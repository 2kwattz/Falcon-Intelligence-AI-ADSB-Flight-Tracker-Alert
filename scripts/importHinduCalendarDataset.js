require("dotenv").config();

const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const mongoose = require("mongoose");
const HinduCalendarDatasetDay = require("../models/HinduCalendarDatasetDay");

const datasetPath = path.resolve(__dirname, "../extraDatasets/hindu_calendar_2026_2027.json");
const BATCH_SIZE = 100;

async function main() {
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required to import the Hindu calendar dataset");

    const source = await fs.readFile(datasetPath);
    const dataset = JSON.parse(source.toString("utf8"));
    if (!Array.isArray(dataset.days) || dataset.days.length === 0) throw new Error("Dataset must contain a non-empty days array");

    const checksum = crypto.createHash("sha256").update(source).digest("hex");
    const datasetVersion = String(dataset.metadata?.schema_version || "unknown");
    await mongoose.connect(process.env.MONGO_URI);

    for (let start = 0; start < dataset.days.length; start += BATCH_SIZE) {
        const operations = dataset.days.slice(start, start + BATCH_SIZE).map((sourceDay) => {
            const {
                original_daily_calendar_response: originalDailyCalendarResponse = null,
                original_response_preservation: originalResponsePreservation = null,
                ...details
            } = sourceDay;
            if (!/^\d{4}-\d{2}-\d{2}$/.test(String(details.date || ""))) {
                throw new Error(`Invalid calendar date at dataset entry ${start}`);
            }

            return {
                updateOne: {
                    filter: { calendarDate: details.date },
                    update: {
                        $set: {
                            year: details.year,
                            month: details.month,
                            day: details.day,
                            weekday: details.weekday || "",
                            weekdayHi: details.weekday_hi || "",
                            timezone: details.timezone || "Asia/Kolkata",
                            location: details.location || {},
                            hinduMonth: details.hindu_month || {},
                            observances: Array.isArray(details.observances) ? details.observances : [],
                            hasListedObservance: Boolean(details.has_listed_observance),
                            primaryObservanceId: details.primary_observance_id || null,
                            details,
                            originalDailyCalendarResponse,
                            originalResponsePreservation,
                            datasetVersion,
                            sourceChecksum: checksum
                        },
                        $setOnInsert: { calendarDate: details.date }
                    },
                    upsert: true
                }
            };
        });
        await HinduCalendarDatasetDay.bulkWrite(operations, { ordered: false });
    }

    await mongoose.connection.db.collection("hindu_calendar_dataset_imports").updateOne(
        { source: path.basename(datasetPath) },
        { $set: { metadata: dataset.metadata || {}, checksum, importedAt: new Date(), recordCount: dataset.days.length } },
        { upsert: true }
    );
    console.log(`Imported ${dataset.days.length} Hindu calendar days (SHA-256 ${checksum}).`);
    await mongoose.disconnect();
}

main().catch(async (error) => {
    console.error(`Hindu calendar dataset import failed: ${error.message}`);
    await mongoose.disconnect().catch(() => {});
    process.exitCode = 1;
});
