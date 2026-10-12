const express = require("express");
const path = require("path");
const axios = require("axios");
const { getTrackedAircrafts } = require("../redis/trackedAircraftCache");

const router = express.Router();
const HEXDB_AIRCRAFT_URL = "https://hexdb.io/api/v1/aircraft";
const ICAO_HEX_PATTERN = /^[0-9A-F]{6}$/i;
const AIRCRAFT_LOOKUP_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_AIRCRAFT_LOOKUP_CACHE_ENTRIES = 500;
const aircraftLookupCache = new Map();

// The dashboard is deliberately served from the same origin as the API so it
// works in deployments without needing a separate frontend host or CORS setup.
router.get("/tracked-aircrafts", (req, res) => {
    return res.sendFile(path.join(__dirname, "../public/tracked-aircrafts.html"));
});

const getAircraftTypeCounts = (aircraftData) => aircraftData.reduce((typeCounts, aircraft) => {
    const typeCode = aircraft.typeCode
        || aircraft.t?.trim()?.toUpperCase()
        || "UNKNOWN";

    typeCounts[typeCode] = (typeCounts[typeCode] || 0) + 1;
    return typeCounts;
}, {});

const addAircraftTypeCounts = (aircraftData, aircraftTypeCounts) => aircraftData.map((aircraft) => {
    const typeCode = aircraft.typeCode
        || aircraft.t?.trim()?.toUpperCase()
        || "UNKNOWN";

    return {
        ...aircraft,
        typeCode,
        aircraftTypeCount: aircraftTypeCounts[typeCode]
    };
});

router.get("/trackedaircrafts", async (req, res) => {
    try {
        const aircraftData = await getTrackedAircrafts();
        const aircraftTypeCounts = getAircraftTypeCounts(aircraftData);
        const classifiedAircraftData = addAircraftTypeCounts(aircraftData, aircraftTypeCounts);

        return res.status(200).json({
            status: true,
            count: classifiedAircraftData.length,
            aircraftTypeCounts,
            aircraftData: classifiedAircraftData
        });
    } catch (error) {
        console.error("[*] Failed to read tracked aircraft cache:", error.message);

        return res.status(500).json({
            status: false,
            message: "Unable to retrieve tracked aircraft data"
        });
    }
});

function getCachedAircraftLookup(hex) {
    const cached = aircraftLookupCache.get(hex);

    if (!cached) {
        return null;
    }

    if (cached.expiresAt <= Date.now()) {
        aircraftLookupCache.delete(hex);
        return null;
    }

    return cached.aircraft;
}

function cacheAircraftLookup(hex, aircraft) {
    if (aircraftLookupCache.size >= MAX_AIRCRAFT_LOOKUP_CACHE_ENTRIES) {
        const oldestHex = aircraftLookupCache.keys().next().value;
        aircraftLookupCache.delete(oldestHex);
    }

    aircraftLookupCache.set(hex, {
        aircraft,
        expiresAt: Date.now() + AIRCRAFT_LOOKUP_CACHE_TTL_MS
    });
}

function normalizeAircraftLookup(hex, aircraft) {
    return {
        hex: aircraft.ModeS || hex,
        registration: aircraft.Registration || null,
        typeCode: aircraft.ICAOTypeCode || null,
        model: aircraft.Type || null,
        manufacturer: aircraft.Manufacturer || null,
        operatorCode: aircraft.OperatorFlagCode || null,
        registeredOwner: aircraft.RegisteredOwners || null,
        source: "HexDB"
    };
}

// Resolve missing archive fields from HexDB's public ICAO/Mode-S registry.
// Keeping the request server-side avoids CORS issues and lets us protect the
// public service from repeated clicks with a short-lived, bounded cache.
router.get("/aircraft-lookup/:hex", async (req, res) => {
    const hex = String(req.params.hex || "").trim().toUpperCase();

    if (!ICAO_HEX_PATTERN.test(hex)) {
        return res.status(400).json({
            status: false,
            message: "Enter a six-character ICAO/Mode-S hex code."
        });
    }

    const cachedAircraft = getCachedAircraftLookup(hex);

    if (cachedAircraft) {
        return res.status(200).json({
            status: true,
            cached: true,
            aircraft: cachedAircraft
        });
    }

    try {
        const response = await axios.get(`${HEXDB_AIRCRAFT_URL}/${hex}`, {
            timeout: 5000,
            validateStatus: () => true
        });

        if (response.status === 404 || response.data?.status === "404") {
            return res.status(404).json({
                status: false,
                message: `No registry record was found for ${hex}.`
            });
        }

        if (response.status < 200 || response.status >= 300 || !response.data) {
            console.warn(`[*] Aircraft lookup returned ${response.status} for ${hex}`);
            return res.status(502).json({
                status: false,
                message: "The aircraft lookup service is temporarily unavailable."
            });
        }

        const aircraft = normalizeAircraftLookup(hex, response.data);
        cacheAircraftLookup(hex, aircraft);

        return res.status(200).json({
            status: true,
            cached: false,
            aircraft
        });
    } catch (error) {
        console.error(`[*] Aircraft lookup failed for ${hex}:`, error.message);
        return res.status(502).json({
            status: false,
            message: "The aircraft lookup service is temporarily unavailable."
        });
    }
});

module.exports = router;
