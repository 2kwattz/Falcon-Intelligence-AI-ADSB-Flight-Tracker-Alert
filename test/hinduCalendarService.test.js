const test = require("node:test");
const assert = require("node:assert/strict");
const { createHinduCalendarService, extractFestivals, extractOccasions } = require("../services/hinduCalendarService");

test("gets daily occasions using the private API key and caches the provider result", async () => {
    let calls = 0;
    const httpClient = {
        async get(url, options) {
            calls += 1;
            assert.equal(url, "https://api.tathaastuapi.com/v1/calendar/day");
            assert.deepEqual(options.headers, { "X-API-Key": "test-key" });
            assert.equal(options.params.date, "2026-10-23");
            assert.equal(options.params.region, "IN-GJ");
            return { data: { festivals: [{ festival_key: "VRAT_EKADASHI", name: "Ekadashi" }], special_day_flags: { is_ekadashi: true } } };
        }
    };
    const service = createHinduCalendarService({ httpClient, apiKey: "test-key" });

    const first = await service.getDailyOccasions({ date: "2026-10-23", region: "IN-GJ" });
    const second = await service.getDailyOccasions({ date: "2026-10-23", region: "IN-GJ" });

    assert.equal(calls, 1);
    assert.equal(first.cached, false);
    assert.equal(second.cached, true);
    assert.deepEqual(first.festivals, [{ festival_key: "VRAT_EKADASHI", name: "Ekadashi" }]);
    assert.deepEqual(first.occasions, [
        { festival_key: "VRAT_EKADASHI", name: "Ekadashi" },
        {
            event_key: "IS_EKADASHI",
            name: "Ekadashi",
            type: "PANCHANG_SPECIAL_DAY",
            source: "special_day_flags"
        }
    ]);
    assert.deepEqual(first.calendar.special_day_flags, { is_ekadashi: true });
});

test("reports missing configuration without attempting a request", async () => {
    const service = createHinduCalendarService({ apiKey: "" });
    await assert.rejects(
        service.getDailyOccasions({ date: "2026-10-23" }),
        { code: "HINDU_CALENDAR_NOT_CONFIGURED" }
    );
});

test("normalizes TathaAstu's stored and derived festival response shape", () => {
    const payload = {
        festivals: {
            stored: [{ festival_key: "VRAT_EKADASHI", name: "Ekadashi" }],
            derived: [{ festival_key: "VRAT_PRADOSH", display_name: "Pradosh", category: "VRAT" }]
        },
        special_day_flags: { is_panchak: true, is_ekadashi: false }
    };

    assert.deepEqual(extractFestivals(payload), [
        { festival_key: "VRAT_EKADASHI", name: "Ekadashi" },
        { festival_key: "VRAT_PRADOSH", display_name: "Pradosh", category: "VRAT" }
    ]);
    assert.deepEqual(extractOccasions(payload), [
        { festival_key: "VRAT_EKADASHI", name: "Ekadashi" },
        { festival_key: "VRAT_PRADOSH", display_name: "Pradosh", category: "VRAT" },
        {
            event_key: "IS_PANCHAK",
            name: "Panchak",
            type: "PANCHANG_SPECIAL_DAY",
            source: "special_day_flags"
        }
    ]);
});
