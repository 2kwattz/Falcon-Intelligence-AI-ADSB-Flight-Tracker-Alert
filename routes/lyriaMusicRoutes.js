const crypto = require("crypto");
const express = require("express");
const mongodbAuthMiddleware = require("../middlewares/mongodbAuthMiddleware");
const LyriaMusicSettings = require("../models/LyriaMusicSettings");
const {
    countLyriaPromptTokens,
    generateLyriaMusic,
    LyriaMusicRequestError
} = require("../services/lyriaMusicService");
const { sendLyriaUsageNotifications } = require("../services/lyriaUsageNotificationService");

const router = express.Router();
const outputs = new Map();
const outputTtlMs = 60 * 60 * 1000;
const settingsKey = "global";
const maxPromptCharacters = 12_000;
const defaultSettings = { key: settingsKey, maxPromptTokens: 2000, maxRequests: 3, windowHours: 10 };

class LyriaRateLimitError extends Error {
    constructor(resetsAt) {
        super("Lyria Music Studio has reached its generation limit. Try again after the current window resets.");
        this.name = "LyriaRateLimitError";
        this.statusCode = 429;
        this.resetsAt = resetsAt;
    }
}

function pruneExpiredOutputs() {
    const expiresBefore = Date.now() - outputTtlMs;
    for (const [id, output] of outputs) {
        if (output.createdAt < expiresBefore) outputs.delete(id);
    }
}

function activeReservations(settings, now = Date.now()) {
    const windowMs = Number(settings.windowHours) * 60 * 60 * 1000;
    return (settings.generationReservations || []).filter((reservation) => {
        const timestamp = new Date(reservation.createdAt).getTime();
        return Number.isFinite(timestamp) && timestamp > now - windowMs;
    });
}

function serializeSettings(settings, now = Date.now()) {
    const reservations = activeReservations(settings, now);
    const oldestReservation = reservations[0];
    const resetsAt = oldestReservation
        ? new Date(new Date(oldestReservation.createdAt).getTime() + Number(settings.windowHours) * 60 * 60 * 1000)
        : null;
    return {
        maxPromptTokens: Number(settings.maxPromptTokens),
        maxRequests: Number(settings.maxRequests),
        windowHours: Number(settings.windowHours),
        usedRequests: reservations.length,
        remainingRequests: Math.max(0, Number(settings.maxRequests) - reservations.length),
        resetsAt: resetsAt?.toISOString() || null
    };
}

async function getSettings() {
    return LyriaMusicSettings.findOneAndUpdate(
        { key: settingsKey },
        { $setOnInsert: defaultSettings },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );
}

async function reserveGeneration(tokenCount) {
    // The optimistic version check keeps this Mongo-backed global limit safe
    // when two dashboard requests arrive together; Lyria never uses Redis.
    for (let attempt = 0; attempt < 5; attempt += 1) {
        const settings = await getSettings();
        if (tokenCount > settings.maxPromptTokens) {
            throw new LyriaMusicRequestError(
                `This prompt uses ${tokenCount.toLocaleString()} tokens; the current limit is ${settings.maxPromptTokens.toLocaleString()} tokens.`,
                400
            );
        }

        const now = Date.now();
        const reservations = activeReservations(settings, now);
        const policy = serializeSettings({ ...settings.toObject(), generationReservations: reservations }, now);
        if (reservations.length >= settings.maxRequests) throw new LyriaRateLimitError(policy.resetsAt);

        const reservation = { id: crypto.randomUUID(), createdAt: new Date(now) };
        const updated = await LyriaMusicSettings.findOneAndUpdate(
            { _id: settings._id, rateLimitVersion: settings.rateLimitVersion },
            {
                $set: { generationReservations: [...reservations, reservation] },
                $inc: { rateLimitVersion: 1 }
            },
            { new: true }
        );
        if (updated) return updated;
    }

    throw new LyriaMusicRequestError("Lyria Music Studio is busy. Please try again.", 503);
}

function positiveInteger(value, field, { min, max }) {
    const number = Number(value);
    if (!Number.isInteger(number) || number < min || number > max) {
        throw new LyriaMusicRequestError(`${field} must be a whole number from ${min} to ${max}.`, 400);
    }
    return number;
}

router.get("/api/lyria-music/settings", mongodbAuthMiddleware, async (req, res) => {
    try {
        return res.json({ success: true, settings: serializeSettings(await getSettings()) });
    } catch (error) {
        console.error("Could not load Lyria Music Studio settings:", error.message);
        return res.status(503).json({ success: false, message: "Could not load Lyria Music Studio settings." });
    }
});

router.put("/api/lyria-music/settings", mongodbAuthMiddleware, async (req, res) => {
    try {
        const maxPromptTokens = positiveInteger(req.body?.maxPromptTokens, "Prompt token limit", { min: 1, max: 2000 });
        const maxRequests = positiveInteger(req.body?.maxRequests, "Generation limit", { min: 1, max: 20 });
        const windowHours = positiveInteger(req.body?.windowHours, "Rate-limit window", { min: 1, max: 168 });
        const currentSettings = await getSettings();
        const settings = await LyriaMusicSettings.findOneAndUpdate(
            { _id: currentSettings._id },
            {
                $set: { maxPromptTokens, maxRequests, windowHours },
                $inc: { rateLimitVersion: 1 }
            },
            { new: true }
        );
        return res.json({ success: true, message: "Lyria Music Studio limits saved.", settings: serializeSettings(settings) });
    } catch (error) {
        const statusCode = error instanceof LyriaMusicRequestError ? error.statusCode : 503;
        console.error("Could not save Lyria Music Studio settings:", error.message);
        return res.status(statusCode).json({ success: false, message: error.message || "Could not save Lyria Music Studio limits." });
    }
});

router.post("/api/lyria-music/generate", mongodbAuthMiddleware, async (req, res) => {
    const prompt = typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";
    if (!prompt || prompt.length > maxPromptCharacters) {
        return res.status(400).json({ success: false, message: `Enter a music prompt of up to ${maxPromptCharacters.toLocaleString()} characters.` });
    }

    try {
        // Google performs the exact count. Character length is only a safe request-size guard.
        const inputTokens = await countLyriaPromptTokens(prompt);
        const settings = await reserveGeneration(inputTokens);
        const rateLimit = serializeSettings(settings);
        // Reservation is the billable-attempt boundary. Email failures must not
        // block generation, but are logged for operators to investigate.
        void sendLyriaUsageNotifications({
            inputTokens,
            rateLimit,
            initiatedBy: req.user?.username || req.user?.email || "Authenticated Lyria request"
        }).catch((notificationError) => {
            console.error("Lyria usage email notification failed:", notificationError.message);
        });
        pruneExpiredOutputs();
        const generatedMusic = await generateLyriaMusic(prompt);
        const outputId = crypto.randomUUID();
        outputs.set(outputId, { ...generatedMusic, createdAt: Date.now() });
        return res.status(201).json({
            success: true,
            message: "Lyria 3.5 music generated.",
            inputTokens,
            rateLimit,
            music: {
                model: generatedMusic.model,
                outputUrl: `/api/lyria-music/outputs/${encodeURIComponent(outputId)}`
            }
        });
    } catch (error) {
        const statusCode = error instanceof LyriaMusicRequestError || error instanceof LyriaRateLimitError
            ? error.statusCode
            : 502;
        console.error("Lyria music generation failed:", error.message);
        return res.status(statusCode).json({
            success: false,
            message: error.message || "Could not generate music.",
            resetsAt: error instanceof LyriaRateLimitError ? error.resetsAt : undefined
        });
    }
});

router.get("/api/lyria-music/outputs/:outputId", mongodbAuthMiddleware, (req, res) => {
    pruneExpiredOutputs();
    const output = outputs.get(req.params.outputId);
    if (!output) return res.status(404).json({ success: false, message: "The music output is no longer available." });

    res.set("Cache-Control", "private, no-store");
    res.type(output.mimeType);
    return res.send(output.audio);
});

module.exports = router;
