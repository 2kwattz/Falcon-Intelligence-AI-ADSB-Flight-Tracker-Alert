function altitudeFilteredFlightAlertTemplate(match) {
    const hasValue = (value) => {
        if (Array.isArray(value)) {
            return value.length > 0;
        }

        return value !== null && value !== undefined && value !== "";
    };

    const escapeHtml = (value) => {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    const formatIndianStandardTime = (date = new Date()) => {
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
    };

    const formatValue = (value, unit = "") => {
        if (!hasValue(value)) {
            return "Unknown";
        }

        const formattedValue = Array.isArray(value)
            ? value.join(", ")
            : value;

        return escapeHtml(
            `${formattedValue}${unit ? ` ${unit}` : ""}`
        );
    };

    const row = (label, value, unit = "") => `
        <tr>
            <td style="
                padding: 9px 12px;
                border-bottom: 1px solid #e5e7eb;
                color: #6b7280;
                font-size: 13px;
                width: 42%;
            ">
                ${escapeHtml(label)}
            </td>
            <td style="
                padding: 9px 12px;
                border-bottom: 1px solid #e5e7eb;
                color: #111827;
                font-size: 13px;
                font-weight: 600;
            ">
                ${formatValue(value, unit)}
            </td>
        </tr>
    `;

    const data = {
        aircraftType: formatValue(match.aircraftType),
        registration: formatValue(match.registration),
        description: formatValue(match.description),
        operator: formatValue(match.operator),
        callsign: formatValue(match.callsign),
        altitude: formatValue(match.altitude, "ft"),
        hexCode: formatValue(match.hexCode),
        time: escapeHtml(formatIndianStandardTime())
    };

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Altitude Filtered - ${data.registration}</title>
</head>

<body style="
    margin: 0;
    padding: 0;
    background: #f3f4f6;
    font-family: Arial, Helvetica, sans-serif;
    color: #111827;
">

<div style="
    max-width: 720px;
    margin: 30px auto;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    overflow: hidden;
">

    <!-- HEADER -->

    <div style="
        padding: 24px 28px;
        background: #111827;
        color: #ffffff;
    ">

        <div style="
            font-size: 12px;
            letter-spacing: 1.5px;
            color: #9ca3af;
            margin-bottom: 8px;
        ">
            FALCON INTELLIGENCE
        </div>

        <div style="
            font-size: 22px;
            font-weight: 700;
        ">
            Call Alert Suppressed
        </div>

        <div style="
            margin-top: 6px;
            font-size: 13px;
            color: #d1d5db;
        ">
            ${data.aircraftType} · ${data.registration}
        </div>

    </div>


    <!-- MAIN MESSAGE -->

    <div style="padding: 28px;">

        <div style="
            font-size: 15px;
            line-height: 1.7;
            color: #374151;
        ">

            <p style="margin-top: 0;">
                We detected
                <strong>${data.aircraftType}</strong>
                <strong>${data.registration}</strong>
                within the monitored area.
            </p>

            <p>
                However, we <strong>did not send you a call alert</strong>
                because the aircraft was flying above the
                <strong>20,000 ft alert threshold</strong>.
            </p>

            <div style="
                margin: 22px 0;
                padding: 18px 20px;
                background: #f9fafb;
                border-left: 4px solid #6b7280;
                border-radius: 6px;
            ">

                <div style="
                    font-size: 12px;
                    color: #6b7280;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    margin-bottom: 6px;
                ">
                    Detected Altitude
                </div>

                <div style="
                    font-size: 25px;
                    font-weight: 700;
                    color: #111827;
                ">
                    ${data.altitude}
                </div>

            </div>

            <p>
                We understand the spotting sentiments. Nobody wants to
                grab their camera, sprint outside, look up at the sky,
                and discover that the aircraft is approximately
                <strong>six kilometres above their patience</strong>.
                😭
            </p>

            <p>
                So Falcon Intelligence decided not to create a false
                alarm. Your camera remains safely in your hands,
                your neighbours remain unbothered, and your neck has
                been spared from unnecessary sky-scanning.
            </p>

            <p>
                If the aircraft descends to <strong>20,000 ft or below</strong>,
                the normal call-alert rules will apply.
            </p>

        </div>


        <!-- STATUS -->

        <div style="
            margin-top: 28px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
        ">

            <div style="
                font-size: 12px;
                letter-spacing: 1px;
                color: #6b7280;
                margin-bottom: 12px;
                font-weight: 700;
            ">
                ALERT DECISION
            </div>

            <table style="
                width: 100%;
                border-collapse: collapse;
            ">

                ${row("Aircraft", `${match.aircraftType} / ${match.registration}`)}
                ${row("Description", match.description)}
                ${row("Operator", match.operator)}
                ${row("Callsign / Flight ID", match.callsign)}
                ${row("Barometric Altitude", match.altitude, "ft")}
                ${row("Mode-S / Hex", match.hexCode)}
                ${row("Monitoring Zone", "Vadodara")}
                ${row("Monitoring Radius", "100 KM")}
                ${row("Source", "ADS-B")}
                ${row("Decision", "CALL ALERT SUPPRESSED")}

            </table>

        </div>


        <!-- FOOTER -->

        <div style="
            margin-top: 28px;
            padding-top: 18px;
            border-top: 1px solid #e5e7eb;
            font-size: 11px;
            line-height: 1.6;
            color: #9ca3af;
        ">

            Detection time: ${data.time}<br>

            Falcon Intelligence will continue monitoring the aircraft
            for relevant altitude changes.

            <br><br>

            <strong>
                No false alarms. Just aircraft.
            </strong>

        </div>

    </div>

</div>

</body>
</html>
`;
}

module.exports = altitudeFilteredFlightAlertTemplate;