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
Mongo dashboard authentication + rate limit
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
| `POST /api/lyria-music/generate` | Generate a Lyria track from `{ "prompt": "..." }`. |
| `GET /api/lyria-music/outputs/:outputId` | Stream one previously generated audio result to the dashboard player or download link. |

`prompt` is required and limited to 2,000 characters. The generate endpoint is
limited to four requests per client IP every 15 minutes to control accidental or
unexpected API spending.

Successful generation response:

```json
{
  "success": true,
  "message": "Lyria 3.5 music generated.",
  "music": {
    "model": "lyria-3.5",
    "outputUrl": "/api/lyria-music/outputs/<output-id>"
  }
}
```

## Storage and Redis policy

Lyria does **not** use Redis.

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
| `routes/lyriaMusicRoutes.js` | Authenticated generate/output endpoints, rate limit, and temporary output handling. |
| `services/lyriaMusicService.js` | Google Interactions API request, audio extraction, decoding, and provider-error mapping. |
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
