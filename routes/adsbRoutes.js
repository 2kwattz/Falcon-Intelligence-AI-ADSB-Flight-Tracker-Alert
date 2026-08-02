const express = require("express"); // NodeJs Framework
const router = express.Router(); // Express Router
const redisClient = require("../redis/redisClient"); // Caching
const { cacheTrackedAircraft } = require("../redis/trackedAircraftCache");
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

const numbersToCall = [
    process.env.ROSHAN_BHAI_PHONE,
    process.env.RISHI_BHAI_PHONE,
    process.env.ANMOL_BHAI_PHONE,
    process.env.ISHAN_BHAI_PHONE,
];

const ALERT_EXPIRY_SECONDS = 20 * 60;

const AIRCRAFT_METADATA_WAIT_SECONDS = 10;

async function shouldWaitForAircraftMetadata(aircraft) {
    const icao = normalizeHexCode(aircraft?.hex);


    if (!icao) return false;

    // Already has all important fields
    if (aircraft.flight) {
        return false;
    }

    const key = `aircraft:firstseen:${icao}`;

    const firstSeen = await redisClient.get(key);

    // First time seeing this aircraft
    if (!firstSeen) {
        await redisClient.set(
            key,
            Date.now(),
            "EX",
            AIRCRAFT_METADATA_WAIT_SECONDS + 5
        );

        return true;
    }

    const elapsedSeconds =
        (Date.now() - Number(firstSeen)) / 1000;

    if (elapsedSeconds < AIRCRAFT_METADATA_WAIT_SECONDS) {
        return true;
    }

    // Wait time exceeded.
    // Send email even if metadata is incomplete.
    return false;
}


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
    const icao = normalizeHexCode(aircraft?.hex);

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
        console.log(`[REDIS] STORED ${icao} (${aircraft.flight || "Unknown"})`);
    } else {
        console.log(`[REDIS] SKIPPED ${icao} (${aircraft.flight || "Unknown"}) - already cached`);
    }
}

const VoiceResponse = twilio.twiml.VoiceResponse;

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
const logIafAircraftMatches = async (adsbAircrafts = []) => {
    if (!Array.isArray(adsbAircrafts)) {
        return [];
    }

    const matches = [];

    for (const adsbAircraft of adsbAircrafts) {
        const icao = normalizeHexCode(adsbAircraft?.hex);

        // ---

        // const waitForMetadata = await shouldWaitForAircraftMetadata(adsbAircraft);

        // if (waitForMetadata) {
        //     console.log(`[WAIT] ${icao} waiting for registration/type...`);
        //     continue;
        // }



        // const exists = await redisClient.exists(`aircraft:${icao}`);

        // if (!exists) {


        //     const match = {
        //         hexCode: adsbAircraft.Id,
        //         registration: adsbAircraft?.Reg,
        //         aircraftType: adsbAircraft?.Type,
        //         operator: adsbAircraft?.Op,
        //         callsign: adsbAircraft?.Call,
        //         altitude: adsbAircraft?.Alt,
        //         groundAltitude: adsbAircraft?.GAlt,
        //         speed: adsbAircraft?.Spd,
        //         track: adsbAircraft?.Trak,
        //         squawk: adsbAircraft?.Sqk,
        //         country: adsbAircraft?.Cou,
        //         type: adsbAircraft?.Type,
        //         manufacturer: adsbAircraft?.Man,
        //         latitude: adsbAircraft?.Lat,
        //         longitude: adsbAircraft?.Long,
        //         year: adsbAircraft?.Year,
        //         cMessages: adsbAircraft?.CMsgs,



        //     };

        //     const emailsToSend = [
        //         "roshan.bhatia.blueera@gmail.com",
        //         // "anmolv2472000@gmail.com",
        //         // "thehighroller46@gmail.com"
        //     ];




        //     for (const email of emailsToSend) {

        //         try {

        //             const key = `flight-alert:email:${icao}:${email}`;
        //             const shouldEmail = await shouldTriggerEmail(match.hexCode, email);

        //             if (shouldEmail) {

        //                 await transporter.sendMail({
        //                     from: `Falcon Intelligence`,
        //                     to: email,
        //                     subject: `Falcon Intelligence Flight Alert | ${match.registration} (${match.aircraftType}) within 100 km of Vadodara`,
        //                     html: flightAlertTemplate(match)
        //                 });
        //             }



        //         }
        //         catch (error) {
        //             console.log("Error in sending temp mail ", error)
        //         }

        //     }
        // }
        // ---

        try {
            await cacheTrackedAircraft(adsbAircraft);
        } catch (error) {
            // Do not interrupt flight alerts if the dedicated tracking cache is unavailable.
            console.error("[*] Failed to cache tracked aircraft:", error.message);
        }

        await cacheAircraft(redisClient, adsbAircraft);

        console.log("Cached Aircraft:", adsbAircraft);
        // const icao = normalizeHexCode(adsbAircraft?.Icao); VRS

        if (!icao || !iafAircraftByHexCode.has(icao)) {
            continue;
        }




        const matchedAircrafts = iafAircraftByHexCode.get(icao);

        for (const iafAircraft of matchedAircrafts) {


console.log(JSON.stringify(adsbAircraft, null, 2));
        const match = {
    hexCode: adsbAircraft.hex ?? iafAircraft.HexCode,

    registration:
        adsbAircraft.r ??
        iafAircraft.Registration,

    aircraftType:
        adsbAircraft.t ??
        iafAircraft.TypeCode,

    description:
        adsbAircraft.desc ??
        iafAircraft.AircraftType,

    operator:
        adsbAircraft.ownOp ??
        iafAircraft.AircraftOperator,

    callsign:
        adsbAircraft.flight?.trim(),

    altitude: adsbAircraft.alt_baro,
    gpsAltitude: adsbAircraft.alt_geom,

    groundSpeed: adsbAircraft.gs,
    ias: adsbAircraft.ias,
    tas: adsbAircraft.tas,
    mach: adsbAircraft.mach,

    windDirection: adsbAircraft.wd,
    windSpeed: adsbAircraft.ws,
    outsideAirTemp: adsbAircraft.oat,
    totalAirTemp: adsbAircraft.tat,

    track: adsbAircraft.track,
    trackRate: adsbAircraft.track_rate,
    roll: adsbAircraft.roll,

    magneticHeading: adsbAircraft.mag_heading,
    trueHeading: adsbAircraft.true_heading,

    verticalSpeed: adsbAircraft.baro_rate,
    geometricVerticalSpeed: adsbAircraft.geom_rate,

    squawk: adsbAircraft.squawk,

    qnh: adsbAircraft.nav_qnh,
    selectedAltitude: adsbAircraft.nav_altitude_mcp,
    selectedHeading: adsbAircraft.nav_heading,
    navigationModes: adsbAircraft.nav_modes,

    latitude: adsbAircraft.lat,
    longitude: adsbAircraft.lon,

    nic: adsbAircraft.nic,
    rc: adsbAircraft.rc,
    nicBaro: adsbAircraft.nic_baro,
    nacP: adsbAircraft.nac_p,
    nacV: adsbAircraft.nac_v,

    sil: adsbAircraft.sil,
    silType: adsbAircraft.sil_type,

    alert: adsbAircraft.alert,
    spi: adsbAircraft.spi,

    mlat: adsbAircraft.mlat,
    tisb: adsbAircraft.tisb,

    version: adsbAircraft.version,

    seen: adsbAircraft.seen,
    seenPosition: adsbAircraft.seen_pos,

    messages: adsbAircraft.messages,
    rssi: adsbAircraft.rssi
};
            matches.push(match);

            try {
                // Include the matched IAF metadata as well as the complete raw
                // ADS-B/Mode-S payload in the dedicated five-day record.
                await cacheTrackedAircraft({ ...adsbAircraft, ...match });
            } catch (error) {
                console.error("[*] Failed to enrich tracked aircraft cache:", error.message);
            }

            console.log("[*] Tracked aircraft from iafData detected:", match);

            const response = new VoiceResponse();

            response.say(
                `Hello, this is a call from 2kwattz Falcon Intelligence. ${match.aircraftType} ${match.registration} of ${match.operator} is within 100 miles of Vadodara at ${match.altitude}. Grab your camera and start shooting.`,
                {
                    voice: "alice"
                }
            );

            // Calls
            for (const number of numbersToCall) {

                try {

                    const shouldCall = await shouldTriggerCall(match.hexCode, number);

                    if (!shouldCall) {
                        console.log(`[CALL] Skipping ${number}`);
                        continue;
                    }

                    console.log(`[CALL] Calling ${number}`);

                    await client.calls.create({
                        to: number,
                        from: "+12792392187",
                        twiml: response.toString()
                    });

                }
                catch (err) {
                    console.error("[CALL ERROR]", err.message);
                }

            }


            const emailsToSend = [
                "prakashbhatia1970@gmail.com",
                "roshan.bhatia.blueera@gmail.com",
                "anmolv2472000@gmail.com",
                "thehighroller46@gmail.com",
                "ishaangangulydpsv@gmail.com",
                "anmol.saevit@gmail.com"
            ];

            for (const email of emailsToSend) {

                try {

                    const shouldEmail = await shouldTriggerEmail(match.hexCode, email);

                    if (!shouldEmail) {
                        console.log(`[EMAIL] Skipping ${email}`);
                        continue;
                    }

                    await sendEmail(
                        email,
                        `Falcon Intelligence Flight Alert | ${match.registration} (${match.aircraftType}) within 100 km of Vadodara`,
                        flightAlertTemplate(match)
                    );

                    await transporter.sendMail({
                        from: `Falcon Intelligence`,
                        to: email,
                        subject: `Falcon Intelligence Flight Alert | ${match.registration} (${match.aircraftType}) within 100 km of Vadodara`,
                        html: flightAlertTemplate(match)
                    });

                    console.log(`[EMAIL] Sent to ${email}`);

                }
                catch (err) {
                    console.error("[EMAIL ERROR]", err.message);
                }

            }

        }

    }

    if (matches.length === 0) {
        // console.log("[*] No preselected aircraft in Vadodara airspace");
    }

    return matches;
};

const fetchAircrafts = async () => {

    const response = await axios.get(ADSB_FLIGHT_JSON_URL);

    // Fetching ADSB Aircraft Data from RTL SDR 
    // const aircrafts = response.data?.acList; Virtual Radar Config
    const aircrafts = response.data?.aircraft || []; // Readsb Config

    console.log("Aircraft received:", aircrafts.length);

    // for (const a of aircrafts) {
    //     console.log(a.Icao, a.Reg);
    // }

    for (const a of aircrafts) {
        console.log(a.hex, a.flight?.trim());
    }

    if (Array.isArray(aircrafts)) {
        await logIafAircraftMatches(aircrafts);
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
router.get("/aircrafts", async function (req, res) {
    try {
        console.log("[*] ADSB Aircrafts JSON Route Hit");
        const adsbAircraftsJson = await fetchAircrafts();

        if (adsbAircraftsJson) {
            console.log("[*] Adsb Aircrafts Json available");

            return res.json({
                status: true,
                aircraftData: adsbAircraftsJson
            })
        }
        else {
            console.log("[*] Adsb Aircrafts data not found ", adsbAircraftsJson);

            return res.json({
                status: false,
                message: "Unable to fetch aircrafts data"
            })
        }
    }
    catch (error) {

        return res.json({
            status: false,
            message: "Internal Server Error"
        })
    }

});

// Web Socket ADSB Data


module.exports = router;
