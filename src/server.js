const express = require("express"); // Node Framework
const cluster = require("cluster"); // Horizontal Scaling
const os = require("os"); // CPU/Os Info
const compression = require("compression") // Gzip/Deflate Middleware
const cors = require('cors');
const helmet = require("helmet"); // Basic Security 
const xss = require("xss"); // Cross Site Scripting Prevention
const hpp = require("hpp"); // HTTP Parameter Pollution Protection
const http = require("http"); // Inbuilt Http Server
const fs = require("fs");
const { Server } = require("socket.io"); // Socket.io Web Socket Server
const multer = require("multer"); // File Handling Library
const { expressMiddleware } = require('@as-integrations/express5'); // Apollo Express Bridge
const cookieParser = require("cookie-parser"); // To set JWT Token in cookies
const morgan = require("morgan"); // Requests Logger
const winston = require("winston"); // Overall Logger
// const swaggerUi = require("swagger-ui-express"); // Swagger UI
// const swaggerSpec = require("../config/swagger"); // Swagger Configuration
const authMiddleware = require("../middlewares/authMiddleware");
const iafData = require("../iafData.js");
const nodemailer = require("nodemailer");

const flightAlertTemplate = require("../templates/flightAlertTemplate.js")

const twilio = require("twilio");

const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

const { ADSB_FLIGHT_JSON_URL } = require("../utils/globals.js");


// Custom Middlewares
const errorMiddleware = require("../middlewares/errorMiddleware"); // General Error Middleware
const generalRateLimiter = require("../middlewares/generalRateLimiter"); // General Rate Limiter
const sqlInjectionGuard = require("../middlewares/sqlInjectionGuard"); // Prevents SQL Injection Attacks
const fakeServerHeaders = require("../middlewares/spoofHeaders"); // Honeypot for Attackers

// Caching 
const redisClient = require("../redis/redisClient");

// Utility Functions
const deviceParser = require("../utils/deviceParser");
const geoLocationTracker = require("../utils/geoLocationTracker");

// Routes 

// Main '/' Route is temporarily in Auth Routes
const authRoutes = require("../routes/authRouter.js"); // Auth routes
const chatroomRoutes = require("../routes/chatroomRoutes"); // Chatroom Routes
const communityRoutes = require("../routes/communityRouter") // Communities Router
const aiRoutes = require("../routes/aiRoutes.js") // AI LLM Routes
const adminRoutes = require("../routes/adminRoutes.js") // Admin Routes
const adsbRoutes = require("../routes/adsbRoutes.js");
const flightScrapperRoutes = require("../routes/flightScrapperRoutes.js"); // Flight Data Scrapper
const { error } = require("console");

// Enviornment Variables
require("dotenv").config(); // DOT ENV Declaration

require("../db/conn"); // MySQL Connection

const PORT = process.env.PORT || 3001; // Node Port

const app = express(); // Express Server Instance
const server = http.createServer(app); // Web Socket Server Instance

// Allowed Origins

const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:5174",
];
const ALERT_EXPIRY_SECONDS = 20 * 60;
// Node Server Initialization

async function startServer() {
    try {

        // Middlewares
        app.use(express.json({ limit: "100kb" })); // Request Body Handling with 100kb limit
        app.use(express.urlencoded({ extended: true, limit: "100kb" })); // Form Data Handling with 100kb limit 
        app.use(cookieParser()); // Cookie Parser
        app.use(compression()); // GZip/ Deflate compression
        app.use(helmet({ contentSecurityPolicy: process.env.NODE_ENV === "development" ? false : true })); // Basic Security
        app.use(cors({ origin: allowedOrigins, credentials: true })); // CORS Implementation (Allowing all domains temporarily)
        app.use(generalRateLimiter); // IP Based Rate Limiting.Max 100 req /15min
        app.use(sqlInjectionGuard); // Additional Layer of SQL Injection Defence Mechanism & IP Logger
        app.use(fakeServerHeaders); // Spoof headers. Confuses Attacker
        app.use(hpp()); // Prevents HTTP Parameter Pollution


        // Multer File Storage Configuration

        // Disk storage in Project/Uploads folder
        const diskStorage = multer.diskStorage({
            destination: "uploads/",
        })

        // Memory Storage buffer
        const memoryStorage = multer.memoryStorage()

        // Winston Logger Configuration

        const logger = winston.createLogger({
            level: "http",

            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.printf(
                    ({ timestamp, level, message }) =>
                        `${timestamp} [${level.toUpperCase()}] ${message}`
                )
            ),

            transports: [
                new winston.transports.Console()
            ]
        });
        // Morgan Integration in Winston Logger

        app.use(
            morgan("combined", {
                stream: {
                    write: (message) => logger.http(message.trim())
                }
            })
        );

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

        async function shouldTriggerEmail(city, hexCode, email) {
            const key = `flight-alert:${city}:email:${hexCode}:${email}`;

            const result = await redisClient.set(
                key,
                Date.now(),
                "EX",
                ALERT_EXPIRY_SECONDS,
                "NX"
            );

            return result === "OK";
        }
        // Virtual Radar Server Caching values

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

        async function cacheADSBAircraft(redis, city, aircraft) {

            // aircraft details from sdr/api
            const icao = normalizeHexCode(aircraft?.hex);

            if (!icao) return;

            await redis.set(
                `adsb-api:${city}:${icao}`,
                JSON.stringify({
                    ...aircraft,
                    source: "adsb-api",
                    city,
                    updatedAt: new Date().toISOString()
                }),
                "EX",
                30 * 60
            );

            console.log(`[ADSB API] Cached ${city} -> ${icao}`);
        }

        const VoiceResponse = twilio.twiml.VoiceResponse;

        const ADSB_TRACKING_INTERVAL_MS = 1000;
        let isTrackingPollRunning = false;

        const normalizeHexCode = (hexCode) => {
            return typeof hexCode === "string" ? hexCode.trim().toUpperCase() : null;
        }




        // Home & Test Routes
        app.get("/", async (req, res) => {

            try {
                // Temporarily used as a testing route for utilities/functions

                // GeoIP Location Testing

                const userLocation = await geoLocationTracker(req.ip)

                console.log(`[*] Fetched User Location `, userLocation)
                // User Agent Testing

                const userAgent = req.headers["user-agent"]; // User Device & Browser Details
                const deviceInfo = JSON.stringify(deviceParser(userAgent), null, 2)

                console.log(`[*] Test User Device Info ${deviceInfo}`);

                res.status(200).json({
                    status: true,
                    message: "Home Route Working"
                })
            }
            catch (error) {
                console.error("[*] Error in / Node Route ", error || error.message);

                res.status(500).json({
                    status: false,
                    message: "Internal Server Error"
                })
            }


        })

        app.get("/errorTest", (req, res, next) => {
            const simulatedError = new Error("Manual Error Testing");
            simulatedError.statusCode = 500;
            next(simulatedError);
        })

        // Router Middlewares

        app.use("/auth", authRoutes); // Authentication routes
        app.use("/ai", aiRoutes); // AI Models Router
        app.use("/admin", adminRoutes) // Admin Router
        app.use("/adsb", adsbRoutes) // Adsb Router
        app.use("/scrapper", flightScrapperRoutes)
        app.set("trust proxy", false);

        // XSS Sanitization Eg
        // const clean = xss(
        //    '<img src=x onerror=alert(1)>'
        // );

        // To allow a specific param through HPP 
        // app.use(
        //   hpp({
        //     whitelist: ["category"]
        //   })
        // );

        // Web Socket Connection

        const io = new Server(server, {
            cors: {
                origin: "*"
            }
        });


        io.on("connection", function (socket) {

            console.log(`[*] Web Socket Client connected with Socket Id ${socket.id}`);

            // Yet to add listeners
        })

        const axios = require("axios");


        // Fetching Flight Data Loop

        // Virtual Radar Configuration

        // setInterval(async () => {
        //     try {
        //         const { data } = await axios.get(
        //             "http://localhost/VirtualRadar/AircraftList.json"
        //         );

        //         io.emit("aircraft-data", data);
        //     } catch (err) {
        //         // console.error(err.message);
        //     }
        // }, 1000);

        // ADSB Data Scrapper 

        const iafAircraftByHexCode = new Map();

        // Setting Hex Set of Mode S/Hex : IAFDATA
        Object.values(iafData.allAircraft).forEach(aircraftList => {
            aircraftList.forEach(aircraft => {
                if (aircraft?.HexCode) {
                    iafAircraftByHexCode.set(
                        normalizeHexCode(aircraft.HexCode),
                        aircraft
                    );
                }
            });
        });

        function enrichWithIafAircraftData(aircraft, iafAircraft) {
            return {
                ...iafAircraft,
                ...aircraft,
                hex: aircraft?.hex || iafAircraft?.HexCode,
                HexCode: iafAircraft?.HexCode || aircraft?.hex,
                r: aircraft?.r || iafAircraft?.Registration,
                registration: aircraft?.registration || aircraft?.r || iafAircraft?.Registration,
                t: aircraft?.t || iafAircraft?.TypeCode || iafAircraft?.AircraftType,
                aircraftType: aircraft?.aircraftType || aircraft?.t || iafAircraft?.AircraftType,
                type: aircraft?.type || aircraft?.t || iafAircraft?.TypeCode,
                operator: aircraft?.operator || aircraft?.Op || iafAircraft?.AircraftOperator,
            };
        }

        // People recieving emails for bdq
        const emailsToSendBdq = [
            "roshan.bhatia.blueera@gmail.com",
            "anmolv2472000@gmail.com",
            "thehighroller46@gmail.com",
            "ishaangangulydpsv@gmail.com",
            "anmol.saevit@gmail.com"
        ];

        // People recieving emails for Banglore
        const emailsToSendBeng = [
            "roshan.bhatia.blueera@gmail.com",
        ];

        const fetchADSBScrapperData = async () => {

            try {

                console.log("[*] Scrapper is active")
                const ADSBUrl = `http://localhost:3001/scrapper/ac`;

                const response = await axios.get(`http://localhost:3001/scrapper/ac`,
                    { timeout: 200000 }
                );

                const vadodaraAirspace =
                    response?.data?.aircraftData?.Vadodara?.ac ?? [];

                const bangloreAirspace = response?.data?.aircraftData?.Bengaluru?.ac ?? [];

                // const hyderabadAirspace = response?.aircraftData?.Hyderabad?.ac;
                // const chandigarhAirspace = response?.aircraftData?.Chandigarh?.ac;

                // console.log("Bengaluru airspace data ",bangloreAirspace)

                console.log("[*] Aircrafts currently in 250 nautical miles of Vadodara ", vadodaraAirspace?.length)
                console.log("[*] Aircrafts currently in 250 nautical miles of Banglore ", bangloreAirspace?.length)

                for (const aircraft of vadodaraAirspace) {
                    const icao = normalizeHexCode(aircraft?.hex);
                    const iafAircraft = iafAircraftByHexCode.get(icao);

                    if (icao && iafAircraft) {
                        const enrichedAircraft = enrichWithIafAircraftData(aircraft, iafAircraft);

                        console.log(`[*] ${enrichedAircraft.r} ${enrichedAircraft.t} matches aircraft of interest `);

                        await cacheADSBAircraft(redisClient, "Vadodara", enrichedAircraft);

                        // Email Alert
                        for (const email of emailsToSendBdq) {
                            if (await shouldTriggerEmail("Vadodara", enrichedAircraft.hex, email)) {
                                await transporter.sendMail({
                                    from: "Falcon Intelligence",
                                    to: email,
                                    subject: `Falcon Intelligence Flight Alert | ${enrichedAircraft.r} (${enrichedAircraft.t}) within 100 km of Vadodara`,
                                    html: flightAlertTemplate(enrichedAircraft, {
                                        zoneName: "Vadodara",
                                        radius: 250,
                                        radiusUnit: "km",
                                        source: "ADSB API",
                                    })
                                });
                            }
                        }
                    } else {
                        // console.log("No Aircraft of interest in Vadodara airspace");
                    }
                }


                for (const aircraft of bangloreAirspace) {

                    // console.log("[*] IAF Mode S Check for Bengaluru airspace")
                    const icao = normalizeHexCode(aircraft?.hex);
                    const iafAircraft = iafAircraftByHexCode.get(icao);

                    if (icao && iafAircraft) {
                        const enrichedAircraft = enrichWithIafAircraftData(aircraft, iafAircraft);

                        console.log(`[*] ${enrichedAircraft.r} ${enrichedAircraft.t} matches aircraft of interest `);
                        // console.log(aircraft);
                        await cacheADSBAircraft(redisClient, "Bengaluru", enrichedAircraft);

                        // Email Alert

                        for (let email of emailsToSendBeng) {

                            console.log("Triggering banglore email alerts")

                            if (await shouldTriggerEmail("Bengaluru", enrichedAircraft.hex, email)) {
                                await transporter.sendMail({
                                    from: `Falcon Intelligence`,
                                    to: email,
                                    subject: `Falcon Intelligence Flight Alert | ${enrichedAircraft.r} (${enrichedAircraft.t}) within 250 nautical miles of Banglore`,
                                    html: flightAlertTemplate(enrichedAircraft, {
                                        zoneName: "Bengaluru",
                                        radius: 250,
                                        radiusUnit: "nautical miles",
                                        source: "ADSB API",
                                    })
                                });

                            }

                        }


                    }

                    else {
                        // console.log("No Aircraft of interest in banglore airspace")
                    }
                }


            } catch (err) {
                console.error(err);
                return ({
                    status: false,
                    message: err?.data || "Error"
                })
            }




        }

        fetchADSBScrapperData();

        setInterval(fetchADSBScrapperData, 10 * 60 * 1000);

        // Redis Check 

        // Response on connecting to the Redis Server
        redisClient.on("connect", function () {
            console.log(`[*] Redis Client has been connected on port ${process.env.REDIS_PORT}`)
        })

        // Response on Redis Error
        redisClient.on("error", (err) => {
            console.error("[*] Error in Redis Client:", err.message);
        });

        // Response on connection closure
        redisClient.on("close", () => {
            console.log("[*]  Redis Connection Closed. Have a nice day :)");
        });

        // 404 Middleware
        app.use((req, res, next) => {
            const error = new Error("Page Not Found");
            error.statusCode = 404;
            next(error);
        });

        // Error Middleware
        app.use(errorMiddleware)

        // app.listen(PORT, () => {
        //     console.log(`[*] Node Server PID ${process.pid} started on port ${PORT}`);
        // });

        server.listen(PORT, () => {
            console.log(`[*] Node Server PID ${process.pid} started on port ${PORT}`);
        });
    }
    catch (error) {
        console.error("[*] Fatal server startup error:", error);
        process.exit(1);
    }
}

startServer();
