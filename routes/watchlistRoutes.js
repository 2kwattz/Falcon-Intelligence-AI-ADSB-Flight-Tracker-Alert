const express = require("express");
const rateLimit = require("express-rate-limit");
const nodemailer = require("nodemailer");
const requestTemplate = require("../templates/requestTemplate");
const contactTemplate = require("../templates/contactTemplate");

const router = express.Router();
const REQUEST_RECIPIENT = "prakashbhatia1970@gmail.com";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.GMAIL_SMTP,
        pass: process.env.GMAIL_SMTP_PASSWORD
    }
});

const watchlistRequestLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: false, message: "Too many watchlist requests. Please try again later." }
});

function normaliseField(value) {
    return typeof value === "string" ? value.trim() : "";
}

router.post("/watchlist-request", watchlistRequestLimiter, async (req, res) => {
    const name = normaliseField(req.body.name);
    const email = normaliseField(req.body.email).toLowerCase();
    const phone = normaliseField(req.body.phone);
    const message = normaliseField(req.body.message);

    if (!name || !email || !phone || !message) {
        return res.status(400).json({ status: false, message: "Please complete every field." });
    }

    if (name.length > 100 || email.length > 254 || phone.length > 40 || message.length > 3000) {
        return res.status(400).json({ status: false, message: "One or more fields are too long." });
    }

    if (!emailPattern.test(email)) {
        return res.status(400).json({ status: false, message: "Please enter a valid email address." });
    }

    try {
        const request = { name, email, phone, message };

        await transporter.sendMail({
            from: `Falcon Intelligence <${process.env.GMAIL_SMTP}>`,
            to: REQUEST_RECIPIENT,
            replyTo: email,
            subject: "You got a new registration request",
            text: requestTemplate.toText(request),
            html: requestTemplate(request)
        });

        return res.status(201).json({ status: true, message: "Watchlist request received." });
    } catch (error) {
        console.error("[*] Unable to send watchlist request email:", error.message);
        return res.status(500).json({ status: false, message: "Unable to send your request right now. Please try again later." });
    }
});

router.post("/contact-message", watchlistRequestLimiter, async (req, res) => {
    const name = normaliseField(req.body.name);
    const email = normaliseField(req.body.email).toLowerCase();
    const message = normaliseField(req.body.message);

    if (!name || !email || !message) {
        return res.status(400).json({ status: false, message: "Please complete every field." });
    }

    if (name.length > 100 || email.length > 254 || message.length > 3000) {
        return res.status(400).json({ status: false, message: "One or more fields are too long." });
    }

    if (!emailPattern.test(email)) {
        return res.status(400).json({ status: false, message: "Please enter a valid email address." });
    }

    try {
        await transporter.sendMail({
            from: `Falcon Intelligence <${process.env.GMAIL_SMTP}>`,
            to: REQUEST_RECIPIENT,
            replyTo: email,
            subject: "You got a new contact message",
            html: contactTemplate({ name, email, message })
        });

        return res.status(201).json({ status: true, message: "Contact message received." });
    } catch (error) {
        console.error("[*] Unable to send contact message email:", error.message);
        return res.status(500).json({ status: false, message: "Unable to send your message right now. Please try again later." });
    }
});

module.exports = router;
