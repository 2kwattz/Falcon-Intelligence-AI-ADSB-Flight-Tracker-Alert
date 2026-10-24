const mongoose = require("mongoose");

const hinduCalendarDailyRecordSchema = new mongoose.Schema(
    {
        calendarDate: {
            type: String,
            required: true,
            match: /^\d{4}-\d{2}-\d{2}$/
        },
        // Allows records for separate locations/traditions without overwriting each other.
        contextKey: {
            type: String,
            required: true
        },
        // Stores every request option that changes the provider response.
        context: {
            type: mongoose.Schema.Types.Mixed,
            required: true
        },
        provider: {
            type: String,
            required: true,
            default: "TathaAstu"
        },
        // Festivals, vrats, provider events, and active Panchang special-day flags.
        occasions: {
            type: [mongoose.Schema.Types.Mixed],
            default: []
        },
        // Preserve the complete calendar-day payload, including Panchang special-day data.
        calendar: {
            type: mongoose.Schema.Types.Mixed,
            required: true
        },
        providerSyncedAt: {
            type: Date,
            required: true
        },
        // Expired automatically by MongoDB's TTL index below.
        expiresAt: {
            type: Date,
            required: true
        }
    },
    { timestamps: true, versionKey: false }
);

hinduCalendarDailyRecordSchema.index({ calendarDate: 1, contextKey: 1 }, { unique: true });
hinduCalendarDailyRecordSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("HinduCalendarDailyRecord", hinduCalendarDailyRecordSchema);
