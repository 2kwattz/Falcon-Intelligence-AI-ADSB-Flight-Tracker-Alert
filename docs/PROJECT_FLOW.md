# Falcon Intelligence: Project Flow

This guide starts simple and then goes deeper. Read only as far as you need.

## Summary: the whole project in one minute

Falcon Intelligence is a self-hosted aviation-observation platform. It receives
ADS-B/Mode-S aircraft data, displays it to the public, retains recent local
sightings, compares aircraft with city catalogues, sends alerts when rules
permit, and gives authenticated operators a dashboard to run the system.

```text
Aircraft signal / partner feed
              ↓
       Falcon server reads it
              ↓
   cache it, show it, compare it
       ↙          ↓          ↘
  live map   archive page   city alerts
                              ↓
                       email / phone call
```

It does not make aircraft data. It uses data from a local SDR receiver and the
ADSBHub TCP feed.

## 1. The building blocks

| Part | Plain-English job | Main location |
| --- | --- | --- |
| Browser UI | Pages people use: map, archive, login, dashboard. | `public/` |
| Server | Receives requests and connects all features. | `src/server.js`, `routes/` |
| Local feed | Local readsb/SDR aircraft data. | `routes/adsbRoutes.js` |
| Remote feed | Continuously connected ADSBHub aircraft data. | `feedPartners/adsbHubTcpConn.js` |
| Cache | Fast temporary storage and cooldowns. | `redis/` |
| Databases | Persistent account/configuration data. | `db/`, `models/` |
| Alert lists | The aircraft to match per city. | `aircraftsDataset/` |

`src/server.js` starts Express, loads configuration, applies middleware, serves
the static site, and mounts feature routes. A normal request follows this path:

```text
Browser → parsing/cookies → common safety middleware → route
        → optional login check → cache/database/provider → HTML or JSON
```

Helmet headers, request-size limits, CORS, parameter-pollution protection,
SQL-injection filtering, general rate limiting, and anonymous-visitor logging
run before ordinary routes.

## 2. Two separate aircraft pipelines

This distinction is the key to understanding the project.

| Pipeline | Source | Main purpose | Storage |
| --- | --- | --- | --- |
| Local / Vadodara | Local readsb file, then HTTP fallback | Vadodara alerts, five-day archive, local map | Redis archive and normal cache |
| Remote cities | ADSBHub TCP feed | Bengaluru/Delhi/Hyderabad live views and alerts | In-memory current-aircraft map |

### 2.1 Local receiver: Vadodara

`routes/adsbRoutes.js` starts a polling loop when the module is loaded. It runs
every two seconds by default (`ADSB_TRACKING_INTERVAL_MS`, minimum one second).

```text
readsb aircraft.json
  ↓
try READSB_AIRCRAFT_JSON_PATH
  ├─ available → read local file
  └─ unavailable → request ADSB_FLIGHT_JSON_URL
  ↓
payload.aircraft[]
  ↓
archive write + Vadodara catalogue/alert processing
```

Raw fields can include `hex` (ICAO/Mode-S identity), callsign, latitude,
longitude, altitude, speed, track, squawk, emergency status, and receiver
metadata. The application preserves these useful fields for investigation.

`GET /adsb/aircrafts` runs the same fetch/process operation on demand. Use it
first when local data seems missing.

### 2.2 Remote receiver: ADSBHub TCP

`feedPartners/adsbHubTcpConn.js` connects to ADSBHub (by default
`data.adsbhub.org:5002`), parses SBS messages, and maintains one current
aircraft object per hex in Node memory.

```text
ADSBHub TCP SBS lines → parser → Map<hex, current aircraft>
                              ↓
          live map + nearby API + remote-city alert polling
```

The client reconnects after disconnection, records error/connection state, and
expires stale aircraft. This live map disappears after a Node restart; it is
not the five-day archive.

The nearby APIs validate coordinates/radius, calculate distance, and return
aircraft inside the requested area:

* `GET /api/aircraft/nearby`
* `GET /api/adsbhub-tcp/nearby`
* `GET /api/adsbhub-tcp/nearby/:latitude/:longitude/:radialMiles`

### 2.3 Live Map

The live map deliberately bypasses archive and alert logic:

```text
Live Map → GET /live-map/aircrafts?source=…&bbox=…&limit=…
         → select local SDR or ADSBHub
         → validate/filter positions and cap result size
         → browser renders map
```

`routes/liveMapRoutes.js` returns positioned aircraft, a separately limited
list without positions, source/connection state, and truncation flags.

## 3. Intelligence Archive: recent local sightings

The archive is the local/Vadodara feed's five-day memory. Its complete guide is
[INTELLIGENCE_ARCHIVE.md](INTELLIGENCE_ARCHIVE.md).

```text
local aircraft with hex → cacheTrackedAircraft()
  → Redis `tracked-aircraft:<UPPERCASE_HEX>` → five-day TTL
  → GET /trackedaircrafts → /tracked-aircrafts page
```

The important details are:

* One Redis key is one aircraft's latest retained state, not a full historical
  sequence of every received message.
* Partial new messages merge with the saved record, so callsign, type, operator,
  and registration data are not lost when a later message omits them.
* Unchanged records have their expiry refreshed but are not rewritten. Thus
  `trackedAt` is the last data change, not always the latest radio message.
* Archive Redis uses its own logical database (default database `1`).
* The API returns all current records; the browser filters, groups, sorts, and
  paginates 50 records at a time.

The public archive page supports text/date/type/registration/operator/status,
altitude/speed/age, and raw-field filters. Its details dialog shows raw fields,
a last-known-position map, and an optional HexDB lookup for a valid hex code.

Only **Vadodara** in the archive page selector is archived. Bengaluru, Delhi,
and Hyderabad are live ADSBHub views, not Redis archive searches.

## 4. Alerts: when a sighting becomes a notification

```text
Aircraft observed
  → usable ICAO hex?
  → listed in the relevant city catalogue?
  → inside radius (remote cities)?
  → city enabled, time/altitude rules met?
  → not in Redis notification cooldown?
  → email and, when eligible, phone call
```

City catalogue files are `VadodaraAlertAircrafts.js`,
`BangaloreAlertAircrafts.js`, `DelhiAlertAircrafts.js`, and
`HyderabadAlertAircrafts.js`. `MasterDataset.js` is only a dashboard reference;
it is never used to decide an alert. `services/cityAircraftCatalogues.js`
validates dashboard changes and writes the editable city files without restart.

### Vadodara alert flow

```text
local feed → archive write → Vadodara hex match
           → merge catalogue details → altitude/grace logic
           → Redis cooldown → Gmail email and possible Twilio call
```

The local path handles an altitude grace period for aircraft initially above the
call threshold. It uses a 20-minute alert cooldown to avoid repeatedly
notifying the same recipient about the same aircraft.

### Bengaluru, Delhi, Hyderabad alert flow

`routes/apiRoutes.js` starts a separate poller for each remote city:

```text
ADSBHub current aircraft → keep aircraft in city radius → catalogue match
 → add distance/identity data → time/altitude/cooldown rules → deliver alert
```

Remote city settings are persisted in MongoDB and reloaded at startup. The
dashboard can change radius (1–1000 miles), enabled state, and email recipients.
Operational status is public at `/api/bangalore-iaf-alert-status`,
`/api/delhi-iaf-alert-status`, and `/api/hyderabad-iaf-alert-status`.

Email goes through Gmail/Nodemailer; calls use Twilio. Delivery failures are
logged. A cooldown is acquired before delivery, so failures are not immediately
retried. Never use production credentials with a matching dummy feed.

## 5. Public pages

The frontend is standard browser HTML/CSS/JavaScript in `public/`; it has no
separate frontend build step.

| Page | User purpose | Server role |
| --- | --- | --- |
| `/` | Learn and navigate. | Serves landing page. |
| `/live-map` | Watch current aircraft. | Serves map and live-feed API. |
| `/tracked-aircrafts` | Investigate local retained aircraft. | Serves archive, map detail, registry lookup. |
| `/explore` | Use aircraft exploration view. | Serves Explore page. |
| City status pages | See city tracking state. | Serves page plus status/feed APIs. |
| Contact/watchlist | Submit a message/request. | Validates, rate-limits, sends SMTP email. |
| Login/profile/dashboard | Use account and operator functions. | Applies correct auth system. |

Contact and watchlist submissions validate fields and email format and are rate
limited to 10 requests per 15 minutes.

## 6. Two account systems: do not mix them up

New dashboard work was added beside the original MySQL application accounts,
not in place of them.

| System | Namespace/cookie | Database | Used for |
| --- | --- | --- | --- |
| Legacy | `/auth`, `token` | MySQL | Existing users, communities, chatroom, legacy pages, AI assistant |
| Dashboard | `/auth/mongo`, `mongoToken` | MongoDB | Dashboard, operational APIs, dashboard profile, video generator |

### Mongo dashboard login

```text
login → MongoDB user → bcrypt password check → save HMAC-hashed 2FA challenge
      → email six-digit code → POST /auth/mongo/login/verify-otp
      → write login activity → HS256 JWT → HttpOnly `mongoToken` cookie
      → protected request checks JWT
```

The Mongo middleware accepts a Bearer token or `mongoToken`, checks algorithm,
issuer, audience, expiry, and confirms the user still exists. Protected HTML
requests redirect to `/login`; protected APIs return JSON 401.

Dashboard login uses a Redis-backed per-identifier/IP limiter. If its Redis
dependency is unavailable, login fails closed rather than allowing unlimited
password attempts.

#### Mandatory email two-factor authentication

After every correct Mongo dashboard password, the server requires an emailed
six-digit code. This is not conditional on IP address, city, device, browser,
or a remembered session:

```text
password accepted → save HMAC-hashed five-minute challenge → email code
→ POST /auth/mongo/login/verify-otp → write activity → issue cookie
```

The code is single-use and five wrong attempts end the challenge. The login
page displays a five-minute countdown while the server enforces the actual
expiry. The server does not issue a Mongo session cookie until it succeeds. If Gmail SMTP is
unavailable, login fails safely instead of bypassing the second factor.

Each successful verification writes a MongoDB `login_activities` record with
the username, server-parsed device/browser/operating-system summary, login
timestamp, and IP address. A TTL index removes it after three days; the account
owner can view and clear only their own records on the Profile → Login activity
page.

The legacy system remains in `routes/authRouter.js`. Its middleware reads the
legacy `token` cookie with `JWT_SECRET_KEY`; legacy community and chatroom
routes continue to use that identity and MySQL.

## 7. Protected operations dashboard

The dashboard is protected before static HTML is served. Its usual flow is:

```text
dashboard browser → GET /auth/mongo/me → GET /api/dashboard/stats
 → server reads receiver, feed, server, Redis, MongoDB, and settings state
 → browser renders operator panels
```

It can show signed-in identity, local readsb health and gain, server
memory/disk/CPU/uptime, Redis/Mongo health, ADSBHub/ADSB.lol feed state,
Graphs1090 output, city alerts, editable city catalogues, Master Dataset,
anonymous visitor logs, Hindu-calendar automation state, and the imported
calendar dataset's fast "What is special today?" view.

| Operator action | Endpoint family | Where it goes |
| --- | --- | --- |
| Set readsb gain | `PUT /api/dashboard/readsb/gain` | Restricted host helper/readsb config |
| Enable/disable city alerts | `PUT /api/dashboard/city-alert-enabled` | MongoDB and running config |
| Change city radius | `PUT /api/dashboard/city-alert-radii` | MongoDB and running config |
| Manage recipients | `/api/dashboard/city-alert-email-recipients` | MongoDB and running config |
| Manage city aircraft | `/api/dashboard/city-aircraft` | Validated `aircraftsDataset/` files |
| Toggle visitor logging | `PUT /api/dashboard/visitor-logs/settings` | Redis setting |

The gain control is intentionally narrow: the dashboard calls one restricted
helper rather than accepting an arbitrary shell command. The host needs limited
sudo permission for that helper.

## 8. Other features

| Feature | Flow |
| --- | --- |
| AI assistant | Legacy-authenticated, rate-limited `/ai/askllm`; cleans input, limits it to 8,000 characters, blocks simple injection patterns, then calls Gemini. |
| Hindu calendar | The provider service fetches/normalizes current occasion data and schedules a daily Asia/Kolkata refresh. A separate imported 2026–2027 dataset provides the dashboard Extras daily summary and full details without a provider call; on dates without an observance, it shows the dataset’s mantra name, chant text, transliteration, deity, and repetition count for a devotional video. |
| Payments | Razorpay key/order/payment verification routes live in `routes/apiRoutes.js`; secret keys remain on server. |
| Video generation | Mongo-authenticated upload/job/output routes coordinate with configured ComfyUI/Wan-style tooling. |
| Lyria Music Studio | Mongo-authenticated Dashboard → Extras workspace calls Google Lyria 3.5 with a server-only API key, counts every prompt before generation (hard cap: 2,000 prompt tokens), and defaults to three global requests in a rolling 10-hour window. One Usage & limits summary shows the live cap, used/remaining attempts, and reset; the gear beside the info icon opens settings to change the policy. MongoDB stores only the policy and timestamp reservations, never Lyria data in Redis. Audio remains in memory for one hour. It is separate from video generation. |
| Communities/chatrooms | Legacy-authenticated MySQL features; community image uploads use Multer. |
| Visitor logs | Eligible anonymous public-page visits go to bounded Redis data; assets, APIs, protected routes, and signed-in visitors are excluded. |

## 9. Where data lives

| Location | Contents | Important behaviour |
| --- | --- | --- |
| Browser | UI state and cookies. | Never the source of truth. |
| Node memory | ADSBHub live aircraft, connection state, HexDB cache. | Lost after restart. |
| General Redis | Rate limits, cooldowns, visitor logs, normal cache. | Temporary/TTL-based. |
| Archive Redis DB | `tracked-aircraft:<hex>` records. | One latest local record per aircraft, five-day TTL. |
| MySQL | Legacy users, communities, chatroom/application data. | Persistent legacy store. |
| MongoDB | Dashboard users, city settings, temporary provider calendar records, login-activity records, and persistent imported calendar-day records. | Login activity has a three-day TTL; the imported dataset is indexed by date and has no TTL. |
| Filesystem | Public files, catalogues, receiver files, uploads, graphs. | Depends on host disk and backups. |

Redis is cache storage, not permanent flight history. Clearing it or reaching a
TTL removes the relevant temporary data by design.

## 10. Configuration essentials

Settings come from `.env`; never commit it or expose secrets.

| Area | Important variables |
| --- | --- |
| Server | `PORT`, `NODE_ENV`, `TRUST_PROXY_HOPS` |
| Local feed | `READSB_AIRCRAFT_JSON_PATH`, `ADSB_FLIGHT_JSON_URL`, `ADSB_TRACKING_INTERVAL_MS` |
| Redis | `REDIS_HOST`, `REDIS_PORT`, `TRACKED_AIRCRAFTS_REDIS_*` |
| Databases | `MYSQL_*`, `MONGO_URI` |
| Dashboard JWT | `JWT_SECRET`/`JWT_SECRET_KEY`, `JWT_EXPIRES_IN`, `JWT_ISSUER`, `JWT_AUDIENCE` |
| Alerts/OTP | `GMAIL_SMTP`, `GMAIL_SMTP_PASSWORD`, `LOGIN_OTP_SECRET`, Twilio variables |
| External providers | `ADSBHUB_HOST`, `ADSBHUB_PORT`, `GEMINI_API_KEY`, `RAZORPAY_*`, `TATHAASTU_API_KEY` |

Set `TRUST_PROXY_HOPS` only when Node is exclusively behind the stated number
of trusted proxies. It changes client-IP handling, affecting rate limits,
visitor logs, and the IP address recorded for successful login activity.

## 11. Troubleshooting map

| Symptom | Check first | Why |
| --- | --- | --- |
| Live map empty | `/live-map/aircrafts`, receiver file, ADSBHub connection | Map does not use the archive. |
| Archive empty/stale | `/adsb/aircrafts`, `/trackedaircrafts`, archive Redis | Local polling needs an aircraft with `hex` to cache it. |
| Remote city unavailable | City status endpoint and dashboard toggle | Disabled city tracking blocks the live view intentionally. |
| No alert | Catalogue hex, radius, time, altitude, cooldown, recipient/provider logs | Feed health alone does not mean alert eligibility. |
| Dashboard unauthorized | `/auth/mongo/me`, MongoDB, JWT config | Dashboard uses `mongoToken`, not legacy `token`. |
| Legacy feature unauthorized | Legacy `/auth` login and `token` cookie | Community and AI routes use legacy auth. |
| Login unavailable | Redis login-limiter health | Dashboard login fails closed if limiter Redis is down. |

Useful local checks:

```bash
curl http://127.0.0.1:3001/adsb/aircrafts
curl http://127.0.0.1:3001/trackedaircrafts
curl 'http://127.0.0.1:3001/live-map/aircrafts?source=vadodara-station'
curl http://127.0.0.1:3001/api/bangalore-iaf-alert-status
```

## Final mental model

```text
1. Receive aircraft data.
2. Maintain useful current views.
3. Keep recent local sightings briefly.
4. Match aircraft with city catalogues.
5. Alert only when rules permit.
6. Give public users information and operators controls.
7. Protect accounts, requests, secrets, and host operations.
```

Every major route, service, cache, database, and page supports one or more of
these seven jobs.
