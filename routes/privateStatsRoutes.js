const os = require("node:os");
const fs = require("node:fs/promises");
const path = require("node:path");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const axios = require("axios");
const express = require("express");
const mongoose = require("mongoose");

const mongodbAuthMiddleware = require("../middlewares/mongodbAuthMiddleware");
const redisClient = require("../redis/redisClient");
const {
    getVisitorLogSnapshot,
    setVisitorLoggingEnabled
} = require("../services/anonymousVisitorLogs");
const { getConnectionStatus } = require("../feedPartners/adsbHubTcpConn");
const {
    STATION_ID,
    STATION_NAME,
    getLocalSdrAircraft
} = require("../services/localSdrAircraftFeed");
const {
    getCityAlertRadii,
    getCityAlertEnabled,
    getCityAlertEmailRecipients,
    updateCityAlertRadii,
    updateCityAlertEnabled,
    addCityAlertEmailRecipient,
    removeCityAlertEmailRecipient,
    CityAlertSettingsError
} = require("../services/cityAlertSettings");
const { ADSB_FLIGHT_JSON_URL, READSB_AIRCRAFT_JSON_PATH } = require("../utils/globals");

const router = express.Router();
const execFileAsync = promisify(execFile);

function parseOsRelease(contents) {
    const details = {};

    for (const line of contents.split(/\r?\n/)) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith("#")) continue;

        const separatorIndex = trimmedLine.indexOf("=");
        if (separatorIndex === -1) continue;

        const key = trimmedLine.slice(0, separatorIndex);
        let value = trimmedLine.slice(separatorIndex + 1).trim();

        if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1).replace(/\\(["\\$`])/g, "$1");
        }

        details[key] = value;
    }

    return details;
}

async function getServerOperatingSystem() {
    const fallbackName = `${os.type()} ${os.release()}`;

    try {
        const details = parseOsRelease(await fs.readFile("/etc/os-release", "utf8"));
        const id = (details.ID || os.platform()).toLowerCase();

        return {
            name: details.PRETTY_NAME || details.NAME || fallbackName,
            id,
            isUbuntu: id === "ubuntu",
            platform: os.platform(),
            architecture: os.arch(),
            kernel: os.release()
        };
    } catch (error) {
        return {
            name: fallbackName,
            id: os.platform(),
            isUbuntu: false,
            platform: os.platform(),
            architecture: os.arch(),
            kernel: os.release()
        };
    }
}

function getMainServerIdentity() {
    return {
        name: DASHBOARD_SERVER_NAME,
        hostname: os.hostname(),
        dataCollection: "server"
    };
}

function roundMetric(value, decimalPlaces = 1) {
    const number = Number(value);
    if (!Number.isFinite(number)) return null;

    const factor = 10 ** decimalPlaces;
    return Math.round(number * factor) / factor;
}

function usagePercent(usedBytes, totalBytes) {
    const used = Number(usedBytes);
    const total = Number(totalBytes);

    if (!Number.isFinite(used) || !Number.isFinite(total) || total <= 0) return null;
    return roundMetric((used / total) * 100);
}

function memorySnapshot(totalBytes, availableBytes, source) {
    const total = Number(totalBytes);
    const available = Number(availableBytes);
    const used = Math.max(total - available, 0);

    return {
        totalBytes: total,
        availableBytes: available,
        usedBytes: used,
        usedPercent: usagePercent(used, total),
        source
    };
}

async function getMemoryHealth() {
    const fallback = () => memorySnapshot(os.totalmem(), os.freemem(), "Node OS metrics");

    try {
        const memInfo = await fs.readFile("/proc/meminfo", "utf8");
        const values = {};

        for (const line of memInfo.split(/\r?\n/)) {
            const match = line.match(/^([A-Za-z_]+):\s+(\d+)\s+kB$/i);
            if (match) values[match[1]] = Number(match[2]) * 1024;
        }

        if (Number.isFinite(values.MemTotal) && Number.isFinite(values.MemAvailable)) {
            return memorySnapshot(values.MemTotal, values.MemAvailable, "/proc/meminfo");
        }
    } catch (error) {
        // Non-Linux hosts can still report a useful fallback via Node's OS API.
    }

    return fallback();
}

async function getRootDiskHealth() {
    if (typeof fs.statfs === "function") {
        try {
            const stats = await fs.statfs("/");
            const blockSize = Number(stats.frsize || stats.bsize);
            const totalBytes = Number(stats.blocks) * blockSize;
            const usedBytes = Math.max(Number(stats.blocks - stats.bfree) * blockSize, 0);
            const availableBytes = Math.max(Number(stats.bavail) * blockSize, 0);

            if (Number.isFinite(totalBytes) && Number.isFinite(usedBytes) && Number.isFinite(availableBytes)) {
                return {
                    available: true,
                    mountPath: "/",
                    totalBytes,
                    usedBytes,
                    availableBytes,
                    usedPercent: usagePercent(usedBytes, totalBytes)
                };
            }
        } catch (error) {
            // Fall back to the Ubuntu df command below when statfs is unavailable.
        }
    }

    try {
        const { stdout } = await execFileAsync("df", ["-Pk", "/"], {
            timeout: numberFromEnvironment(FEEDER_COMMAND_TIMEOUT_MS, 2000),
            maxBuffer: 8192,
            windowsHide: true
        });
        const rows = stdout.trim().split(/\r?\n/).map((row) => row.trim()).filter(Boolean);
        const columns = rows[rows.length - 1]?.split(/\s+/) || [];
        const [filesystem, totalKilobytes, usedKilobytes, availableKilobytes, percent, mountPath] = columns;
        const totalBytes = Number(totalKilobytes) * 1024;
        const usedBytes = Number(usedKilobytes) * 1024;
        const availableBytes = Number(availableKilobytes) * 1024;

        if (!filesystem || !Number.isFinite(totalBytes) || !Number.isFinite(usedBytes) || !Number.isFinite(availableBytes)) {
            throw new Error("Unexpected df output");
        }

        return {
            available: true,
            mountPath: mountPath || "/",
            totalBytes,
            usedBytes,
            availableBytes,
            usedPercent: Number.isFinite(Number.parseFloat(percent))
                ? roundMetric(Number.parseFloat(percent))
                : usagePercent(usedBytes, totalBytes)
        };
    } catch (error) {
        return {
            available: false,
            mountPath: "/",
            totalBytes: null,
            usedBytes: null,
            availableBytes: null,
            usedPercent: null
        };
    }
}

async function getMongoConnectionHealth() {
    const connection = mongoose.connection;
    const stateNames = {
        0: "disconnected",
        1: "connected",
        2: "connecting",
        3: "disconnecting"
    };
    const state = stateNames[connection.readyState] || "unknown";

    if (connection.readyState !== 1 || !connection.db) {
        return {
            connected: false,
            state,
            latencyMs: null
        };
    }

    let timeoutId;
    const startedAt = Date.now();

    try {
        await Promise.race([
            connection.db.admin().ping(),
            new Promise((_, reject) => {
                timeoutId = setTimeout(() => reject(new Error("MongoDB health check timed out")), 2000);
            })
        ]);

        return {
            connected: true,
            state: "connected",
            latencyMs: Date.now() - startedAt
        };
    } catch (error) {
        return {
            connected: false,
            state: "unavailable",
            latencyMs: null
        };
    } finally {
        clearTimeout(timeoutId);
    }
}

async function getRedisConnectionHealth() {
    const initialState = redisClient.status || "unknown";

    if (initialState !== "ready") {
        return {
            connected: false,
            state: initialState,
            latencyMs: null
        };
    }

    let timeoutId;
    const startedAt = Date.now();

    try {
        const response = await Promise.race([
            redisClient.ping(),
            new Promise((_, reject) => {
                timeoutId = setTimeout(() => reject(new Error("Redis health check timed out")), 2000);
            })
        ]);

        if (response !== "PONG") {
            throw new Error("Unexpected Redis health-check response");
        }

        return {
            connected: true,
            state: "connected",
            latencyMs: Date.now() - startedAt
        };
    } catch (error) {
        return {
            connected: false,
            state: "unavailable",
            latencyMs: null
        };
    } finally {
        clearTimeout(timeoutId);
    }
}

async function getServerHealth() {
    const [memory, disk, mongodb, redis] = await Promise.all([
        getMemoryHealth(),
        getRootDiskHealth(),
        getMongoConnectionHealth(),
        getRedisConnectionHealth()
    ]);
    const [oneMinute, fiveMinute, fifteenMinute] = os.loadavg();
    const cpuCores = Math.max(os.cpus().length, 1);

    return {
        memory,
        disk,
        cpu: {
            cores: cpuCores,
            oneMinuteLoad: roundMetric(oneMinute, 2),
            fiveMinuteLoad: roundMetric(fiveMinute, 2),
            fifteenMinuteLoad: roundMetric(fifteenMinute, 2),
            oneMinuteLoadPerCore: roundMetric(oneMinute / cpuCores, 2)
        },
        mongodb,
        redis,
        systemUptimeSeconds: Math.round(os.uptime()),
        processRssBytes: process.memoryUsage().rss
    };
}

// re-api authorizes requests by the Ubuntu host's public IP address. The
// station circle is configurable so a deployment can use its actual receiver
// location without exposing that location to the browser.
const ADSBLOL_RE_API_URL = process.env.ADSBLOL_RE_API_URL || "https://re-api.adsb.lol";
const ADSBLOL_RE_API_CIRCLE = process.env.ADSBLOL_RE_API_CIRCLE || "22.3072,73.1812,250";
const ADSBLOL_RE_API_TIMEOUT_MS = Number(process.env.ADSBLOL_RE_API_TIMEOUT_MS || 5000);
const FEEDER_COMMAND_TIMEOUT_MS = Number(process.env.FEEDER_COMMAND_TIMEOUT_MS || 2000);
const DASHBOARD_SERVER_NAME = (process.env.DASHBOARD_SERVER_NAME || "Main server").trim() || "Main server";
const READSB_STATS_JSON_PATH = process.env.READSB_STATS_JSON_PATH
    || path.join(path.dirname(READSB_AIRCRAFT_JSON_PATH), "stats.json");
const READSB_RECEIVER_JSON_PATH = process.env.READSB_RECEIVER_JSON_PATH
    || path.join(path.dirname(READSB_AIRCRAFT_JSON_PATH), "receiver.json");
const READSB_STATS_URL = process.env.READSB_STATS_URL || new URL("stats.json", ADSB_FLIGHT_JSON_URL).toString();
const READSB_RECEIVER_URL = process.env.READSB_RECEIVER_URL || new URL("receiver.json", ADSB_FLIGHT_JSON_URL).toString();
const READSB_LOG_PATH = (process.env.READSB_LOG_PATH || "").trim();
const READSB_LOG_LINES = Math.max(5, Math.min(Number(process.env.READSB_LOG_LINES) || 24, 100));
const READSB_HEALTHY_MESSAGE_RATE = Math.max(1, Number(process.env.READSB_HEALTHY_MESSAGE_RATE) || 1);
const configuredBadMessageRate = Number(process.env.READSB_MAX_BAD_MESSAGE_RATE);
const READSB_MAX_BAD_MESSAGE_RATE = Math.max(0, Math.min(
    Number.isFinite(configuredBadMessageRate) ? configuredBadMessageRate : 75,
    100
));
const READSB_FRESH_MESSAGE_SECONDS = Math.max(5, Number(process.env.READSB_FRESH_MESSAGE_SECONDS) || 30);
const READSB_MAX_MANUAL_GAIN_DB = 59.6;
const READSB_GAIN_CONTROL_COMMAND = process.env.READSB_GAIN_CONTROL_COMMAND || "/usr/local/sbin/falcon-set-readsb-gain";
const GRAPHS1090_OUTPUT_DIR = process.env.GRAPHS1090_OUTPUT_DIR || "/run/graphs1090";
const GRAPHS1090_PERIOD = (process.env.GRAPHS1090_PERIOD || "24h").trim();
const graphs1090Metrics = [
    { id: "aircraft_message_rate", label: "Message rate" },
    { id: "local_rate", label: "Local decode rate" },
    { id: "signal", label: "Signal and noise" },
    { id: "aircraft", label: "Aircraft" },
    { id: "range", label: "Range" },
    { id: "tracks", label: "Tracks" }
];

const feederClients = [
    {
        id: "flightradar24",
        name: "FlightRadar24",
        services: ["fr24feed"],
        processes: ["fr24feed"]
    },
    {
        id: "airnavradar",
        name: "AirNav Radar",
        services: ["rbfeeder", "radarbox"],
        processes: ["rbfeeder", "radarbox"]
    },
    {
        id: "adsbexchange",
        name: "ADSBExchange",
        services: ["adsbexchange-feed", "adsbx"],
        processes: ["adsbexchange-feed", "adsbx"]
    },
    {
        id: "flightaware",
        name: "FlightAware",
        services: ["piaware"],
        processes: ["piaware"]
    },
    {
        id: "airplanes-live",
        name: "Airplanes.live",
        services: ["airplaneslive-feed", "airplanes-live"],
        processes: ["airplaneslive-feed", "airplanes-live"]
    },
    {
        id: "adsblol",
        name: "ADSB.lol",
        services: ["adsblol-feed", "adsblol"],
        processes: ["adsblol-feed", "adsblol"]
    },
    {
        id: "adsbhub",
        name: "ADSBHub",
        services: ["adsbhub-feed", "adsbhub"],
        processes: ["adsbhub-feed", "adsbhub"]
    }
];

// These values are deliberately read only on the protected API response. They
// are never logged or exposed by a public endpoint.
const alertPhoneVariables = [
    { label: "Roshan", variable: "ROSHAN_BHAI_PHONE" },
    { label: "Meet", variable: "MEET_BHAI_PHONE" },
    { label: "Rishi", variable: "RISHI_BHAI_PHONE" },
    { label: "Anmol", variable: "ANMOL_BHAI_PHONE" },
    { label: "Ishan", variable: "ISHAN_BHAI_PHONE" },
    { label: "Kushal", variable: "KUSHAL_BHAI_PHONE" },
    { label: "Bangalore alert 1", variable: "BANGALORE_ALERT_PHONE_1" },
    { label: "Bangalore alert 2", variable: "BANGALORE_ALERT_PHONE_2" },
    { label: "Bangalore alert 3", variable: "BANGALORE_ALERT_PHONE_3" },
    { label: "Bangalore alert 4", variable: "BANGALORE_ALERT_PHONE_4" },
    { label: "Delhi alert 1", variable: "DELHI_ALERT_PHONE_1" },
    { label: "Delhi alert 2", variable: "DELHI_ALERT_PHONE_2" },
    { label: "Delhi alert 3", variable: "DELHI_ALERT_PHONE_3" },
    { label: "Delhi alert 4", variable: "DELHI_ALERT_PHONE_4" },
    { label: "Hyderabad alert 1", variable: "HYDERABAD_ALERT_PHONE_1" },
    { label: "Hyderabad alert 2", variable: "HYDERABAD_ALERT_PHONE_2" },
    { label: "Hyderabad alert 3", variable: "HYDERABAD_ALERT_PHONE_3" },
    { label: "Hyderabad alert 4", variable: "HYDERABAD_ALERT_PHONE_4" }
];

function formatBytes(bytes) {
    const value = Number(bytes);

    if (!Number.isFinite(value) || value < 0) return "Unavailable";
    if (value < 1024) return `${value} B`;

    const units = ["KB", "MB", "GB", "TB"];
    let unitIndex = -1;
    let formatted = value;

    do {
        formatted /= 1024;
        unitIndex += 1;
    } while (formatted >= 1024 && unitIndex < units.length - 1);

    return `${formatted.toFixed(formatted >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

function phoneNumbersForDashboard() {
    return alertPhoneVariables
        .map(({ label, variable }) => ({
            label,
            variable,
            number: process.env[variable]
        }))
        .filter((phone) => typeof phone.number === "string" && phone.number.trim())
        .map((phone) => ({ ...phone, number: phone.number.trim() }));
}

async function getVadodaraStation() {
    try {
        const feed = await getLocalSdrAircraft();
        const connection = feed.connection || {};

        return {
            id: STATION_ID,
            name: connection.stationName || STATION_NAME,
            source: connection.source || STATION_ID,
            state: connection.connected ? "receiving" : "unavailable",
            connected: Boolean(connection.connected),
            aircraftCount: connection.aircraftCount ?? feed.aircraft?.length ?? 0,
            lastMessageAt: connection.lastMessageAt || null,
            detail: "Local readsb receiver"
        };
    } catch (error) {
        return {
            id: STATION_ID,
            name: STATION_NAME,
            source: STATION_ID,
            state: "unavailable",
            connected: false,
            aircraftCount: 0,
            lastMessageAt: null,
            detail: "Local receiver feed is unavailable"
        };
    }
}

function finiteMetric(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function firstFiniteMetric(...values) {
    for (const value of values) {
        const number = finiteMetric(value);
        if (number !== null) return number;
    }

    return null;
}

async function readReadsbJson({ filePath, url }) {
    try {
        return JSON.parse(await fs.readFile(filePath, "utf8"));
    } catch {
        // The HTTP endpoint is useful when readsb writes its JSON files in a
        // directory the application user cannot read.
        const response = await axios.get(url, {
            timeout: numberFromEnvironment(FEEDER_COMMAND_TIMEOUT_MS, 2000),
            headers: { Accept: "application/json" },
            validateStatus: (status) => status >= 200 && status < 300
        });
        return response.data;
    }
}

function readsbWindow(stats) {
    return stats?.last1min || stats?.latest || stats?.total || stats || {};
}

async function getReadsbGainConfiguration() {
    try {
        const { stdout } = await execFileAsync("pgrep", ["-xo", "readsb"], {
            timeout: numberFromEnvironment(FEEDER_COMMAND_TIMEOUT_MS, 2000),
            maxBuffer: 1024,
            windowsHide: true
        });
        const pid = stdout.trim();

        if (!/^\d+$/.test(pid)) throw new Error("readsb process not found");

        const argumentsList = (await fs.readFile(`/proc/${pid}/cmdline`))
            .toString("utf8")
            .split("\0")
            .filter(Boolean);
        const gainIndex = argumentsList.findIndex((argument) => argument === "--gain" || argument.startsWith("--gain="));

        if (gainIndex === -1) {
            return { available: true, mode: "unknown", configuredGainDb: null };
        }

        const gainValue = argumentsList[gainIndex] === "--gain"
            ? argumentsList[gainIndex + 1]
            : argumentsList[gainIndex].slice("--gain=".length);
        const normalizedGain = String(gainValue || "").trim().toLowerCase();

        if (["auto", "automatic"].includes(normalizedGain)) {
            return { available: true, mode: "automatic", configuredGainDb: null };
        }

        const configuredGainDb = finiteMetric(gainValue);
        return {
            available: true,
            mode: configuredGainDb === null ? "unknown" : "manual",
            configuredGainDb
        };
    } catch {
        return { available: false, mode: "unknown", configuredGainDb: null };
    }
}

function getReadsbMetrics(stats, receiver) {
    const window = readsbWindow(stats);
    const receivedMessages = firstFiniteMetric(window.messages, window.received, stats?.messages);
    const badMessages = firstFiniteMetric(window.local?.bad, window.bad, window.bad_messages, stats?.bad);
    const detectedModeSMessages = firstFiniteMetric(window.local?.modes, window.modes, window.messages_valid);
    const fallbackFrameCount = receivedMessages !== null && badMessages !== null
        ? receivedMessages + badMessages
        : null;
    const badMessageRateDenominator = detectedModeSMessages && detectedModeSMessages > 0
        ? detectedModeSMessages
        : fallbackFrameCount && fallbackFrameCount > 0
            ? fallbackFrameCount
            : null;
    const gainDb = firstFiniteMetric(
        receiver?.gain_db,
        receiver?.gain,
        stats?.gain_db,
        stats?.gain,
        stats?.latest?.gain_db,
        stats?.latest?.gain
    );
    const badMessageRate = badMessageRateDenominator !== null && badMessages !== null
        ? roundMetric((badMessages / badMessageRateDenominator) * 100, 2)
        : null;

    return {
        receivedMessages,
        badMessages,
        badMessageRate,
        badMessageRateBasis: detectedModeSMessages && detectedModeSMessages > 0
            ? "detected Mode-S frames"
            : fallbackFrameCount && fallbackFrameCount > 0
                ? "decoded and rejected frames"
                : null,
        gainDb
    };
}

function graphs1090FileName(fileName) {
    return typeof fileName === "string"
        && /^(?:dump1090|readsb)-[A-Za-z0-9._-]+-(?:aircraft_message_rate|local_rate|signal|aircraft|range|tracks)-(?:2h|8h|24h|48h|7d|30d|90d|180d|365d|730d|1095d|1825d|3650d)\.png$/.test(fileName);
}

async function getGraphs1090Stats() {
    try {
        const fileNames = (await fs.readdir(GRAPHS1090_OUTPUT_DIR)).filter(graphs1090FileName);
        const graphs = await Promise.all(graphs1090Metrics.map(async (metric) => {
            const suffix = `-${metric.id}-${GRAPHS1090_PERIOD}.png`;
            const fileName = fileNames.find((name) => name.endsWith(suffix));
            if (!fileName) return null;

            const fileStats = await fs.stat(path.join(GRAPHS1090_OUTPUT_DIR, fileName));
            return {
                id: metric.id,
                label: metric.label,
                fileName,
                updatedAt: fileStats.mtime.toISOString()
            };
        }));

        return {
            available: true,
            period: GRAPHS1090_PERIOD,
            graphs: graphs.filter(Boolean)
        };
    } catch {
        return { available: false, period: GRAPHS1090_PERIOD, graphs: [] };
    }
}

async function getReadsbLog() {
    const commandOptions = {
        timeout: numberFromEnvironment(FEEDER_COMMAND_TIMEOUT_MS, 2000),
        maxBuffer: 64 * 1024,
        windowsHide: true
    };

    try {
        if (READSB_LOG_PATH) {
            const { stdout } = await execFileAsync("tail", ["-n", String(READSB_LOG_LINES), READSB_LOG_PATH], commandOptions);
            return {
                available: true,
                source: READSB_LOG_PATH,
                lines: stdout.trim().split(/\r?\n/).filter(Boolean)
            };
        }

        const { stdout } = await execFileAsync("journalctl", [
            "--no-pager",
            "--output=short-iso",
            "--lines", String(READSB_LOG_LINES),
            "--unit", "readsb"
        ], commandOptions);
        const lines = stdout.trim().split(/\r?\n/).filter(Boolean);

        return {
            available: lines.length > 0,
            source: "journalctl -u readsb",
            lines
        };
    } catch {
        return {
            available: false,
            source: READSB_LOG_PATH || "journalctl -u readsb",
            lines: []
        };
    }
}

function receiverHealth({ station, metrics, statsAvailable }) {
    const lastMessageAt = station.lastMessageAt ? new Date(station.lastMessageAt).getTime() : null;
    const messageAgeSeconds = Number.isFinite(lastMessageAt)
        ? Math.max(0, Math.round((Date.now() - lastMessageAt) / 1000))
        : null;
    const fresh = messageAgeSeconds !== null && messageAgeSeconds <= READSB_FRESH_MESSAGE_SECONDS;
    const active = metrics.receivedMessages !== null && metrics.receivedMessages >= READSB_HEALTHY_MESSAGE_RATE;
    const clean = metrics.badMessageRate !== null && metrics.badMessageRate <= READSB_MAX_BAD_MESSAGE_RATE;
    const criteria = {
        maximumMessageAgeSeconds: READSB_FRESH_MESSAGE_SECONDS,
        minimumMessagesPerMinute: READSB_HEALTHY_MESSAGE_RATE,
        maximumBadMessageRate: READSB_MAX_BAD_MESSAGE_RATE
    };

    if (!station.connected || !fresh) {
        return {
            state: "unhealthy",
            label: "No recent ADS-B reception",
            detail: "The receiver has not produced a recent aircraft update.",
            messageAgeSeconds,
            criteria
        };
    }

    if (!statsAvailable || metrics.receivedMessages === null || metrics.badMessageRate === null) {
        return {
            state: "warning",
            label: "Receiving; decoder metrics unavailable",
            detail: "Aircraft data is current, but readsb statistics are not available to verify decode quality.",
            messageAgeSeconds,
            criteria
        };
    }

    if (!active || !clean) {
        return {
            state: "warning",
            label: "Reception needs attention",
            detail: !active
                ? "The receiver is current but decoded too few messages in the last minute."
                : "The bad-message rate is above the configured healthy threshold.",
            messageAgeSeconds,
            criteria
        };
    }

    return {
        state: "healthy",
        label: "Healthy reception",
        detail: "Recent aircraft data and decoder quality are within the configured healthy thresholds.",
        messageAgeSeconds,
        criteria
    };
}

async function getAdsbReceiverStatus(station) {
    const [statsResult, receiverResult, log, gainConfiguration] = await Promise.all([
        readReadsbJson({ filePath: READSB_STATS_JSON_PATH, url: READSB_STATS_URL })
            .then((data) => ({ available: true, data }))
            .catch(() => ({ available: false, data: null })),
        readReadsbJson({ filePath: READSB_RECEIVER_JSON_PATH, url: READSB_RECEIVER_URL })
            .then((data) => ({ available: true, data }))
            .catch(() => ({ available: false, data: null })),
        getReadsbLog(),
        getReadsbGainConfiguration()
    ]);
    const metrics = getReadsbMetrics(statsResult.data, receiverResult.data);

    return {
        stationName: station.name,
        source: station.source,
        connected: station.connected,
        aircraftCount: station.aircraftCount,
        lastMessageAt: station.lastMessageAt,
        statsAvailable: statsResult.available,
        receiverInfoAvailable: receiverResult.available,
        gainConfiguration,
        ...metrics,
        health: receiverHealth({ station, metrics, statsAvailable: statsResult.available }),
        log
    };
}

function numberFromEnvironment(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : fallback;
}

function requestedReadsbGain(body) {
    const mode = String(body?.mode || "").trim().toLowerCase();

    if (mode === "automatic" || mode === "auto" || mode === "default") {
        return { mode: "automatic", value: "auto" };
    }

    if (mode !== "manual") return null;

    const gain = Number(body?.gainDb);
    if (!Number.isFinite(gain) || gain < 0 || gain > READSB_MAX_MANUAL_GAIN_DB) return null;

    return {
        mode: "manual",
        value: String(Math.round(gain * 10) / 10)
    };
}

async function applyReadsbGain(setting) {
    await execFileAsync("sudo", ["-n", READSB_GAIN_CONTROL_COMMAND, setting.value], {
        timeout: 15_000,
        maxBuffer: 4096,
        windowsHide: true
    });
}

function reApiAircraftCount(payload) {
    if (Array.isArray(payload?.aircraft)) return payload.aircraft.length;
    if (Array.isArray(payload?.ac)) return payload.ac.length;
    return Number.isFinite(Number(payload?.total)) ? Number(payload.total) : 0;
}

async function getAdsbLolReApiStatus() {
    try {
        const response = await axios.get(ADSBLOL_RE_API_URL, {
            params: { circle: ADSBLOL_RE_API_CIRCLE },
            timeout: numberFromEnvironment(ADSBLOL_RE_API_TIMEOUT_MS, 5000),
            headers: {
                Accept: "application/json",
                "User-Agent": "Falcon-Intelligence-Dashboard/1.0"
            },
            validateStatus: (status) => status >= 200 && status < 300
        });

        const aircraftCount = reApiAircraftCount(response.data);

        return {
            id: "adsblol-re-api",
            name: "ADSB.lol re-api",
            source: "re-api.adsb.lol",
            state: "receiving",
            connected: true,
            aircraftCount,
            lastMessageAt: new Date().toISOString(),
            detail: `re-api accepted this server IP and returned ${aircraftCount.toLocaleString()} aircraft in the station circle.`
        };
    } catch (error) {
        const status = Number(error.response?.status);
        const detail = status === 401 || status === 403
            ? "re-api did not authorize this server IP. Confirm the Ubuntu host public IP is registered with ADSB.lol."
            : "ADSB.lol re-api could not be reached from this Ubuntu server.";

        return {
            id: "adsblol-re-api",
            name: "ADSB.lol re-api",
            source: "re-api.adsb.lol",
            state: "unavailable",
            connected: false,
            aircraftCount: 0,
            lastMessageAt: null,
            detail
        };
    }
}

async function commandSucceeded(command, args) {
    try {
        await execFileAsync(command, args, {
            timeout: numberFromEnvironment(FEEDER_COMMAND_TIMEOUT_MS, 2000),
            maxBuffer: 1024,
            windowsHide: true
        });
        return true;
    } catch {
        return false;
    }
}

function pgrepPattern(processName) {
    // pgrep -f can otherwise match the pgrep command itself. Bracketing the
    // first character keeps the regular expression equivalent for a feeder
    // process while preventing that false positive.
    return `[${processName.charAt(0)}]${processName.slice(1)}`;
}

async function inspectFeederClient(client) {
    const activeServices = await Promise.all(client.services.map(async (service) => ({
        service,
        active: await commandSucceeded("systemctl", ["is-active", "--quiet", service])
    })));
    const activeService = activeServices.find((result) => result.active);

    if (activeService) {
        return {
            id: client.id,
            name: client.name,
            source: "Ubuntu systemd",
            state: "active",
            connected: true,
            metric: "Service active",
            lastMessageAt: null,
            detail: `systemd service ${activeService.service} is active. This verifies the local feeder service, not the partner's upstream acceptance.`
        };
    }

    const detectedProcesses = await Promise.all(client.processes.map(async (processName) => ({
        processName,
        running: await commandSucceeded("pgrep", ["-f", pgrepPattern(processName)])
    })));
    const detectedProcess = detectedProcesses.find((result) => result.running);

    if (detectedProcess) {
        return {
            id: client.id,
            name: client.name,
            source: "Ubuntu process list",
            state: "detected",
            connected: false,
            metric: "Process detected",
            lastMessageAt: null,
            detail: `Process ${detectedProcess.processName} is running, but no active systemd service was found to confirm its health.`
        };
    }

    return {
        id: client.id,
        name: client.name,
        source: "Ubuntu systemd / process list",
        state: "not-detected",
        connected: false,
        metric: "Not detected",
        lastMessageAt: null,
        detail: "No matching active systemd service or feeder process was found on this Ubuntu host."
    };
}

async function getFeedingData() {
    return Promise.all(feederClients.map(inspectFeederClient));
}

async function buildDashboardStats(user) {
    const [vadodaraStation, adsbLolReApi, feedingData, operatingSystem, health] = await Promise.all([
        getVadodaraStation(),
        getAdsbLolReApiStatus(),
        getFeedingData(),
        getServerOperatingSystem(),
        getServerHealth()
    ]);
    const [adsbReceiver, adsbHub, graphs1090] = await Promise.all([
        getAdsbReceiverStatus(vadodaraStation),
        Promise.resolve(getConnectionStatus()),
        getGraphs1090Stats()
    ]);

    const receivingData = [
        {
            id: "adsbhub-tcp",
            name: "ADSBHub",
            source: "ADSBHub TCP",
            state: adsbHub.state,
            connected: adsbHub.connected,
            aircraftCount: adsbHub.aircraftCount,
            lastMessageAt: adsbHub.lastMessageAt,
            detail: adsbHub.warning || `${adsbHub.receivedLines.toLocaleString()} lines received · ${adsbHub.parsedMessages.toLocaleString()} parsed`,
            receivedLines: adsbHub.receivedLines,
            parsedMessages: adsbHub.parsedMessages,
            receivedBytes: formatBytes(adsbHub.receivedBytes)
        },
        adsbLolReApi
    ];

    return {
        success: true,
        generatedAt: new Date().toISOString(),
        user: {
            firstName: user.firstName,
            username: user.username
        },
        system: {
            uptimeSeconds: Math.round(process.uptime()),
            memoryUsedBytes: process.memoryUsage().rss,
            cpuCores: os.cpus().length,
            operatingSystem,
            server: getMainServerIdentity(),
            health
        },
        stations: [vadodaraStation],
        adsbReceiver,
        graphs1090,
        receivingData,
        feedingData,
        alertPhoneNumbers: phoneNumbersForDashboard(),
        cityAlertRadii: getCityAlertRadii(),
        cityAlertEnabled: getCityAlertEnabled(),
        cityAlertEmailRecipients: getCityAlertEmailRecipients()
    };
}

async function sendDashboardStats(req, res) {
    try {
        res.set("Cache-Control", "no-store");
        return res.status(200).json(await buildDashboardStats(req.user));
    } catch (error) {
        console.error("Dashboard stats error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to load dashboard statistics"
        });
    }
}

async function sendVisitorLogs(req, res) {
    try {
        res.set("Cache-Control", "no-store");
        return res.status(200).json({
            success: true,
            generatedAt: new Date().toISOString(),
            visitorLogs: await getVisitorLogSnapshot()
        });
    } catch (error) {
        console.error("Visitor logs dashboard error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to load visitor logs"
        });
    }
}

async function updateVisitorLoggingSettings(req, res) {
    if (typeof req.body?.enabled !== "boolean") {
        return res.status(400).json({
            success: false,
            message: "The enabled setting must be true or false"
        });
    }

    try {
        const enabled = await setVisitorLoggingEnabled(req.body.enabled);
        res.set("Cache-Control", "no-store");
        return res.status(200).json({
            success: true,
            visitorLogs: { enabled }
        });
    } catch (error) {
        return res.status(503).json({
            success: false,
            message: "Visitor logging settings are unavailable because Redis is disconnected"
        });
    }
}

async function updateCityAlertRadiusSettings(req, res) {
    try {
        const cityAlertRadii = await updateCityAlertRadii(req.body?.radii);
        res.set("Cache-Control", "no-store");
        return res.status(200).json({ success: true, cityAlertRadii });
    } catch (error) {
        const statusCode = error instanceof CityAlertSettingsError ? error.statusCode : 500;
        if (statusCode === 500) console.error("City alert radius dashboard update error:", error.message);
        return res.status(statusCode).json({
            success: false,
            message: error.message || "Unable to update city alert radii"
        });
    }
}

async function updateCityAlertEnabledSettings(req, res) {
    try {
        const cityAlertEnabled = await updateCityAlertEnabled(req.body?.enabled);
        res.set("Cache-Control", "no-store");
        return res.status(200).json({ success: true, cityAlertEnabled: cityAlertEnabled.enabled });
    } catch (error) {
        const statusCode = error instanceof CityAlertSettingsError ? error.statusCode : 500;
        if (statusCode === 500) console.error("City alert enabled dashboard update error:", error.message);
        return res.status(statusCode).json({
            success: false,
            message: error.message || "Unable to update city alert settings"
        });
    }
}

async function changeCityAlertEmailRecipient(req, res) {
    try {
        const { cityId, email } = req.body || {};
        const settings = req.method === "DELETE"
            ? await removeCityAlertEmailRecipient(cityId, email)
            : await addCityAlertEmailRecipient(cityId, email);
        res.set("Cache-Control", "no-store");
        return res.status(200).json({
            success: true,
            cityAlertEmailRecipients: settings.emailRecipients
        });
    } catch (error) {
        const statusCode = error instanceof CityAlertSettingsError ? error.statusCode : 500;
        if (statusCode === 500) console.error("City alert email recipient dashboard update error:", error.message);
        return res.status(statusCode).json({
            success: false,
            message: error.message || "Unable to update city alert email recipients"
        });
    }
}

async function updateReadsbGain(req, res) {
    const setting = requestedReadsbGain(req.body);

    if (!setting) {
        return res.status(400).json({
            success: false,
            message: `Choose automatic gain or a manual gain between 0 and ${READSB_MAX_MANUAL_GAIN_DB} dB.`
        });
    }

    try {
        await applyReadsbGain(setting);
        res.set("Cache-Control", "no-store");
        return res.status(200).json({
            success: true,
            gainConfiguration: {
                mode: setting.mode,
                configuredGainDb: setting.mode === "manual" ? Number(setting.value) : null
            },
            message: setting.mode === "automatic"
                ? "Automatic gain has been enabled and readsb restarted."
                : `Manual gain was set to ${setting.value} dB and readsb restarted.`
        });
    } catch (error) {
        console.error("Readsb gain update failed:", error.message);
        return res.status(503).json({
            success: false,
            message: "Receiver gain could not be updated. Install the restricted falcon-set-readsb-gain helper and allow the dashboard service account to run it with sudo without a password."
        });
    }
}

async function sendGraphs1090Image(req, res) {
    const fileName = req.params.fileName;

    if (!graphs1090FileName(fileName)) {
        return res.status(404).json({ success: false, message: "Graphs1090 image not found" });
    }

    const outputDirectory = path.resolve(GRAPHS1090_OUTPUT_DIR);
    const imagePath = path.resolve(outputDirectory, fileName);

    if (path.dirname(imagePath) !== outputDirectory) {
        return res.status(404).json({ success: false, message: "Graphs1090 image not found" });
    }

    try {
        await fs.access(imagePath);
        res.set("Cache-Control", "no-store");
        return res.type("png").sendFile(imagePath, { dotfiles: "deny" }, (error) => {
            if (error && !res.headersSent) {
                res.status(error.statusCode || 404).json({ success: false, message: "Graphs1090 image not found" });
            }
        });
    } catch {
        return res.status(404).json({ success: false, message: "Graphs1090 image not found" });
    }
}

// Login is now the only access check. The old private-stats password/session
// endpoints are intentionally removed.
router.get("/api/dashboard/stats", mongodbAuthMiddleware, sendDashboardStats);
router.get("/api/private-stats", mongodbAuthMiddleware, sendDashboardStats);
router.get("/api/dashboard/graphs1090/:fileName", mongodbAuthMiddleware, sendGraphs1090Image);
router.get("/api/dashboard/visitor-logs", mongodbAuthMiddleware, sendVisitorLogs);
router.put("/api/dashboard/visitor-logs/settings", mongodbAuthMiddleware, updateVisitorLoggingSettings);
router.put("/api/dashboard/readsb/gain", mongodbAuthMiddleware, updateReadsbGain);
router.put("/api/dashboard/city-alert-radii", mongodbAuthMiddleware, updateCityAlertRadiusSettings);
router.put("/api/dashboard/city-alert-enabled", mongodbAuthMiddleware, updateCityAlertEnabledSettings);
router.post("/api/dashboard/city-alert-email-recipients", mongodbAuthMiddleware, changeCityAlertEmailRecipient);
router.delete("/api/dashboard/city-alert-email-recipients", mongodbAuthMiddleware, changeCityAlertEmailRecipient);

module.exports = router;
