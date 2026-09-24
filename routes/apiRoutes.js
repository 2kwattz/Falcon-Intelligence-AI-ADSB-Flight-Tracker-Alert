const express = require("express"); // NodeJs Framework
const axios = require("axios");
const router = express.Router(); // Express Router
const { getLiveAircraft, getConnectionStatus } = require("../feedPartners/adsbHubTcpConn");

const EARTH_RADIUS_NAUTICAL_MILES = 3440.065;
const MAX_RADIUS_NAUTICAL_MILES = 12000;
const DEFAULT_LIMIT = 250;
const MAX_LIMIT = 1000;
const AIRPLANES_LIVE_USER_AGENT = process.env.AIRPLANES_LIVE_USER_AGENT?.trim();

function parseFiniteNumber(value) {
    if (typeof value !== "string" || value.trim() === "") return null;

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function parseLimit(value) {
    if (value === undefined) return DEFAULT_LIMIT;
    if (typeof value !== "string" || !/^\d+$/.test(value)) return null;

    const parsed = Number(value);
    return parsed >= 1 && parsed <= MAX_LIMIT ? parsed : null;
}

function hasUsablePosition(aircraft) {
    return Number.isFinite(aircraft.latitude) &&
        Number.isFinite(aircraft.longitude) &&
        aircraft.latitude >= -90 && aircraft.latitude <= 90 &&
        aircraft.longitude >= -180 && aircraft.longitude <= 180;
}

function degreesToRadians(degrees) {
    return degrees * Math.PI / 180;
}

// Great-circle distance; correct across the date line and near poles.
function distanceInNauticalMiles(latitudeA, longitudeA, latitudeB, longitudeB) {
    const latitudeDelta = degreesToRadians(latitudeB - latitudeA);
    const longitudeDelta = degreesToRadians(longitudeB - longitudeA);
    const latitudeARadians = degreesToRadians(latitudeA);
    const latitudeBRadians = degreesToRadians(latitudeB);
    const haversine = Math.sin(latitudeDelta / 2) ** 2 +
        Math.cos(latitudeARadians) * Math.cos(latitudeBRadians) * Math.sin(longitudeDelta / 2) ** 2;

    return 2 * EARTH_RADIUS_NAUTICAL_MILES * Math.asin(Math.min(1, Math.sqrt(haversine)));
}

function toNearbyAircraft(aircraft, distanceNm) {
    return {
        hex: aircraft.hex,
        callsign: aircraft.callsign,
        altitude: aircraft.altitude,
        groundSpeed: aircraft.groundSpeed,
        heading: aircraft.heading,
        latitude: aircraft.latitude,
        longitude: aircraft.longitude,
        verticalRate: aircraft.verticalRate,
        squawk: aircraft.squawk,
        alert: aircraft.alert,
        emergency: aircraft.emergency,
        spi: aircraft.spi,
        isOnGround: aircraft.isOnGround,
        lastSeen: aircraft.lastSeen,
        distanceNm: Number(distanceNm.toFixed(2))
    };
}

/**
 * GET /api/aircraft/nearby?latitude=22.3072&longitude=73.1812&radiusNm=100
 */
router.get("/aircraft/nearby", (req, res) => {
    const latitude = parseFiniteNumber(req.query.latitude);
    const longitude = parseFiniteNumber(req.query.longitude);
    const radiusNm = parseFiniteNumber(req.query.radiusNm);
    const limit = parseLimit(req.query.limit);

    if (latitude === null || latitude < -90 || latitude > 90) {
        return res.status(400).json({ status: false, message: "latitude must be a number between -90 and 90." });
    }

    if (longitude === null || longitude < -180 || longitude > 180) {
        return res.status(400).json({ status: false, message: "longitude must be a number between -180 and 180." });
    }

    if (radiusNm === null || radiusNm <= 0 || radiusNm > MAX_RADIUS_NAUTICAL_MILES) {
        return res.status(400).json({ status: false, message: `radiusNm must be greater than 0 and no more than ${MAX_RADIUS_NAUTICAL_MILES}.` });
    }

    if (limit === null) {
        return res.status(400).json({ status: false, message: `limit must be a whole number between 1 and ${MAX_LIMIT}.` });
    }

    const nearbyAircraft = getLiveAircraft()
        .filter(hasUsablePosition)
        .map((aircraft) => ({
            aircraft,
            distanceNm: distanceInNauticalMiles(latitude, longitude, aircraft.latitude, aircraft.longitude)
        }))
        .filter(({ distanceNm }) => distanceNm <= radiusNm)
        .sort((a, b) => a.distanceNm - b.distanceNm || b.aircraft.lastSeen - a.aircraft.lastSeen);

    const visibleAircraft = nearbyAircraft
        .slice(0, limit)
        .map(({ aircraft, distanceNm }) => toNearbyAircraft(aircraft, distanceNm));

    res.set("Cache-Control", "no-store");
    return res.json({
        status: true,
        source: "adsbhub-tcp",
        updatedAt: new Date().toISOString(),
        query: { latitude, longitude, radiusNm, limit },
        connection: getConnectionStatus(),
        aircraft: visibleAircraft,
        totalInRadius: nearbyAircraft.length,
        truncated: nearbyAircraft.length > visibleAircraft.length
    });
});

const CALLSIGN_PATTERN = /^[A-Z0-9]{2,12}$/;
const AIRCRAFT_SEARCH_SOURCES = [
    { name: "adsb.lol", url: (callsign) => "https://api.adsb.lol/v2/callsign/" + encodeURIComponent(callsign) },
    { name: "airplanes.live", url: (callsign) => "https://api.airplanes.live/v2/callsign/" + encodeURIComponent(callsign) }
];

function normalizeCallsign(value) {
    if (typeof value !== "string") return null;

    const callsign = value.trim().toUpperCase();
    return CALLSIGN_PATTERN.test(callsign) ? callsign : null;
}

function getProviderAircraft(payload) {
    if (Array.isArray(payload?.ac)) return payload.ac;
    if (Array.isArray(payload?.aircraft)) return payload.aircraft;
    if (Array.isArray(payload?.aircrafts)) return payload.aircrafts;
    return [];
}

function isPresent(value) {
    return value !== undefined && value !== null && value !== "";
}

function aircraftIdentity(aircraft) {
    const hex = String(aircraft.hex || aircraft.icao || aircraft.icao24 || "").trim().toUpperCase();
    if (hex) return "hex:" + hex;

    const callsign = String(aircraft.flight || aircraft.callsign || "").trim().toUpperCase();
    const registration = String(aircraft.r || aircraft.registration || "").trim().toUpperCase();
    const latitude = aircraft.lat ?? aircraft.latitude ?? "";
    const longitude = aircraft.lon ?? aircraft.longitude ?? "";
    return "fallback:" + callsign + ":" + registration + ":" + latitude + ":" + longitude;
}

function mergeAircraft(existing, incoming, sourceName) {
    for (const [key, value] of Object.entries(incoming)) {
        if (!isPresent(existing[key]) && isPresent(value)) {
            existing[key] = value;
        }
    }

    if (!existing.sources.includes(sourceName)) {
        existing.sources.push(sourceName);
    }
}

function providerError(error, providerName) {
    if (error.response?.status === 403 && providerName === "airplanes.live") {
        return "Access blocked by Airplanes.live; request approval for this server IP.";
    }
    if (error.response?.status) return "HTTP " + error.response.status;
    if (error.code === "ECONNABORTED") return "Request timed out";
    return "Provider unavailable";
}

/**
 * GET /api/aircraft/search?callsign=AIC101
 *
 * Queries ADSB.lol and Airplanes.live in parallel. Aircraft are deduplicated
 * by ICAO hex (with a position fallback when an upstream record has no hex).
 */
router.get("/aircraft/search", async (req, res) => {
    const callsign = normalizeCallsign(req.query.callsign);

    if (!callsign) {
        return res.status(400).json({
            status: false,
            message: "callsign must contain 2 to 12 letters or numbers."
        });
    }

    const providerResults = await Promise.all(AIRCRAFT_SEARCH_SOURCES.map(async (provider) => {
        try {
            const headers = { Accept: "application/json" };
            if (provider.name === "airplanes.live" && AIRPLANES_LIVE_USER_AGENT) {
                headers["User-Agent"] = AIRPLANES_LIVE_USER_AGENT;
            }
            const response = await axios.get(provider.url(callsign), {
                timeout: 8000,
                headers
            });
            return {
                name: provider.name,
                ok: true,
                aircraft: getProviderAircraft(response.data)
            };
        } catch (error) {
            return { name: provider.name, ok: false, aircraft: [], error: providerError(error, provider.name) };
        }
    }));

    const availableProviders = providerResults.filter((provider) => provider.ok);
    if (!availableProviders.length) {
        return res.status(502).json({
            status: false,
            message: "Aircraft search providers are currently unavailable.",
            callsign,
            sources: providerResults.map(({ name, ok, error }) => ({ name, ok, error }))
        });
    }

    const aircraftByIdentity = new Map();
    for (const provider of availableProviders) {
        provider.aircraft.forEach((aircraft) => {
            if (!aircraft || typeof aircraft !== "object") return;

            const identity = aircraftIdentity(aircraft);
            const existing = aircraftByIdentity.get(identity);
            if (existing) {
                mergeAircraft(existing, aircraft, provider.name);
                return;
            }

            aircraftByIdentity.set(identity, { ...aircraft, sources: [provider.name] });
        });
    }

    const aircraft = [...aircraftByIdentity.values()];
    res.set("Cache-Control", "no-store");
    return res.json({
        status: true,
        callsign,
        updatedAt: new Date().toISOString(),
        count: aircraft.length,
        aircraft,
        sources: providerResults.map(({ name, ok, error, aircraft: records }) => ({
            name,
            ok,
            count: records.length,
            ...(error ? { error } : {})
        }))
    });
});

module.exports = router;
