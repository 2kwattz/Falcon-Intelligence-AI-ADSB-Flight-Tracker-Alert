const mongoose = require("mongoose");

const hinduCalendarDatasetDaySchema = new mongoose.Schema({
    calendarDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    year: { type: Number, required: true },
    month: { type: Number, required: true },
    day: { type: Number, required: true },
    weekday: { type: String, default: "" },
    weekdayHi: { type: String, default: "" },
    timezone: { type: String, default: "Asia/Kolkata" },
    location: { type: mongoose.Schema.Types.Mixed, default: {} },
    hinduMonth: { type: mongoose.Schema.Types.Mixed, default: {} },
    observances: { type: [mongoose.Schema.Types.Mixed], default: [] },
    // Compact mantra-video cards for non-observance days; full production data stays in details.
    mantraVideos: { type: [mongoose.Schema.Types.Mixed], default: [] },
    hasListedObservance: { type: Boolean, default: false },
    primaryObservanceId: { type: String, default: null },
    // All curated/calculated fields except the original provider response.
    details: { type: mongoose.Schema.Types.Mixed, required: true },
    // Returned only from the explicit original-JSON dashboard endpoint.
    originalDailyCalendarResponse: { type: mongoose.Schema.Types.Mixed, default: null, select: false },
    originalResponsePreservation: { type: mongoose.Schema.Types.Mixed, default: null, select: false },
    datasetVersion: { type: String, default: "" },
    sourceChecksum: { type: String, default: "" }
}, { timestamps: true, versionKey: false, collection: "hindu_calendar_dataset_days" });

hinduCalendarDatasetDaySchema.index({ calendarDate: 1 }, { unique: true });
hinduCalendarDatasetDaySchema.index({ year: 1, month: 1 });
hinduCalendarDatasetDaySchema.index({ hasListedObservance: 1, calendarDate: 1 });
hinduCalendarDatasetDaySchema.index({ primaryObservanceId: 1, calendarDate: 1 });

module.exports = mongoose.model("HinduCalendarDatasetDay", hinduCalendarDatasetDaySchema);
