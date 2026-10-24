function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function lyriaUsageTemplate({ isLimitReached, inputTokens, rateLimit, initiatedBy, occurredAt }) {
    const heading = isLimitReached ? "Lyria generation limit reached" : "Lyria generation attempt used";
    const summary = isLimitReached
        ? "All generation attempts in the current Lyria rate window have now been used."
        : "A Lyria music generation attempt has been reserved and sent to Google.";
    const rows = [
        ["Prompt tokens", `${Number(inputTokens).toLocaleString()} of ${Number(rateLimit.maxPromptTokens).toLocaleString()}`],
        ["Rate allowance", `${rateLimit.usedRequests} of ${rateLimit.maxRequests} generations used`],
        ["Rate window", `${rateLimit.windowHours} hour${rateLimit.windowHours === 1 ? "" : "s"}`],
        ["Remaining", `${rateLimit.remainingRequests} generation${rateLimit.remainingRequests === 1 ? "" : "s"}`],
        ["Next slot", rateLimit.resetsAt || "No reset is currently required"],
        ["Initiated by", initiatedBy || "Authenticated Lyria request"],
        ["Time (Asia/Kolkata)", occurredAt]
    ];

    return `
<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(heading)}</title></head>
<body style="margin:0;padding:0;background:#f3f6f8;color:#17222b;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;background:#f3f6f8;"><tr><td align="center">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;overflow:hidden;background:#fff;border-radius:12px;box-shadow:0 10px 30px rgba(23,34,43,.1);">
      <tr><td style="padding:28px 32px;background:#0e2434;">
        <p style="margin:0 0 8px;color:#69e1c1;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Falcon Intelligence</p>
        <p style="margin:0 0 8px;color:#b9d6e2;font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;">YouTube Automation</p>
        <h1 style="margin:0;color:#fff;font-size:26px;line-height:1.25;">${escapeHtml(heading)}</h1>
      </td></tr>
      <tr><td style="padding:28px 32px;">
        <p style="margin:0 0 20px;color:#3b4a54;font-size:15px;line-height:1.55;">${escapeHtml(summary)}</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
          ${rows.map(([label, value]) => `<tr><td style="padding:10px 0;border-top:1px solid #e3ebef;color:#60717d;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;">${escapeHtml(label)}</td><td style="padding:10px 0;border-top:1px solid #e3ebef;color:#17222b;font-size:14px;text-align:right;">${escapeHtml(value)}</td></tr>`).join("")}
        </table>
        <p style="margin:20px 0 0;color:#60717d;font-size:12px;line-height:1.5;">The prompt text, generated audio, and API keys are intentionally not included in this notification.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body>
</html>`;
}

module.exports = lyriaUsageTemplate;
