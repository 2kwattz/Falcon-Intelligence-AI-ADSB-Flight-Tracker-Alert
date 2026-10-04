const fs = require("node:fs/promises");
const axios = require("axios");
const { ADSB_FLIGHT_JSON_URL, READSB_AIRCRAFT_JSON_PATH } = require("../utils/globals");

const STATION_ID = "vadodara-station";
const STATION_NAME = "Vadodara Station";
let lastReadWarningAt = 0;

function toFiniteNumber(value) {
    const number = Number(value);

    return Number.isFinite(number) ? number : null;
}

function trimText(value) {
    return typeof value === "string" && value.trim() ? value.trim() : null;
}

function timestampFromSeen(payloadNowSeconds, seenSeconds) {
    const nowSeconds = toFiniteNumber(payloadNowSeconds);
    const seen = toFiniteNumber(seenSeconds);

    if (nowSeconds === null || seen === null) {
        return Date.now();
    }

    return Math.max(0, (nowSeconds - seen) * 1000);
}

function altitudeFromReadsb(value) {
    if (typeof value === "string" && value.toLowerCase() === "ground") {
        return 0;
    }

    return toFiniteNumber(value);
}

function normalizeReadsbAircraft(aircraft, payloadNowSeconds) {
    const lastSeen = timestampFromSeen(payloadNowSeconds, aircraft.seen);
    const positionSeen = aircraft.seen_pos === undefined
        ? lastSeen
        : timestampFromSeen(payloadNowSeconds, aircraft.seen_pos);

    return {
        hex: trimText(aircraft.hex)?.toUpperCase() || null,
        callsign: trimText(aircraft.flight) || trimText(aircraft.callsign),
        altitude: altitudeFromReadsb(aircraft.alt_baro ?? aircraft.alt_geom ?? aircraft.altitude),
        groundSpeed: toFiniteNumber(aircraft.gs ?? aircraft.groundSpeed),
        heading: toFiniteNumber(aircraft.track ?? aircraft.true_heading ?? aircraft.mag_heading ?? aircraft.heading),
        latitude: toFiniteNumber(aircraft.lat ?? aircraft.latitude),
        longitude: toFiniteNumber(aircraft.lon ?? aircraft.longitude),
        verticalRate: toFiniteNumber(aircraft.baro_rate ?? aircraft.geom_rate ?? aircraft.verticalRate),
        squawk: trimText(aircraft.squawk),
        alert: aircraft.alert ?? null,
        emergency: aircraft.emergency ?? null,
        spi: aircraft.spi ?? null,
        isOnGround: typeof aircraft.alt_baro === "string" && aircraft.alt_baro.toLowerCase() === "ground",
        lastSeen,
        positionSeen,
        source: STATION_ID,
        stationName: STATION_NAME
    };
}

async function readAircraftPayload() {
    if (READSB_AIRCRAFT_JSON_PATH) {
        try {
            return JSON.parse(await fs.readFile(READSB_AIRCRAFT_JSON_PATH, "utf8"));
        } catch (error) {
            const now = Date.now();

            if (now - lastReadWarningAt > 60 * 1000) {
                lastReadWarningAt = now;
                console.warn(`[*] Could not read ${READSB_AIRCRAFT_JSON_PATH}; falling back to HTTP SDR feed:`, error.message);
            }
        }
    }

    const response = await axios.get(ADSB_FLIGHT_JSON_URL, { timeout: 2500 });

    return response.data;
}

async function getLocalSdrAircraft() {
    const payload = await readAircraftPayload();
    const rawAircraft = Array.isArray(payload?.aircraft) ? payload.aircraft : [];
    const aircraft = rawAircraft
        .map((item) => normalizeReadsbAircraft(item, payload?.now))
        .filter((item) => item.hex);
    const lastMessageAt = aircraft.reduce((latest, item) => Math.max(latest, item.lastSeen || 0), null);

    return {
        aircraft,
        connection: {
            connected: true,
            connectedAt: null,
            lastMessageAt,
            aircraftCount: aircraft.length,
            stationName: STATION_NAME,
            source: STATION_ID
        }
    };
}

module.exports = {
    STATION_ID,
    STATION_NAME,
    getLocalSdrAircraft
};
