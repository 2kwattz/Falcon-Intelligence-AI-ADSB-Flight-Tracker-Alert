const express = require("express"); // NodeJs Framework
const router = express.Router(); // Express Router
const crypto = require("crypto");
const Razorpay = require("razorpay");

const redisClient = require("../redis/redisClient"); // Caching
const authMiddleware = require("../middlewares/authMiddleware"); // Auth Middleware
const aiRateLimiting = require("../middlewares/aiRateLimiting");
const { getLiveAircraft, getConnectionStatus } = require("../feedPartners/adsbHubTcpConn");
const { STATION_ID, STATION_NAME, getLocalSdrAircraft } = require("../services/localSdrAircraftFeed");
const bangaloreIafData = require("../iafDataBangalore");
const delhiIafData = require("../iafDataDelhi");
const flightAlertTemplate = require("../templates/flightAlertTemplate");
const sendEmail = require("../services/sendEmail");
const twilio = require("twilio");

const cleanXSS = require("../utils/xssCleaner");

// API HOSTNAMES

const AIRPLANES_LIVE = "https://api.airplanes.live/";
const ADSBLOL = "https://api.adsb.lol/"

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const BANGALORE_CENTER = {
    latitude: 12.9716,
    longitude: 77.5946
};
const DELHI_CENTER = {
    latitude: 28.6139,
    longitude: 77.2090
};
const ADSBHUB_SOURCE_ID = "adsbhub-tcp";
const ADSBHUB_SOURCE_NAME = "ADSBHub TCP";
const CITY_ALERT_RADIUS_MILES = 100;
const CITY_ALERT_INTERVAL_MS = 1000;
const CITY_ALERT_EXPIRY_SECONDS = 20 * 60;
const EARTH_RADIUS_MILES = 3958.7613;
const CITY_CALL_ALERT_MAX_ALTITUDE_FEET = 20000;
const TWILIO_CALLER_ID = process.env.TWILIO_CALLER_ID || "+12792392187";
const BANGALORE_AIRSPACE_CALLER_ID =
    process.env.BANGALORE_AIRSPACE_NUMBER || TWILIO_CALLER_ID;

const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);
const VoiceResponse = twilio.twiml.VoiceResponse;

const bangaloreAlertEmails = [
    "roshan.bhatia.blueera@gmail.com",
    "prakashbhatia1970@gmail.com"
];

const delhiAlertEmails = [
    "roshan.bhatia.blueera@gmail.com",
    "prakashbhatia1970@gmail.com"
];

const bangaloreAlertPhoneNumbers = [
    process.env.BANGALORE_ALERT_PHONE_1,
    process.env.BANGALORE_ALERT_PHONE_2,
    process.env.BANGALORE_ALERT_PHONE_3,
    process.env.BANGALORE_ALERT_PHONE_4
].filter(Boolean);

const razorpay = RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET
    ? new Razorpay({
        key_id: RAZORPAY_KEY_ID,
        key_secret: RAZORPAY_KEY_SECRET
    })
    : null;

function normalizeAmount(value) {
    const amount = Number(value);

    if (!Number.isInteger(amount)) return null;

    return amount;
}

function isAuthFailure(error) {
    const statusCode = error?.statusCode || error?.status;
    const description = error?.error?.description || error?.message || "";

    return statusCode === 401 || /auth/i.test(description);
}

const normalizeHexCode = (hexCode) => {
    return typeof hexCode === "string" ? hexCode.trim().toUpperCase() : null;
};

function toRadians(value) {
    return value * Math.PI / 180;
}

function distanceMiles(from, to) {
    const fromLatitude = toRadians(from.latitude);
    const toLatitude = toRadians(to.latitude);
    const latitudeDelta = toRadians(to.latitude - from.latitude);
    const longitudeDelta = toRadians(to.longitude - from.longitude);

    const a =
        Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
        Math.cos(fromLatitude) * Math.cos(toLatitude) *
        Math.sin(longitudeDelta / 2) * Math.sin(longitudeDelta / 2);

    return EARTH_RADIUS_MILES * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function hasUsablePosition(aircraft) {
    return Number.isFinite(aircraft?.latitude) &&
        Number.isFinite(aircraft?.longitude) &&
        aircraft.latitude >= -90 &&
        aircraft.latitude <= 90 &&
        aircraft.longitude >= -180 &&
        aircraft.longitude <= 180;
}

function toFiniteNumber(value) {
    const number = Number(value);

    return Number.isFinite(number) ? number : null;
}

function getNearbyAdsbHubAircraft({ latitude, longitude, radiusMiles, limit = 250 }) {
    const center = { latitude, longitude };

    return getLiveAircraft()
        .filter(hasUsablePosition)
        .map((aircraft) => {
            const distanceFromCenterMiles = distanceMiles(
                center,
                {
                    latitude: aircraft.latitude,
                    longitude: aircraft.longitude
                }
            );

            return {
                ...aircraft,
                distanceMiles: Number(distanceFromCenterMiles.toFixed(2)),
                distanceNm: Number((distanceFromCenterMiles / 1.150779448).toFixed(2))
            };
        })
        .filter((aircraft) => aircraft.distanceMiles <= radiusMiles)
        .sort((a, b) => a.distanceMiles - b.distanceMiles)
        .slice(0, limit);
}

function resolveFeedSource(value) {
    const source = typeof value === "string" ? value.trim().toLowerCase() : "";

    if (source === STATION_ID || source === "vadodara" || source === "local-sdr" || source === "sdr") {
        return STATION_ID;
    }

    return ADSBHUB_SOURCE_ID;
}

function withDistanceFromCenter(aircraft, center) {
    const distanceFromCenterMiles = distanceMiles(
        center,
        {
            latitude: aircraft.latitude,
            longitude: aircraft.longitude
        }
    );

    return {
        ...aircraft,
        distanceMiles: Number(distanceFromCenterMiles.toFixed(2)),
        distanceNm: Number((distanceFromCenterMiles / 1.150779448).toFixed(2))
    };
}

async function getNearbyAircraftForSource({ latitude, longitude, radiusMiles, limit, source }) {
    if (source === STATION_ID) {
        const stationFeed = await getLocalSdrAircraft();
        const center = { latitude, longitude };
        const aircraft = stationFeed.aircraft
            .filter(hasUsablePosition)
            .map((item) => withDistanceFromCenter(item, center))
            .filter((item) => item.distanceMiles <= radiusMiles)
            .sort((a, b) => a.distanceMiles - b.distanceMiles)
            .slice(0, limit);

        return {
            aircraft,
            connection: stationFeed.connection,
            feed: {
                id: STATION_ID,
                label: STATION_NAME
            }
        };
    }

    return {
        aircraft: getNearbyAdsbHubAircraft({ latitude, longitude, radiusMiles, limit }),
        connection: {
            ...getConnectionStatus(),
            source: ADSBHUB_SOURCE_ID,
            stationName: ADSBHUB_SOURCE_NAME
        },
        feed: {
            id: ADSBHUB_SOURCE_ID,
            label: ADSBHUB_SOURCE_NAME
        }
    };
}

function parseNearbyRequest(req) {
    const latitude = toFiniteNumber(req.params.latitude ?? req.query.latitude ?? req.query.lat);
    const longitude = toFiniteNumber(
        req.params.longitude ??
        req.query.longitude ??
        req.query.long ??
        req.query.lon ??
        req.query.lng
    );
    const radiusMiles = toFiniteNumber(
        req.params.radialMiles ??
        req.query.radialMiles ??
        req.query["radial-miles"] ??
        req.query.radiusMiles ??
        req.query.radiusMi
    );
    const radiusNm = toFiniteNumber(req.query.radiusNm);
    const requestedLimit = Number.parseInt(req.query.limit, 10);
    const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 500) : 250;

    return {
        latitude,
        longitude,
        radiusMiles: radiusMiles ?? (radiusNm !== null ? radiusNm * 1.150779448 : null),
        limit,
        source: resolveFeedSource(req.query.source)
    };
}

function validateNearbyInput({ latitude, longitude, radiusMiles }) {
    if (latitude === null || latitude < -90 || latitude > 90) {
        return "A valid latitude is required";
    }

    if (longitude === null || longitude < -180 || longitude > 180) {
        return "A valid longitude is required";
    }

    if (radiusMiles === null || radiusMiles <= 0 || radiusMiles > 1000) {
        return "A valid radial miles value between 0 and 1000 is required";
    }

    return null;
}

function buildIafAircraftHexLookup(cityIafData) {
    const lookup = new Map();
    const aircraftGroups = cityIafData?.allAircraft || {};

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

const cityAlertConfigs = [
    {
        id: "bangalore",
        label: "Bangalore",
        center: BANGALORE_CENTER,
        radiusMiles: CITY_ALERT_RADIUS_MILES,
        intervalMs: CITY_ALERT_INTERVAL_MS,
        expirySeconds: CITY_ALERT_EXPIRY_SECONDS,
        emails: bangaloreAlertEmails,
        callPhones: bangaloreAlertPhoneNumbers,
        callFrom: BANGALORE_AIRSPACE_CALLER_ID,
        enableCallAlerts: true,
        cacheMatchedAircraft: true,
        iafData: bangaloreIafData,
        distanceField: "distanceFromBangaloreMiles"
    },
    {
        id: "delhi",
        label: "Delhi",
        center: DELHI_CENTER,
        radiusMiles: CITY_ALERT_RADIUS_MILES,
        intervalMs: CITY_ALERT_INTERVAL_MS,
        expirySeconds: CITY_ALERT_EXPIRY_SECONDS,
        emails: delhiAlertEmails,
        callPhones: [],
        callFrom: TWILIO_CALLER_ID,
        enableCallAlerts: false,
        cacheMatchedAircraft: false,
        iafData: delhiIafData,
        distanceField: "distanceFromDelhiMiles"
    }
].map((config) => ({
    ...config,
    iafAircraftByHexCode: buildIafAircraftHexLookup(config.iafData),
    state: {
        isRunning: false,
        lastRunAt: null,
        lastError: null,
        lastMatches: []
    }
}));

const cityAlertConfigById = new Map(cityAlertConfigs.map((config) => [config.id, config]));

async function shouldTriggerCityEmail(config, hexCode, email) {
    const key = `${config.id}-flight-alert:email:${hexCode}:${email}`;

    const result = await redisClient.set(
        key,
        Date.now(),
        "EX",
        config.expirySeconds,
        "NX"
    );

    return result === "OK";
}

async function cacheCityMatchedAircraft(config, match) {
    if (!config.cacheMatchedAircraft) {
        return;
    }

    const key = `${config.id}-matched-aircraft:${match.hexCode}`;

    await redisClient.set(
        key,
        JSON.stringify({
            ...match,
            cacheScope: "city-alert-match",
            cachedAt: new Date().toISOString()
        }),
        "EX",
        config.expirySeconds
    );
}

async function shouldTriggerCityCall(config, hexCode, phoneNumber) {
    const key = `${config.id}-flight-alert:call:${hexCode}:${phoneNumber}`;

    const result = await redisClient.set(
        key,
        Date.now(),
        "EX",
        config.expirySeconds,
        "NX"
    );

    return result === "OK";
}

function shouldAllowCityCallForAltitude(match) {
    if (match.isOnGround) {
        return true;
    }

    const altitude = Number(match.altitude);

    return !Number.isFinite(altitude) || altitude <= CITY_CALL_ALERT_MAX_ALTITUDE_FEET;
}

function toCityAlertMatch(config, adsbAircraft, iafAircraft, distanceMilesFromCenter) {
    const match = {
        hexCode: normalizeHexCode(adsbAircraft.hex) ?? iafAircraft.HexCode,
        registration: iafAircraft.Registration,
        aircraftType: iafAircraft.TypeCode,
        description: iafAircraft.AircraftType,
        operator: iafAircraft.AircraftOperator,
        callsign: adsbAircraft.callsign?.trim(),
        altitude: adsbAircraft.altitude,
        gpsAltitude: null,
        groundSpeed: adsbAircraft.groundSpeed,
        track: adsbAircraft.heading,
        verticalSpeed: adsbAircraft.verticalRate,
        squawk: adsbAircraft.squawk,
        latitude: adsbAircraft.latitude,
        longitude: adsbAircraft.longitude,
        alert: adsbAircraft.alert,
        spi: adsbAircraft.spi,
        isOnGround: adsbAircraft.isOnGround,
        seen: adsbAircraft.lastSeen ? Math.max(0, Math.round((Date.now() - adsbAircraft.lastSeen) / 1000)) : null,
        distanceFromAlertCenterMiles: Number(distanceMilesFromCenter.toFixed(1)),
        alertLocation: config.label,
        alertRadiusMiles: config.radiusMiles
    };

    match[config.distanceField] = match.distanceFromAlertCenterMiles;

    return match;
}

async function sendCityAlertEmails(config, match) {
    for (const email of config.emails) {
        try {
            const shouldEmail = await shouldTriggerCityEmail(config, match.hexCode, email);

            if (!shouldEmail) {
                console.log(`[${config.id.toUpperCase()} EMAIL] Skipping ${email} for ${match.hexCode}`);
                continue;
            }

            await sendEmail(
                email,
                `Falcon Intelligence ${config.label} Alert | ${match.registration} (${match.aircraftType}) within ${config.radiusMiles} miles`,
                flightAlertTemplate(match)
            );

            console.log(`[${config.id.toUpperCase()} EMAIL] Sent to ${email} for ${match.hexCode}`);
        }
        catch (error) {
            console.error(`[${config.id.toUpperCase()} EMAIL ERROR]`, error.message || error);
        }
    }
}

async function triggerCityCallAlert(config, match) {
    if (!config.enableCallAlerts || !config.callPhones.length) {
        return;
    }

    if (!shouldAllowCityCallForAltitude(match)) {
        console.log(
            `[${config.id.toUpperCase()} CALL] ${match.registration} (${match.hexCode}) is above ${CITY_CALL_ALERT_MAX_ALTITUDE_FEET} ft - skipping call`
        );
        return;
    }

    const response = new VoiceResponse();

    response.say(
        `Hello, this is a call from 2kwattz Falcon Intelligence. ` +
        `${match.aircraftType} ${match.registration} of ${match.operator} ` +
        `is within ${config.radiusMiles} miles of ${config.label}. ` +
        `Grab your camera and start shooting.`,
        {
            voice: "alice"
        }
    );

    for (const phoneNumber of config.callPhones) {
        try {
            const shouldCall = await shouldTriggerCityCall(config, match.hexCode, phoneNumber);

            if (!shouldCall) {
                console.log(`[${config.id.toUpperCase()} CALL] Skipping ${phoneNumber} for ${match.hexCode}`);
                continue;
            }

            console.log(`[${config.id.toUpperCase()} CALL] Calling ${phoneNumber} for ${match.hexCode}`);

            await twilioClient.calls.create({
                to: phoneNumber,
                from: config.callFrom,
                twiml: response.toString()
            });
        }
        catch (error) {
            console.error(`[${config.id.toUpperCase()} CALL ERROR]`, error.message || error);
        }
    }
}

async function pollCityIafAlerts(config) {
    if (config.state.isRunning) {
        return;
    }

    config.state.isRunning = true;

    try {
        const aircraft = getNearbyAdsbHubAircraft({
            latitude: config.center.latitude,
            longitude: config.center.longitude,
            radiusMiles: config.radiusMiles,
            limit: 500
        });
        const matches = [];

        for (const adsbAircraft of aircraft) {
            const hexCode = normalizeHexCode(adsbAircraft.hex);

            if (!hexCode || !config.iafAircraftByHexCode.has(hexCode)) {
                continue;
            }

            const matchedAircrafts = config.iafAircraftByHexCode.get(hexCode);

            for (const iafAircraft of matchedAircrafts) {
                const match = toCityAlertMatch(
                    config,
                    adsbAircraft,
                    iafAircraft,
                    adsbAircraft.distanceMiles
                );

                matches.push(match);
                await cacheCityMatchedAircraft(config, match);
                await sendCityAlertEmails(config, match);
                await triggerCityCallAlert(config, match);
            }
        }

        config.state.lastMatches = matches.map((match) => ({
            hexCode: match.hexCode,
            registration: match.registration,
            aircraftType: match.aircraftType,
            callsign: match.callsign,
            distanceFromAlertCenterMiles: match.distanceFromAlertCenterMiles,
            [config.distanceField]: match[config.distanceField],
            latitude: match.latitude,
            longitude: match.longitude
        }));
        config.state.lastRunAt = new Date().toISOString();
        config.state.lastError = null;
    }
    catch (error) {
        config.state.lastError = error.message || String(error);
        console.error(`[*] ${config.label} IAF alert poll failed:`, error.message || error);
    }
    finally {
        config.state.isRunning = false;
    }
}

function startCityIafAlertPolling(config) {
    console.log(
        `[*] ${config.label} IAF alert polling started. Radius ${config.radiusMiles} miles, interval ${config.intervalMs / 1000}s`
    );

    setInterval(() => pollCityIafAlerts(config), config.intervalMs);
}

cityAlertConfigs.forEach(startCityIafAlertPolling);







// Routes

async function handleAdsbHubNearbyRequest(req, res) {
    const nearbyRequest = parseNearbyRequest(req);
    const validationError = validateNearbyInput(nearbyRequest);

    if (validationError) {
        return res.status(400).json({
            status: false,
            message: validationError
        });
    }

    let nearbyPayload;

    try {
        nearbyPayload = await getNearbyAircraftForSource(nearbyRequest);
    } catch (error) {
        console.error("[*] Nearby aircraft feed unavailable:", error.message || error);
        return res.status(502).json({
            status: false,
            source: nearbyRequest.source,
            message: nearbyRequest.source === STATION_ID ? `${STATION_NAME} feed unavailable` : `${ADSBHUB_SOURCE_NAME} feed unavailable`
        });
    }

    res.set("Cache-Control", "no-store");
    return res.status(200).json({
        status: true,
        source: nearbyRequest.source,
        feed: nearbyPayload.feed,
        center: {
            latitude: nearbyRequest.latitude,
            longitude: nearbyRequest.longitude
        },
        radiusMiles: Number(nearbyRequest.radiusMiles.toFixed(2)),
        updatedAt: new Date().toISOString(),
        connection: nearbyPayload.connection,
        count: nearbyPayload.aircraft.length,
        totalInRadius: nearbyPayload.aircraft.length,
        aircraft: nearbyPayload.aircraft
    });
}

router.get("/aircraft/nearby", handleAdsbHubNearbyRequest);
router.get("/adsbhub-tcp/nearby", handleAdsbHubNearbyRequest);
router.get("/adsbhub-tcp/nearby/:latitude/:longitude/:radialMiles", handleAdsbHubNearbyRequest);
router.get("/adsbhub-tcp/:latitude/:longitude/:radialMiles", handleAdsbHubNearbyRequest);

function buildCityAlertStatus(config) {
    return {
        status: true,
        city: config.label,
        center: config.center,
        radiusMiles: config.radiusMiles,
        emailRecipients: config.emails.length,
        callRecipients: config.callPhones.length,
        callAlertsEnabled: config.enableCallAlerts,
        callAltitudeLimitFeet: CITY_CALL_ALERT_MAX_ALTITUDE_FEET,
        matchedAircraftCacheEnabled: config.cacheMatchedAircraft,
        matchedAircraftCacheSeconds: config.cacheMatchedAircraft ? config.expirySeconds : 0,
        iafHexesLoaded: config.iafAircraftByHexCode.size,
        lastRunAt: config.state.lastRunAt,
        lastError: config.state.lastError,
        lastMatches: config.state.lastMatches,
        connection: getConnectionStatus()
    };
}

router.get("/bangalore-iaf-alert-status", function(req, res) {
    return res.status(200).json(buildCityAlertStatus(cityAlertConfigById.get("bangalore")));
});

router.get("/delhi-iaf-alert-status", function(req, res) {
    return res.status(200).json(buildCityAlertStatus(cityAlertConfigById.get("delhi")));
});

router.get("/razorpay-key", function(req, res) {
    if (!RAZORPAY_KEY_ID) {
        return res.status(500).json({
            status: false,
            message: "Razorpay key is not configured"
        });
    }

    return res.status(200).json({
        status: true,
        key_id: RAZORPAY_KEY_ID
    });
});

router.post("/create-order", async function(req, res) {
    try {
        if (!razorpay) {
            return res.status(500).json({
                status: false,
                message: "Razorpay is not configured"
            });
        }

        const amount = normalizeAmount(req.body.amount);
        const currency = String(req.body.currency || "INR").trim().toUpperCase();
        const receipt = String(req.body.receipt || `falcon_donation_${Date.now()}`).trim().slice(0, 40);

        if (amount === null || amount < 100) {
            return res.status(400).json({
                status: false,
                message: "Amount must be at least 100 paise"
            });
        }

        if (!/^[A-Z]{3}$/.test(currency)) {
            return res.status(400).json({
                status: false,
                message: "Currency must be a valid 3-letter code"
            });
        }

        const order = await razorpay.orders.create({
            amount,
            currency,
            receipt
        });

        return res.status(200).json({
            status: true,
            order_id: order.id,
            amount: order.amount,
            currency: order.currency
        });
    }
    catch(error) {
        console.error("[*] Razorpay order creation failed:", error?.message || error);

        if (isAuthFailure(error)) {
            return res.status(401).json({
                status: false,
                message: "Razorpay authentication failed"
            });
        }

        return res.status(500).json({
            status: false,
            message: "Unable to create Razorpay order"
        });
    }
});

router.post("/verify-payment", function(req, res) {
    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
    } = req.body;

    if (!RAZORPAY_KEY_SECRET) {
        return res.status(500).json({
            status: false,
            message: "Razorpay signature verification is not configured"
        });
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({
            status: false,
            message: "Payment verification fields are missing"
        });
    }

    const generatedSignature = crypto
        .createHmac("sha256", RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

    const expected = Buffer.from(generatedSignature);
    const received = Buffer.from(String(razorpay_signature));
    const signatureMatches = expected.length === received.length && crypto.timingSafeEqual(expected, received);

    if (!signatureMatches) {
        return res.status(400).json({
            status: false,
            message: "Payment signature verification failed"
        });
    }

    return res.status(200).json({
        status: true,
        message: "Payment verified successfully"
    });
});

router.post("/askllm",aiRateLimiting, authMiddleware,async function(req,res){

    try{
        console.log("[*] Request Sent to QWEN2.5 7B Model");
        let query = req.body.query;

        query = query.toLowerCase().trim();

        if(!query){
            return res.status(400).json({
                status: false,
                message: "Invalid Query"
            })
        }

        if(isPromptInjection(query)){
            return res.status(400).json({
                status:false,
                message: "Prompt Injection was detected and blocked",
                ipAddress: req.ip

            })}

        const response = await askQwen2(query);

        if(!response?.response || typeof response?.response !== "string" ){
            return res.status(500).json({
                    status:false,
                    message: "Ai Service returned invalid response"
                })
            }

        if(response?.response){
            return res.status(200).json({
                status:true,
                message:response.response,
                model: response.model,
                createdAt: response.created_at,
                loadDuration: response.load_duration,
                totalDuration: response.totalDuration,
                promptEvalDuration: response.prompt_eval_duration,
                eval_duration: response.eval_duration

            })
        }
        
        else{
            return res.status(500).json({
                status:false,
                message:"Internal Server Error"
            })
        }
    }
    catch(error){
         console.log("[*] Error sending request to QWEN2.5 7B Model", error);
           return res.status(500).json({
                status:false,
                message:"Internal Server Error"
            })
    }
})

module.exports = router;
