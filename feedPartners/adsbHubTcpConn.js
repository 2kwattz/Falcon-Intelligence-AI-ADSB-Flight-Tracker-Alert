const net = require("net");

const HOST = "data.adsbhub.org";
const PORT = 5002;

const RECONNECT_DELAY = 5000;
const AIRCRAFT_TIMEOUT = 60 * 1000;

let socket = null;
let buffer = "";
let reconnectTimer = null;
let connectedAt = null;
let lastMessageAt = null;

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

            lastSeen: null
        };

        aircraft.set(hex, ac);
    }

    return ac;
}

function parseSBS(line) {
    const fields = line.split(",");

    if (fields[0] !== "MSG") {
        return;
    }

    const messageType = Number(fields[1]);

    const hex = fields[4]?.trim().toUpperCase();

    if (!hex) {
        return;
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
}

function connect() {
    console.log(`Connecting to ${HOST}:${PORT}...`);

    socket = net.createConnection(
        {
            host: HOST,
            port: PORT
        },
        () => {
            console.log(`Connected to ADSBHub ${HOST}:${PORT}`);
            buffer = "";
            connectedAt = Date.now();
        }
    );

    socket.setKeepAlive(true, 30000);

    socket.on("data", (chunk) => {
        buffer += chunk.toString("utf8");

        const lines = buffer.split(/\r?\n/);

        buffer = lines.pop() || "";

        for (const line of lines) {
            const message = line.trim();

            if (!message) {
                continue;
            }

            try {
                parseSBS(message);
            } catch (error) {
                console.error("SBS parse error:", error.message);
            }
        }
    });

    socket.on("error", (error) => {
        console.error("ADS-B TCP error:", error.message);
    });

    socket.on("close", () => {
        console.log("ADSBHub connection closed.");
        connectedAt = null;

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
    return {
        connected: Boolean(socket && !socket.destroyed && connectedAt),
        connectedAt,
        lastMessageAt,
        aircraftCount: aircraft.size
    };
}

module.exports = { getLiveAircraft, getConnectionStatus };
