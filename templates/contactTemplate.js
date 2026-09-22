function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function contactTemplate({ name, email, message }) {
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
                            <h1 style="margin:0; color:#ffffff; font-size:27px; line-height:1.25;">You got a new contact message</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:28px 32px;">
                            <p style="margin:0 0 10px; color:#52616b; font-size:13px; font-weight:700; letter-spacing:.08em; text-transform:uppercase;">From</p>
                            <p style="margin:0 0 4px; color:#17222b; font-size:17px; font-weight:700;">${escapeHtml(name)}</p>
                            <p style="margin:0 0 26px; font-size:15px;"><a href="mailto:${escapeHtml(email)}" style="color:#137b72;">${escapeHtml(email)}</a></p>
                            <p style="margin:0 0 10px; color:#52616b; font-size:13px; font-weight:700; letter-spacing:.08em; text-transform:uppercase;">Message</p>
                            <div style="padding:18px; border-radius:8px; background:#eef5f6; color:#17222b; font-size:15px; line-height:1.6; white-space:pre-wrap; word-break:break-word;">${escapeHtml(message)}</div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

module.exports = contactTemplate;
