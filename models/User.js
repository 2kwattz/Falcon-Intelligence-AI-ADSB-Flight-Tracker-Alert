const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },

    profilePicture: {
      type: String,
      default: ""
    },

    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      match: /^[a-z0-9_]+$/
    },

    dob: {
      type: Date,
      required: true
    },

    location: {
      type: String,
      trim: true,
      default: ""
    },

    // Retain only coarse city-level data for anomalous-login checks.
    lastLoginLocation: {
      city: { type: String, trim: true, default: "" },
      region: { type: String, trim: true, default: "" },
      country: { type: String, trim: true, default: "" },
      updatedAt: { type: Date, default: null }
    },

    // This is deliberately excluded from ordinary document queries and APIs.
    pendingLoginOtp: {
      challengeId: { type: String, select: false, default: "" },
      hash: { type: String, select: false, default: "" },
      expiresAt: { type: Date, select: false, default: null },
      attempts: { type: Number, select: false, default: 0 },
      location: {
        city: { type: String, select: false, default: "" },
        region: { type: String, select: false, default: "" },
        country: { type: String, select: false, default: "" }
      }
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },

    password: {
      type: String,
      required: true,
      select: false
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("User", userSchema);
