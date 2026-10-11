const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "../.env") });

const twilio = require("twilio");

const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

async function listRecentCalls() {
    const calls = await client.calls.list({ limit: 10 });

    calls.forEach((call) => {
        console.log([
            call.sid,
            `to=${call.to}`,
            `from=${call.from}`,
            `status=${call.status}`,
            `start=${call.startTime ? call.startTime.toISOString() : "n/a"}`,
            `end=${call.endTime ? call.endTime.toISOString() : "n/a"}`
        ].join(" "));
    });
}

listRecentCalls().catch((error) => {
    console.error("Could not list recent calls:", error.message);
    process.exitCode = 1;
});
