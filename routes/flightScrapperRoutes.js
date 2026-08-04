const express = require("express"); // NodeJs Framework
const router = express.Router(); // Express Router
const redisClient = require("../redis/redisClient"); // Caching
const authMiddleware = require("../middlewares/authMiddleware"); // Auth Middleware
const axios = require("axios"); // HTTP Request Maker
const { ADSB_FLIGHT_JSON_URL } = require("../utils/globals")
const iafData = require("../iafData");
const flightAlertTemplate = require("../templates/flightAlertTemplate")
const sendEmail = require("../services/sendEmail"); // Email Service
const nodemailer = require("nodemailer")

const twilio = require("twilio");



const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

// Build this once when your app starts
const iafHexSet = new Set();
const iafAircraftByHexCode = new Map();

Object.values(iafData.allAircraft).forEach(aircraftList => {
    aircraftList.forEach(aircraft => {
        if (aircraft.HexCode) {
            const hexCode = String(aircraft.HexCode).trim();
            iafHexSet.add(hexCode.toLowerCase());
            iafAircraftByHexCode.set(hexCode.toUpperCase(), aircraft);
        }
    });
});

const SCRAPPER_SLEEP_MS = 10000;
const SCRAPPER_STATUS_TIME_ZONE = process.env.SCRAPPER_STATUS_TIME_ZONE || "Asia/Kolkata";
const SCRAPPER_STATUS_TIME_ZONE_LABEL = "IST";

const scrapperState = {
    mode: "idle",
    isSleeping: false,
    isTracking: false,
    currentCity: null,
    currentUrl: null,
    lastStartedAt: null,
    lastCompletedAt: null,
    lastError: null,
    nextWakeAt: null,
    requestCount: 0,
    updatedAt: new Date().toISOString()
};

function setScrapperState(updates) {
    Object.assign(scrapperState, updates, {
        updatedAt: new Date().toISOString()
    });
}

function formatStatusTime(value) {
    if (!value) {
        return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat("en-IN", {
        timeZone: SCRAPPER_STATUS_TIME_ZONE,
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
    }).format(date) + ` ${SCRAPPER_STATUS_TIME_ZONE_LABEL}`;
}

function getScrapperStatus() {
    const formattedTimes = {
        lastStartedAt: formatStatusTime(scrapperState.lastStartedAt),
        lastCompletedAt: formatStatusTime(scrapperState.lastCompletedAt),
        nextWakeAt: formatStatusTime(scrapperState.nextWakeAt),
        updatedAt: formatStatusTime(scrapperState.updatedAt)
    };

    return {
        status: true,
        scrapper: {
            ...scrapperState,
            timeZone: SCRAPPER_STATUS_TIME_ZONE,
            timeZoneLabel: SCRAPPER_STATUS_TIME_ZONE_LABEL,
            formattedTimes,
            lastStartedAtFormatted: formattedTimes.lastStartedAt,
            lastCompletedAtFormatted: formattedTimes.lastCompletedAt,
            nextWakeAtFormatted: formattedTimes.nextWakeAt,
            updatedAtFormatted: formattedTimes.updatedAt
        }
    };
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const numbersToCall = [
    process.env.ROSHAN_BHAI_PHONE,
    // process.env.RISHI_BHAI_PHONE,
    // process.env.ANMOL_BHAI_PHONE,
    process.env.ISHAN_BHAI_PHONE,
];

const ALERT_EXPIRY_SECONDS = 20 * 60;

// Nodemailer Transporter

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.GMAIL_SMTP,
        pass: process.env.GMAIL_SMTP_PASSWORD
    }
})

async function shouldTriggerCall(hexCode, phoneNumber) {
    const key = `flight-alert:call:${hexCode}:${phoneNumber}`;

    const result = await redisClient.set(
        key,
        Date.now(),
        "EX",
        ALERT_EXPIRY_SECONDS,
        "NX"
    );

    return result === "OK";
}

async function shouldTriggerEmail(hexCode, email) {
    const key = `flight-alert:email:${hexCode}:${email}`;

    const result = await redisClient.set(
        key,
        Date.now(),
        "EX",
        ALERT_EXPIRY_SECONDS,
        "NX"
    );

    return result === "OK";
}


// async function cacheAircraft(redis, aircraft) {
//     const icao = normalizeHexCode(aircraft?.Icao);

//     if (!icao) return;

//     const result = await redis.set(
//         `aircraft:${icao}`,
//         JSON.stringify({
//             ...aircraft,
//             updatedAt: new Date().toISOString()
//         }),
//         "EX",
//         30 * 60, // 30 minutes
//         "NX"
//     );

//     if (result === "OK") {
//         console.log(`[REDIS] STORED ${icao} (${aircraft.Reg || "Unknown"})`);
//     } else {
//         console.log(`[REDIS] SKIPPED ${icao} (${aircraft.Reg || "Unknown"}) - already cached`);
//     }
// }


async function cacheAircraft(redis, aircraft) {
    const icao = normalizeHexCode(aircraft?.hex);

    if (!icao) return;

    const result = await redis.set(
        `aircraft:${icao}`,
        JSON.stringify({
            ...aircraft,
            updatedAt: new Date().toISOString()
        }),
        "EX",
        30 * 60
    );

    if (result === "OK") {
        console.log(`[REDIS] STORED ${icao} (${aircraft.r || "Unknown"})`);
    } else {
        console.log(`[REDIS] UPDATED ${icao}`);
    }
}

const VoiceResponse = twilio.twiml.VoiceResponse;

const ADSB_TRACKING_INTERVAL_MS = 1000;
let isTrackingPollRunning = false;

const normalizeHexCode = (hexCode) => {
    return typeof hexCode === "string" ? hexCode.trim().toUpperCase() : null;
}

function enrichWithIafAircraftData(aircraft) {
    const icao = normalizeHexCode(aircraft?.hex || aircraft?.Icao || aircraft?.HexCode);
    const iafAircraft = iafAircraftByHexCode.get(icao);

    if (!icao || !iafAircraft) {
        return aircraft;
    }

    return {
        ...iafAircraft,
        ...aircraft,
        hex: aircraft?.hex || iafAircraft.HexCode,
        HexCode: iafAircraft.HexCode || aircraft?.hex,
        r: aircraft?.r || iafAircraft.Registration,
        registration: aircraft?.registration || aircraft?.r || iafAircraft.Registration,
        t: aircraft?.t || iafAircraft.TypeCode || iafAircraft.AircraftType,
        aircraftType: aircraft?.aircraftType || aircraft?.t || iafAircraft.AircraftType,
        type: aircraft?.type || aircraft?.t || iafAircraft.TypeCode,
        operator: aircraft?.operator || aircraft?.Op || iafAircraft.AircraftOperator,
    };
}

function enrichScrapperResponse(response) {
    if (!Array.isArray(response?.ac)) {
        return response;
    }

    return {
        ...response,
        ac: response.ac.map(enrichWithIafAircraftData)
    };
}

const cityCoordinates = {
    Vadodara: {
        lat: 22.29941,
        lon: 73.20812
    },
    Bengaluru: {
        lat: 12.97160,
        lon: 77.59456
    },
    // Chandigarh: {
    //     lat: 30.73331,
    //     lon: 76.77942
    // },
    // Hyderabad: {
    //     lat: 17.38504,
    //     lon: 78.48667
    // }
};


const getCityAircrafts = async (city, latitude, longitude, radius = 250) => {

    try {

        let ADSB_LOL_URL = `https://api.adsb.lol/v2/lat/${latitude}/lon/${longitude}/dist/${radius}`;

        console.log("sending req")

        setScrapperState({
            mode: "sleeping",
            isSleeping: true,
            isTracking: false,
            currentCity: city,
            currentUrl: ADSB_LOL_URL,
            nextWakeAt: new Date(Date.now() + SCRAPPER_SLEEP_MS).toISOString()
        });

        await sleep(SCRAPPER_SLEEP_MS)

        setScrapperState({
            mode: "tracking",
            isSleeping: false,
            isTracking: true,
            currentCity: city,
            currentUrl: ADSB_LOL_URL,
            nextWakeAt: null
        });

        const response = await axios.get(ADSB_LOL_URL);

        console.log("Response.data from ADSB Lol ", response.data);

        return response.data
    }
    catch (error) {
        setScrapperState({
            mode: "error",
            isSleeping: false,
            isTracking: false,
            lastError: error?.message || "Error in scrapping data",
            nextWakeAt: null
        });

        console.log("Error in scrapping data ", error)
    }

}

router.get("/status", function (req, res) {
    return res.status(200).json(getScrapperStatus());
});

router.get("/ac", async function (req, res) {
    try {

        let fullResponse = {};

        setScrapperState({
            mode: "tracking",
            isSleeping: false,
            isTracking: true,
            lastStartedAt: new Date().toISOString(),
            lastError: null,
            requestCount: scrapperState.requestCount + 1
        });

        for (const [city, coords] of Object.entries(cityCoordinates)) {
            const response = await getCityAircrafts(city, coords.lat, coords.lon);



            fullResponse[city] = enrichScrapperResponse(response);

        }

        setScrapperState({
            mode: "idle",
            isSleeping: false,
            isTracking: false,
            currentCity: null,
            currentUrl: null,
            lastCompletedAt: new Date().toISOString(),
            nextWakeAt: null
        });

        return res.status(200).json({
            status: true,
            scrapper: getScrapperStatus().scrapper,
            aircraftData: fullResponse
        })


    }
    catch (error) {
        setScrapperState({
            mode: "error",
            isSleeping: false,
            isTracking: false,
            lastCompletedAt: new Date().toISOString(),
            lastError: error?.message || "Error in extAdsbData route",
            nextWakeAt: null
        });

        res.json({
            status: false,
            scrapper: getScrapperStatus().scrapper,
            message: error?.data || "Error in extAdsbData route"
        })
    }
});

router.get("/getac", async function (req, res) {
    try {

        const FETCH_ADSB = `http://localhost:3001/scrapper/ac`;
        const response = await axios.get(FETCH_ADSB);

        console.log("AC DATA FROM INTERNAL API CALL");

        return res.json({
            status: true,
            data: response
        });


    }
    catch (error) {
        res.json({
            status: false,
            message: error?.data
        })
    }
})


module.exports = router;
