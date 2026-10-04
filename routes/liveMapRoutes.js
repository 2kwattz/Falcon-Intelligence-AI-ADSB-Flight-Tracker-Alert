const express = require("express");
const path = require("path");
const { getLiveAircraft, getConnectionStatus } = require("../feedPartners/adsbHubTcpConn");
const { STATION_ID, STATION_NAME, getLocalSdrAircraft } = require("../services/localSdrAircraftFeed");

const router = express.Router();

const ADSBHUB_SOURCE_ID = "adsbhub-tcp";
const ADSBHUB_SOURCE_NAME = "ADSBHub TCP";

function hasUsablePosition(aircraft) {
    return Number.isFinite(aircraft.latitude) &&
        Number.isFinite(aircraft.longitude) &&
        aircraft.latitude >= -90 && aircraft.latitude <= 90 &&
        aircraft.longitude >= -180 && aircraft.longitude <= 180;
}

function parseBounds(value) {
    if (typeof value !== "string") return null;

    const values = value.split(",").map(Number);
    const [west, south, east, north] = values;

    if (values.length !== 4 || values.some((number) => !Number.isFinite(number))) return null;
    if (west < -180 || east > 180 || south < -90 || north > 90 || west >= east || south >= north) return null;

    return { west, south, east, north };
}

function isInsideBounds(aircraft, bounds) {
    return !bounds || (
        aircraft.longitude >= bounds.west && aircraft.longitude <= bounds.east &&
        aircraft.latitude >= bounds.south && aircraft.latitude <= bounds.north
    );
}

function toMapAircraft(aircraft) {
    return {
        hex: aircraft.hex,
        callsign: aircraft.callsign,
        altitude: aircraft.altitude,
        groundSpeed: aircraft.groundSpeed,
        heading: aircraft.heading,
        latitude: aircraft.latitude,
        longitude: aircraft.longitude,
        verticalRate: aircraft.verticalRate,
        isOnGround: aircraft.isOnGround,
        lastSeen: aircraft.lastSeen,
        positionSeen: aircraft.positionSeen,
        source: aircraft.source,
        stationName: aircraft.stationName
    };
}

function resolveFeedSource(value) {
    const source = typeof value === "string" ? value.trim().toLowerCase() : "";

    if (source === STATION_ID || source === "vadodara" || source === "local-sdr" || source === "sdr") {
        return STATION_ID;
    }

    return ADSBHUB_SOURCE_ID;
}

async function getAircraftForSource(source) {
    if (source === STATION_ID) {
        return {
            feed: {
                id: STATION_ID,
                label: STATION_NAME
            },
            ...(await getLocalSdrAircraft())
        };
    }

    return {
        feed: {
            id: ADSBHUB_SOURCE_ID,
            label: ADSBHUB_SOURCE_NAME
        },
        aircraft: getLiveAircraft().map((aircraft) => ({
            ...aircraft,
            source: ADSBHUB_SOURCE_ID,
            stationName: ADSBHUB_SOURCE_NAME
        })),
        connection: {
            ...getConnectionStatus(),
            source: ADSBHUB_SOURCE_ID,
            stationName: ADSBHUB_SOURCE_NAME
        }
    };
}

// This route keeps the map feed selectable without coupling the browser to the
// archive, alert, or polling pipelines.
router.get("/aircrafts", async (req, res) => {
    const bounds = parseBounds(req.query.bbox);
    const requestedLimit = Number.parseInt(req.query.limit, 10);
    const requestedNoPositionLimit = Number.parseInt(req.query.noPositionLimit, 10);
    const source = resolveFeedSource(req.query.source);
    // A hard ceiling keeps a busy feed from overwhelming the browser.
    const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 350) : 250;
    const noPositionLimit = Number.isInteger(requestedNoPositionLimit) ? Math.min(Math.max(requestedNoPositionLimit, 1), 350) : 120;
    let sourcePayload;

    try {
        sourcePayload = await getAircraftForSource(source);
    } catch (error) {
        console.error("[*] Live-map feed unavailable:", error.message || error);
        res.set("Cache-Control", "no-store");
        return res.status(502).json({
            status: false,
            source,
            message: source === STATION_ID ? `${STATION_NAME} feed unavailable` : `${ADSBHUB_SOURCE_NAME} feed unavailable`
        });
    }

    const liveAircraft = sourcePayload.aircraft;
    const aircraft = liveAircraft
        .filter(hasUsablePosition)
        .filter((item) => isInsideBounds(item, bounds))
        .sort((a, b) => b.lastSeen - a.lastSeen);
    const noPositionAircraft = liveAircraft
        .filter((item) => !hasUsablePosition(item))
        .sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));
    const visibleAircraft = aircraft.slice(0, limit).map(toMapAircraft);
    const visibleNoPositionAircraft = noPositionAircraft.slice(0, noPositionLimit).map(toMapAircraft);

    res.set("Cache-Control", "no-store");
    res.json({
        status: true,
        source,
        feed: sourcePayload.feed,
        updatedAt: new Date().toISOString(),
        connection: sourcePayload.connection,
        aircraft: visibleAircraft,
        noPositionAircraft: visibleNoPositionAircraft,
        totalInView: aircraft.length,
        totalWithoutPosition: noPositionAircraft.length,
        truncated: aircraft.length > visibleAircraft.length,
        noPositionTruncated: noPositionAircraft.length > visibleNoPositionAircraft.length
    });
});

router.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/live-map.html"));
});

module.exports = router;
