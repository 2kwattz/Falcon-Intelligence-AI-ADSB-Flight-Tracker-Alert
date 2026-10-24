# Google Lyria Music Studio

## Summary

Lyria Music Studio is a standalone music-generation feature inside
**Dashboard → Extras**. It uses Google **Lyria 3.5** to create original audio
from a text prompt. It is separate from the Falcon Video Generator: it does not
use ComfyUI, Wan 2.2, video jobs, image uploads, or the video-generator
passcode.

The browser never receives a Google API key. Only an authenticated Mongo
dashboard user can request music or retrieve an output.

## User flow

```text
Dashboard → Extras
        ↓
Enter a music prompt
        ↓
POST /api/lyria-music/generate
        ↓
Mongo dashboard authentication + token/rate-limit check
        ↓
Google Gemini Interactions API, model: lyria-3.5
        ↓
Audio returned as base64 → decoded in Node.js memory
        ↓
Dashboard audio player + download link
```

The prompt can describe genre, instruments, tempo, mood, song structure, and
whether vocals are wanted. The dashboard warns users not to request a specific
artist's voice. Google generated audio includes a SynthID watermark.

## Configuration

Set one of the following server-only environment variables:

```dotenv
# Recommended: a key dedicated to Lyria access.
LYRIA_API_KEY=...

# Optional. Defaults to lyria-3.5.
LYRIA_MODEL=lyria-3.5
```

If `LYRIA_API_KEY` is absent, the service falls back to `GEMINI_API_KEY`. That
fallback key must have access to Lyria 3.5. Do not expose either key in browser
JavaScript, HTML, logs, or committed `.env` files.

## API

Both endpoints require the Mongo dashboard session (`mongoToken` cookie or a
valid Bearer token).

| Request | Purpose |
| --- | --- |
| `GET /api/lyria-music/settings` | Read the current global prompt-token and generation limits plus remaining allowance. |
| `PUT /api/lyria-music/settings` | Update the global limits from Dashboard → Extras. |
| `POST /api/lyria-music/generate` | Generate a Lyria track from `{ "prompt": "..." }`. |
| `GET /api/lyria-music/outputs/:outputId` | Stream one previously generated audio result to the dashboard player or download link. |

## Limits and how they work

The default policy is a maximum of **2,000 prompt tokens** and **3 generation
requests in a rolling 10-hour window**. It is a global limit for the Lyria
feature, not a separate allowance for each browser, user, or IP address. This
protects the single Google API project that pays for generation.

Before a generation is reserved, the server asks Google's token-count endpoint
to count the actual prompt. This is exact token accounting, not a rough
character-to-token estimate. The browser permits up to 12,000 characters only
as a request-size guard; a prompt still cannot exceed the configured token
limit. A prompt that is too large does not consume a generation slot.

The dashboard does not count tokens while the user types. Google counts the
prompt once the user selects **Generate**. If that exact count exceeds the
configured limit, the request is rejected before it creates a reservation or
uses a generation attempt.

Dashboard → Extras shows one compact **Usage & limits** summary for the shared
prompt cap, generations used, remaining generations, rolling-window length,
and next available slot. Select the gear icon beside the **i** icon to open the
separate **Limit settings** dialog. An authenticated dashboard user can change
all three values there:

- prompt-token limit: 1–2,000 tokens (2,000 is the hard maximum);
- generation allowance: 1–20 requests; and
- rolling window: 1–168 hours.

The live allowance appears only in the Usage & limits summary; the settings
dialog is only for editing the policy. A slot is reserved just before calling Google and is kept even if Google
later rejects or times out the request. That deliberately prevents repeated
failed attempts from bypassing the spend protection.

## Email notifications

Every reserved Lyria generation attempt immediately starts an email notification
to `prakashbhatia1970@gmail.com` and `roshan.bhatia.blueera@gmail.com`. It uses
the **Falcon Intelligence / YouTube Automation** template and includes the
token count, rate allowance, remaining attempts, reset time, authenticated
initiator, and India-local timestamp. It deliberately excludes the prompt,
audio, provider response, and API key.

When the final allowed generation in the current rolling window is reserved
(three in ten hours by default), both recipients receive a second **Lyria
generation limit reached** email immediately. The notifications happen for
every caller of `POST /api/lyria-music/generate`, including a dashboard or an
automation client; they are not tied to one UI.

Delivery uses the existing Gmail SMTP configuration:

```dotenv
GMAIL_SMTP=your-sending-address@gmail.com
GMAIL_SMTP_PASSWORD=your-gmail-app-password
```

An SMTP delivery failure is logged but never cancels a reserved generation
attempt or prevents music generation.

Successful generation response:

```json
{
  "success": true,
  "message": "Lyria 3.5 music generated.",
  "inputTokens": 84,
  "rateLimit": {
    "maxPromptTokens": 2000,
    "maxRequests": 3,
    "windowHours": 10,
    "usedRequests": 1,
    "remainingRequests": 2,
    "resetsAt": "2026-10-24T12:00:00.000Z"
  },
  "music": {
    "model": "lyria-3.5",
    "outputUrl": "/api/lyria-music/outputs/<output-id>"
  }
}
```

## Storage and Redis policy

Lyria does **not** use Redis.

MongoDB stores exactly one global Lyria settings record in the
`lyria_music_settings` collection. It contains the editable policy and compact
timestamp-only generation reservations used to enforce the rolling window. It
does not store prompts, generated audio, Google API keys, or provider responses.

Generated audio is held in a process-local in-memory `Map` for one hour so the
authenticated dashboard can play or download it. Each result is then removed on
the next Lyria request or output retrieval after its expiry time. This means:

- A server restart removes generated music immediately.
- Multiple Node processes do not share generated outputs.
- Audio is not written to MongoDB, Redis, or disk by this feature.

The Google response is decoded from base64, limited to 30 MB, and served with
`Cache-Control: private, no-store`.

## Files

| File | Responsibility |
| --- | --- |
| `public/dashboard.html` | Lyria Music Studio panel in the Extras tab. |
| `public/dashboard.js` | Prompt validation, authenticated request, audio player, and download behavior. |
| `public/dashboard.css` | Music Studio styling. |
| `models/LyriaMusicSettings.js` | MongoDB schema for the global Lyria policy and rolling-window reservations. |
| `routes/lyriaMusicRoutes.js` | Authenticated settings, generate, and output endpoints; Mongo-backed limit reservation; temporary output handling. |
| `services/lyriaMusicService.js` | Google token-count and Interactions API requests, audio extraction, decoding, and provider-error mapping. |
| `services/lyriaUsageNotificationService.js` | Sends non-blocking Gmail notifications for usage attempts and exhausted allowances. |
| `templates/lyriaUsageTemplate.js` | Falcon Intelligence / YouTube Automation HTML usage-email template. |
| `src/server.js` | Mounts the Lyria routes. |

## Operational notes

- The full-song Lyria 3.5 request can take several minutes. The server request
  timeout is five minutes.
- The application does not invoke Lyria on startup or import. A request occurs
  only when an authenticated dashboard user presses **Generate music**.
- The feature is intentionally independent of aircraft calls, calendar data,
  Redis, and Falcon Video Generator workflows.
- Before production use, ensure the configured Google project has Lyria access
  and review current Google pricing and content restrictions.
