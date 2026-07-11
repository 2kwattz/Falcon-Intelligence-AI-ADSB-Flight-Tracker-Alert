function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function welcomeTemplate(firstName = "there") {
    const safeName = escapeHtml(String(firstName).trim() || "there");

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Welcome to ShadowChat</title>
</head>
<body style="margin:0; padding:0; background-color:#f3f4f6; font-family:Arial, Helvetica, sans-serif; color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f3f4f6; padding:32px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 12px 32px rgba(17,24,39,0.08);">
                    <tr>
                        <td style="background-color:#111827; padding:34px 28px; text-align:center;">
                            <h1 style="margin:0; color:#ffffff; font-size:30px; line-height:1.25; font-weight:700;">Welcome to ShadowChat</h1>
                            <p style="margin:10px 0 0; color:#d1d5db; font-size:15px; line-height:1.6;">Your account is ready. Let the conversations begin.</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:34px 28px;">
                            <p style="margin:0 0 18px; font-size:17px; line-height:1.6;">Hi ${safeName},</p>
                            <p style="margin:0 0 18px; font-size:16px; line-height:1.7; color:#374151;">
                                Thanks for joining ShadowChat. We are excited to have you onboard and ready to connect, share, and chat in a cleaner, safer space.
                            </p>
                            <p style="margin:0 0 24px; font-size:16px; line-height:1.7; color:#374151;">
                                You can now sign in to your account and start exploring your new chat experience.
                            </p>
                            <table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0;">
                                <tr>
                                    <td style="border-radius:10px; background-color:#2563eb;">
                                        <a href="${process.env.CLIENT_URL || "#"}" style="display:inline-block; padding:14px 22px; color:#ffffff; text-decoration:none; font-size:15px; font-weight:700;">
                                            Open ShadowChat
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            <p style="margin:0; font-size:14px; line-height:1.7; color:#6b7280;">
                                If the button does not work, open this link in your browser:
                                <br />
                                <a href="${process.env.CLIENT_URL || "#"}" style="color:#2563eb; word-break:break-all;">${process.env.CLIENT_URL || "ShadowChat app URL"}</a>
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color:#f9fafb; padding:22px 28px; text-align:center; border-top:1px solid #e5e7eb;">
                            <p style="margin:0; color:#6b7280; font-size:13px; line-height:1.6;">
                                This email was sent because a ShadowChat account was created with this email address.
                            </p>
                            <p style="margin:10px 0 0; color:#9ca3af; font-size:12px;">&copy; ${new Date().getFullYear()} ShadowChat. All rights reserved.</p>
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

module.exports = welcomeTemplate;
