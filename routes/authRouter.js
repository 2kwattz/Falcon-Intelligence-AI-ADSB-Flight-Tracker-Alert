const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt"); // Bcrypt Hashing
const jwt = require("jsonwebtoken"); // JWT Authentication
const disposableDomains = require("disposable-email-domains"); // Real Time List of Disposable Emails
const crypto = require("crypto"); // For generating secure tokens
const redisClient = require("../redis/redisClient");
const { BASE_URL } = require("../utils/globals")
// Templates
const welcomeTemplate = require("../templates/welcome");
const confirmPasswordResetTemplate = require("../templates/confirmResetPassword");
const forgotPasswordTemplate = require("../templates/ForgotPassword");


// Utility Functions
const sendEmail = require("../services/sendEmail"); // Email Service
const deviceParser = require("../utils/deviceParser"); // Device User Agent Parsing
const cleanXSS = require("../utils/xssCleaner"); // To prevent XSS Attacks 
const { formatName, blockedEmailDomains, isDisposableEmail } = require("../utils/commonHelpers"); // Common Helper Functions

// SQL Connection
const { pool } = require("../db/conn");

const authMiddleware = require("../middlewares/authMiddleware");

const allowedGenders = ["male", "female", "other"];
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const usernameRegex = /^[A-Za-z][A-Za-z0-9_]*$/;
const lettersOnlyValidationRegex = /^[A-Za-z]+$/


// Validation Function

const validateData = (data) => {


    // Validating First Name
    if (!data.firstName || data.firstName.trim() === "") {
        return {
            status: false,
            error: "First Name is required"
        }
    };

    // Validating Last Name
    if (!data.lastName || data.lastName.trim() === "") {
        return {
            status: false,
            error: "Last Name is required"
        }
    };

    // Validating Username
    if (!data.username || data.username.trim() === "") {
        return {
            status: false,
            error: "Username is required"
        }
    }

    if (emailRegex.test(data.username)) {
        return {
            status: false,
            error: "Username cannot be an email address"
        };
    }

    if (data.username.length < 3 || data.username.length > 16) {
        return {
            status: false,
            error: "Username must be between 3 and 16 characters"
        };
    }
    if (!usernameRegex.test(data.username)) {
        return {
            status: false,
            error: "Username can only contain characters, numbers and underscores"
        }
    }

    // Validating Email Address
    if (!data.email || data.email?.trim() === "") {

        return {
            status: false,
            error: "Email is required"
        }
    };

    // Validating Email Format

    const email = data?.email.trim().toLowerCase();

    if (!emailRegex.test(email)) {

        return {
            status: false,
            error: "Invalid Email Format"
        }
    };

    const emailDomain = email?.split("@")[1]?.trim()?.toLowerCase();

    // Validating Domain Authenticity using Internal Data
    if (blockedEmailDomains.has(emailDomain)) {
        return {
            status: false,
            error: "Temporary Email Addresses are not allowed"
        }
    }

    if (disposableDomains?.includes(emailDomain)) {
        return {
            status: false,
            error: "Temporary Email Addresses are not allowed"
        }
    }



    // Validating Password
    if (!data.password) {
        return {
            status: false,
            error: "Password is required"
        }
    }

    // Validating confirm password
    if (!data.confirmPassword) {
        return {
            status: false,
            error: "Confirm Password is required"
        }
    }

    // Validating Password's length
    if (data.password.length < 6) {
        return {
            status: false,
            error: "Password should atleast be 6 characters"
        }
    }

    // Verifying Password and Confirm Password
    if (data.password !== data.confirmPassword) {
        return {
            status: false,
            error: "Password and Confirm Password do not match"
        }
    }

    const passwordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;

    // Validating Strong Password
    if (!passwordRegex.test(data.password)) {
        return {
            status: false,
            error:
                "Password must contain uppercase, lowercase and number"
        }
    };

    // Validating Date Of Birth
    if (!data.date_of_birth) {
        return {
            status: false,
            error: "Date Of Birth is required"
        }
    }

    // Creating Date Object
    const dob = new Date(`${data.date_of_birth}T00:00:00`);

    // Checking Invalid Date
    if (isNaN(dob.getTime())) {
        return {
            status: false,
            error: "Invalid Date Of Birth"
        }
    }

    // Checking Future Date
    const currentDate = new Date();

    if (dob > currentDate) {
        return {
            status: false,
            error: "Date Of Birth cannot be in the future"
        }
    }

    // Calculating Age
    let age = currentDate.getFullYear() - dob.getFullYear();

    const monthDifference =
        currentDate.getMonth() - dob.getMonth();

    // Adjusting Age Properly
    if (
        monthDifference < 0 ||
        (
            monthDifference === 0 &&
            currentDate.getDate() < dob.getDate()
        )) {
        age--;
    }

    // Minimum Age Validation
    if (age < 13) {
        return {
            status: false,
            error: "Minimum age should be 13 years"
        }
    };

    // Maximum Age Validation
    if (age > 120) {
        return {
            status: false,
            error: "Invalid Date Of Birth"
        }
    };

    if (!allowedGenders.includes(data.gender)) {
        return {
            status: false,
            error: "Invalid Gender"
        };
    }

    return {
        status: true
    }
};

// Routes

router.post("/register", async function (req, res) {

    // Required for SQL Transaction
    const conn = await pool.getConnection();

    try {

        console.log("[*] POST /Register route")

        // Fetching User Information & Validation
        const cleanedBodyData = cleanXSS(req.body);

        console.log("[*] Cleaned Req.body for XSS")


        // Request Body Validations

        cleanedBodyData.email = cleanedBodyData?.email?.trim().toLowerCase();
        cleanedBodyData.username = cleanedBodyData?.username?.trim().toLowerCase();
        cleanedBodyData.firstName = formatName(cleanedBodyData?.firstName);
        cleanedBodyData.lastName = formatName(cleanedBodyData?.lastName);


        console.log("[*] Cleaned Trimmed Data")

        const validation = validateData(cleanedBodyData);

        console.log("[*] Validated Data");

        // Validation Failed
        if (!validation.status) {
            console.log("[*] Validation Failed")
            return res.status(400).json(validation);
        }

        console.log("[*] Checking existing users...");

        // Device UUID Checking

        const deviceUUID = cleanedBodyData.deviceId?.trim();

        // Verifying Device UUID

        if (!deviceUUID) {
            return res.status(400).json({
                status: false,
                message: "Invalid Device UUID"
            })
        }

        // Device UUID Validation Regex
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

        // Device UUID Regex Test

        if (!deviceUUID || !uuidRegex.test(deviceUUID)) {
            return res.status(400).json({
                status: false,
                message: "Invalid Device UUID"
            });
        }

        // Verifying Username & Email Address
        const [existingUsers] = await pool.execute(`
            SELECT userId FROM users WHERE username = ? OR email = ? LIMIT 1`, [cleanedBodyData.username, cleanedBodyData.email]);

        if (existingUsers.length > 0) {

            console.log(`[*] User Already Exists`)
            return res.status(409).json({
                success: false,
                message: "User already exists"
            });
        }

        // Enforcing user's role as "User" since frontend cannot be trusted
        const role = "user";

        // Hashing password using bcrypt

        const hashedPassword = await bcrypt.hash(cleanedBodyData.password, 10);

        // Registering User 
        const [userResult] = await pool.execute(`
            INSERT INTO users (
                firstName,
                lastName,
                username,
                email,
                password,
                gender,
                date_of_birth,
                role)
                VALUES (?,?,?,?,?,?,?,?)`, [
            cleanedBodyData.firstName,
            cleanedBodyData.lastName,
            cleanedBodyData.username,
            cleanedBodyData.email,
            hashedPassword,
            cleanedBodyData.gender,
            cleanedBodyData.date_of_birth,
            role
        ]);

        // Generating JWT Token

        const token = jwt.sign(
            {
                id: userResult.insertId,
                firstName: cleanedBodyData.firstName,
                lastName: cleanedBodyData.lastName,
                email: cleanedBodyData.email,
                gender: cleanedBodyData.gender,
                role: role,
            },
            process.env.JWT_SECRET_KEY,
            {
                expiresIn: "7d"
            }
        );

        // Upon Token Generation failure
        if (!token) {
            return res.status(500).json({
                status: false,
                message: "Token generation failed"
            });
        }

        res.cookie("token", token, {
            httpOnly: false,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        try {

            await sendEmail(
                cleanedBodyData.email,
                "Welcome to ShadowChat",
                welcomeTemplate(cleanedBodyData.firstName)
            );
        }
        catch (error) {
            console.log("[*] Error in sending Welcome/Registration Email")
        }

        // Keeping track of User Device Inventory

        await conn.beginTransaction();

        // Fetching User Agent
        const userAgent = req.headers['user-agent'];

        // Parsing User Agent
        const deviceInfoParsed = deviceParser(userAgent);

        console.log("[*] Device Info Parsed /Register route ", deviceInfoParsed);

        const browser = deviceInfoParsed?.browser?.name ?? null;
        const browserVersion = deviceInfoParsed?.browser?.version ?? null;
        const operatingSystem = deviceInfoParsed?.os?.name ?? null;
        const osArchitecture = deviceInfoParsed?.cpu?.architecture ?? null;
        const deviceVendor = deviceInfoParsed?.device?.vendor ?? null;
        const deviceModel = deviceInfoParsed?.device?.model ?? null;
        const osVersion = deviceInfoParsed?.os?.version ?? null;
        const ipAddress = req.ip;
        const isActive = true;
        let deviceType = deviceInfoParsed?.device?.type ?? "Unknown";

        deviceType = deviceInfoParsed?.device?.type
            ? deviceInfoParsed.device.type.charAt(0).toUpperCase() +
            deviceInfoParsed.device.type.slice(1)
            : "Unknown";

        console.log("[*] Browser:", browser);
        console.log("[*] Browser Version:", browserVersion);
        console.log("[*] Operating System:", operatingSystem);
        console.log("[*] OS Architecture:", osArchitecture);
        console.log("[*] IP Address: ", ipAddress);
        console.log("[*] Device Type : ", deviceType);


        console.log(`[*] Device UUID`, deviceUUID);

        // Storing Current State of User's Device

        const [deviceResults] = await conn.execute(
            `
        INSERT INTO devices (
        device_uuid,
        user_agent,
        browser,
        browser_version,
        operating_system,
        os_version,
        os_architecture,
        device_type,
        device_vendor,
        device_model
    )
    VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )

    ON DUPLICATE KEY UPDATE
    user_agent = VALUES(user_agent),
    browser = VALUES(browser),
    browser_version = VALUES(browser_version),
    operating_system = VALUES(operating_system),
    os_version = VALUES(os_version),
    os_architecture = VALUES(os_architecture),
    device_type = VALUES(device_type),
    device_vendor = VALUES(device_vendor),
    device_model = VALUES(device_model),
    updated_at = NOW(),
    id = LAST_INSERT_ID(id)
`,
            [
                deviceUUID,
                userAgent,
                browser,
                browserVersion,
                operatingSystem,
                osVersion,
                osArchitecture,
                deviceType,
                deviceVendor,
                deviceModel
            ]
        );

        const deviceId = deviceResults.insertId;

        console.log("[*] Device Registration/ Updation Confirmation ", deviceId);

        // Updating User Device Mapping
        await conn.execute(
            `
INSERT INTO user_devices
(
    userId,
    deviceId,
    ip_address,
    is_active,
    last_seen_at,
    created_at,
    updated_at
)
VALUES
(
    ?, ?, ?, TRUE, NOW(), NOW(), NOW()
)
ON DUPLICATE KEY UPDATE
    ip_address = VALUES(ip_address),
    is_active = TRUE,
    last_seen_at = NOW(),
    updated_at = NOW()
`,
            [
                userResult.insertId,
                deviceId,
                ipAddress
            ]
        );


        // SQL Transcation Completed
        await conn.commit();

        await res.status(201).json({
            status: true,
            message: "Registration Successful. Please check email for verification code",
            token: token
        });
    }

    catch (error) {
        console.error(`[*] Error in registering user ${error.message || error}`);

        // Rolling back transcation 
        try {

            await conn.rollback();
        }
        catch (error) {
            console.log("Error rolling back /REGISTER")
        }

        // Manual Response
        return res.status(500).json({
            status: false,
            error: "Internal Server Error"
        });
    }

    finally {
        conn.release();
    }
})

router.post("/login", async function (req, res) {

    // Required for SQL Transactions 
    const conn = await pool.getConnection();

    try {
        console.log("[*] GET POST /Login Route ")
        const cleanedBodyData = cleanXSS(req.body); // Sanitizes values against XSS attacks for eg < will become &lt

        // Fetching username/email & password

        console.log("Clean Body Data ", cleanedBodyData)
        const identifier = cleanedBodyData.identifier?.trim().toLowerCase();
        const password = cleanedBodyData.password?.trim();
        const deviceUUID = cleanedBodyData.deviceId?.trim();
        const ipAddress = req.ip;

        console.log(`[*] Identifier `, identifier);
        console.log(`[*] Device UUID`, deviceUUID);

        // Verifying Device UUID

        if (!deviceUUID) {
            return res.status(400).json({
                status: false,
                message: "Invalid Device UUID"
            })
        }

        // Device UUID Validation Regex
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

        // Device UUID Regex Test

        if (!deviceUUID || !uuidRegex.test(deviceUUID)) {
            return res.status(400).json({
                status: false,
                message: "Invalid Device UUID"
            });
        }

        // Identifier Validation
        if (!identifier) {

            console.log("[*] Identifier missing")

            return res.status(400).json({
                status: false,
                message: "Email or Username is required"
            })
        };

        // Password Validation

        if (!password) {
            console.log("[*] Password Missing");

            return res.status(400).json({
                status: false,
                message: "Password is required"
            })
        }

        const isEmail = emailRegex.test(identifier);

        if (isEmail) {

            // Validating Email Format

            const email = identifier;
            const emailDomain = email.split("@")[1];

            // Validating Domain Authenticity using Internal data
            if (blockedEmailDomains.has(emailDomain) || disposableDomains.includes(emailDomain)) {
                return res.status(400).json({
                    status: false,
                    error: "Temporary Email Addresses are not allowed"
                })
            }

        }

        else {
            // User entered username
            if (identifier.length < 3 || identifier.length > 16) {
                return res.status(400).json({
                    status: false,
                    error: "Username must be between 3 and 16 characters"
                });
            }
            else if (!usernameRegex.test(identifier)) {
                return res.status(400).json({
                    status: false,
                    error: "Username can only contain characters, numbers and underscores"
                })
            }
        }

        // Verifying User from Database

        // Fake Hash to prevent enumeration attack via response timing
        const fakeHash = "$2b$10$KbQiM6TA6L/2esL8hWT8EOV9V7sXxJ0L0K9lK1w2r0kM7rj8yP6yS";
        let users;

        if (isEmail) {

            [users] = await pool.execute(`
                SELECT *
                FROM users
                WHERE email = ?
                LIMIT 1
                `, [identifier]);

        } else {

            [users] = await pool.execute(
                `
                SELECT *
                FROM users
                WHERE username = ?
                LIMIT 1
                `, [identifier])
        }


        const MAX_LOGIN_ATTEMPTS = 10;
        const MAX_BRUTE_TIME_WINDOW = 15 * 60;

        // Storing User Information
        const user = users[0];

        let key; // User Key for bruteforce prevention

        // Validation if user does not exist
        if (users.length === 0) {

            // Fake hash to prevent timing based enumeration attack
            await bcrypt.compare(password, fakeHash);

            // Storing UserId + Ip Address Unique key in redis for IP + Email based bruteforce prevention
            key = `login:${identifier}:${ipAddress}`;

            // Fetching and incrementing login attempts from Redis Cache
            const attempt_count = await redisClient.incr(key);

            attempt_count === 1 && await redisClient.expire(key, MAX_BRUTE_TIME_WINDOW);

            if (attempt_count >= MAX_LOGIN_ATTEMPTS) {
                return res.status(429).json({
                    status: false,
                    message: "Too many requests. Please try again later"
                })
            }

            req.bruteforceKey = key;

            return res.status(401).json({
                status: false,
                message: "Invalid Credentials"

            })
        }

        // Fetching User Id from DB
        const userId = user?.userId;
        key = `login:${userId}:${ipAddress}`;

        // Fetching login attempts from Redis Cache
        const loginAttempts = Number(await redisClient.get(key) || 0);

        if (loginAttempts >= MAX_LOGIN_ATTEMPTS) {
            return res.status(429).json({
                status: false,
                message: "Too many requests. Please try again later"
            })
        }

        req.bruteforceKey = key;

        console.log("[*] User Id /Login Route ", userId)

        const isPasswordCorrect = await bcrypt.compare(
            password,
            user.password
        )

        // Validation if password is incorrect
        if (!isPasswordCorrect) {

            const attempt_count = await redisClient.incr(key);

            if (attempt_count === 1) {
                await redisClient.expire(key, MAX_BRUTE_TIME_WINDOW);
            }

            return res.status(401).json({
                status: false,
                message: "Invalid Credentials"
            })
        }

        // Deleting Login Attempts on correct password
        await redisClient.del(key);

        // Generating JWT Token
        const token = jwt.sign({
            id: user.userId,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            gender: user.gender,
            bio: user.bio,
            role: user.role
        },
            process.env.JWT_SECRET_KEY, {
            expiresIn: "7d"
        }
        );

        console.log(`[*] User ${user.username} logged in successfully`);

        // Setting JWT token in cookie
        res.cookie("token", token, {
            httpOnly: false,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });



        // SQL Transaction Started
        await conn.beginTransaction();


        // Fetching User Agent from headers
        const userAgent = req.headers['user-agent'];

        // Parsing User Agent
        const deviceInfoParsed = deviceParser(userAgent);

        const browser = deviceInfoParsed?.browser?.name ?? null;
        const browserVersion = deviceInfoParsed?.browser?.version ?? null;
        const operatingSystem = deviceInfoParsed?.os?.name ?? null;
        const osArchitecture = deviceInfoParsed?.cpu?.architecture ?? null;
        const deviceVendor = deviceInfoParsed?.device?.vendor ?? null;
        const deviceModel = deviceInfoParsed?.device?.model ?? null;
        const osVersion = deviceInfoParsed?.os?.version ?? null;
        const isActive = true;
        let deviceType = deviceInfoParsed?.device?.type ?? "Unknown";

        deviceType =
            deviceInfoParsed?.device?.type
                ? deviceInfoParsed.device.type.charAt(0).toUpperCase() +
                deviceInfoParsed.device.type.slice(1)
                : "Unknown";

        console.log("[*] Browser:", browser);
        console.log("[*] Browser Version:", browserVersion);
        console.log("[*] Operating System:", operatingSystem);
        console.log("[*] OS Architecture:", osArchitecture);
        console.log("[*] IP Address: ", ipAddress);
        console.log("[*] Device Type : ", deviceType)


        // Storing Device Details in Device Tables
        const [deviceResult] = await conn.execute(
            `
        INSERT INTO devices
        (
        device_uuid,
        user_agent,
        browser,
        browser_version,
        operating_system,
        os_version,
        os_architecture,
        device_type,
        device_vendor,
        device_model,
        created_at,
        updated_at
        )
        VALUES
        (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW()
        )
        ON DUPLICATE KEY UPDATE
        user_agent = VALUES(user_agent),
        browser = VALUES(browser),
        browser_version = VALUES(browser_version),
        operating_system = VALUES(operating_system),
        os_version = VALUES(os_version),
        os_architecture = VALUES(os_architecture),
        device_type = VALUES(device_type),
        device_vendor = VALUES(device_vendor),
        device_model = VALUES(device_model),
        updated_at = NOW(),
        id = LAST_INSERT_ID(id)
        `,
            [
                deviceUUID,
                userAgent,
                browser,
                browserVersion,
                operatingSystem,
                osVersion,
                osArchitecture,
                deviceType,
                deviceVendor,
                deviceModel
            ]
        );

        const deviceId = deviceResult.insertId;

        console.log(deviceResult);
        console.log("Device ID =", deviceResult.insertId);

        // Creating User Device Mapping
        await conn.execute(`
    INSERT INTO user_devices
    (
    userId,
    deviceId,
    ip_address,
    is_active,
    last_seen_at,
    created_at,
    updated_at
    )
    VALUES
    (
        ?, ?, ?, TRUE, NOW(), NOW(), NOW()
    )
    ON DUPLICATE KEY UPDATE
        ip_address = VALUES(ip_address),
        is_active = TRUE,
        last_seen_at = NOW(),
        updated_at = NOW()
    `,
            [
                userId,
                deviceId,
                ipAddress
            ]);


        // SQL Transaction Completed
        await conn.commit();

        return res.status(200).json({
            status: true,
            message: "Login Successful",
            token: token
        })
    }

    catch (error) {
        console.log(`[*] Error in handling POST /api/login route ${error?.message || error}`);

        // Rolling back Device Inventory Queries in Error Scenario

        try {
            await conn.rollback();
        } catch {
            console.log("[*] Error executing Rollback in POST/Login")
        }


        return res.status(500).json({
            status: false,
            message: "Internal Server Error"
        })
    }

    finally {
        conn.release();
    }

})

// Auth Verification

router.get("/me", authMiddleware, function (req, res) {
    try {
        return res.json({
            success: true,
            user: req.user
        })
    }
    catch (error) {
        console.log(`[*] Error. Cannot Decode User ${error?.message || error}`);
        return res.status(500).json({
            status: false,
            message: "Internal Server Error"
        })


    }
})

// User Profile

router.get("/myprofile", authMiddleware, async function (req, res) {
    try {
        console.log("[*] GET /MyProfile");


        // Fetching User Id from Request Header
        const userId = req.user.id;

        // Fetching User from Redis Cache if its available
        const cachedUser = await redisClient.get(`user:${userId}`);

        if (!cachedUser) {

            console.log("[*] User Profile Information not available in cache. Quering Database");

            // Fetching User's data from database
            const [users] = await pool.execute(`SELECT userId,firstName,lastName,email,username,gender,latitude,longitude,bio,profile_picture,created_at,is_verified,date_of_birth FROM users WHERE userId = ? LIMIT 1`, [userId]);


            // If user doesnt exist
            if (users.length === 0) {

                console.log(`[*] GET /MyProfile : User not found`);

                return res.json({
                    status: false,
                    message: "User not found"
                })
            }

            // Storing User Info
            const user = users[0];

            console.log("[*] Console Logging User Info ", user);

            // Storing Data in Redis Cache

            await redisClient.set(`user:${userId}`, JSON.stringify(user),
                "EX",
                86400
            );
            console.log("[*] User Profile in Redis stored successfully");

            return res.status(200).json({
                status: true,
                message: "User Details fetched successfully",
                data: user,
            })
        }
        else {

            console.log(`[*] Redis Cache HIT`);
            return res.status(200).json({
                status: true,
                message: "User Details fetched sucessfully",
                data: JSON.parse(cachedUser)

            })
        }
    }
    catch (error) {
        return res.status(500).json({
            status: false,
            message: "Internal Server Error"
        })

    }
})

// Fetch User Devices
router.get("/mydevices", authMiddleware, async function (req, res) {
    try {
        console.log(`[*] GET /MyDevices`);

        // Fetching User Id
        console.log("[*] My Devices REQ.USER DATA ", req.user)
        const userId = req.user.id

        console.log("[*] User Id fetched ", userId)

        if (!Number.isInteger(userId) || userId <= 0) {
            return res.status(401).json({
                status: false,
                message: "Invalid User",
            })
        }

        console.log("[*] Fetched User Id ", userId);

        const [devices] = await pool.execute(
            `
        SELECT
            d.id,
            d.device_uuid,
            d.browser,
            d.browser_version,
            d.operating_system,
            d.os_version,
            d.device_type,
            d.device_vendor,
            d.device_model,

            ud.ip_address,
            ud.is_active,
            ud.last_seen_at,
            ud.created_at

            FROM user_devices ud

            INNER JOIN devices d
            ON d.id = ud.deviceId

            WHERE ud.userId = ?

            ORDER BY ud.last_seen_at DESC
            `,
            [userId]
        );

        console.log("[*] User Devices Info fetched ", devices);

        if (devices.length === 0) {

            // If No devices are stored in database
            return res.status(200).json({
                status: true,
                message: "User does not have any registered devices",
                devices: []
            })
        }

        return res.status(200).json({
            status: true,
            message: "User devices fetched successfully",
            devices: devices
        })
    }


    catch (error) {

        console.log(`[*] Error in fetching User Devices ${error?.message || error} `)

        return res.status(500).json({
            status: false,
            message: "Error fetching user devices"
        })


    }
})

// CRUD Operations

// Update First Name

router.post("/updateFirstName", authMiddleware, async function (req, res) {

    try {
        const firstName = cleanXSS(req.body.firstName)?.trim();
        console.log("[*] Fetched First Name", firstName);


        if (!firstName) {
            return res.status(400).json({
                status: false,
                message: "First name is required"
            })
        }


        if (!lettersOnlyValidationRegex.test(firstName)) {
            return res.status(400).json({
                status: false,
                message: "First name can only contain letters"
            })
        }

        if (firstName.length < 2) {
            return res.status(400).json({
                status: false,
                message: "First name should be at least 2 characters. (We remember you Om) Are you a person or a variable?"
            })
        }

        if (firstName.length > 50) {
            return res.status(400).json({
                status: false,
                message: "First name cannot exceed 50 characters"
            });
        }

        const formattedName = formatName(firstName);

        // Fetching User
        const userId = req.user.id;

        // Updating Name in database
        const query = `UPDATE users SET firstName = ? WHERE userId = ?`;
        const [result] = await pool.execute(query, [formattedName, userId]);

        // If Database updation failed
        if (result.affectedRows === 0) {
            return res.status(404).json({
                status: false,
                message: "No records updated"
            });
        }


        // Result

        const cachedUser = await redisClient.get(`user:${userId}`);

        if (cachedUser) {
            console.log("[*] User present in Cache")

            const user = JSON.parse(cachedUser);

            user.firstName = formattedName;

            await redisClient.set(`user:${userId}`, JSON.stringify(user), "EX", 86400)
        }

        // Result 

        return res.status(200).json({
            status: true,
            message: "First Name updated successfully"
        });
    }
    catch (error) {
        console.log("[*] Error while updating first name ", error?.message || error);
        return res.status(500).json({
            status: false,
            message: "Internal Server Error"
        })
    }

})

// Update Last Name

router.post("/updateLastName", authMiddleware, async function (req, res) {

    try {
        const lastName = cleanXSS(req.body.lastName)?.trim();
        console.log("[*] Fetched Last Name", lastName);


        if (!lastName) {
            return res.status(400).json({
                status: false,
                message: "Last name is required"
            })
        }


        if (!lettersOnlyValidationRegex.test(lastName)) {
            return res.status(400).json({
                status: false,
                message: "Last name can only contain letters"
            })
        }

        if (lastName.length < 2) {
            return res.status(400).json({
                status: false,
                message: "Last name should be at least 2 characters. Are you a person or a variable?"
            })
        }

        if (lastName.length > 50) {
            return res.status(400).json({
                status: false,
                message: "Last name cannot exceed 50 characters"
            });
        }

        const formattedName = formatName(lastName);

        // Fetching User
        const userId = req.user.id;

        // Updating Name in database
        const query = `UPDATE users SET lastName = ? WHERE userId = ?`;
        const [result] = await pool.execute(query, [formattedName, userId]);

        // If Database updation failed
        if (result.affectedRows === 0) {
            return res.status(404).json({
                status: false,
                message: "No records updated"
            });
        }


        // Result

        const cachedUser = await redisClient.get(`user:${userId}`);

        if (cachedUser) {
            console.log("[*] User present in Cache")

            const user = JSON.parse(cachedUser);

            user.lastName = formattedName;

            await redisClient.set(`user:${userId}`, JSON.stringify(user), "EX", 86400)
        }

        return res.status(200).json({
            status: true,
            message: "Last Name updated successfully"
        });
    }
    catch (error) {
        console.log("[*] Error while updating last name ", error?.message || error);
        return res.status(500).json({
            status: false,
            message: "Internal Server Error"
        })
    }

})

// Update Email Address

router.post("/updateEmail", authMiddleware, async function (req, res) {

    try {
        const emailAddress = cleanXSS(req.body.emailAddress)?.trim()?.toLowerCase();
        const emailDomain = emailAddress?.split("@")[1]?.trim()?.toLowerCase();
        console.log("[*] Fetched Email Address", emailAddress);

        // Fetching User
        const userId = req.user.id;

        // Validating Email Response
        if (!emailAddress) {
            return res.status(400).json({
                status: false,
                message: "Email Address is required"
            })
        }

        // Validating Email Structure
        if (!emailRegex.test(emailAddress)) {
            return res.status(400).json({
                status: false,
                message: "Invalid Email Address format"
            })
        }

        // Validating Email Min length
        if (emailAddress?.length < 5) {
            return res.status(400).json({
                status: false,
                message: "Email Address should be at least 5 characters"
            })
        }

        // Validating Email Max Length
        if (emailAddress?.length > 50) {
            return res.status(400).json({
                status: false,
                message: "Email Address cannot exceed 50 characters"
            });
        }

        // Validating Email Authenticity
        if (blockedEmailDomains?.has(emailDomain) || disposableDomains?.includes(emailDomain)) {
            return res.status(400).json({
                status: false,
                message: "Temporary Email Addresses are not allowed"
            });
        }

        // Validating Email Duplication

        const duplicationQuery = `SELECT userId from Users WHERE email = ? LIMIT 1`;
        const [duplicationResults] = await pool.execute(duplicationQuery, [emailAddress]);
        const userIdFetchedFromDb = duplicationResults[0]?.userId;

        if (duplicationResults.length > 0) {

            if (Number(userId) === Number(userIdFetchedFromDb)) {

                return res.status(400).json({
                    status: false,
                    message: "New email address must be different from current email address"
                })
            }

            return res.status(409).json({
                status: false,
                message: "User with that email address already exists"
            })
        }


        // Updating Email in database
        const query = `UPDATE users SET email = ? WHERE userId = ?`;
        const [result] = await pool.execute(query, [emailAddress, userId]);

        // Storing in Redis Cache

        const cachedUser = await redisClient.get(`user:${userId}`);

        if (cachedUser) {
            console.log("[*] User present in Cache")

            const user = JSON.parse(cachedUser);

            user.email = emailAddress;

            await redisClient.set(`user:${userId}`, JSON.stringify(user), "EX", 86400)
        }

        // Result 

        return res.status(200).json({
            status: true,
            message: "Email updated successfully"
        });
    }
    catch (error) {
        console.log("[*] Error while updating Email Address ", error?.message || error);
        return res.status(500).json({
            status: false,
            message: "Internal Server Error"
        })
    }

});

// Updating Username

router.post("/updateUsername", authMiddleware, async function (req, res) {
    try {
        console.log("[*] Reached update username route");

        // Fetching username from Request Body
        const username = cleanXSS(req.body?.username)?.trim()?.toLowerCase();

        // Fetching User Id from Request Header
        const userId = req.user.id;
        console.log("[*] User Id:", userId);

        if (!username || username === "") {
            return res.status(400).json({
                status: false,
                message: "Username is required"
            })
        }

        if (!usernameRegex.test(username)) {
            return res.status(400).json({
                status: false,
                message: "Username can only contain letters, underscores and numbers. First character should be a letter"
            })
        }


        if (emailRegex.test(username)) {
            return res.status(400).json({
                status: false,
                error: "Username cannot be an email address"
            });
        }

        if (username.length < 3 || username.length > 16) {
            return res.status(400).json({
                status: false,
                error: "Username must be between 3 and 16 characters"
            });
        }

        // Checking username from database

        const searchUsernameQuery = `SELECT userId FROM users WHERE username = ? LIMIT 1`

        const [usernameResult] = await pool.execute(searchUsernameQuery, [username]);

        const takenUsernameUserId = usernameResult[0].userId;

        if (takenUsernameUserId == userId) {

            return res.status(400).json({
                status: false,
                message: "Your new username cannot be your current username"
            })
        }

        if (usernameResult.length !== 0) {
            return res.status(409).json({
                status: false,
                message: "Username already exists. Please choose a different username "
            })
        }

        // Update username query if all validations cleared
        const updateQuery = `UPDATE users SET username = ? where userId = ?`;

        const [updateUsername] = await pool.execute(updateQuery, [username, userId]);

        if (updateUsername.changedRows !== 0) {
            return res.status(200).json({
                status: true,
                message: "Username updated successfully"

            })
        }
        else {
            return res.status(500).json({
                status: false,
                message: "Cannot update username. Please try again later"
            })
        }

    }
    catch (error) {
        console.log("[*] Error in Updating Username ", error?.message || error);

        return res.status(500).json({
            status: false,
            message: "Internal Server Error"
        })
    }
})

// Updating Password 

router.post("/updatePassword", authMiddleware, async function (req, res) {
    try {

        const oldPassword = req.body.oldPassword?.trim();
        const newPassword = req.body.newPassword?.trim();
        const confirmNewPassword = req.body.confirmNewPassword?.trim();
        const userIpAddress = req.ip;

        if (!oldPassword) {
            return res.status(400).json({
                status: false,
                error: "Old password is required"
            });
        }

        if (!newPassword) {
            return res.status(400).json({
                status: false,
                error: "New password is required"
            });
        }

        if (!confirmNewPassword) {
            return res.status(400).json({
                status: false,
                error: "Confirm password is required"
            });
        }


        const passwordRegex =
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;

        // Validating Strong Password
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({
                status: false,
                error: "Password must contain uppercase, lowercase and number"
            });
        }

        if (newPassword !== confirmNewPassword) {
            return res.status(400).json({
                status: false,
                error: "New password and confirm password should match"
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                status: false,
                error: "Password should atleast be 6 characters"
            });
        }

        if (oldPassword === newPassword) {
            return res.status(400).json({
                status: false,
                error: "New password must be different from old password"
            });
        }

        const [users] = await pool.execute(
            "SELECT firstName, email, password FROM users WHERE userId = ? LIMIT 1",
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                status: false,
                error: "User not found"
            });
        }

        const dbUserPassword = users[0].password;
        const dbUserFirstName = users[0].firstName;
        const dbUserEmail = users[0].email;

        // Comparing Old Database Password with User entered password
        const isPasswordMatch = await bcrypt.compare(oldPassword, dbUserPassword);

        if (!isPasswordMatch) {
            return res.status(400).json({
                status: false,
                error: "Old password is incorrect"
            });
        }

        // Hash new password
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        // Update Hashed Password to the database
        await pool.execute(
            "UPDATE users SET password = ? WHERE userId = ?",
            [hashedNewPassword, req.user.id]
        );

        // Invalidating cache temporarily
        await redisClient.del(`user:${req.user.id}`);

        try {

            await sendEmail(
                dbUserEmail,
                "Your Password has been changed",
                confirmPasswordResetTemplate(dbUserFirstName, userIpAddress)
            );
        }
        catch (error) {
            console.log("[*] Error in sending Update Password Confirmation Email")
        }


        return res.status(200).json({
            status: true,
            message: "Password updated successfully"
        });
    }


    catch (error) {

        console.error(
            "[*] Error updating password:",
            error?.message || error
        );

        return res.status(500).json({
            status: false,
            error: "Internal Server Error"
        });

    }
});

// Forgot Password

router.post("/forgotPassword", async function (req, res) {

    try {
        console.log("[*] User hit POST/ Reset Password");

        const emailAddress = req?.body?.emailAddress;

        console.log(`[*] Initiating Password Reset for ${emailAddress} `)

        // Validating Email Existence
        if (!emailAddress) {

            return res.status(400).json({
                status: false,
                error: "Please enter a valid email address"
            });
        }

        // Validating Email Structure
        if (!emailRegex.test(emailAddress)) {
            return res.status(400).json({
                status: false,
                message: "Invalid Email Address format"
            })
        }

        // Validating Email Min length
        if (emailAddress?.length < 5) {
            return res.status(400).json({
                status: false,
                message: "Email Address should be at least 5 characters"
            })
        }

        // Validating Email Max Length
        if (emailAddress?.length > 50) {
            return res.status(400).json({
                status: false,
                message: "Email Address cannot exceed 50 characters"
            });
        }

        // Validating Email Authenticity
        if (blockedEmailDomains?.has(emailDomain) || disposableDomains?.includes(emailDomain)) {
            return res.status(400).json({
                status: false,
                message: "Temporary Email Addresses are not allowed"
            });
        }

        // Email Address to confirm User Authenticity
        const confirmAccountQuery = `SELECT userId,firstName,lastName FROM users WHERE EmailAddress = ?`;

        const [user] = await pool.execute(confirmAccountQuery, [emailAddress]);

        if (user.length === 0) {
            console.log("[*] No Email Address found for Password Reset");

            return res.status(200).json({
                status: true,
                message: "If an account with that email address exists, a password reset link has been sent. Please check your email and follow the instructions to reset your password."
            });

        }
        else {

            const userId = user[0].userId; // Primary Index of the Queried user
            const firstName = user[0].firstName // First Name of the Queried user
            const lastName = user[0].lastName // Last Name of the Queried user
            const userFullName = `${firstName} ${lastName}`; // Full Name of the Queried user
            const userIpAddress = req?.ip; // IP Address of the originating request


            console.log("[*] UserId of the queried user ", userId);
            console.log("[*] Initiating Password Reset Process");

            // Generated Reset Password Token
            const resetToken = crypto.randomBytes(32).toString("hex");

            console.log("[*] Raw Reset Token has been generated ", resetToken);

            // Hashing the Reset Password Token using SHA256
            const hashedResetToken = crypto
                .createHash("sha256")
                .update(resetToken)
                .digest("hex");

            console.log("[*] Hashed Reset Token has been generated ", hashedResetToken);

            // Reset Password Token Expiry
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 Minutes expiry time

            // Adding Reset Password Token and Expiry Time in Database
            const resetPasswordQuery = `UPDATE users SET resetPasswordToken = ?, resetPasswordExpiryTime = ? WHERE emailAddress = ?`;

            // Querying Database
            const [passwordResetRows] = await pool.execute(resetPasswordQuery, [hashedResetToken, expiresAt, emailAddress]);

            // Verifying Password Reset Rows Updation
            if (passwordResetRows.affectedRows !== 1) {

                console.error("[*] Failed to update password reset token in database.");

                return res.status(500).json({
                    status: false,
                    message: "Internal Server Error"
                });
            }

            // URL Generation for Password Reset


            const passwordResetUrl = `${BASE_URL}resetPassword?token=${resetToken}`;

            try {

                await sendEmail(
                    emailAddress,
                    "Somebody requested for your Shadow Chat Password",
                    forgotPasswordResetTemplate(userFullName, passwordResetUrl, userIpAddress)
                );
            }
            catch (error) {
                console.log("[*] Error in sending Update Password Confirmation Email");

                return res.status(500).json({
                    status: false,
                    error: "Internal Server Error"
                });
            }



            // Yet to add 

            return res.status(200).json({
                status: true,
                message: "If an account with that email address exists, a password reset link has been sent. Please check your email and follow the instructions to reset your password."
            });
        }
    }
    catch (error) {

        console.error("[*] Error in POST/ Reset Password ", error?.message || error);

        return res.status(500).json({
            status: false,
            error: "Internal Server Error"
        });
    }

});

// Reset Forgotten Password

router.get("/resetPassword", async function (req, res) {

    try {
        console.log("[*] Reset Password API Hit")
    }
    catch (error) {

        console.error("[*] Error in POST/ Reset Password ", error?.message || error);

        return res.status(500).json({
            status: false,
            error: "Internal Server Error"
        });

    }

})

// Delete Account

router.post("/deleteAccount", authMiddleware, async function (req, res) {
    try {
        console.log("[*] Reached delete account route");

        // Checking wheater user owns any communities/chatrooms

    }
    catch (error) {

        console.log("[*] Error in Delete Account Route ", error?.message || error)

        res.status(500).json({
            status: false,
            message: "Internal Server Error"
        })

    }
})

module.exports = router;
