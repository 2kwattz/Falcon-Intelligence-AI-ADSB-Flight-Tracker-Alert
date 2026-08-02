const trackedAircraftRedisClient = require("./trackedAircraftRedisClient");
const { isDeepStrictEqual } = require("node:util");

const TRACKED_AIRCRAFT_TTL_SECONDS = 5 * 24 * 60 * 60;
const TRACKED_AIRCRAFT_KEY_PREFIX = "tracked-aircraft:";

const normalizeHexCode = (hexCode) => (
    typeof hexCode === "string" ? hexCode.trim().toUpperCase() : null
);

const getTrackedAircraftKey = (icao) => `${TRACKED_AIRCRAFT_KEY_PREFIX}${icao}`;

const normalizeTypeCode = (typeCode) => (
    typeof typeCode === "string" && typeCode.trim()
        ? typeCode.trim().toUpperCase()
        : undefined
);

const hasValue = (value) => (
    value !== undefined && value !== null && value !== ""
);

const removeEmptyValues = (aircraft) => Object.fromEntries(
    Object.entries(aircraft).filter(([, value]) => hasValue(value))
);

const parseCachedAircraft = (cachedAircraft) => {
    if (!cachedAircraft) {
        return {};
    }

    try {
        return JSON.parse(cachedAircraft);
    } catch (error) {
        console.warn("[*] Replacing invalid tracked-aircraft cache entry:", error.message);
        return {};
    }
};

async function cacheTrackedAircraft(aircraft) {
    const icao = normalizeHexCode(aircraft?.hex);

    if (!icao) {
        return false;
    }

    const key = getTrackedAircraftKey(icao);
    const existingAircraft = parseCachedAircraft(await trackedAircraftRedisClient.get(key));
    const latestAircraftData = removeEmptyValues(aircraft);
    const { trackedAt, lastUpdatedAt, ...existingAircraftData } = existingAircraft;

    // ADS-B feeds can omit metadata in individual messages. Preserve previously
    // observed fields while accepting any newer position or Mode-S data.
    const cachedAircraftData = removeEmptyValues({
        ...existingAircraftData,
        ...latestAircraftData,
        hex: icao,
        registration: latestAircraftData.registration
            ?? latestAircraftData.r
            ?? existingAircraftData.registration
            ?? existingAircraftData.r,
        callsign: latestAircraftData.callsign
            ?? latestAircraftData.flight?.trim()
            ?? existingAircraftData.callsign
            ?? existingAircraftData.flight?.trim(),
        aircraftType: latestAircraftData.aircraftType
            ?? latestAircraftData.t
            ?? existingAircraftData.aircraftType
            ?? existingAircraftData.t,
        typeCode: normalizeTypeCode(latestAircraftData.t)
            ?? normalizeTypeCode(latestAircraftData.typeCode)
            ?? existingAircraftData.typeCode
            ?? normalizeTypeCode(existingAircraftData.t),
        description: latestAircraftData.description
            ?? latestAircraftData.desc
            ?? existingAircraftData.description
            ?? existingAircraftData.desc,
        operator: latestAircraftData.operator
            ?? latestAircraftData.ownOp
            ?? existingAircraftData.operator
            ?? existingAircraftData.ownOp
    });

    if (isDeepStrictEqual(cachedAircraftData, existingAircraftData)) {
        // No field changed, so leave the cached JSON untouched but retain it for
        // five days from the most recent sighting.
        await trackedAircraftRedisClient.expire(key, TRACKED_AIRCRAFT_TTL_SECONDS);
        return false;
    }

    const updatedAt = new Date().toISOString();

    await trackedAircraftRedisClient.set(
        key,
        JSON.stringify({
            ...cachedAircraftData,
            trackedAt: updatedAt,
            lastUpdatedAt: updatedAt
        }),
        "EX",
        TRACKED_AIRCRAFT_TTL_SECONDS
    );

    return true;
}

async function getTrackedAircrafts() {
    let cursor = "0";
    const keys = [];

    do {
        const [nextCursor, batchKeys] = await trackedAircraftRedisClient.scan(
            cursor,
            "MATCH",
            `${TRACKED_AIRCRAFT_KEY_PREFIX}*`,
            "COUNT",
            100
        );

        cursor = nextCursor;
        keys.push(...batchKeys);
    } while (cursor !== "0");

    if (keys.length === 0) {
        return [];
    }

    const cachedAircraft = await trackedAircraftRedisClient.mget(keys);

    return cachedAircraft
        .filter(Boolean)
        .flatMap((cachedValue) => {
            try {
                return [JSON.parse(cachedValue)];
            } catch (error) {
                console.warn("[*] Ignoring invalid tracked-aircraft cache entry:", error.message);
                return [];
            }
        })
        .sort((first, second) => (
            new Date(second.trackedAt).getTime() - new Date(first.trackedAt).getTime()
        ));
}

module.exports = {
    TRACKED_AIRCRAFT_TTL_SECONDS,
    cacheTrackedAircraft,
    getTrackedAircrafts
};
