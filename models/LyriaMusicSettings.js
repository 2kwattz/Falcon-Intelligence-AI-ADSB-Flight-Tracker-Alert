const mongoose = require("mongoose");

const generationReservationSchema = new mongoose.Schema({
    id: { type: String, required: true },
    createdAt: { type: Date, required: true }
}, { _id: false });

// One global policy controls Google project spend across all dashboard users.
const lyriaMusicSettingsSchema = new mongoose.Schema({
    key: { type: String, required: true, default: "global" },
    maxPromptTokens: { type: Number, required: true, default: 2000, min: 1, max: 2000 },
    maxRequests: { type: Number, required: true, default: 3, min: 1, max: 20 },
    windowHours: { type: Number, required: true, default: 10, min: 1, max: 168 },
    generationReservations: { type: [generationReservationSchema], default: [] },
    rateLimitVersion: { type: Number, required: true, default: 0 }
}, { timestamps: true, versionKey: false, collection: "lyria_music_settings" });

lyriaMusicSettingsSchema.index({ key: 1 }, { unique: true });

module.exports = mongoose.model("LyriaMusicSettings", lyriaMusicSettingsSchema);
