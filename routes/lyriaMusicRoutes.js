const crypto = require("crypto");
const express = require("express");
const rateLimit = require("express-rate-limit");
const mongodbAuthMiddleware = require("../middlewares/mongodbAuthMiddleware");
const { generateLyriaMusic, LyriaMusicRequestError } = require("../services/lyriaMusicService");

const router = express.Router();
const outputs = new Map();
const outputTtlMs = 60 * 60 * 1000;
const generationRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 4,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many music generation requests. Please try again in 15 minutes." }
});

function pruneExpiredOutputs() {
    const expiresBefore = Date.now() - outputTtlMs;
    for (const [id, output] of outputs) {
        if (output.createdAt < expiresBefore) outputs.delete(id);
    }
}

router.post("/api/lyria-music/generate", mongodbAuthMiddleware, generationRateLimit, async (req, res) => {
    const prompt = typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";
    if (!prompt || prompt.length > 2_000) {
        return res.status(400).json({ success: false, message: "Enter a music prompt of up to 2,000 characters." });
    }

    try {
        pruneExpiredOutputs();
        const generatedMusic = await generateLyriaMusic(prompt);
        const outputId = crypto.randomUUID();
        outputs.set(outputId, { ...generatedMusic, createdAt: Date.now() });
        return res.status(201).json({
            success: true,
            message: "Lyria 3.5 music generated.",
            music: {
                model: generatedMusic.model,
                outputUrl: `/api/lyria-music/outputs/${encodeURIComponent(outputId)}`
            }
        });
    } catch (error) {
        const statusCode = error instanceof LyriaMusicRequestError ? error.statusCode : 502;
        console.error("Lyria music generation failed:", error.message);
        return res.status(statusCode).json({ success: false, message: error.message || "Could not generate music." });
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
