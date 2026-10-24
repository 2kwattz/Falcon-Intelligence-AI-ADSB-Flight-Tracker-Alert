const axios = require("axios");

const PROVIDER_NAME = "TathaAstu";
const PROVIDER_BASE_URL = "https://api.tathaastuapi.com/v1";
const DEFAULT_TIME_ZONE = "Asia/Kolkata";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function dateInTimeZone(timeZone = DEFAULT_TIME_ZONE, now = new Date()) {
    const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    });
    const parts = Object.fromEntries(
        formatter.formatToParts(now)
            .filter(({ type }) => type !== "literal")
            .map(({ type, value }) => [type, value])
    );

    return `${parts.year}-${parts.month}-${parts.day}`;
}

function extractFestivals(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.festivals)) return payload.festivals;
    if (payload?.festivals && typeof payload.festivals === "object") {
        return [
            ...(Array.isArray(payload.festivals.stored) ? payload.festivals.stored : []),
            ...(Array.isArray(payload.festivals.derived) ? payload.festivals.derived : [])
        ];
    }
    if (Array.isArray(payload?.calendar?.festivals)) return payload.calendar.festivals;
    if (Array.isArray(payload?.day?.festivals)) return payload.day.festivals;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.results)) return payload.results;
    return [];
}

function entriesForField(source, field) {
    const value = source[field];
    if (Array.isArray(value)) return value;
    if (field === "festivals" && value && typeof value === "object") {
        return [
            ...(Array.isArray(value.stored) ? value.stored : []),
            ...(Array.isArray(value.derived) ? value.derived : [])
        ];
    }
    return [];
}

function extractOccasions(payload) {
    const sources = [payload, payload?.calendar, payload?.day].filter(Boolean);
    const occasions = [];
    const seen = new Set();

    for (const source of sources) {
        for (const field of ["festivals", "vrats", "occasions", "events"]) {
            for (const item of entriesForField(source, field)) {
                const identity = item?.festival_key || item?.event_key || item?.id || JSON.stringify(item);
                if (seen.has(identity)) continue;
                seen.add(identity);
                occasions.push(item);
            }
        }

        if (source.special_day_flags && typeof source.special_day_flags === "object") {
            for (const [flag, active] of Object.entries(source.special_day_flags)) {
                if (active !== true) continue;
                const identity = `special:${flag}`;
                if (seen.has(identity)) continue;
                seen.add(identity);
                occasions.push({
                    event_key: flag.toUpperCase(),
                    name: flag.replace(/^is_/, "").split("_").map(
                        (word) => word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(" "),
                    type: "PANCHANG_SPECIAL_DAY",
                    source: "special_day_flags"
                });
            }
        }
    }

    return occasions;
}

function createHinduCalendarService({
    httpClient = axios,
    apiKey = process.env.TATHAASTU_API_KEY,
    now = () => Date.now()
} = {}) {
    const cache = new Map();
    const inFlight = new Map();

    function getCacheKey(params) {
        return JSON.stringify(Object.fromEntries(
            Object.entries(params).sort(([left], [right]) => left.localeCompare(right))
        ));
    }

    async function getDailyOccasions(options = {}) {
        if (!apiKey) {
            const error = new Error("Hindu calendar API is not configured");
            error.code = "HINDU_CALENDAR_NOT_CONFIGURED";
            throw error;
        }

        const params = {
            date: options.date || dateInTimeZone(options.tz || DEFAULT_TIME_ZONE),
            lang: options.lang || "en"
        };

        ["location_id", "lat", "lon", "tz", "region", "type", "tags", "festival_mode", "sampradaya", "content"]
            .forEach((key) => {
                if (options[key] !== undefined && options[key] !== null && options[key] !== "") {
                    params[key] = options[key];
                }
            });

        const cacheKey = getCacheKey(params);
        const cached = cache.get(cacheKey);
        if (cached && cached.expiresAt > now()) {
            return { ...cached.value, cached: true };
        }

        const existingRequest = inFlight.get(cacheKey);
        if (existingRequest) return existingRequest;

        const fetchOccasions = async () => {
            try {
            const response = await httpClient.get(`${PROVIDER_BASE_URL}/calendar/day`, {
                headers: { "X-API-Key": apiKey },
                params,
                timeout: 8000
            });
            const providerPayload = response.data;
            const value = {
                provider: PROVIDER_NAME,
                date: params.date,
                occasions: extractOccasions(providerPayload),
                // Kept for callers already using the original route response.
                festivals: extractFestivals(providerPayload),
                calendar: providerPayload,
                data: providerPayload,
                cached: false
            };

            cache.set(cacheKey, { value, expiresAt: now() + CACHE_TTL_MS });
            return value;
            } catch (cause) {
                const error = new Error("Unable to retrieve Hindu calendar occasions");
                error.code = "HINDU_CALENDAR_PROVIDER_ERROR";
                error.status = cause.response?.status || 502;
                error.details = cause.response?.data?.message || cause.response?.data?.error || cause.message;
                throw error;
            } finally {
                inFlight.delete(cacheKey);
            }
        };

        const request = fetchOccasions();
        inFlight.set(cacheKey, request);
        return request;
    }

    return { getDailyOccasions };
}

module.exports = {
    DEFAULT_TIME_ZONE,
    createHinduCalendarService,
    dateInTimeZone,
    extractFestivals,
    extractOccasions,
    hinduCalendarService: createHinduCalendarService()
};
