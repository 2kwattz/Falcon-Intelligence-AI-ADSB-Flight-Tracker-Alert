// function escapeHtml(value) {
//     return String(value)
//         .replace(/&/g, "&amp;")
//         .replace(/</g, "&lt;")
//         .replace(/>/g, "&gt;")
//         .replace(/"/g, "&quot;")
//         .replace(/'/g, "&#039;");
// }

// function formatIndianStandardTime(date = new Date()) {
//     const formattedTime = new Intl.DateTimeFormat("en-IN", {
//         timeZone: "Asia/Kolkata",
//         day: "2-digit",
//         month: "long",
//         year: "numeric",
//         hour: "2-digit",
//         minute: "2-digit",
//         second: "2-digit",
//         hour12: true
//     }).format(date);

//     return `${formattedTime} IST`;
// }

// function flightAlertTemplate(match) {
//     const hasValue = (value) => {
//         if (Array.isArray(value)) {
//             return value.length > 0;
//         }

//         return value !== null && value !== undefined && value !== "";
//     };

//     const formatValue = (value, unit = "") => {
//         if (!hasValue(value)) {
//             return "Unknown";
//         }

//         const formattedValue = Array.isArray(value) ? value.join(", ") : value;
//         return escapeHtml(`${formattedValue}${unit ? ` ${unit}` : ""}`);
//     };

//     const row = (label, value, unit) => `
// <tr>
// <td style="padding:12px 18px;color:#7ea4b3;border-bottom:1px solid #17313c;width:42%;">
// ${escapeHtml(label)}
// </td>
// <td style="padding:12px 18px;color:#ffffff;border-bottom:1px solid #17313c;">
// ${formatValue(value, unit)}
// </td>
// </tr>`;

//     const telemetrySection = (title, fields, includeEmptyFields = false) => {
//         const availableFields = includeEmptyFields
//             ? fields
//             : fields.filter(([, value]) => hasValue(value));

//         if (availableFields.length === 0) {
//             return "";
//         }

//         return `
// <tr style="background:#0f2430;">
// <td colspan="2" style="padding:14px 18px;color:#67e8f9;font-size:13px;letter-spacing:2px;font-weight:bold;">
// ${escapeHtml(title)}
// </td>
// </tr>
// ${availableFields.map(([label, value, unit]) => row(label, value, unit)).join("")}`;
//     };

//     const telemetrySections = [
//         // These fields have IAF-data fallbacks in adsbRoutes and remain visible
//         // even when the live ADS-B feed has not supplied the corresponding value.
//         telemetrySection("AIRCRAFT IDENTITY", [
//             ["Registration", match.registration],
//             ["ICAO Type Designator", match.aircraftType],
//             ["Aircraft Description", match.description],
//             ["Operator", match.operator],
//             ["Mode-S / Hex", match.hexCode]
//         ], true),
//         telemetrySection("LIVE ADS-B IDENTITY", [
//             ["Callsign / Flight ID", match.callsign]
//         ]),
//         telemetrySection("FLIGHT TELEMETRY", [
//             ["Barometric Altitude", match.altitude, "ft"],
//             ["Geometric Altitude", match.gpsAltitude, "ft"],
//             ["Ground Speed", match.groundSpeed, "kt"],
//             ["Indicated Airspeed (IAS)", match.ias, "kt"],
//             ["True Airspeed (TAS)", match.tas, "kt"],
//             ["Mach", match.mach],
//             ["Ground Track", match.track, "°"],
//             ["Track Rate", match.trackRate, "°/s"],
//             ["True Heading", match.trueHeading, "°"],
//             ["Magnetic Heading", match.magneticHeading, "°"],
//             ["Roll", match.roll, "°"],
//             ["Barometric Vertical Speed", match.verticalSpeed, "ft/min"],
//             ["Geometric Vertical Speed", match.geometricVerticalSpeed, "ft/min"],
//             ["Squawk", match.squawk]
//         ]),
//         telemetrySection("ATMOSPHERIC CONDITIONS", [
//             ["Wind Direction", match.windDirection, "°"],
//             ["Wind Speed", match.windSpeed, "kt"],
//             ["Outside Air Temperature", match.outsideAirTemp, "°C"],
//             ["Total Air Temperature", match.totalAirTemp, "°C"],
//             ["Pressure Setting (QNH)", match.qnh, "hPa"]
//         ]),
//         telemetrySection("NAVIGATION & POSITION", [
//             ["Latitude", match.latitude],
//             ["Longitude", match.longitude],
//             ["MCP Selected Altitude", match.selectedAltitude, "ft"],
//             ["Selected Heading", match.selectedHeading, "°"],
//             ["Navigation Modes", match.navigationModes]
//         ]),
//         telemetrySection("SURVEILLANCE QUALITY", [
//             ["Navigation Integrity Category (NIC)", match.nic],
//             ["Radius of Containment (RC)", match.rc, "m"],
//             ["Barometric NIC", match.nicBaro],
//             ["Navigation Accuracy Category — Position", match.nacP],
//             ["Navigation Accuracy Category — Velocity", match.nacV],
//             ["Surveillance Integrity Level (SIL)", match.sil],
//             ["SIL Supplement", match.silType],
//             ["ADS-B Version", match.version]
//         ]),
//         telemetrySection("RECEIVER STATUS", [
//             ["ADS-B Alert Flag", match.alert],
//             ["Special Position Identification (SPI)", match.spi],
//             ["MLAT Contribution", match.mlat],
//             ["TIS-B Contribution", match.tisb],
//             ["Age of Last Message", match.seen, "s"],
//             ["Age of Last Position", match.seenPosition, "s"],
//             ["Messages Received", match.messages],
//             ["Received Signal Strength", match.rssi, "dBFS"]
//         ])
//     ].join("");

//     const data = {
//         aircraftType: formatValue(match.aircraftType),
//         registration: formatValue(match.registration),
//         time: escapeHtml(formatIndianStandardTime())
//     };

//     return `
// <!DOCTYPE html>
// <html lang="en">
// <head>
// <meta charset="UTF-8">
// <meta name="viewport" content="width=device-width, initial-scale=1.0">
// <title>Falcon Intelligence</title>
// </head>

// <body style="
//     margin:0;
//     padding:0;
//     background:#071018;
//     font-family:'Segoe UI',Arial,sans-serif;
//     color:#ffffff;
// ">

// <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#071018;padding:40px 16px;">
// <tr>
// <td align="center">

// <table role="presentation"
// width="100%"
// cellpadding="0"
// cellspacing="0"
// style="
// max-width:760px;
// background:#0b1620;
// border:1px solid #183743;
// border-radius:16px;
// overflow:hidden;
// box-shadow:0 20px 50px rgba(0,0,0,.45);
// ">

// <!-- ================= HEADER ================= -->

// <tr>
// <td
// style="
// background:linear-gradient(135deg,#071822 0%,#0c2431 45%,#10322e 100%);
// padding:42px 30px;
// border-bottom:1px solid #214654;
// text-align:center;
// ">

// <div
// style="
// display:inline-block;
// padding:7px 18px;
// border:1px solid #2c6973;
// border-radius:999px;
// color:#5eead4;
// font-size:11px;
// letter-spacing:2px;
// margin-bottom:18px;
// ">
// TACTICAL AIR SURVEILLANCE NETWORK
// </div>

// <h1
// style="
// margin:0;
// font-size:34px;
// letter-spacing:4px;
// font-weight:700;
// color:#ffffff;
// ">
// FALCON INTELLIGENCE
// </h1>

// <p
// style="
// margin:14px 0 0;
// font-size:15px;
// letter-spacing:1px;
// color:#8bd3ff;
// ">
// AUTOMATED FLIGHT DETECTION & ALERT SYSTEM
// </p>

// </td>
// </tr>

// <!-- ================= BODY ================= -->

// <tr>
// <td style="padding:34px;">

// <h2
// style="
// margin:0;
// color:#5eead4;
// font-size:24px;
// letter-spacing:1px;
// ">
// ${data.aircraftType} ${data.registration}
// </h2>

// <p
// style="
// margin-top:18px;
// color:#c8d4db;
// line-height:1.8;
// font-size:15px;
// ">
// A monitored aircraft has entered the configured surveillance radius of
// <strong style="color:#5eead4;">100 km surrounding Vadodara, Gujarat</strong>.
// This notification has been automatically generated by the Falcon Intelligence
// monitoring engine.
// </p>

// <!-- ================= STATUS ================= -->

// <table
// role="presentation"
// width="100%"
// cellpadding="0"
// cellspacing="0"
// style="
// margin-top:30px;
// background:#08131a;
// border:1px solid #214654;
// border-radius:10px;
// overflow:hidden;
// font-family:Consolas,'Courier New',monospace;
// ">

// <tr>
// <td
// style="
// padding:14px 18px;
// background:#0f2430;
// color:#67e8f9;
// font-size:13px;
// letter-spacing:2px;
// font-weight:bold;
// ">
// MISSION STATUS
// </td>
// </tr>

// <tr>
// <td style="padding:20px;color:#d8f6ff;font-size:14px;line-height:2;">

// STATUS&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:
// <span style="color:#22c55e;">TRACK ACTIVE</span><br>

// ZONE&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:
// VADODARA<br>

// RADIUS&nbsp;&nbsp;&nbsp;&nbsp;:
// 100 KM<br>

// SOURCE&nbsp;&nbsp;&nbsp;&nbsp;:
// ADS-B<br>

// TIME (IST)&nbsp;:
// ${data.time}

// </td>
// </tr>

// </table>

// <!-- ================= TELEMETRY ================= -->

// <table
// role="presentation"
// width="100%"
// cellpadding="0"
// cellspacing="0"
// style="
// margin-top:30px;
// border-collapse:collapse;
// background:#08131a;
// border:1px solid #214654;
// font-family:Consolas,'Courier New',monospace;
// ">

// ${telemetrySections}

// </table>

// <!-- ================= ALERT BOX ================= -->

// <div
// style="
// margin-top:32px;
// background:#08151d;
// border:1px solid #214654;
// border-left:5px solid #22c55e;
// border-radius:10px;
// padding:20px;
// ">

// <div
// style="
// font-size:12px;
// letter-spacing:2px;
// font-weight:bold;
// color:#22c55e;
// margin-bottom:12px;
// ">
// ALERT STATUS
// </div>

// <div
// style="
// color:#d9e8ef;
// font-size:15px;
// line-height:1.8;
// ">
// The monitored aircraft is currently operating inside the configured
// surveillance perimeter around Vadodara.

// Continue monitoring for changes in heading, altitude, speed or departure from
// the monitored zone.
// </div>

// </div>

// </td>
// </tr>

// <!-- ================= FOOTER ================= -->

// <tr>
// <td
// style="
// background:#050d13;
// padding:28px;
// text-align:center;
// border-top:1px solid #17313c;
// ">

// <p
// style="
// margin:0;
// color:#5eead4;
// font-size:13px;
// letter-spacing:3px;
// ">
// FALCON INTELLIGENCE
// </p>

// <p
// style="
// margin:10px 0 0;
// color:#7c95a1;
// font-size:12px;
// letter-spacing:1px;
// ">
// TACTICAL FLIGHT MONITORING • AUTOMATED ALERT DELIVERY
// </p>

// <p
// style="
// margin-top:18px;
// color:#4d6572;
// font-size:11px;
// ">
// © ${new Date().getFullYear()} Falcon Intelligence. All rights reserved.
// </p>

// </td>
// </tr>

// </table>

// </td>
// </tr>
// </table>

// </body>
// </html>
// `;
// }

// module.exports = flightAlertTemplate;

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

    const row = (label, value, unit = "") => `
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
${availableFields
    .map(([label, value, unit]) => row(label, value, unit))
    .join("")}`;
    };

    /*
     * ============================================================
     * TWO MODES
     * ============================================================
     *
     * Normal aircraft:
     * match.predictedRegistration is falsy / absent
     *
     * Mystery Box:
     * match.predictedRegistration is truthy
     */

    const isMysteryBox = !!match.predictedRegistration;

    /*
     * ============================================================
     * TELEMETRY
     * ============================================================
     */

    const telemetrySections = [
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

        /*
         * Only Mystery Box aircraft show predicted identity.
         */
        isMysteryBox
            ? telemetrySection("PREDICTED AIRCRAFT IDENTITY", [
                ["Predicted Registration", match.predictedRegistration],
                ["Predicted Aircraft", match.predictedAircraftType],
                ["Predicted Type Code", match.predictedType],
                ["Predicted Operator", match.predictedOperator]
            ])
            : "",

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

    /*
     * ============================================================
     * DISPLAY DATA
     * ============================================================
     */

    const data = {
        aircraftType: formatValue(
            isMysteryBox ? "MYSTERY BOX AIRCRAFT" : match.aircraftType
        ),

        registration: formatValue(
            isMysteryBox ? "UNKNOWN" : match.registration
        ),

        predictedReg: formatValue(match.predictedRegistration),

        predictedAircraftType: formatValue(
            match.predictedAircraftType
        ),

        predictedType: formatValue(
            match.predictedType
        ),

        predictedOperator: formatValue(
            match.predictedOperator
        ),

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
${isMysteryBox
    ? "MYSTERY BOX AIRCRAFT DETECTED"
    : "AUTOMATED FLIGHT DETECTION & ALERT SYSTEM"}
</p>

</td>
</tr>

<!-- ================= BODY ================= -->

<tr>
<td style="padding:34px;">

<h2
style="
margin:0;
color:${isMysteryBox ? "#facc15" : "#5eead4"};
font-size:24px;
letter-spacing:1px;
">
${isMysteryBox
    ? "🕵️ MYSTERY BOX AIRCRAFT"
    : `${data.aircraftType} ${data.registration}`}
</h2>

<p
style="
margin-top:18px;
color:#c8d4db;
line-height:1.8;
font-size:15px;
">

${isMysteryBox
    ? `
A monitored aircraft has entered the configured surveillance radius of
<strong style="color:#5eead4;">100 km surrounding Vadodara, Gujarat</strong>.

<br><br>

The server detected an aircraft. 

<br><br>

The Mode-S / ADS-B hex value recieved from the aircraft is:
 
<strong style="color:#67e8f9;">
${formatValue(match.hexCode)}
</strong>

<br><br>

And this is where things get interesting.

The detected hex <strong style="color:#facc15;">cannot be reliably treated as a confirmed aircraft identity.</strong>

It may be:

<strong style="color:#facc15;">
a spoofed or otherwise misleading hex value,
</strong>

or the aircraft may simply be
<strong style="color:#facc15;">
not transmitting usable identifying information through ADS-B.
</strong>

<br><br>

In other words, the receiver basically told us:

<strong style="color:#ffffff;">
"Yes, something is here. No, I'm not telling you who."
</strong>

<br><br>

We've got the hex.

We've got absolutely no useful identity information.

<br><br>

Registration?
<strong style="color:#facc15;">Unknown.</strong>

<br>

Aircraft type?
<strong style="color:#facc15;">Unknown.</strong>

<br>

Operator?
<strong style="color:#facc15;">Unknown.</strong>

<br><br>

But Falcon Intelligence has a prediction:

<strong style="color:#a78bfa;">
${data.predictedAircraftType}
</strong>

<br><br>

Prediction is based on open source data of invalid transponder codes, code spoofings, history of aircrafts using such codes.
So this is where you stop trusting computers and start looking at the sky.

`
    : `
A monitored aircraft has entered the configured surveillance radius of
<strong style="color:#5eead4;">100 km surrounding Vadodara, Gujarat</strong>.
This notification has been automatically generated by the Falcon Intelligence
monitoring engine.
`}

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
${isMysteryBox ? "MYSTERY BOX STATUS" : "MISSION STATUS"}
</td>
</tr>

<tr>
<td style="padding:20px;color:#d8f6ff;font-size:14px;line-height:2;">

${isMysteryBox
    ? `
STATUS&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:
<span style="color:#facc15;">IDENTITY UNKNOWN</span><br>

ZONE&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:
VADODARA<br>

RADIUS&nbsp;&nbsp;&nbsp;&nbsp;:
100 KM<br>

SOURCE&nbsp;&nbsp;&nbsp;&nbsp;:
ADS-B<br>

HEX&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:
<span style="color:#67e8f9;">${formatValue(match.hexCode)}</span><br>

PREDICTION&nbsp;:
<span style="color:#a78bfa;">AVAILABLE</span><br>

AIRCRAFT&nbsp;&nbsp;:
<span style="color:#facc15;">REFUSED TO IDENTIFY ITSELF</span><br>

TIME (IST)&nbsp;:
${data.time}
`
    : `
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
`}

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

<!-- ================= MYSTERY BOX PREDICTION ================= -->

${isMysteryBox
    ? `
<div
style="
margin-top:32px;
background:#0c1420;
border:1px solid #4c3d73;
border-left:5px solid #a78bfa;
border-radius:10px;
padding:20px;
">

<div
style="
font-size:12px;
letter-spacing:2px;
font-weight:bold;
color:#a78bfa;
margin-bottom:12px;
">
🔮 PREDICTED AIRCRAFT DETAILS
</div>

<div
style="
color:#ffffff;
font-size:22px;
font-weight:700;
line-height:1.5;
">
${data.predictedAircraftType}
</div>

<div
style="
margin-top:14px;
color:#c8d4db;
font-size:14px;
line-height:2;
">

Predicted Registration:
<strong style="color:#ffffff;">
${data.predictedReg}
</strong>

<br>

Predicted Type:
<strong style="color:#ffffff;">
${data.predictedType}
</strong>

<br>

Predicted Operator:
<strong style="color:#ffffff;">
${data.predictedOperator}
</strong>

</div>

<div
style="
margin-top:18px;
padding-top:15px;
border-top:1px solid #293047;
color:#8f9ba5;
font-size:11px;
line-height:1.7;
">

These are predicted details based on the detected aircraft identity.

The aircraft itself hasn't confirmed any of this.

<strong style="color:#facc15;">
We've got a suspect, not a confession.
</strong>

</div>

</div>
`
    : ""}

<!-- ================= ALERT BOX ================= -->

<div
style="
margin-top:32px;
background:${isMysteryBox ? "#11151a" : "#08151d"};
border:1px solid ${isMysteryBox ? "#3b4248" : "#214654"};
border-left:5px solid ${isMysteryBox ? "#ef4444" : "#22c55e"};
border-radius:10px;
padding:20px;
">

<div
style="
font-size:12px;
letter-spacing:2px;
font-weight:bold;
color:${isMysteryBox ? "#ef4444" : "#22c55e"};
margin-bottom:12px;
">
${isMysteryBox ? "🚨 MYSTERY BOX ALERT" : "ALERT STATUS"}
</div>

<div
style="
color:#d9e8ef;
font-size:15px;
line-height:1.8;
">

${isMysteryBox
    ? `
<strong style="color:#ffffff;">
We found an aircraft.
The aircraft refused to introduce itself.
</strong>

<br><br>

<strong style="color:#facc15;font-size:17px;">
GO AND CHECK, BSDK. 💀
</strong>

<br><br>

Grab the camera.

Look at the sky.

Chodu Check the aircraft.

<br><br>

<strong style="color:#ffffff;">
Falcon Intelligence has done the nerd work.
Now go find the bastard.
</strong>

<br>
Karm Karo, Phaal ki chinta mat karo - Lord Krishna
</br>

<img src="https://passionforstorytelling.wordpress.com/wp-content/uploads/2022/03/bhagavad-gita-quotes-on-karma.png" alt="Mystery Box Aircraft" style="margin-top:18px;max-width:100%;border-radius:8px;">
`
    : `
The monitored aircraft is currently operating inside the configured
surveillance perimeter around Vadodara.

Continue monitoring for changes in heading, altitude, speed or departure from
the monitored zone.
`}

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