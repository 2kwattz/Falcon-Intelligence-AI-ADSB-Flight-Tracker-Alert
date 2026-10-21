const fs = require("node:fs/promises");
const fsSync = require("node:fs");
const path = require("node:path");

const CITY_CATALOGUE_FILES = Object.freeze({
    vadodara: path.join(__dirname, "../aircraftsDataset/VadodaraAlertAircrafts.js"),
    bangalore: path.join(__dirname, "../aircraftsDataset/BangaloreAlertAircrafts.js"),
    delhi: path.join(__dirname, "../aircraftsDataset/DelhiAlertAircrafts.js"),
    hyderabad: path.join(__dirname, "../aircraftsDataset/HyderabadAlertAircrafts.js")
});

const CITY_LABELS = Object.freeze({
    vadodara: "Vadodara",
    bangalore: "Bangalore",
    delhi: "Delhi",
    hyderabad: "Hyderabad"
});

const listeners = new Set();
const catalogues = new Map();
const reloadTimers = new Map();
const cityWriteQueues = new Map();

class CityAircraftCatalogueError extends Error {
    constructor(message, statusCode = 400) {
        super(message);
        this.statusCode = statusCode;
    }
}

function normalizeCityId(value) {
    const cityId = typeof value === "string" ? value.trim().toLowerCase() : "";
    if (!Object.hasOwn(CITY_CATALOGUE_FILES, cityId)) {
        throw new CityAircraftCatalogueError("Choose Vadodara, Bangalore, Delhi, or Hyderabad", 400);
    }
    return cityId;
}

function normalizeText(value, field, maxLength = 100) {
    const text = typeof value === "string" ? value.trim() : "";
    if (!text || text.length > maxLength) {
        throw new CityAircraftCatalogueError(`${field} is required and must be at most ${maxLength} characters`, 400);
    }
    return text;
}

function normalizeAircraft(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new CityAircraftCatalogueError("Aircraft details are required", 400);
    }
    const hexCode = typeof value.HexCode === "string" ? value.HexCode.trim().toUpperCase() : "";
    if (!/^[0-9A-F]{6}$/.test(hexCode)) {
        throw new CityAircraftCatalogueError("ICAO / Mode-S hex code must be exactly six hexadecimal characters", 400);
    }
    return {
        Registration: normalizeText(value.Registration, "Registration"),
        AircraftType: normalizeText(value.AircraftType, "Aircraft type"),
        TypeCode: normalizeText(value.TypeCode, "Type code", 20).toUpperCase(),
        AircraftOperator: normalizeText(value.AircraftOperator, "Operator"),
        HexCode: hexCode
    };
}

// Catalogue files can contain partial legacy metadata.  Alert eligibility is
// determined solely by a valid ICAO / Mode-S value; the remaining fields are
// safe display metadata and must never suppress a notification.
function normalizeLoadedAircraft(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const hexCode = typeof value.HexCode === "string" ? value.HexCode.trim().toUpperCase() : "";
    if (!/^[0-9A-F]{6}$/.test(hexCode)) return null;
    const metadata = (field) => typeof value[field] === "string" && value[field].trim()
        ? value[field].trim()
        : "Unknown";
    return {
        Registration: metadata("Registration"),
        AircraftType: metadata("AircraftType"),
        TypeCode: metadata("TypeCode").toUpperCase(),
        AircraftOperator: metadata("AircraftOperator"),
        HexCode: hexCode
    };
}

function normaliseCatalogue(catalogue) {
    const source = catalogue?.allAircraft && typeof catalogue.allAircraft === "object"
        ? catalogue.allAircraft
        : {};
    const allAircraft = {};
    for (const [group, records] of Object.entries(source)) {
        if (!Array.isArray(records)) continue;
        const normalizedGroup = typeof group === "string" && group.trim() ? group.trim() : "Other";
        const validRecords = records.map(normalizeLoadedAircraft).filter(Boolean);
        if (validRecords.length) allAircraft[normalizedGroup] = validRecords;
    }
    return { allAircraft };
}

function readCatalogueFile(cityId) {
    const filePath = CITY_CATALOGUE_FILES[cityId];
    delete require.cache[require.resolve(filePath)];
    return normaliseCatalogue(require(filePath));
}

function cloneCatalogue(catalogue) {
    return JSON.parse(JSON.stringify(catalogue));
}

function initialiseCatalogues() {
    for (const cityId of Object.keys(CITY_CATALOGUE_FILES)) {
        catalogues.set(cityId, readCatalogueFile(cityId));
    }
}

initialiseCatalogues();

function notifyCatalogueChange(cityId, catalogue) {
    const copy = cloneCatalogue(catalogue);
    for (const listener of listeners) {
        try {
            listener(cityId, copy);
        } catch (error) {
            console.error("City aircraft catalogue listener error:", error.message);
        }
    }
}

// Editing a city file manually is supported too. Watch the directory (rather
// than each file) so the atomic rename used by dashboard saves keeps watching.
const watchedDirectory = path.dirname(CITY_CATALOGUE_FILES.vadodara);
fsSync.watch(watchedDirectory, { persistent: false }, (_eventType, fileName) => {
    const changedPath = path.join(watchedDirectory, String(fileName || ""));
    const cityId = Object.entries(CITY_CATALOGUE_FILES)
        .find(([, filePath]) => filePath === changedPath)?.[0];
    if (!cityId) return;
    clearTimeout(reloadTimers.get(cityId));
    reloadTimers.set(cityId, setTimeout(() => {
        try {
            const catalogue = readCatalogueFile(cityId);
            catalogues.set(cityId, catalogue);
            notifyCatalogueChange(cityId, catalogue);
        } catch (error) {
            console.error(`Unable to reload ${CITY_LABELS[cityId]} aircraft catalogue:`, error.message);
        }
    }, 100));
});

function getCityAircraftCatalogue(cityIdValue) {
    const cityId = normalizeCityId(cityIdValue);
    return cloneCatalogue(catalogues.get(cityId));
}

function getDashboardAircraftCatalogues() {
    return Object.fromEntries(Object.keys(CITY_CATALOGUE_FILES).map((cityId) => [
        cityId,
        {
            label: CITY_LABELS[cityId],
            aircraft: Object.entries(catalogues.get(cityId).allAircraft).flatMap(([group, records]) =>
                records.map((record) => ({ group, ...record }))
            )
        }
    ]));
}

function findAircraft(catalogue, hexCode, registration) {
    for (const [group, records] of Object.entries(catalogue.allAircraft)) {
        const index = records.findIndex((record) => (
            record.HexCode === hexCode && (registration === undefined || record.Registration === registration)
        ));
        if (index !== -1) return { group, index };
    }
    return null;
}

async function saveCatalogue(cityId, catalogue) {
    const filePath = CITY_CATALOGUE_FILES[cityId];
    const output = `// Managed from the authenticated dashboard. Do not edit while a dashboard update is in progress.\n` +
        `const cityAlertAircrafts = ${JSON.stringify(catalogue, null, 4)};\n\nmodule.exports = cityAlertAircrafts;\n`;
    const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    try {
        await fs.writeFile(temporaryPath, output, { encoding: "utf8", mode: 0o600 });
        await fs.rename(temporaryPath, filePath);
    } catch (error) {
        await fs.unlink(temporaryPath).catch(() => {});
        throw new CityAircraftCatalogueError(`Unable to save the ${CITY_LABELS[cityId]} aircraft file: ${error.message}`, 503);
    }
    catalogues.set(cityId, catalogue);
    notifyCatalogueChange(cityId, catalogue);
    return cloneCatalogue(catalogue);
}

// A single Node process can receive overlapping dashboard requests. Queue
// mutations by city so each request reads the catalogue only after the prior
// request has saved its change. Different cities can still save in parallel.
function queueCityMutation(cityId, mutation) {
    const previous = cityWriteQueues.get(cityId) || Promise.resolve();
    const operation = previous.catch(() => undefined).then(mutation);
    const queueTail = operation.catch(() => undefined);
    cityWriteQueues.set(cityId, queueTail);
    queueTail.finally(() => {
        if (cityWriteQueues.get(cityId) === queueTail) {
            cityWriteQueues.delete(cityId);
        }
    });
    return operation;
}

async function addCityAircraft(cityIdValue, groupValue, aircraftValue) {
    const cityId = normalizeCityId(cityIdValue);
    const group = normalizeText(groupValue, "Aircraft group");
    const aircraft = normalizeAircraft(aircraftValue);
    return queueCityMutation(cityId, async () => {
        const catalogue = getCityAircraftCatalogue(cityId);
        if (findAircraft(catalogue, aircraft.HexCode)) {
            throw new CityAircraftCatalogueError(`${aircraft.HexCode} already exists in the ${CITY_LABELS[cityId]} catalogue`, 409);
        }
        (catalogue.allAircraft[group] ||= []).push(aircraft);
        await saveCatalogue(cityId, catalogue);
        return aircraft;
    });
}

async function updateCityAircraft(cityIdValue, originalHexValue, originalRegistrationValue, groupValue, aircraftValue) {
    const cityId = normalizeCityId(cityIdValue);
    const originalHex = typeof originalHexValue === "string" ? originalHexValue.trim().toUpperCase() : "";
    const group = normalizeText(groupValue, "Aircraft group");
    const aircraft = normalizeAircraft(aircraftValue);
    const originalRegistration = typeof originalRegistrationValue === "string" ? originalRegistrationValue.trim() : "";
    return queueCityMutation(cityId, async () => {
        const catalogue = getCityAircraftCatalogue(cityId);
        const found = findAircraft(catalogue, originalHex, originalRegistration);
        if (!found) throw new CityAircraftCatalogueError("Aircraft was not found in this city catalogue", 404);
        const duplicate = findAircraft(catalogue, aircraft.HexCode);
        if (duplicate && aircraft.HexCode !== originalHex) {
            throw new CityAircraftCatalogueError(`${aircraft.HexCode} already exists in the ${CITY_LABELS[cityId]} catalogue`, 409);
        }
        catalogue.allAircraft[found.group].splice(found.index, 1);
        if (!catalogue.allAircraft[found.group].length) delete catalogue.allAircraft[found.group];
        (catalogue.allAircraft[group] ||= []).push(aircraft);
        await saveCatalogue(cityId, catalogue);
        return aircraft;
    });
}

async function removeCityAircraft(cityIdValue, hexValue, registrationValue) {
    const cityId = normalizeCityId(cityIdValue);
    const hexCode = typeof hexValue === "string" ? hexValue.trim().toUpperCase() : "";
    const registration = typeof registrationValue === "string" ? registrationValue.trim() : "";
    return queueCityMutation(cityId, async () => {
        const catalogue = getCityAircraftCatalogue(cityId);
        const found = findAircraft(catalogue, hexCode, registration);
        if (!found) throw new CityAircraftCatalogueError("Aircraft was not found in this city catalogue", 404);
        catalogue.allAircraft[found.group].splice(found.index, 1);
        if (!catalogue.allAircraft[found.group].length) delete catalogue.allAircraft[found.group];
        await saveCatalogue(cityId, catalogue);
    });
}

function onCityAircraftCatalogueChange(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

module.exports = {
    CITY_LABELS,
    CityAircraftCatalogueError,
    getCityAircraftCatalogue,
    getDashboardAircraftCatalogues,
    addCityAircraft,
    updateCityAircraft,
    removeCityAircraft,
    onCityAircraftCatalogueChange
};
