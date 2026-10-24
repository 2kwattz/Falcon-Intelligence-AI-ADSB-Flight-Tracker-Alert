const express = require("express");
const { hinduCalendarService } = require("../services/hinduCalendarService");
const { getOrSyncCalendarDay, scheduledContext } = require("../services/hinduCalendarDailySync");

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const REGION_PATTERN = /^(?:NORTH_INDIA|SOUTH_INDIA|EAST_INDIA|WEST_INDIA|NEPAL|KASHMIR|SRI_LANKA|IN-[A-Z]{2})$/;
const ALLOWED_TYPES = new Set(["VRAT", "FESTIVAL", "SANKRANTI"]);
const ALLOWED_SAMPRADAYAS = new Set(["smarta", "vaishnava"]);
const ALLOWED_FESTIVAL_MODES = new Set(["standard", "drik"]);

function asSingleValue(value) {
    return Array.isArray(value) ? null : value;
}

function validDate(value) {
    if (!DATE_PATTERN.test(value)) return false;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function validateQuery(query) {
    const values = Object.fromEntries(Object.entries(query).map(([key, value]) => [key, asSingleValue(value)]));
    const date = values.date;
    if (date && !validDate(date)) return "date must be a valid YYYY-MM-DD value";

    const locationId = values.location_id;
    if (locationId && (!/^\d+$/.test(locationId) || Number(locationId) < 1)) {
        return "location_id must be a positive integer";
    }

    const hasLatitude = values.lat !== undefined;
    const hasLongitude = values.lon !== undefined;
    if (hasLatitude !== hasLongitude) return "lat and lon must be supplied together";
    if (hasLatitude) {
        const latitude = Number(values.lat);
        const longitude = Number(values.lon);
        if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return "lat must be between -90 and 90";
        if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return "lon must be between -180 and 180";
    }

    if (values.region && !REGION_PATTERN.test(values.region)) {
        return "region must be a supported India state code or regional tradition";
    }
    if (values.type && !ALLOWED_TYPES.has(values.type)) return "type must be VRAT, FESTIVAL, or SANKRANTI";
    if (values.sampradaya && !ALLOWED_SAMPRADAYAS.has(values.sampradaya)) return "sampradaya must be smarta or vaishnava";
    if (values.festival_mode && !ALLOWED_FESTIVAL_MODES.has(values.festival_mode)) return "festival_mode must be standard or drik";
    if (values.lang && !/^[a-z]{2}(?:-[A-Z]{2})?$/.test(values.lang)) return "lang must be an ISO language code";
    if (values.tz) {
        try {
            Intl.DateTimeFormat(undefined, { timeZone: values.tz });
        } catch {
            return "tz must be a valid IANA time zone";
        }
    }

    return null;
}

function calendarContext(query) {
    const context = scheduledContext();
    const fields = ["tz", "region", "lang", "type", "tags", "festival_mode", "sampradaya", "content"];
    for (const field of fields) {
        if (query[field] !== undefined) context[field] = query[field];
    }

    if (query.location_id !== undefined) {
        context.location_id = Number(query.location_id);
        delete context.lat;
        delete context.lon;
    } else if (query.lat !== undefined) {
        context.lat = Number(query.lat);
        context.lon = Number(query.lon);
        delete context.location_id;
    }

    return context;
}

function createHinduFestivalRouter({ calendarService = hinduCalendarService, getDailyRecord = getOrSyncCalendarDay } = {}) {
    const router = express.Router();

    async function getHinduFestivals(req, res) {
        const query = {
            ...req.query,
            ...(req.params.date ? { date: req.params.date } : {})
        };
        const validationError = validateQuery(query);
        if (validationError) {
            return res.status(400).json({ error: validationError });
        }

        try {
            const occasions = await getDailyRecord({
                calendarDate: query.date,
                context: calendarContext(query),
                service: calendarService
            });
            return res.json(occasions);
        } catch (error) {
            if (error.code === "HINDU_CALENDAR_NOT_CONFIGURED") {
                return res.status(503).json({
                    error: "Hindu calendar service is not configured",
                    setup: "Set TATHAASTU_API_KEY on the server."
                });
            }

            if (error.code === "HINDU_CALENDAR_STORAGE_UNAVAILABLE") {
                return res.status(503).json({
                    error: "Hindu calendar storage is unavailable"
                });
            }

            console.error("Hindu calendar provider request failed:", error.details || error.message);
            return res.status(error.status || 502).json({
                error: "Unable to retrieve Hindu calendar occasions",
                provider: "TathaAstu"
            });
        }
    }

    // Primary, descriptive endpoints.
    router.get("/today", getHinduFestivals);
    // Compatibility with the first integration path.
    router.get("/daily", getHinduFestivals);
    router.get("/:date", getHinduFestivals);
    return router;
}

module.exports = createHinduFestivalRouter();
module.exports.createHinduFestivalRouter = createHinduFestivalRouter;
