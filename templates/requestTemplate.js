function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function requestTemplate({ name, email, phone, message }) {
    const details = [
        ["Name", name],
        ["Email", email],
        ["Phone", phone],
        ["What they want to track and why", message]
    ];

    const rows = details.map(([label, value]) => `
        <tr>
            <td style="padding:12px 16px; border-bottom:1px solid #dce5eb; color:#52616b; font-size:14px; font-weight:700; vertical-align:top; width:210px;">${escapeHtml(label)}</td>
            <td style="padding:12px 16px; border-bottom:1px solid #dce5eb; color:#17222b; font-size:14px; line-height:1.55; white-space:pre-wrap; word-break:break-word;">${escapeHtml(value)}</td>
        </tr>
    `).join("");

    return `
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>You got a new registration request</title>
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
                        <td style="padding:28px 16px 16px;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #dce5eb; border-radius:8px; border-collapse:separate; border-spacing:0; overflow:hidden;">
                                ${rows}
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

module.exports = requestTemplate;
