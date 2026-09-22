const express = require("express");
const path = require("path");
const { getLiveAircraft, getConnectionStatus } = require("../feedPartners/adsbHubTcpConn");

const router = express.Router();

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
        lastSeen: aircraft.lastSeen
    };
}

// This route intentionally reads only from the ADSBHub TCP receiver.  It is
// not coupled to the archive, alert, or VirtualRadar polling pipelines.
router.get("/aircrafts", (req, res) => {
    const bounds = parseBounds(req.query.bbox);
    const requestedLimit = Number.parseInt(req.query.limit, 10);
    // A hard ceiling keeps a busy feed from overwhelming the browser.
    const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 350) : 250;
    const aircraft = getLiveAircraft()
        .filter(hasUsablePosition)
        .filter((item) => isInsideBounds(item, bounds))
        .sort((a, b) => b.lastSeen - a.lastSeen);
    const visibleAircraft = aircraft.slice(0, limit).map(toMapAircraft);

    res.set("Cache-Control", "no-store");
    res.json({
        status: true,
        source: "adsbhub-tcp",
        updatedAt: new Date().toISOString(),
        connection: getConnectionStatus(),
        aircraft: visibleAircraft,
        totalInView: aircraft.length,
        truncated: aircraft.length > visibleAircraft.length
    });
});

router.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/live-map.html"));
});

module.exports = router;
