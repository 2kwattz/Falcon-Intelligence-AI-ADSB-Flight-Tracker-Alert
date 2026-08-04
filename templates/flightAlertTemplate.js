function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function isPresent(value) {
    return value !== undefined && value !== null && value !== "";
}

function firstPresent(source, keys, fallback = "Unknown") {
    for (const key of keys) {
        if (isPresent(source?.[key])) {
            return source[key];
        }
    }

    return fallback;
}

function formatValue(value, unit) {
    if (!isPresent(value)) {
        return "Unknown";
    }

    const cleanValue = escapeHtml(value);

    if (!unit) {
        return cleanValue;
    }

    return `${cleanValue} ${escapeHtml(unit)}`;
}

function formatDegrees(value) {
    if (!isPresent(value)) {
        return "Unknown";
    }

    return `${escapeHtml(value)}&deg;`;
}

function formatTimestamp(value) {
    const date = isPresent(value) ? new Date(value) : new Date();

    if (Number.isNaN(date.getTime())) {
        return escapeHtml(value);
    }

    return escapeHtml(date.toISOString().replace("T", " ").replace("Z", " UTC"));
}

function titleizeKey(key) {
    return String(key)
        .replace(/_/g, " ")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function renderRow(label, value, emphasized = false) {
    return `
<tr>
<td style="padding:12px 18px;color:#7ea4b3;border-bottom:1px solid #17313c;width:42%;">
${escapeHtml(label)}
</td>
<td style="padding:12px 18px;color:#ffffff;border-bottom:1px solid #17313c;${emphasized ? "font-weight:bold;" : ""}">
${value}
</td>
</tr>`;
}

function renderSection(title, rows) {
    const visibleRows = rows.filter(({ value }) => isPresent(value) && value !== "Unknown");

    if (visibleRows.length === 0) {
        return "";
    }

    return `
<table
role="presentation"
width="100%"
cellpadding="0"
cellspacing="0"
style="
margin-top:30px;
border-collapse:collapse;
background:#08131a;
border:1px solid #214654;
font-family:Consolas,'Courier New',monospace;
">

<tr style="background:#0f2430;">
<td colspan="2"
style="
padding:14px 18px;
color:#67e8f9;
font-size:13px;
letter-spacing:2px;
font-weight:bold;
">
${escapeHtml(title)}
</td>
</tr>

${visibleRows.map(({ label, value, emphasized }) => renderRow(label, value, emphasized)).join("")}

</table>`;
}

function normalizeAlertContext(match = {}, options = {}) {
    const merged = { ...match, ...options };
    const zoneName = firstPresent(merged, ["zoneName", "city", "zone", "location"], "Surveillance Zone");
    const radius = firstPresent(merged, ["radius", "radiusValue", "surveillanceRadius"], "Unknown");
    const radiusUnit = firstPresent(merged, ["radiusUnit", "distanceUnit"], "");
    const source = firstPresent(merged, ["source", "dataSource"], "ADS-B");
    const status = firstPresent(merged, ["status", "alertStatus"], "TRACK ACTIVE");
    const statusColor = firstPresent(merged, ["statusColor"], "#22c55e");
    const generatedAt = firstPresent(merged, ["generatedAt", "time", "timestamp", "updatedAt"], new Date());
    const systemName = firstPresent(merged, ["systemName", "brandName"], "FALCON INTELLIGENCE");
    const networkName = firstPresent(merged, ["networkName"], "TACTICAL AIR SURVEILLANCE NETWORK");
    const subtitle = firstPresent(merged, ["subtitle"], "AUTOMATED FLIGHT DETECTION & ALERT SYSTEM");
    const registration = firstPresent(merged, ["r", "Reg", "registration", "Registration"], "Unknown Registration");
    const aircraftType = firstPresent(merged, ["aircraftType", "AircraftType", "Type", "t"], "Unknown Aircraft");

    const radiusText = radius === "Unknown"
        ? "the configured radius"
        : `${escapeHtml(radius)}${radiusUnit ? ` ${escapeHtml(radiusUnit)}` : ""}`;
    const defaultDetectionTitle =
        `${registration} ${aircraftType} detected within ${radius === "Unknown" ? "configured" : `${radius}${radiusUnit ? ` ${radiusUnit}` : ""}`} surveillance range`;
    const detectionTitle = firstPresent(
        merged,
        ["detectionTitle", "title"],
        defaultDetectionTitle
    );

    return {
        detectionTitle,
        generatedAt: formatTimestamp(generatedAt),
        networkName: escapeHtml(networkName),
        radius,
        radiusText,
        radiusUnit,
        source: escapeHtml(source),
        status: escapeHtml(status),
        statusColor: escapeHtml(statusColor),
        subtitle: escapeHtml(subtitle),
        systemName: escapeHtml(systemName),
        zoneName: escapeHtml(zoneName),
        zoneNameRaw: zoneName,
    };
}

function buildAircraftRows(match = {}) {
    const rowSpecs = [
        {
            title: "Aircraft Telemetry",
            rows: [
                { label: "Registration", keys: ["r", "Reg", "registration", "Registration"], emphasized: true },
                { label: "Callsign", keys: ["flight", "callsign", "Call"] },
                { label: "Aircraft Type", keys: ["aircraftType", "AircraftType", "Type", "t"] },
                { label: "Type Code", keys: ["type", "TypeCode", "t"] },
                { label: "Operator", keys: ["operator", "Op", "AircraftOperator"] },
                { label: "Manufacturer", keys: ["manufacturer", "Man"] },
                { label: "ICAO HEX", keys: ["hex", "Icao", "Id", "hexCode", "HexCode"], emphasized: true },
                { label: "Country", keys: ["country", "Cou"] },
                { label: "Year", keys: ["year", "Year"] },
                { label: "Category", keys: ["category"] },
            ],
        },
        {
            title: "Flight Dynamics",
            rows: [
                { label: "Altitude", keys: ["alt_baro", "Alt", "altitude"], unit: "ft" },
                { label: "Geometric Altitude", keys: ["alt_geom", "GAlt", "groundAltitude"], unit: "ft" },
                { label: "Ground Speed", keys: ["gs", "Spd", "speed"], unit: "knots" },
                { label: "Indicated Airspeed", keys: ["ias"], unit: "knots" },
                { label: "True Airspeed", keys: ["tas"], unit: "knots" },
                { label: "Mach", keys: ["mach"] },
                { label: "Track", keys: ["track", "Trak"], formatter: formatDegrees },
                { label: "Magnetic Heading", keys: ["mag_heading"], formatter: formatDegrees },
                { label: "True Heading", keys: ["true_heading"], formatter: formatDegrees },
                { label: "Roll", keys: ["roll"], formatter: formatDegrees },
                { label: "Vertical Rate", keys: ["baro_rate", "geom_rate", "Vsi"], unit: "ft/min" },
            ],
        },
        {
            title: "Position & Signal",
            rows: [
                { label: "Latitude", keys: ["lat", "Lat", "latitude"] },
                { label: "Longitude", keys: ["lon", "Long", "longitude"] },
                { label: "Distance", keys: ["dst", "distance"], unit: "nm" },
                { label: "Direction", keys: ["dir"] },
                { label: "Signal", keys: ["rssi", "signal"], unit: "dBFS" },
                { label: "Messages", keys: ["messages", "CMsgs", "cMessages"] },
                { label: "Seen", keys: ["seen"] },
                { label: "Seen Position", keys: ["seen_pos"] },
            ],
        },
        {
            title: "Weather & Emergency",
            rows: [
                { label: "Squawk", keys: ["squawk", "Sqk"], emphasized: true },
                { label: "Emergency", keys: ["emergency"] },
                { label: "Wind Direction", keys: ["wd"], formatter: formatDegrees },
                { label: "Wind Speed", keys: ["ws"], unit: "knots" },
                { label: "Outside Air Temp", keys: ["oat"], unit: "C" },
                { label: "Total Air Temp", keys: ["tat"], unit: "C" },
            ],
        },
    ];

    return rowSpecs.map((section) => ({
        title: section.title,
        rows: section.rows.map((row) => {
            const value = firstPresent(match, row.keys, "");

            return {
                label: row.label,
                value: row.formatter ? row.formatter(value) : formatValue(value, row.unit),
                emphasized: row.emphasized,
            };
        }),
    }));
}

function buildAdditionalRows(match = {}) {
    const knownKeys = new Set([
        "AircraftOperator", "AircraftType", "Alt", "Call", "CMsgs", "Cou", "GAlt", "HexCode", "Icao", "Id",
        "Lat", "Long", "Man", "Op", "Reg", "Registration", "Spd", "Sqk", "Trak", "Type", "TypeCode", "Vsi",
        "Year", "alertStatus", "alt_baro", "alt_geom", "altitude", "baro_rate", "brandName", "callsign",
        "category", "city", "country", "dataSource", "detectionTitle", "dir", "distance", "distanceUnit",
        "dst", "emergency", "flight", "generatedAt", "geom_rate", "groundAltitude", "gs", "hex", "hexCode",
        "ias", "lat", "latitude", "location", "lon", "longitude", "mach", "mag_heading", "manufacturer",
        "messages", "networkName", "oat", "operator", "r", "radius", "radiusUnit", "radiusValue", "roll",
        "rssi", "seen", "seen_pos", "signal", "source", "speed", "status", "statusColor", "subtitle",
        "surveillanceRadius", "t", "tas", "tat", "time", "timestamp", "title", "track", "true_heading",
        "type", "updatedAt", "wd", "ws", "year", "zone", "zoneName",
    ]);

    return Object.entries(match)
        .filter(([key, value]) => !knownKeys.has(key) && isPresent(value) && typeof value !== "object")
        .map(([key, value]) => ({
            label: titleizeKey(key),
            value: formatValue(value),
        }));
}

function flightAlertTemplate(match = {}, options = {}) {
    const alert = normalizeAlertContext(match, options);
    const aircraftSections = buildAircraftRows(match);
    const additionalRows = buildAdditionalRows(match);
    const additionalSection = renderSection("Additional Aircraft Data", additionalRows);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${alert.systemName}</title>
</head>

<body style="
    margin:0;
    padding:0;
    background:#071018;
    font-family:'Segoe UI',Arial,sans-serif;
    color:#ffffff;
">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#071018;padding:40px 16px;">
<tr>
<td align="center">

<table role="presentation"
width="100%"
cellpadding="0"
cellspacing="0"
style="
max-width:760px;
background:#0b1620;
border:1px solid #183743;
border-radius:16px;
overflow:hidden;
box-shadow:0 20px 50px rgba(0,0,0,.45);
">

<tr>
<td
style="
background:linear-gradient(135deg,#071822 0%,#0c2431 45%,#10322e 100%);
padding:42px 30px;
border-bottom:1px solid #214654;
text-align:center;
">

<div
style="
display:inline-block;
padding:7px 18px;
border:1px solid #2c6973;
border-radius:999px;
color:#5eead4;
font-size:11px;
letter-spacing:2px;
margin-bottom:18px;
">
${alert.networkName}
</div>

<h1
style="
margin:0;
font-size:34px;
letter-spacing:4px;
font-weight:700;
color:#ffffff;
">
${alert.systemName}
</h1>

<p
style="
margin:14px 0 0;
font-size:15px;
letter-spacing:1px;
color:#8bd3ff;
">
${alert.subtitle}
</p>

</td>
</tr>

<tr>
<td style="padding:34px;">

<h2
style="
margin:0;
color:#5eead4;
font-size:24px;
letter-spacing:1px;
">
${escapeHtml(alert.detectionTitle)}
</h2>

<p
style="
margin-top:18px;
color:#c8d4db;
line-height:1.8;
font-size:15px;
">
A monitored aircraft has entered ${alert.radiusText} surrounding
<strong style="color:#5eead4;">${alert.zoneName}</strong>.
This notification has been automatically generated by the Falcon Intelligence
monitoring engine.
</p>

<table
role="presentation"
width="100%"
cellpadding="0"
cellspacing="0"
style="
margin-top:30px;
background:#08131a;
border:1px solid #214654;
border-radius:10px;
overflow:hidden;
font-family:Consolas,'Courier New',monospace;
">

<tr>
<td
style="
padding:14px 18px;
background:#0f2430;
color:#67e8f9;
font-size:13px;
letter-spacing:2px;
font-weight:bold;
">
MISSION STATUS
</td>
</tr>

<tr>
<td style="padding:20px;color:#d8f6ff;font-size:14px;line-height:2;">

STATUS&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:
<span style="color:${alert.statusColor};">${alert.status}</span><br>

ZONE&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:
${alert.zoneName}<br>

RADIUS&nbsp;&nbsp;&nbsp;&nbsp;:
${alert.radius === "Unknown" ? "Unknown" : `${escapeHtml(alert.radius)} ${escapeHtml(alert.radiusUnit)}`}<br>

SOURCE&nbsp;&nbsp;&nbsp;&nbsp;:
${alert.source}<br>

TIME (UTC)&nbsp;:
${alert.generatedAt}

</td>
</tr>

</table>

${aircraftSections.map(({ title, rows }) => renderSection(title, rows)).join("")}
${additionalSection}

<div
style="
margin-top:32px;
background:#08151d;
border:1px solid #214654;
border-left:5px solid ${alert.statusColor};
border-radius:10px;
padding:20px;
">

<div
style="
font-size:12px;
letter-spacing:2px;
font-weight:bold;
color:${alert.statusColor};
margin-bottom:12px;
">
ALERT STATUS
</div>

<div
style="
color:#d9e8ef;
font-size:15px;
line-height:1.8;
">
The monitored aircraft is currently operating inside the configured
surveillance perimeter around ${alert.zoneName}.

Continue monitoring for changes in heading, altitude, speed or departure from
the monitored zone.
</div>

</div>

</td>
</tr>

<tr>
<td
style="
background:#050d13;
padding:28px;
text-align:center;
border-top:1px solid #17313c;
">

<p
style="
margin:0;
color:#5eead4;
font-size:13px;
letter-spacing:3px;
">
${alert.systemName}
</p>

<p
style="
margin:10px 0 0;
color:#7c95a1;
font-size:12px;
letter-spacing:1px;
">
TACTICAL FLIGHT MONITORING &bull; AUTOMATED ALERT DELIVERY
</p>

<p
style="
margin-top:18px;
color:#4d6572;
font-size:11px;
">
&copy; ${new Date().getFullYear()} Falcon Intelligence. All rights reserved.
</p>

</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
`;
}

module.exports = flightAlertTemplate;
