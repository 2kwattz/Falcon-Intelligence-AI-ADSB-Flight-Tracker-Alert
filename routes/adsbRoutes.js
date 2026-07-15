const express = require("express"); // NodeJs Framework
const router = express.Router(); // Express Router
const redisClient = require("../redis/redisClient"); // Caching
const authMiddleware = require("../middlewares/authMiddleware"); // Auth Middleware
const axios = require("axios"); // HTTP Request Maker
const { ADSB_FLIGHT_JSON_URL } = require("../utils/globals")
const iafData = require("../iafData");

const ADSB_TRACKING_INTERVAL_MS = 1000;
let isTrackingPollRunning = false;

const normalizeHexCode = (hexCode) => {
    return typeof hexCode === "string" ? hexCode.trim().toUpperCase() : null;
}

const buildIafAircraftHexLookup = () => {
    const lookup = new Map();
    const aircraftGroups = iafData?.allAircraft || {};

    Object.values(aircraftGroups).flat().forEach((aircraft) => {
        const hexCode = normalizeHexCode(aircraft?.HexCode);

        if (!hexCode) {
            return;
        }

        const existingAircraft = lookup.get(hexCode) || [];
        existingAircraft.push(aircraft);
        lookup.set(hexCode, existingAircraft);
    });

    return lookup;
}

const iafAircraftByHexCode = buildIafAircraftHexLookup();

const logIafAircraftMatches = (adsbAircrafts = []) => {
    if (!Array.isArray(adsbAircrafts)) {
        return [];
    }

    const matches = [];

    adsbAircrafts.forEach((adsbAircraft) => {
        const icao = normalizeHexCode(adsbAircraft?.Icao);

        if (!icao || !iafAircraftByHexCode.has(icao)) {
            return;
        }

        const matchedAircrafts = iafAircraftByHexCode.get(icao);

        matchedAircrafts.forEach((iafAircraft) => {
            const match = {
                hexCode: icao,
                registration: iafAircraft.Registration,
                aircraftType: iafAircraft.AircraftType,
                operator: iafAircraft.AircraftOperator,
                altitude: adsbAircraft.Alt,
                speed: adsbAircraft.Spd,
                track: adsbAircraft.Trak,
                squawk: adsbAircraft.Sqk
            };

            matches.push(match);
            console.log("[*] Tracked aircraft from iafData detected in ADS-B feed:", match);
        });
    });

    if (matches.length === 0) {
        console.log("[*] No preselected aircraft in Vadodara airspace");
    }

    return matches;
}

const fetchAircrafts = async () =>{

    const response = await axios.get(ADSB_FLIGHT_JSON_URL);

    // Fetching ADSB Aircraft Data from RTL SDR 
      const aircrafts = response.data?.acList;

      if (Array.isArray(aircrafts)) {
        logIafAircraftMatches(aircrafts);
      }

      return aircrafts;
} 

const startAdsbTracking = () => {
    console.log(`[*] ADS-B aircraft tracking started. Polling every ${ADSB_TRACKING_INTERVAL_MS / 1000}s`);

    setInterval(async () => {
        if (isTrackingPollRunning) {
            return;
        }

        isTrackingPollRunning = true;

        try {
            await fetchAircrafts();
        }
        catch (error) {
            console.error("[*] ADS-B tracking poll failed:", error.message || error);
        }
        finally {
            isTrackingPollRunning = false;
        }
    }, ADSB_TRACKING_INTERVAL_MS);
}

startAdsbTracking();

// Aircraft ADSB Data for HTTP Polling
router.get("/aircrafts", authMiddleware, async function (req,res) {
    try{
        console.log("[*] ADSB Aircrafts JSON Route Hit");
        const adsbAircraftsJson = await fetchAircrafts();
        
        if(adsbAircraftsJson){
            console.log("[*] Adsb Aircrafts Json available");

            return res.json({
                status:true,
                aircraftData:adsbAircraftsJson
            })
        }
        else{
            console.log("[*] Adsb Aircrafts data not found ",adsbAircraftsJson);

            return res.json({
                status:false,
                message:"Unable to fetch aircrafts data"
            })
        }
    }
    catch(error){

    return res.json({
        status:false,
        message:"Internal Server Error"
    })
}
    
});

// Web Socket ADSB Data


module.exports = router;
