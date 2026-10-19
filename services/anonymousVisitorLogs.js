const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");

const redisClient = require("../redis/redisClient");
const deviceParser = require("../utils/deviceParser");

const RETENTION_SECONDS = 24 * 60 * 60;
const INDEX_RETENTION_SECONDS = RETENTION_SECONDS + 60;
const VISITOR_INDEX_KEY = "visitor-log:index";
const VISITOR_SETTINGS_KEY = "visitor-log:settings:enabled";
const VISITOR_KEY_PREFIX = "visitor-log:visitor:";

function boundedEnvironmentInteger(name, fallback, minimum, maximum) {
    const value = Number.parseInt(process.env[name], 10);

    if (!Number.isInteger(value)) return fallback;
    return Math.min(Math.max(value, minimum), maximum);
}

const MAX_VISITORS = boundedEnvironmentInteger("VISITOR_LOG_MAX_RECORDS", 10000, 100, 50000);
const MAX_PAGES_PER_VISITOR = boundedEnvironmentInteger("VISITOR_LOG_MAX_PAGES", 50, 1, 200);
const DASHBOARD_RESULT_LIMIT = boundedEnvironmentInteger("VISITOR_LOG_DASHBOARD_LIMIT", 100, 1, 500);

const publicPageAliases = new Map([
    ["/", "/"],
    ["/index.html", "/"],
    ["/about", "/about"],
    ["/about.html", "/about"],
    ["/contact", "/contact"],
    ["/contact.html", "/contact"],
    ["/login", "/login"],
    ["/login.html", "/login"],
    ["/register", "/register"],
    ["/register.html", "/register"],
    ["/bangalore-status", "/bangalore-status"],
    ["/bangalore-status.html", "/bangalore-status"],
    ["/banglore-status", "/bangalore-status"],
    ["/delhi-status", "/delhi-status"],
    ["/delhi-status.html", "/delhi-status"],
    ["/hyderabad-status", "/hyderabad-status"],
    ["/hyderabad-status.html", "/hyderabad-status"],
    ["/explore", "/explore"],
    ["/explore.html", "/explore"],
    ["/tracked-aircrafts", "/tracked-aircrafts"],
    ["/tracked-aircrafts.html", "/tracked-aircrafts"],
    ["/live-map", "/live-map"],
    ["/live-map.html", "/live-map"]
]);

const recordVisitorScript = `
local enabled = redis.call("GET", KEYS[4])
if enabled == "0" then
    return "disabled"
end

local now = tonumber(ARGV[1])
local retention = tonumber(ARGV[2])
local indexRetention = tonumber(ARGV[3])
local maxVisitors = tonumber(ARGV[4])
local maxPages = tonumber(ARGV[5])
local visitorId = ARGV[6]
local ip = ARGV[7]
local browser = ARGV[8]
local device = ARGV[9]
local operatingSystem = ARGV[10]
local page = ARGV[11]
local timestamp = ARGV[12]

redis.call("ZREMRANGEBYSCORE", KEYS[3], "-inf", now - retention)

local exists = redis.call("EXISTS", KEYS[1])
if exists == 0 then
    if redis.call("ZCARD", KEYS[3]) >= maxVisitors then
        return "capacity-reached"
    end

    redis.call("HSET", KEYS[1],
        "ip", ip,
        "browser", browser,
        "device", device,
        "operatingSystem", operatingSystem,
        "firstSeen", timestamp,
        "lastSeen", timestamp
    )
    redis.call("EXPIRE", KEYS[1], retention)
    redis.call("ZADD", KEYS[3], now, visitorId)
end

if redis.call("SISMEMBER", KEYS[2], page) == 0 and redis.call("SCARD", KEYS[2]) < maxPages then
    redis.call("SADD", KEYS[2], page)

    if exists == 1 then
        redis.call("HSET", KEYS[1], "lastSeen", timestamp)
        redis.call("ZADD", KEYS[3], now, visitorId)
    end
end

-- The page set is created by SADD above, so its expiry must be applied only
-- after creation. This keeps page paths on the same 24-hour lifetime as the
-- visitor record rather than leaving a newly created set without a TTL.
if exists == 0 then
    redis.call("EXPIRE", KEYS[2], retention)
end

redis.call("EXPIRE", KEYS[3], indexRetention)
return "recorded"
`;

let lastRedisErrorAt = 0;

function reportRedisError(error) {
    const now = Date.now();
    if (now - lastRedisErrorAt < 60_000) return;

    lastRedisErrorAt = now;
    console.error("Visitor logging Redis error:", error.message);
}

function normalizeIp(ip) {
    const value = String(ip || "").trim();
    if (!value) return null;
    return value.startsWith("::ffff:") ? value.slice("::ffff:".length) : value.slice(0, 128);
}

function visitorIdForIp(ip) {
    const secret = process.env.VISITOR_LOG_HASH_SECRET
        || process.env.JWT_SECRET
        || process.env.JWT_SECRET_KEY
        || "falcon-intelligence-visitor-log";

    return crypto.createHmac("sha256", secret).update(ip).digest("hex");
}

function visitorKeys(visitorId) {
    const recordKey = `${VISITOR_KEY_PREFIX}${visitorId}`;
    return {
        recordKey,
        pagesKey: `${recordKey}:pages`
    };
}

function displayValue(...parts) {
    return parts
        .map((part) => String(part || "").trim())
        .filter(Boolean)
        .join(" ") || "Unknown";
}

function visitorDetails(req) {
    const parsed = deviceParser(req.get("user-agent") || "");
    const deviceName = displayValue(parsed.device.vendor, parsed.device.model);
    const deviceType = String(parsed.device.type || "").trim();
    let device = "Desktop";

    if (deviceName !== "Unknown") {
        device = deviceType ? `${deviceName} (${deviceType})` : deviceName;
    } else if (deviceType) {
        device = deviceType;
    }

    return {
        browser: displayValue(parsed.browser.name, parsed.browser.version),
        device,
        operatingSystem: displayValue(parsed.os.name, parsed.os.version)
    };
}

function validJwt(token, secret, options) {
    if (!token || !secret) return false;

    try {
        jwt.verify(token, secret, options);
        return true;
    } catch {
        return false;
    }
}

function hasAuthenticatedSession(req) {
    const mongoToken = req.cookies?.mongoToken
        || (req.get("authorization")?.startsWith("Bearer ")
            ? req.get("authorization").slice("Bearer ".length).trim()
            : null);
    const mongoSecret = process.env.JWT_SECRET || process.env.JWT_SECRET_KEY;

    if (validJwt(mongoToken, mongoSecret, {
        algorithms: ["HS256"],
        issuer: process.env.JWT_ISSUER || "falcon-intelligence",
        audience: process.env.JWT_AUDIENCE || "falcon-intelligence-web"
    })) {
        return true;
    }

    return validJwt(req.cookies?.token, process.env.JWT_SECRET_KEY, {
        algorithms: ["HS256"]
    });
}

function requestedPublicPage(req) {
    if (req.method !== "GET") return null;
    if (!String(req.get("accept") || "").includes("text/html")) return null;
    return publicPageAliases.get(req.path) || null;
}

async function recordAnonymousVisitor(req, page) {
    if (redisClient.status !== "ready") return false;

    const ip = normalizeIp(req.ip || req.socket?.remoteAddress);
    if (!ip) return false;

    const visitorId = visitorIdForIp(ip);
    const { recordKey, pagesKey } = visitorKeys(visitorId);
    const details = visitorDetails(req);
    const now = Math.floor(Date.now() / 1000);
    const timestamp = new Date().toISOString();

    try {
        await redisClient.eval(
            recordVisitorScript,
            4,
            recordKey,
            pagesKey,
            VISITOR_INDEX_KEY,
            VISITOR_SETTINGS_KEY,
            now,
            RETENTION_SECONDS,
            INDEX_RETENTION_SECONDS,
            MAX_VISITORS,
            MAX_PAGES_PER_VISITOR,
            visitorId,
            ip,
            details.browser,
            details.device,
            details.operatingSystem,
            page,
            timestamp
        );
        return true;
    } catch (error) {
        reportRedisError(error);
        return false;
    }
}

async function getVisitorLogSnapshot() {
    const base = {
        available: redisClient.status === "ready",
        enabled: true,
        retentionHours: 24,
        maxVisitors: MAX_VISITORS,
        maxPagesPerVisitor: MAX_PAGES_PER_VISITOR,
        totalVisitors: 0,
        visitors: []
    };

    if (!base.available) return base;

    const now = Math.floor(Date.now() / 1000);
    const oldestAllowed = now - RETENTION_SECONDS;

    try {
        const [enabledSetting] = await Promise.all([
            redisClient.get(VISITOR_SETTINGS_KEY),
            redisClient.zremrangebyscore(VISITOR_INDEX_KEY, "-inf", oldestAllowed)
        ]);
        const [visitorIds, totalVisitors] = await Promise.all([
            redisClient.zrevrangebyscore(
                VISITOR_INDEX_KEY,
                "+inf",
                oldestAllowed,
                "LIMIT",
                0,
                DASHBOARD_RESULT_LIMIT
            ),
            redisClient.zcount(VISITOR_INDEX_KEY, oldestAllowed, "+inf")
        ]);

        const pipeline = redisClient.pipeline();
        visitorIds.forEach((visitorId) => {
            const { recordKey, pagesKey } = visitorKeys(visitorId);
            pipeline.hgetall(recordKey);
            pipeline.smembers(pagesKey);
        });
        const records = visitorIds.length ? await pipeline.exec() : [];
        const visitors = [];

        for (let index = 0; index < visitorIds.length; index += 1) {
            const record = records[index * 2]?.[1] || {};
            const pages = records[index * 2 + 1]?.[1] || [];

            if (!record.ip || !record.firstSeen) continue;

            visitors.push({
                ip: record.ip,
                browser: record.browser || "Unknown",
                device: record.device || "Unknown",
                operatingSystem: record.operatingSystem || "Unknown",
                firstSeen: record.firstSeen,
                lastSeen: record.lastSeen || record.firstSeen,
                pages: pages.sort()
            });
        }

        return {
            ...base,
            enabled: enabledSetting !== "0",
            totalVisitors: Number(totalVisitors) || 0,
            visitors
        };
    } catch (error) {
        reportRedisError(error);
        return {
            ...base,
            available: false
        };
    }
}

async function setVisitorLoggingEnabled(enabled) {
    if (redisClient.status !== "ready") {
        throw new Error("Redis is unavailable");
    }

    try {
        await redisClient.set(VISITOR_SETTINGS_KEY, enabled ? "1" : "0");
        return enabled;
    } catch (error) {
        reportRedisError(error);
        throw error;
    }
}

module.exports = {
    getVisitorLogSnapshot,
    hasAuthenticatedSession,
    recordAnonymousVisitor,
    requestedPublicPage,
    setVisitorLoggingEnabled
};
