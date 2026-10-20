const mongoose = require("mongoose");

const CityAlertSettings = require("../models/CityAlertSettings");
const {
    CONFIGURABLE_CITY_IDS,
    DEFAULT_RADIUS_MILES,
    DEFAULT_CITY_ALERT_EMAIL_RECIPIENTS
} = require("../utils/cityAlertDefaults");

const SETTINGS_KEY = "remote-city-alert-settings";
const MIN_RADIUS_MILES = 1;
const MAX_RADIUS_MILES = 1000;
const MAX_EMAIL_RECIPIENTS_PER_CITY = 50;
const settingsChangeListeners = new Set();

function defaultSettings() {
    return {
        radii: Object.fromEntries(CONFIGURABLE_CITY_IDS.map((cityId) => [cityId, DEFAULT_RADIUS_MILES])),
        emailRecipients: Object.fromEntries(
            CONFIGURABLE_CITY_IDS.map((cityId) => [cityId, [...DEFAULT_CITY_ALERT_EMAIL_RECIPIENTS[cityId]]])
        )
    };
}

let cityAlertSettings = defaultSettings();

class CityAlertSettingsError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.name = "CityAlertSettingsError";
        this.statusCode = statusCode;
    }
}

function copySettings() {
    return {
        radii: { ...cityAlertSettings.radii },
        emailRecipients: Object.fromEntries(
            CONFIGURABLE_CITY_IDS.map((cityId) => [cityId, [...cityAlertSettings.emailRecipients[cityId]]])
        )
    };
}

function normalizeRadius(value, cityId) {
    const radiusMiles = Number(value);
    if (!Number.isFinite(radiusMiles) || radiusMiles < MIN_RADIUS_MILES || radiusMiles > MAX_RADIUS_MILES) {
        throw new CityAlertSettingsError(
            `${cityId} must be a radius between ${MIN_RADIUS_MILES} and ${MAX_RADIUS_MILES} miles`,
            400
        );
    }
    return Math.round(radiusMiles * 10) / 10;
}

function normalizeEmail(value) {
    const email = typeof value === "string" ? value.trim().toLowerCase() : "";
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new CityAlertSettingsError("Enter a valid email address", 400);
    }
    return email;
}

function normalizeCityId(value) {
    const cityId = typeof value === "string" ? value.trim().toLowerCase() : "";
    if (!CONFIGURABLE_CITY_IDS.includes(cityId)) {
        throw new CityAlertSettingsError(
            `Only ${CONFIGURABLE_CITY_IDS.join(", ")} city alerts can be managed from the dashboard`,
            400
        );
    }
    return cityId;
}

function normalizedRadii(storedRadii) {
    const source = storedRadii && typeof storedRadii === "object" ? storedRadii : {};
    return Object.fromEntries(CONFIGURABLE_CITY_IDS.map((cityId) => {
        try {
            return [cityId, normalizeRadius(source[cityId], cityId)];
        } catch {
            return [cityId, DEFAULT_RADIUS_MILES];
        }
    }));
}

function normalizedRecipients(storedRecipients) {
    const source = storedRecipients && typeof storedRecipients === "object" ? storedRecipients : {};
    return Object.fromEntries(CONFIGURABLE_CITY_IDS.map((cityId) => {
        const candidates = Object.prototype.hasOwnProperty.call(source, cityId) && Array.isArray(source[cityId])
            ? source[cityId]
            : DEFAULT_CITY_ALERT_EMAIL_RECIPIENTS[cityId];
        const recipients = [];
        for (const candidate of candidates) {
            try {
                const email = normalizeEmail(candidate);
                if (!recipients.includes(email)) recipients.push(email);
            } catch {
                // Ignore malformed values from a legacy settings document.
            }
        }
        return [cityId, recipients];
    }));
}

function applySettings(settings) {
    cityAlertSettings = {
        radii: normalizedRadii(settings?.radii),
        emailRecipients: normalizedRecipients(settings?.emailRecipients)
    };
    for (const listener of settingsChangeListeners) {
        try {
            listener(copySettings());
        } catch (error) {
            console.error("City alert settings listener error:", error.message);
        }
    }
    return copySettings();
}

function ensureDatabaseIsAvailable() {
    if (mongoose.connection.readyState !== 1) {
        throw new CityAlertSettingsError(
            "City alert settings are unavailable because MongoDB is disconnected",
            503
        );
    }
}

function getCityAlertSettings() {
    return copySettings();
}

function getCityAlertRadii() {
    return { ...cityAlertSettings.radii };
}

function getCityAlertEmailRecipients() {
    return copySettings().emailRecipients;
}

function onCityAlertSettingsChange(listener) {
    if (typeof listener !== "function") throw new TypeError("City alert settings listener must be a function");
    settingsChangeListeners.add(listener);
    return () => settingsChangeListeners.delete(listener);
}

async function hydrateCityAlertSettings() {
    if (mongoose.connection.readyState !== 1) return copySettings();
    const settings = await CityAlertSettings.findOne({ key: SETTINGS_KEY }).lean();
    return settings ? applySettings(settings) : copySettings();
}

async function updateCityAlertRadii(requestedRadii) {
    if (!requestedRadii || typeof requestedRadii !== "object" || Array.isArray(requestedRadii)) {
        throw new CityAlertSettingsError("Radii must be an object keyed by city", 400);
    }
    const cityIds = Object.keys(requestedRadii);
    if (!cityIds.length) throw new CityAlertSettingsError("Choose at least one city radius to update", 400);
    if (cityIds.some((cityId) => !CONFIGURABLE_CITY_IDS.includes(cityId))) {
        throw new CityAlertSettingsError(
            `Only ${CONFIGURABLE_CITY_IDS.join(", ")} alert radii can be changed from the dashboard`,
            400
        );
    }

    ensureDatabaseIsAvailable();
    const updates = Object.fromEntries(
        cityIds.map((cityId) => [`radii.${cityId}`, normalizeRadius(requestedRadii[cityId], cityId)])
    );
    const settings = await CityAlertSettings.findOneAndUpdate(
        { key: SETTINGS_KEY },
        { $set: updates, $setOnInsert: { key: SETTINGS_KEY } },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: false }
    ).lean();
    return applySettings(settings);
}

async function changeCityAlertEmailRecipient(cityIdValue, emailValue, action) {
    const cityId = normalizeCityId(cityIdValue);
    const email = normalizeEmail(emailValue);
    if (action !== "add" && action !== "remove") throw new TypeError("City alert email action must be add or remove");

    ensureDatabaseIsAvailable();
    const persisted = await CityAlertSettings.findOne({ key: SETTINGS_KEY }).lean();
    const recipientsByCity = normalizedRecipients(persisted?.emailRecipients);
    const currentRecipients = recipientsByCity[cityId];
    const hasRecipient = currentRecipients.includes(email);
    let nextRecipients = currentRecipients;

    if (action === "add" && !hasRecipient) {
        if (currentRecipients.length >= MAX_EMAIL_RECIPIENTS_PER_CITY) {
            throw new CityAlertSettingsError(
                `${cityId} can have at most ${MAX_EMAIL_RECIPIENTS_PER_CITY} email recipients`,
                400
            );
        }
        nextRecipients = [...currentRecipients, email];
    } else if (action === "remove" && hasRecipient) {
        nextRecipients = currentRecipients.filter((recipient) => recipient !== email);
    }

    const settings = await CityAlertSettings.findOneAndUpdate(
        { key: SETTINGS_KEY },
        { $set: { [`emailRecipients.${cityId}`]: nextRecipients }, $setOnInsert: { key: SETTINGS_KEY } },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: false }
    ).lean();
    return applySettings(settings);
}

module.exports = {
    CONFIGURABLE_CITY_IDS,
    MIN_RADIUS_MILES,
    MAX_RADIUS_MILES,
    MAX_EMAIL_RECIPIENTS_PER_CITY,
    CityAlertSettingsError,
    getCityAlertSettings,
    getCityAlertRadii,
    getCityAlertEmailRecipients,
    hydrateCityAlertSettings,
    updateCityAlertRadii,
    addCityAlertEmailRecipient: (cityId, email) => changeCityAlertEmailRecipient(cityId, email, "add"),
    removeCityAlertEmailRecipient: (cityId, email) => changeCityAlertEmailRecipient(cityId, email, "remove"),
    onCityAlertSettingsChange
};
