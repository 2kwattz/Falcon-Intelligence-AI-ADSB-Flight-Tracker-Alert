const net = require("net");

const HOST = process.env.ADSBHUB_HOST || "data.adsbhub.org";
const PORT = Number(process.env.ADSBHUB_PORT || 5002);

const RECONNECT_DELAY = 5000;
const AIRCRAFT_TIMEOUT = 60 * 1000;
const NO_DATA_WARNING_MS = Number(process.env.ADSBHUB_NO_DATA_WARNING_MS || 30000);

let socket = null;
let buffer = "";
let reconnectTimer = null;
let connectedAt = null;
let lastMessageAt = null;
let lastConnectAttemptAt = null;
let lastError = null;
let lastCloseAt = null;
let receivedBytes = 0;
let receivedLines = 0;
let parsedMessages = 0;
let currentConnectionMessages = 0;
let lastNoDataCloseAt = null;

const aircraft = new Map();

function numberOrNull(value) {
    if (value === undefined || value === null || String(value).trim() === "") {
        return null;
    }

    const number = Number(value);

    return Number.isFinite(number) ? number : null;
}

function getAircraft(hex) {
    let ac = aircraft.get(hex);

    if (!ac) {
        ac = {
            hex: hex,
            callsign: null,

            altitude: null,
            groundSpeed: null,
            heading: null,

            latitude: null,
            longitude: null,

            verticalRate: null,
            squawk: null,

            alert: null,
            emergency: null,
            spi: null,
            isOnGround: null,

            lastSeen: null,
            positionSeen: null
        };

        aircraft.set(hex, ac);
    }

    return ac;
}

function parseSBS(line) {
    const fields = line.split(",");

    if (fields[0] !== "MSG") {
        return false;
    }

    const messageType = Number(fields[1]);

    const hex = fields[4]?.trim().toUpperCase();

    if (!hex) {
        return false;
    }

    const ac = getAircraft(hex);

    // Callsign
    if (fields[10]?.trim()) {
        ac.callsign = fields[10].trim();
    }

    // Altitude
    const altitude = numberOrNull(fields[11]);

    if (altitude !== null) {
        ac.altitude = altitude;
    }

    // Ground speed
    const groundSpeed = numberOrNull(fields[12]);

    if (groundSpeed !== null) {
        ac.groundSpeed = groundSpeed;
    }

    // Heading
    const heading = numberOrNull(fields[13]);

    if (heading !== null) {
        ac.heading = heading;
    }

    // Latitude
    const latitude = numberOrNull(fields[14]);

    if (latitude !== null) {
        ac.latitude = latitude;
    }

    // Longitude
    const longitude = numberOrNull(fields[15]);

    if (longitude !== null) {
        ac.longitude = longitude;
    }

    if (
        Number.isFinite(ac.latitude) &&
        Number.isFinite(ac.longitude) &&
        (latitude !== null || longitude !== null)
    ) {
        ac.positionSeen = Date.now();
    }

    // Vertical rate
    const verticalRate = numberOrNull(fields[16]);

    if (verticalRate !== null) {
        ac.verticalRate = verticalRate;
    }

    // Squawk
    if (fields[17]?.trim()) {
        ac.squawk = fields[17].trim();
    }

    // Alert
    if (fields[18] !== undefined && fields[18] !== "") {
        ac.alert = fields[18];
    }

    // Emergency
    if (fields[19] !== undefined && fields[19] !== "") {
        ac.emergency = fields[19];
    }

    // SPI
    if (fields[20] !== undefined && fields[20] !== "") {
        ac.spi = fields[20];
    }

    // On ground
    if (fields[21] !== undefined && fields[21] !== "") {
        ac.isOnGround = fields[21] === "1";
    }

    // SBS generated timestamp
    ac.generatedDate = fields[6] || null;
    ac.generatedTime = fields[7] || null;

    ac.lastSeen = Date.now();

    lastMessageAt = ac.lastSeen;

    return true;
}

function connect() {
    console.log(`Connecting to ${HOST}:${PORT}...`);
    lastConnectAttemptAt = Date.now();

    socket = net.createConnection(
        {
            host: HOST,
            port: PORT
        },
        () => {
            console.log(`Connected to ADSBHub ${HOST}:${PORT}`);
            buffer = "";
            connectedAt = Date.now();
            currentConnectionMessages = 0;
            lastError = null;
        }
    );

    socket.setKeepAlive(true, 30000);

    socket.on("data", (chunk) => {
        receivedBytes += chunk.length;
        buffer += chunk.toString("utf8");

        const lines = buffer.split(/\r?\n/);

        buffer = lines.pop() || "";
        receivedLines += lines.length;

        for (const line of lines) {
            const message = line.trim();

            if (!message) {
                continue;
            }

            try {
                if (parseSBS(message)) {
                    parsedMessages += 1;
                    currentConnectionMessages += 1;
                }
            } catch (error) {
                console.error("SBS parse error:", error.message);
            }
        }
    });

    socket.on("error", (error) => {
        lastError = {
            message: error.message,
            code: error.code || null,
            at: Date.now()
        };
        console.error("ADS-B TCP error:", error.message);
    });

    socket.on("close", () => {
        console.log("ADSBHub connection closed.");
        connectedAt = null;
        lastCloseAt = Date.now();
        if (currentConnectionMessages === 0) {
            lastNoDataCloseAt = lastCloseAt;
        }

        if (reconnectTimer) {
            return;
        }

        reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            connect();
        }, RECONNECT_DELAY);
    });
}

setInterval(() => {
    const now = Date.now();

    for (const [hex, ac] of aircraft) {
        if (now - ac.lastSeen > AIRCRAFT_TIMEOUT) {
            aircraft.delete(hex);
            console.log(`Removed stale aircraft: ${hex}`);
        }
    }
}, 10000);

connect();

/**
 * Read-only snapshot for the live-map pipeline.  A shallow copy prevents
 * HTTP consumers from mutating the in-memory feed state.
 */
function getLiveAircraft() {
    return [...aircraft.values()].map((ac) => ({ ...ac }));
}

function getConnectionStatus() {
    const now = Date.now();
    const isConnected = Boolean(socket && !socket.destroyed && connectedAt);
    const isConnecting = Boolean(socket && !socket.destroyed && !connectedAt);
    const noDataForMs = isConnected
        ? now - (lastMessageAt || connectedAt)
        : null;
    const waitingForFirstMessage = isConnected && !lastMessageAt;
    const state = isConnected
        ? waitingForFirstMessage
            ? "connected-awaiting-data"
            : "receiving"
        : isConnecting
            ? "connecting"
        : reconnectTimer
            ? "reconnecting"
            : "disconnected";
    const hasNeverReceivedData = parsedMessages === 0;
    const warning = isConnected && noDataForMs > NO_DATA_WARNING_MS
        ? "Connected to ADSBHub, but no SBS messages have been received. Confirm this server's public IP is saved on the ADSBHub profile Data Access page and that your station is actively feeding ADSBHub."
        : hasNeverReceivedData && lastNoDataCloseAt
            ? "ADSBHub accepted the TCP connection and closed it before sending SBS messages. Confirm this server's public IP is saved on the ADSBHub profile Data Access page and that your station is actively feeding ADSBHub."
        : null;

    return {
        host: HOST,
        port: PORT,
        state,
        connected: isConnected,
        connectedAt,
        lastConnectAttemptAt,
        lastMessageAt,
        lastCloseAt,
        lastNoDataCloseAt,
        lastError,
        noDataForMs,
        warning,
        aircraftCount: aircraft.size,
        receivedBytes,
        receivedLines,
        parsedMessages,
        remoteAddress: socket?.remoteAddress || null,
        remotePort: socket?.remotePort || null,
        localAddress: socket?.localAddress || null,
        localPort: socket?.localPort || null
    };
}

module.exports = { getLiveAircraft, getConnectionStatus };
