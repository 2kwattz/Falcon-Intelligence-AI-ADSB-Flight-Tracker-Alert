const axios = require("axios");

const LYRIA_API_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";
const GOOGLE_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const LYRIA_MODEL = process.env.LYRIA_MODEL || "lyria-3.5";
const LYRIA_TIMEOUT_MS = 300_000;
const MAX_AUDIO_BYTES = 30 * 1024 * 1024;

class LyriaMusicRequestError extends Error {
    constructor(message, statusCode = 502) {
        super(message);
        this.name = "LyriaMusicRequestError";
        this.statusCode = statusCode;
    }
}

function findAudioBlock(interaction) {
    const candidates = [interaction?.output_audio];
    for (const step of interaction?.steps || []) {
        for (const content of step?.content || []) {
            if (content?.type === "audio") candidates.push(content);
        }
    }
    return candidates.find((candidate) => typeof candidate?.data === "string" && candidate.data.trim()) || null;
}

function mapLyriaError(error) {
    if (!error.response) return new LyriaMusicRequestError("Google Lyria is unavailable. Please try again shortly.", 503);
    if (error.response.status === 429) return new LyriaMusicRequestError("Google Lyria's generation limit has been reached. Please try again later.", 429);
    if ([401, 403].includes(error.response.status)) return new LyriaMusicRequestError("Google Lyria authentication or model access is unavailable.", 503);
    if (error.response.status >= 400 && error.response.status < 500) return new LyriaMusicRequestError("Google Lyria could not process this music prompt.", 400);
    return new LyriaMusicRequestError("Google Lyria could not generate music right now.", 502);
}

function getApiKey() {
    const apiKey = String(process.env.LYRIA_API_KEY || process.env.GEMINI_API_KEY || "").trim();
    if (!apiKey) throw new LyriaMusicRequestError("Set LYRIA_API_KEY before generating music.", 500);
    return apiKey;
}

async function countLyriaPromptTokens(prompt) {
    const apiKey = getApiKey();

    try {
        const { data } = await axios.post(
            `${GOOGLE_API_BASE_URL}/models/${encodeURIComponent(LYRIA_MODEL)}:countTokens`,
            { contents: [{ parts: [{ text: prompt }] }] },
            {
                headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
                timeout: 30_000
            }
        );
        const totalTokens = Number(data?.totalTokens ?? data?.total_tokens);
        if (!Number.isInteger(totalTokens) || totalTokens < 0) {
            throw new LyriaMusicRequestError("Google Lyria did not return a usable prompt token count.", 502);
        }
        return totalTokens;
    } catch (error) {
        if (error instanceof LyriaMusicRequestError) throw error;
        throw mapLyriaError(error);
    }
}

async function generateLyriaMusic(prompt) {
    const apiKey = getApiKey();

    try {
        const { data } = await axios.post(
            LYRIA_API_URL,
            { model: LYRIA_MODEL, input: prompt },
            {
                headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
                timeout: LYRIA_TIMEOUT_MS,
                maxContentLength: 45 * 1024 * 1024,
                maxBodyLength: 45 * 1024 * 1024
            }
        );
        const audio = findAudioBlock(data);
        if (!audio) throw new LyriaMusicRequestError("Google Lyria returned no audio for this prompt.", 502);

        const buffer = Buffer.from(audio.data, "base64");
        if (!buffer.length || buffer.length > MAX_AUDIO_BYTES) {
            throw new LyriaMusicRequestError("Google Lyria returned an unsupported audio result size.", 502);
        }

        return {
            audio: buffer,
            mimeType: /^audio\//.test(String(audio.mime_type || audio.mimeType || ""))
                ? String(audio.mime_type || audio.mimeType)
                : "audio/mpeg",
            model: data.model || LYRIA_MODEL
        };
    } catch (error) {
        if (error instanceof LyriaMusicRequestError) throw error;
        throw mapLyriaError(error);
    }
}

module.exports = { countLyriaPromptTokens, generateLyriaMusic, LyriaMusicRequestError, LYRIA_MODEL };
