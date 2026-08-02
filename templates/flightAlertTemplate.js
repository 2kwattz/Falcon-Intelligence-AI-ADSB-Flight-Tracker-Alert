function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatIndianStandardTime(date = new Date()) {
    const formattedTime = new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
    }).format(date);

    return `${formattedTime} IST`;
}

function flightAlertTemplate(match) {
    const hasValue = (value) => {
        if (Array.isArray(value)) {
            return value.length > 0;
        }

        return value !== null && value !== undefined && value !== "";
    };

    const formatValue = (value, unit = "") => {
        if (!hasValue(value)) {
            return "Unknown";
        }

        const formattedValue = Array.isArray(value) ? value.join(", ") : value;
        return escapeHtml(`${formattedValue}${unit ? ` ${unit}` : ""}`);
    };

    const row = (label, value, unit) => `
<tr>
<td style="padding:12px 18px;color:#7ea4b3;border-bottom:1px solid #17313c;width:42%;">
${escapeHtml(label)}
</td>
<td style="padding:12px 18px;color:#ffffff;border-bottom:1px solid #17313c;">
${formatValue(value, unit)}
</td>
</tr>`;

    const telemetrySection = (title, fields, includeEmptyFields = false) => {
        const availableFields = includeEmptyFields
            ? fields
            : fields.filter(([, value]) => hasValue(value));

        if (availableFields.length === 0) {
            return "";
        }

        return `
<tr style="background:#0f2430;">
<td colspan="2" style="padding:14px 18px;color:#67e8f9;font-size:13px;letter-spacing:2px;font-weight:bold;">
${escapeHtml(title)}
</td>
</tr>
${availableFields.map(([label, value, unit]) => row(label, value, unit)).join("")}`;
    };

    const telemetrySections = [
        // These fields have IAF-data fallbacks in adsbRoutes and remain visible
        // even when the live ADS-B feed has not supplied the corresponding value.
        telemetrySection("AIRCRAFT IDENTITY", [
            ["Registration", match.registration],
            ["ICAO Type Designator", match.aircraftType],
            ["Aircraft Description", match.description],
            ["Operator", match.operator],
            ["Mode-S / Hex", match.hexCode]
        ], true),
        telemetrySection("LIVE ADS-B IDENTITY", [
            ["Callsign / Flight ID", match.callsign]
        ]),
        telemetrySection("FLIGHT TELEMETRY", [
            ["Barometric Altitude", match.altitude, "ft"],
            ["Geometric Altitude", match.gpsAltitude, "ft"],
            ["Ground Speed", match.groundSpeed, "kt"],
            ["Indicated Airspeed (IAS)", match.ias, "kt"],
            ["True Airspeed (TAS)", match.tas, "kt"],
            ["Mach", match.mach],
            ["Ground Track", match.track, "°"],
            ["Track Rate", match.trackRate, "°/s"],
            ["True Heading", match.trueHeading, "°"],
            ["Magnetic Heading", match.magneticHeading, "°"],
            ["Roll", match.roll, "°"],
            ["Barometric Vertical Speed", match.verticalSpeed, "ft/min"],
            ["Geometric Vertical Speed", match.geometricVerticalSpeed, "ft/min"],
            ["Squawk", match.squawk]
        ]),
        telemetrySection("ATMOSPHERIC CONDITIONS", [
            ["Wind Direction", match.windDirection, "°"],
            ["Wind Speed", match.windSpeed, "kt"],
            ["Outside Air Temperature", match.outsideAirTemp, "°C"],
            ["Total Air Temperature", match.totalAirTemp, "°C"],
            ["Pressure Setting (QNH)", match.qnh, "hPa"]
        ]),
        telemetrySection("NAVIGATION & POSITION", [
            ["Latitude", match.latitude],
            ["Longitude", match.longitude],
            ["MCP Selected Altitude", match.selectedAltitude, "ft"],
            ["Selected Heading", match.selectedHeading, "°"],
            ["Navigation Modes", match.navigationModes]
        ]),
        telemetrySection("SURVEILLANCE QUALITY", [
            ["Navigation Integrity Category (NIC)", match.nic],
            ["Radius of Containment (RC)", match.rc, "m"],
            ["Barometric NIC", match.nicBaro],
            ["Navigation Accuracy Category — Position", match.nacP],
            ["Navigation Accuracy Category — Velocity", match.nacV],
            ["Surveillance Integrity Level (SIL)", match.sil],
            ["SIL Supplement", match.silType],
            ["ADS-B Version", match.version]
        ]),
        telemetrySection("RECEIVER STATUS", [
            ["ADS-B Alert Flag", match.alert],
            ["Special Position Identification (SPI)", match.spi],
            ["MLAT Contribution", match.mlat],
            ["TIS-B Contribution", match.tisb],
            ["Age of Last Message", match.seen, "s"],
            ["Age of Last Position", match.seenPosition, "s"],
            ["Messages Received", match.messages],
            ["Received Signal Strength", match.rssi, "dBFS"]
        ])
    ].join("");

    const data = {
        aircraftType: formatValue(match.aircraftType),
        registration: formatValue(match.registration),
        time: escapeHtml(formatIndianStandardTime())
    };

    return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Falcon Intelligence</title>
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

<!-- ================= HEADER ================= -->

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
TACTICAL AIR SURVEILLANCE NETWORK
</div>

<h1
style="
margin:0;
font-size:34px;
letter-spacing:4px;
font-weight:700;
color:#ffffff;
">
FALCON INTELLIGENCE
</h1>

<p
style="
margin:14px 0 0;
font-size:15px;
letter-spacing:1px;
color:#8bd3ff;
">
AUTOMATED FLIGHT DETECTION & ALERT SYSTEM
</p>

</td>
</tr>

<!-- ================= BODY ================= -->

<tr>
<td style="padding:34px;">

<h2
style="
margin:0;
color:#5eead4;
font-size:24px;
letter-spacing:1px;
">
${data.aircraftType} ${data.registration}
</h2>

<p
style="
margin-top:18px;
color:#c8d4db;
line-height:1.8;
font-size:15px;
">
A monitored aircraft has entered the configured surveillance radius of
<strong style="color:#5eead4;">100 km surrounding Vadodara, Gujarat</strong>.
This notification has been automatically generated by the Falcon Intelligence
monitoring engine.
</p>

<!-- ================= STATUS ================= -->

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
<span style="color:#22c55e;">TRACK ACTIVE</span><br>

ZONE&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:
VADODARA<br>

RADIUS&nbsp;&nbsp;&nbsp;&nbsp;:
100 KM<br>

SOURCE&nbsp;&nbsp;&nbsp;&nbsp;:
ADS-B<br>

TIME (IST)&nbsp;:
${data.time}

</td>
</tr>

</table>

<!-- ================= TELEMETRY ================= -->

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

${telemetrySections}

</table>

<!-- ================= ALERT BOX ================= -->

<div
style="
margin-top:32px;
background:#08151d;
border:1px solid #214654;
border-left:5px solid #22c55e;
border-radius:10px;
padding:20px;
">

<div
style="
font-size:12px;
letter-spacing:2px;
font-weight:bold;
color:#22c55e;
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
surveillance perimeter around Vadodara.

Continue monitoring for changes in heading, altitude, speed or departure from
the monitored zone.
</div>

</div>

</td>
</tr>

<!-- ================= FOOTER ================= -->

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
FALCON INTELLIGENCE
</p>

<p
style="
margin:10px 0 0;
color:#7c95a1;
font-size:12px;
letter-spacing:1px;
">
TACTICAL FLIGHT MONITORING • AUTOMATED ALERT DELIVERY
</p>

<p
style="
margin-top:18px;
color:#4d6572;
font-size:11px;
">
© ${new Date().getFullYear()} Falcon Intelligence. All rights reserved.
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
