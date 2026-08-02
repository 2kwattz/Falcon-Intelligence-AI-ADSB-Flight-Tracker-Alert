const express = require("express");
const { getTrackedAircrafts } = require("../redis/trackedAircraftCache");

const router = express.Router();

const getAircraftTypeCounts = (aircraftData) => aircraftData.reduce((typeCounts, aircraft) => {
    const typeCode = aircraft.typeCode
        || aircraft.t?.trim()?.toUpperCase()
        || "UNKNOWN";

    typeCounts[typeCode] = (typeCounts[typeCode] || 0) + 1;
    return typeCounts;
}, {});

router.get("/trackedaircrafts", async (req, res) => {
    try {
        const aircraftData = await getTrackedAircrafts();

        return res.status(200).json({
            status: true,
            count: aircraftData.length,
            aircraftTypeCounts: getAircraftTypeCounts(aircraftData),
            aircraftData
        });
    } catch (error) {
        console.error("[*] Failed to read tracked aircraft cache:", error.message);

        return res.status(500).json({
            status: false,
            message: "Unable to retrieve tracked aircraft data"
        });
    }
});

module.exports = router;
