const test = require("node:test");
const assert = require("node:assert/strict");
const {
    SCHEDULE_HOUR,
    RECORD_RETENTION_MS,
    contextKey,
    getOrSyncCalendarDay,
    millisecondsUntilNextRun,
    syncTodayIfMissed
} = require("../services/hinduCalendarDailySync");
const mongoose = require("mongoose");

test("schedules the next 11:00 AM Asia/Kolkata run", () => {
    const beforeEleven = new Date("2026-10-23T05:29:50.000Z"); // 10:59:50 IST
    const atEleven = new Date("2026-10-23T05:30:00.000Z"); // 11:00:00 IST

    assert.equal(SCHEDULE_HOUR, 11);
    assert.equal(millisecondsUntilNextRun("Asia/Kolkata", beforeEleven), 10_000);
    assert.equal(millisecondsUntilNextRun("Asia/Kolkata", atEleven), 86_400_000);
});

test("catches up a missing record after the daily schedule and does not overwrite an existing one", async () => {
    const context = { location_id: 1, tz: "Asia/Kolkata", lang: "en" };
    let synced = 0;
    const Record = {
        async exists() {
            return null;
        }
    };
    const sync = async ({ calendarDate, context: receivedContext }) => {
        synced += 1;
        assert.equal(calendarDate, "2026-10-23");
        assert.equal(contextKey(receivedContext), contextKey(context));
        return { calendarDate };
    };

    await syncTodayIfMissed({
        context,
        now: new Date("2026-10-23T06:00:00.000Z"),
        Record,
        sync
    });
    assert.equal(synced, 1);
});

test("returns an unexpired MongoDB calendar record without calling the provider", async () => {
    const context = { location_id: 1, tz: "Asia/Kolkata", lang: "en" };
    const now = new Date("2026-10-23T06:00:00.000Z");
    const originalState = mongoose.connection.readyState;
    mongoose.connection.readyState = 1;

    try {
        const response = await getOrSyncCalendarDay({
            calendarDate: "2026-10-23",
            context,
            now: () => now,
            service: { async getDailyOccasions() { throw new Error("provider must not be called"); } },
            Record: {
                findOne(filter) {
                    assert.equal(filter.calendarDate, "2026-10-23");
                    assert.deepEqual(filter.expiresAt, { $gt: now });
                    return {
                        async lean() {
                            return {
                                calendarDate: "2026-10-23",
                                provider: "TathaAstu",
                                occasions: [{ name: "Panchak" }],
                                calendar: { festivals: [], special_day_flags: { is_panchak: true } }
                            };
                        }
                    };
                }
            }
        });

        assert.equal(response.storage, "mongodb");
        assert.equal(response.cached, true);
        assert.deepEqual(response.occasions, [{
            event_key: "IS_PANCHAK",
            name: "Panchak",
            type: "PANCHANG_SPECIAL_DAY",
            source: "special_day_flags"
        }]);
    } finally {
        mongoose.connection.readyState = originalState;
    }
});

test("retains newly stored daily records for exactly two days", () => {
    assert.equal(RECORD_RETENTION_MS, 172_800_000);
});
