const os = require("node:os");
const fs = require("node:fs/promises");
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

function numberFromEnvironment(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : fallback;
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
    const adsbHub = getConnectionStatus();

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
        receivingData,
        feedingData,
        alertPhoneNumbers: phoneNumbersForDashboard()
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

// Login is now the only access check. The old private-stats password/session
// endpoints are intentionally removed.
router.get("/api/dashboard/stats", mongodbAuthMiddleware, sendDashboardStats);
router.get("/api/private-stats", mongodbAuthMiddleware, sendDashboardStats);
router.get("/api/dashboard/visitor-logs", mongodbAuthMiddleware, sendVisitorLogs);
router.put("/api/dashboard/visitor-logs/settings", mongodbAuthMiddleware, updateVisitorLoggingSettings);

module.exports = router;
