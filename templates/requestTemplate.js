function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function requestDetails({ name, email, phone, message }) {
    return [
        ["Name", name],
        ["Email address", email],
        ["Phone number", phone],
        ["Watchlist request", message]
    ];
}

function requestTemplate({ name, email, phone, message }) {
    const details = requestDetails({ name, email, phone, message });
    const blocks = details.map(([label, value]) => `
        <tr>
            <td style="padding:0 0 20px;">
                <p style="margin:0 0 6px; color:#52616b; font-family:Arial, Helvetica, sans-serif; font-size:13px; font-weight:700; letter-spacing:.08em; text-transform:uppercase;">${escapeHtml(label)}</p>
                <div style="padding:14px 16px; background:#eef5f6; border:1px solid #dce5eb; border-radius:8px; color:#17222b; font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:1.6; white-space:pre-wrap; word-break:break-word;">${escapeHtml(value)}</div>
            </td>
        </tr>
    `).join("");

    return `
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Falcon Intelligence</title>
</head>
<body style="margin:0; padding:0; background:#f3f6f8; color:#17222b; font-family:Arial, Helvetica, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px; background:#f3f6f8;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px; overflow:hidden; background:#ffffff; border-radius:12px; box-shadow:0 10px 30px rgba(23,34,43,.1);">
                    <tr>
                        <td style="padding:28px 32px; background:#0e2434;">
                            <p style="margin:0 0 8px; color:#69e1c1; font-size:12px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase;">Falcon Intelligence</p>
                            <h1 style="margin:0; color:#ffffff; font-size:27px; line-height:1.25;">You got a new registration request</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:28px 32px 8px;">
                            <p style="margin:0 0 22px; color:#52616b; font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:1.55;">A visitor submitted a watchlist request with the following details.</p>
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                ${blocks}
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

requestTemplate.toText = ({ name, email, phone, message }) => requestDetails({ name, email, phone, message })
    .map(([label, value]) => `${label}:\n${String(value ?? "")}`)
    .join("\n\n");

module.exports = requestTemplate;
