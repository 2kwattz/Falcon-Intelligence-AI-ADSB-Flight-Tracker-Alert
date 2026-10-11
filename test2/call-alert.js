const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "../.env") });

const twilio = require("twilio");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

const client = twilio(accountSid, authToken);

const to = process.env.TEST_CALL_TO || process.env.ROSHAN_BHAI_PHONE;
const from = process.env.TEST_CALL_FROM || "+12296653927";
const timeout = Number(process.env.TWILIO_CALL_TIMEOUT_SECONDS) || 15;

client.calls
    .create({
        twiml: "<Response><Say>Hello, this is a test call alert from Falcon Intelligence.</Say></Response>",
        to,
        from,
        timeout
    })
    .then((call) => {
        console.log(call.sid);
    })
    .catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
    });
