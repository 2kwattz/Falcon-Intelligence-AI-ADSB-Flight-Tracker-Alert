const test = require("node:test");
const assert = require("node:assert/strict");
const { createHinduFestivalRouter } = require("../routes/hinduCalendarRoutes");

function handlerFor(router, path) {
    const layer = router.stack.find((entry) => entry.route?.path === path);
    assert.ok(layer, `Route ${path} must be registered`);
    return layer.route.stack[0].handle;
}

async function invoke(handler, { query = {}, params = {} } = {}) {
    const response = {
        statusCode: 200,
        body: undefined,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        }
    }
    await handler({ query, params }, response);
    return response;
}

test("Get Hindu Festivals endpoint retrieves today’s occasions", async () => {
    let receivedQuery;
    const router = createHinduFestivalRouter({
        calendarService: {
            async getDailyOccasions(query) {
                receivedQuery = query;
                return {
                    provider: "TathaAstu",
                    date: "2026-10-23",
                    occasions: [{ name: "Ekadashi", type: "VRAT" }],
                    calendar: { special_day_flags: { is_ekadashi: true } }
                };
            }
        },
        async getDailyRecord({ calendarDate, context, service }) {
            assert.equal(calendarDate, undefined);
            assert.equal(context.lang, "hi");
            return service.getDailyOccasions({ lang: context.lang });
        }
    });

    const response = await invoke(handlerFor(router, "/today"), { query: { lang: "hi" } });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(receivedQuery, { lang: "hi" });
    assert.deepEqual(response.body, {
        provider: "TathaAstu",
        date: "2026-10-23",
        occasions: [{ name: "Ekadashi", type: "VRAT" }],
        calendar: { special_day_flags: { is_ekadashi: true } }
    });
});

test("Get Hindu Festivals date endpoint validates the requested date", async () => {
    const router = createHinduFestivalRouter();

    const response = await invoke(handlerFor(router, "/:date"), { params: { date: "2026-02-30" } });

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.error, "date must be a valid YYYY-MM-DD value");
});
