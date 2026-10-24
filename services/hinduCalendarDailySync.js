const mongoose = require("mongoose");

const HinduCalendarDailyRecord = require("../models/HinduCalendarDailyRecord");
const {
    DEFAULT_TIME_ZONE,
    dateInTimeZone,
    extractOccasions,
    hinduCalendarService
} = require("./hinduCalendarService");

const SCHEDULE_HOUR = 11;
const SCHEDULE_MINUTE = 0;
const RECORD_RETENTION_MS = 2 * 24 * 60 * 60 * 1000;
let scheduledTimer = null;

function getTimeParts(timeZone, now = new Date()) {
    const values = Object.fromEntries(
        new Intl.DateTimeFormat("en-US", {
            timeZone,
            hourCycle: "h23",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        }).formatToParts(now)
            .filter(({ type }) => type !== "literal")
            .map(({ type, value }) => [type, Number(value)])
    );
    return values;
}

function millisecondsUntilNextRun(timeZone = DEFAULT_TIME_ZONE, now = new Date()) {
    const { hour, minute, second } = getTimeParts(timeZone, now);
    const currentSeconds = hour * 3600 + minute * 60 + second;
    const targetSeconds = SCHEDULE_HOUR * 3600 + SCHEDULE_MINUTE * 60;
    const secondsUntilRun = currentSeconds < targetSeconds
        ? targetSeconds - currentSeconds
        : 24 * 60 * 60 - currentSeconds + targetSeconds;

    return secondsUntilRun * 1000;
}

function scheduledContext() {
    const context = {
        lang: (process.env.HINDU_CALENDAR_LANG || "en").trim() || "en",
        tz: (process.env.HINDU_CALENDAR_TIME_ZONE || DEFAULT_TIME_ZONE).trim() || DEFAULT_TIME_ZONE
    };
    const locationId = Number.parseInt(process.env.HINDU_CALENDAR_LOCATION_ID, 10);
    const lat = Number(process.env.HINDU_CALENDAR_LAT);
    const lon = Number(process.env.HINDU_CALENDAR_LON);

    if (Number.isInteger(locationId) && locationId > 0) {
        context.location_id = locationId;
    } else if (Number.isFinite(lat) && Number.isFinite(lon)) {
        context.lat = lat;
        context.lon = lon;
    } else {
        // TathaAstu's documented default location is New Delhi.
        context.location_id = 1;
    }

    const region = (process.env.HINDU_CALENDAR_REGION || "").trim();
    const content = (process.env.HINDU_CALENDAR_CONTENT || "").trim();
    if (region) context.region = region;
    if (content) context.content = content;
    return context;
}

function contextKey(context) {
    return JSON.stringify(Object.fromEntries(
        Object.entries(context)
            .filter(([key]) => key !== "content")
            .sort(([left], [right]) => left.localeCompare(right))
    ));
}

function recordResponse(record) {
    return {
        provider: record.provider,
        date: record.calendarDate,
        occasions: extractOccasions(record.calendar),
        festivals: record.calendar?.festivals || [],
        calendar: record.calendar,
        data: record.calendar,
        providerSyncedAt: record.providerSyncedAt,
        expiresAt: record.expiresAt,
        cached: true,
        storage: "mongodb"
    };
}

async function syncCalendarDay({
    calendarDate,
    context = scheduledContext(),
    service = hinduCalendarService,
    Record = HinduCalendarDailyRecord,
    now = () => new Date()
} = {}) {
    if (mongoose.connection.readyState !== 1) {
        throw new Error("Hindu calendar sync requires an active MongoDB connection");
    }

    const date = calendarDate || dateInTimeZone(context.tz || DEFAULT_TIME_ZONE);
    const response = await service.getDailyOccasions({ ...context, date });
    const syncedAt = now();
    const expiresAt = new Date(syncedAt.getTime() + RECORD_RETENTION_MS);
    const record = await Record.findOneAndUpdate(
        { calendarDate: date, contextKey: contextKey(context) },
        {
            $set: {
                context,
                provider: response.provider,
                occasions: response.occasions || response.festivals || [],
                calendar: response.calendar || response.data,
                providerSyncedAt: syncedAt,
                expiresAt
            },
            $setOnInsert: {
                calendarDate: date,
                contextKey: contextKey(context)
            }
        },
        { returnDocument: "after", upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).lean();

    return record;
}

async function getOrSyncCalendarDay({
    calendarDate,
    context = scheduledContext(),
    service = hinduCalendarService,
    Record = HinduCalendarDailyRecord,
    now = () => new Date()
} = {}) {
    if (mongoose.connection.readyState !== 1) {
        const error = new Error("Hindu calendar cache requires an active MongoDB connection");
        error.code = "HINDU_CALENDAR_STORAGE_UNAVAILABLE";
        error.status = 503;
        throw error;
    }

    const date = calendarDate || dateInTimeZone(context.tz || DEFAULT_TIME_ZONE);
    const currentTime = now();
    const record = await Record.findOne({
        calendarDate: date,
        contextKey: contextKey(context),
        expiresAt: { $gt: currentTime }
    }).lean();

    if (record) return recordResponse(record);

    const synced = await syncCalendarDay({ calendarDate: date, context, service, Record, now });
    return recordResponse(synced);
}

async function syncTodayIfMissed({
    context = scheduledContext(),
    now = new Date(),
    Record = HinduCalendarDailyRecord,
    sync = syncCalendarDay
} = {}) {
    const timeZone = context.tz || DEFAULT_TIME_ZONE;
    const { hour, minute } = getTimeParts(timeZone, now);
    if (hour < SCHEDULE_HOUR || (hour === SCHEDULE_HOUR && minute < SCHEDULE_MINUTE)) return null;

    const calendarDate = dateInTimeZone(timeZone, now);
    const existing = await Record.exists({ calendarDate, contextKey: contextKey(context) });
    if (existing) return null;

    return sync({ calendarDate, context });
}

function scheduleNextSync({ context = scheduledContext(), sync = getOrSyncCalendarDay } = {}) {
    const delay = millisecondsUntilNextRun(context.tz || DEFAULT_TIME_ZONE);
    scheduledTimer = setTimeout(async () => {
        try {
            await sync({ context });
            console.log("Hindu calendar daily record stored successfully");
        } catch (error) {
            console.error("Hindu calendar daily sync failed:", error.message);
        } finally {
            scheduleNextSync({ context, sync });
        }
    }, delay);
    // A scheduler must not keep a process alive while it is otherwise shutting down.
    scheduledTimer.unref?.();
    return scheduledTimer;
}

async function startHinduCalendarDailySync() {
    if (scheduledTimer) return;
    if (!process.env.TATHAASTU_API_KEY) {
        console.warn("Hindu calendar daily sync is disabled: TATHAASTU_API_KEY is not configured");
        return;
    }

    const context = scheduledContext();
    try {
        await syncTodayIfMissed({ context });
    } catch (error) {
        console.error("Unable to catch up the Hindu calendar daily record:", error.message);
    }

    scheduleNextSync({ context });
    console.log(`Hindu calendar daily sync scheduled for ${String(SCHEDULE_HOUR).padStart(2, "0")}:${String(SCHEDULE_MINUTE).padStart(2, "0")} ${context.tz}`);
}

function stopHinduCalendarDailySync() {
    if (scheduledTimer) clearTimeout(scheduledTimer);
    scheduledTimer = null;
}

module.exports = {
    SCHEDULE_HOUR,
    SCHEDULE_MINUTE,
    RECORD_RETENTION_MS,
    contextKey,
    getOrSyncCalendarDay,
    getTimeParts,
    millisecondsUntilNextRun,
    scheduledContext,
    scheduleNextSync,
    startHinduCalendarDailySync,
    stopHinduCalendarDailySync,
    syncCalendarDay,
    syncTodayIfMissed
};
