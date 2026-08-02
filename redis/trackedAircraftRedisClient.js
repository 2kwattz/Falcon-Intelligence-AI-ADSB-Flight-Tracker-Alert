const { Redis } = require("ioredis");

const configuredDatabase = process.env.TRACKED_AIRCRAFTS_REDIS_DB;
const parsedDatabase = Number(configuredDatabase);
const trackedAircraftRedisDatabase = (
    configuredDatabase !== undefined
    && configuredDatabase !== ""
    && Number.isInteger(parsedDatabase)
    && parsedDatabase >= 0
)
    ? parsedDatabase
    : 1;

// This client uses a different Redis logical database so its keys and expiry
// policy are completely isolated from the application's existing Redis cache.
const trackedAircraftRedisClient = new Redis({
    host: process.env.TRACKED_AIRCRAFTS_REDIS_HOST || process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.TRACKED_AIRCRAFTS_REDIS_PORT || process.env.REDIS_PORT) || 6379,
    db: trackedAircraftRedisDatabase
});

module.exports = trackedAircraftRedisClient;
