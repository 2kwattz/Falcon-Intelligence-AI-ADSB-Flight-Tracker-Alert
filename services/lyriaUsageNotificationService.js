const nodemailer = require("nodemailer");
const lyriaUsageTemplate = require("../templates/lyriaUsageTemplate");

const RECIPIENTS = ["prakashbhatia1970@gmail.com", "roshan.bhatia.blueera@gmail.com"];

function formatIndiaTime(value = new Date()) {
    return new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
    }).format(value);
}

async function sendLyriaUsageNotifications({ inputTokens, rateLimit, initiatedBy }) {
    const smtpUser = String(process.env.GMAIL_SMTP || "").trim();
    const smtpPassword = String(process.env.GMAIL_SMTP_PASSWORD || "").trim();
    if (!smtpUser || !smtpPassword) {
        console.warn("Lyria usage email was not sent: GMAIL_SMTP and GMAIL_SMTP_PASSWORD must be configured.");
        return;
    }

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: smtpUser, pass: smtpPassword }
    });
    const occurredAt = formatIndiaTime();
    const emailRateLimit = {
        ...rateLimit,
        resetsAt: rateLimit.resetsAt ? formatIndiaTime(rateLimit.resetsAt) : null
    };
    const common = { inputTokens, rateLimit: emailRateLimit, initiatedBy, occurredAt };
    const messages = [{
        subject: "Falcon Intelligence / YouTube Automation | Lyria generation attempt used",
        html: lyriaUsageTemplate({ ...common, isLimitReached: false })
    }];

    if (rateLimit.remainingRequests === 0) {
        messages.push({
            subject: "Falcon Intelligence / YouTube Automation | Lyria generation limit reached",
            html: lyriaUsageTemplate({ ...common, isLimitReached: true })
        });
    }

    await Promise.all(messages.map(({ subject, html }) => transporter.sendMail({
        from: `Falcon Intelligence <${smtpUser}>`,
        to: RECIPIENTS,
        subject,
        html
    })));
}

module.exports = { sendLyriaUsageNotifications, RECIPIENTS };
