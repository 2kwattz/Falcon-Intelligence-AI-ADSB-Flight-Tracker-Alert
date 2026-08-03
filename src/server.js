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

        setInterval(async () => {
            try {
                const { data } = await axios.get(
                    "http://localhost/VirtualRadar/AircraftList.json"
                );

                io.emit("aircraft-data", data);
            } catch (err) {
                console.error(err.message);
            }
        }, 1000);

        // ADSB Data Scrapper 

        // Build this once when your app starts
        const iafHexSet = new Set();

        Object.values(iafData.allAircraft).forEach(aircraftList => {
            aircraftList.forEach(aircraft => {
                if (aircraft.HexCode) {
                    iafHexSet.add(aircraft.HexCode.toLowerCase());
                }
            });
        });

        const emailsToSendBdq = [
            "roshan.bhatia.blueera@gmail.com",
            "anmolv2472000@gmail.com",
            "thehighroller46@gmail.com",
            "ishaangangulydpsv@gmail.com",
            "anmol.saevit@gmail.com"
        ];


        const emailsToSendBeng = [
            "roshan.bhatia.blueera@gmail.com",
        ];

        const fetchADSBScrapperData = async () => {



               try {
  
            console.log("[*] Scrapper is active")
            const ADSBUrl = `http://localhost:3001/scrapper/ac`;

            const response = await axios.get(`http://localhost:3001/scrapper/ac`);

            const vadodaraAirspace = response?.data?.aircraftData?.Vadodara?.ac;
            const bangloreAirspace = response?.data?.aircraftData?.Bengaluru?.ac;
            // const hyderabadAirspace = response?.aircraftData?.Hyderabad?.ac;
            // const chandigarhAirspace = response?.aircraftData?.Chandigarh?.ac;

            for (const aircraft of vadodaraAirspace) {
                if (
                    aircraft.hex &&
                    iafHexSet.has(aircraft.hex.toLowerCase())
                ) {
                    console.log("ALERT");
                    console.log(aircraft);

                    // Email Alert

                    


                }

                 else{
                    console.log("No Aircraft of interest in vadodara airspace")
                }
            }


            for (const aircraft of bangloreAirspace) {
                      if (
                    aircraft.hex &&
                    iafHexSet.has(aircraft.hex.toLowerCase())
                ) {
                    console.log("ALERT");
                    console.log(aircraft);

                    // Email Alert


                }

                else{
                    console.log("No Aircraft of interest in banglore airspace")
                }
            }


             } catch (err) {
        console.error(err);
        return ({
            status:false,
            message: err?.data || "Error"
        })
    }




        }

        fetchADSBScrapperData();

        setInterval(fetchADSBScrapperData, 15 * 60 * 1000);

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