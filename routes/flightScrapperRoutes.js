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

Object.values(iafData.allAircraft).forEach(aircraftList => {
    aircraftList.forEach(aircraft => {
        if (aircraft.HexCode) {
            iafHexSet.add(aircraft.HexCode.toLowerCase());
        }
    });
});

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


async function cacheAircraft(redis, aircraft) {
    const icao = normalizeHexCode(aircraft?.Icao);

    if (!icao) return;

    const result = await redis.set(
        `aircraft:${icao}`,
        JSON.stringify({
            ...aircraft,
            updatedAt: new Date().toISOString()
        }),
        "EX",
        30 * 60, // 30 minutes
        "NX"
    );

    if (result === "OK") {
        console.log(`[REDIS] STORED ${icao} (${aircraft.Reg || "Unknown"})`);
    } else {
        console.log(`[REDIS] SKIPPED ${icao} (${aircraft.Reg || "Unknown"}) - already cached`);
    }
}

const VoiceResponse = twilio.twiml.VoiceResponse;

const ADSB_TRACKING_INTERVAL_MS = 1000;
let isTrackingPollRunning = false;

const normalizeHexCode = (hexCode) => {
    return typeof hexCode === "string" ? hexCode.trim().toUpperCase() : null;
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


const getCityAircrafts = async (latitude, longitude, radius = 250) => {

    try {

        let ADSB_LOL_URL = `https://api.adsb.lol/v2/lat/${latitude}/lon/${longitude}/dist/${radius}`;

        console.log("sending req")

        await sleep(10000)

        const response = await axios.get(ADSB_LOL_URL);

        console.log("Response.data from ADSB Lol ", response.data);

        return response.data
    }
    catch (error) {
        console.log("Error in scrapping data ", error)
    }

}

router.get("/ac", async function (req, res) {
    try {

        let fullResponse = {};


        for (const [city, coords] of Object.entries(cityCoordinates)) {
            const response = await getCityAircrafts(coords.lat, coords.lon);



            fullResponse[city] = response;

        }

        return res.status(200).json({
            status: true,
            aircraftData: fullResponse
        })


    }
    catch (error) {

        res.json({
            status: false,
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