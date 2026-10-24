const mongoose = require("mongoose");

const LOGIN_ACTIVITY_RETENTION_SECONDS = 3 * 24 * 60 * 60;

const loginActivitySchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    username: { type: String, required: true, trim: true, maxlength: 30 },
    ipAddress: { type: String, required: true, trim: true, maxlength: 100 },
    device: { type: String, required: true, trim: true, maxlength: 180, default: "Unknown" },
    browser: { type: String, required: true, trim: true, maxlength: 120, default: "Unknown" },
    operatingSystem: { type: String, required: true, trim: true, maxlength: 120, default: "Unknown" },
    loggedInAt: { type: Date, required: true, default: Date.now },
    // Internal idempotency guard. It is not returned to the browser.
    loginChallengeId: { type: String, required: true, select: false }
}, { versionKey: false, collection: "login_activities" });

// MongoDB's TTL monitor removes expired records automatically. API reads also
// apply this cutoff so entries stop appearing exactly after three days.
loginActivitySchema.index({ loggedInAt: 1 }, { expireAfterSeconds: LOGIN_ACTIVITY_RETENTION_SECONDS });
loginActivitySchema.index({ user: 1, loginChallengeId: 1 }, { unique: true });
loginActivitySchema.index({ user: 1, loggedInAt: -1 });

const LoginActivity = mongoose.model("LoginActivity", loginActivitySchema);

module.exports = { LoginActivity, LOGIN_ACTIVITY_RETENTION_SECONDS };
