function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function forgotPasswordTemplate({
    userName = "there",
    resetLink = "#",
    ipAddress = "Unknown"
}) {

    const safeName = escapeHtml(String(userName).trim() || "there");
    const safeLink = escapeHtml(resetLink);
    const safeIp = escapeHtml(ipAddress);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Reset Your Password</title>
</head>

<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">

<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;background:#f3f4f6;">
<tr>
<td align="center">

<table role="presentation" width="100%" cellspacing="0" cellpadding="0"
style="max-width:620px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 12px 32px rgba(17,24,39,.08);">

    <!-- Header -->
    <tr>
        <td style="background:#111827;padding:34px 28px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:30px;font-weight:700;">
                Reset Your Password
            </h1>

            <p style="margin:10px 0 0;color:#d1d5db;font-size:15px;line-height:1.6;">
                We received a request to reset your ShadowChat password.
            </p>
        </td>
    </tr>

    <!-- Body -->
    <tr>
        <td style="padding:34px 28px;">

            <p style="margin:0 0 18px;font-size:17px;line-height:1.6;">
                Hi ${safeName},
            </p>

            <p style="margin:0 0 18px;font-size:16px;line-height:1.7;color:#374151;">
                A request was made to reset the password for your ShadowChat account.
                If you initiated this request, click the button below to choose a new password.
            </p>

            <table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0;">
                <tr>
                    <td style="border-radius:10px;background:#2563eb;">
                        <a
                            href="${safeLink}"
                            style="display:inline-block;padding:14px 22px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;"
                        >
                            Reset Password
                        </a>
                    </td>
                </tr>
            </table>

            <p style="margin:0 0 22px;font-size:14px;line-height:1.7;color:#6b7280;">
                This password reset link will expire in
                <strong>15 minutes</strong>
                for your security.
            </p>

            <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
            style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:24px;">
                <tr>
                    <td style="padding:18px;">
                        <p style="margin:0 0 10px;font-size:15px;font-weight:600;color:#111827;">
                            Request Details
                        </p>

                        <p style="margin:6px 0;font-size:14px;color:#4b5563;">
                            <strong>Account:</strong> ${safeName}
                        </p>

                        <p style="margin:6px 0;font-size:14px;color:#4b5563;">
                            <strong>IP Address:</strong> ${safeIp}
                        </p>
                    </td>
                </tr>
            </table>

            <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#374151;">
                If you did <strong>not</strong> request a password reset, you can safely ignore this email.
                Your password will remain unchanged and no further action is required.
            </p>

            <p style="margin:0;font-size:14px;line-height:1.7;color:#6b7280;">
                If the button above doesn't work, copy and paste the following URL into your browser:
                <br><br>

                <a href="${safeLink}"
                   style="color:#2563eb;word-break:break-all;">
                    ${safeLink}
                </a>
            </p>

        </td>
    </tr>

    <!-- Footer -->
    <tr>
        <td style="background:#f9fafb;padding:22px 28px;text-align:center;border-top:1px solid #e5e7eb;">

            <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">
                This email was sent because a password reset was requested for your ShadowChat account.
            </p>

            <p style="margin:10px 0 0;color:#9ca3af;font-size:12px;">
                &copy; ${new Date().getFullYear()} ShadowChat. All rights reserved.
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

module.exports = forgotPasswordTemplate;