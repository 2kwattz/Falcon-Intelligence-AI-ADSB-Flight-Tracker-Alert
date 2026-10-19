# Falcon Intelligence

Falcon Intelligence is a self-hosted aircraft-tracking and alerting application for aviation enthusiasts. It turns ADS-B / Mode-S feed data into a live map, a searchable observation archive, city-based aircraft alerts, and a simple web experience for exploring aircraft activity.

## What it does

The project is designed to collect aircraft observations from a local `readsb`/SDR feed and partner feeds, then make the information useful without requiring a commercial tracking dashboard. Its public-facing pages include:

- A live aircraft map with selectable sources and map-bound filtering.
- An Intelligence Archive that retains aircraft observations in Redis for five days, with searching, filters, raw payload detail, and a last-known-position map.
- An aircraft detail lookup that resolves a valid ICAO / Mode-S hex code through the public HexDB registry.
- Explore, alert-status, authentication, contact, registration, and community pages.
- Alerts that can send email and place phone calls when configured aircraft enter defined airspaces.

When there are no archived records yet, the archive intentionally serves a small, clearly-labelled set of sample records from `public/dummyAircraftData.json`. Live cache data automatically takes precedence once it is available.

## Architecture

```text
Browser (static HTML, CSS, vanilla JavaScript)
                 |
                 v
         Express 5 application
          |       |        |        |
          |       |        |        +--> Public aircraft registry lookup (HexDB)
          |       |        +-----------> MongoDB (dashboard account and profile data)
          |       +--------------------> MySQL (existing account and application data)
          +----------------------------> Redis (archive cache, application cache, and login limits)
                 ^
                 |
    Local readsb/SDR feed and ADSBHub TCP feed
```

The server serves the pages and JSON endpoints from the same origin. The frontend does not require a separate build tool or framework.

## Project layout

| Path | Purpose |
| --- | --- |
| `src/server.js` | Express application bootstrap, middleware, static files, route registration, and Socket.IO setup. |
| `public/` | Browser pages, stylesheets, client-side JavaScript, image assets, and sample archive data. |
| `routes/` | Feature routes for ADS-B data, archive records, authentication, alerts, communities, admin, APIs, and pages. |
| `services/` | Feed readers, SDR utilities, email delivery, signal analysis, and background service helpers. |
| `feedPartners/` | ADSBHub TCP connection and live-feed state. |
| `redis/` | Redis clients and the five-day tracked-aircraft archive cache. |
| `db/` | MySQL and MongoDB connection setup. |
| `models/` | MongoDB/Mongoose models, including the dashboard user profile. |
| `middlewares/` | Authentication, rate limiting, security, request filtering, and error handling. |
| `templates/` | HTML email templates. |
| `test/` | Documentation and scripts for the separate Kundali public-profile research utility. |

## Getting started

### Prerequisites

- Node.js 18 or later
- npm
- MySQL, for account and application data
- Redis, for application cache and tracked-aircraft archive data
- An ADS-B data source, such as a local `readsb` instance, for live ingestion

### Install and run

```bash
npm install
node src/server.js
```

The server listens on `PORT`, defaulting to `3001`. Open `http://localhost:3001` after startup.

### Configuration

Create a `.env` file in the project root. Start with the values required by the services you plan to use:

```dotenv
PORT=3001
NODE_ENV=development

MYSQL_HOST=127.0.0.1
MYSQL_USER=falcon
MYSQL_PASSWORD=change-me
MYSQL_DATABASE=falcon_intelligence

REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# MongoDB is used alongside the existing MySQL database for dashboard users.
MONGO_URI=mongodb://127.0.0.1:27017/falcon_intelligence

# Optional dedicated Redis database for archive records. Defaults to database 1.
TRACKED_AIRCRAFTS_REDIS_DB=1

# Local readsb source. The server prefers the file when it exists.
READSB_AIRCRAFT_JSON_PATH=/run/readsb/aircraft.json
ADSB_FLIGHT_JSON_URL=http://127.0.0.1/data/aircraft.json
```

The following integrations are optional and only needed for their corresponding features:

| Feature | Relevant environment variables |
| --- | --- |
| JWT authentication | `JWT_SECRET` (or `JWT_SECRET_KEY`), `JWT_EXPIRES_IN`, `JWT_ISSUER`, `JWT_AUDIENCE`, `CLIENT_URL` |
| MongoDB dashboard and profile data | `MONGO_URI` |
| Resend email delivery | `RESEND_API_KEY`, `EMAIL_FROM` |
| Gmail SMTP mail delivery | `GMAIL_SMTP`, `GMAIL_SMTP_PASSWORD` |
| Twilio calls | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_CALLER_ID`, `TWILIO_CALL_TIMEOUT_SECONDS` |
| Razorpay payments | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` |
| ADSBHub live feed | `ADSBHUB_HOST`, `ADSBHUB_PORT`, `ADSBHUB_NO_DATA_WARNING_MS` |
| ADSB.lol re-api dashboard probe | `ADSBLOL_RE_API_URL`, `ADSBLOL_RE_API_CIRCLE`, `ADSBLOL_RE_API_TIMEOUT_MS` |
| Local ADS-B receiver dashboard | `READSB_STATS_JSON_PATH`, `READSB_RECEIVER_JSON_PATH`, `READSB_STATS_URL`, `READSB_RECEIVER_URL`, `READSB_LOG_PATH`, `READSB_LOG_LINES`, `READSB_HEALTHY_MESSAGE_RATE`, `READSB_MAX_BAD_MESSAGE_RATE`, `READSB_FRESH_MESSAGE_SECONDS` |
| Dashboard receiver-gain control | `READSB_GAIN_CONTROL_COMMAND` (defaults to `/usr/local/sbin/falcon-set-readsb-gain`) |
| Graphs1090 dashboard graphs | `GRAPHS1090_OUTPUT_DIR` (defaults to `/run/graphs1090`) and `GRAPHS1090_PERIOD` (defaults to `24h`) |
| Ubuntu feeder dashboard checks | `FEEDER_COMMAND_TIMEOUT_MS` |
| Dashboard server label | `DASHBOARD_SERVER_NAME` (defaults to `Main server`) |
| Mongo login protection | Redis-backed: 10 attempts per 1 hour for each email/username and IP pair |
| Anonymous visitor logs | Redis-backed: `VISITOR_LOG_MAX_RECORDS` (default `10000`), `VISITOR_LOG_MAX_PAGES` (default `50`), and `VISITOR_LOG_DASHBOARD_LIMIT` (default `100`) |
| Reverse-proxy client IPs | `TRUST_PROXY_HOPS=1` only when the app is exclusively behind one trusted proxy such as nginx |
| IP lookup | `IPINFO_API_KEY` |

Do not commit `.env` files or API credentials.

### Allowing dashboard gain changes

The dashboard can set a validated manual gain (0–59.6 dB) or `auto`, then briefly restart `readsb`. This requires a root-owned, restricted helper; the Node process deliberately does not receive broad sudo access. On the receiver server, install the helper and allow only that exact command for the account that runs the Falcon Node service:

```bash
sudo install -o root -g root -m 0750 scripts/falcon-set-readsb-gain /usr/local/sbin/falcon-set-readsb-gain
sudo visudo -f /etc/sudoers.d/falcon-readsb-gain
```

Add this sudoers entry, replacing `<app-user>` with the account used by the Node service:

```text
<app-user> ALL=(root) NOPASSWD: /usr/local/sbin/falcon-set-readsb-gain
```

Validate it with `sudo visudo -cf /etc/sudoers.d/falcon-readsb-gain`. The helper only accepts `auto` or a gain in the allowed range, updates `RECEIVER_OPTIONS` in `/etc/default/readsb`, creates `/etc/default/readsb.falcon-gain-backup`, and restores the previous setting if `readsb` fails to restart.

## Key pages and endpoints

| Path | Description |
| --- | --- |
| `/` | Falcon Intelligence landing page. |
| `/live-map` | Live-map page. |
| `/live-map/aircrafts` | Current map aircraft feed. Supports source, bounding-box, and limit options. |
| `/tracked-aircrafts` | Intelligence Archive page. |
| `/trackedaircrafts` | Archived aircraft JSON; returns labelled sample data only when the archive is empty or unavailable. |
| `/aircraft-lookup/:hex` | Validated six-character ICAO / Mode-S registry lookup used by the archive popup. |
| `/explore` | Aircraft exploration page. |
| `/bangalore-status` and `/delhi-status` | City alert-status pages. |
| `/api/aircraft/nearby` | Nearby-aircraft API; additional compatible ADSBHub TCP paths are available under `/api/adsbhub-tcp`. |
| `/auth/mongo/login` | MongoDB/JWT login for the protected dashboard and profile. This is separate from the existing MySQL `/auth` flow. |
| `/dashboard` | Mongo-JWT-protected operations dashboard. Direct `/dashboard.html` access is also protected before static files are served. |
| `/api/dashboard/stats` | Mongo-JWT-protected main-server station, feed, server-health, and configured alert-recipient data. |
| `/profile` | Mongo-JWT-protected profile page, including profile-photo updates. |
| `/falcon-video-generator` | Video-generator page; its upload and generation APIs require Mongo/JWT login. |

Authentication, admin, community, alert, payment, and AI endpoints live under their route prefixes (`/auth`, `/admin`, `/adsb`, `/ai`, and `/api`). Read the matching module in `routes/` before integrating with them, as many require authentication or an external credential.

## Recent authentication and dashboard changes

The existing MySQL authentication system is retained under `/auth`. MongoDB/JWT authentication was added in parallel under `/auth/mongo` so the newer dashboard features do not replace existing MySQL users or routes.

- Mongo accounts use bcrypt password hashes, and the JWT middleware validates the expected algorithm, issuer, audience, expiry, and user record.
- A successful Mongo login sets the separate `mongoToken` cookie. It persists for 30 days by default (configurable with `AUTH_SESSION_COOKIE_MAX_AGE_MS`) so mobile browsers do not discard it as a session cookie; set `JWT_EXPIRES_IN` to the same duration. It is currently configured as browser-readable (`httpOnly: false`) to support the requested client-side token access; this is less resistant to XSS than an HttpOnly cookie.
- Mongo login attempts are Redis-limited to 10 per one-hour window for each normalized email/username and IP pair. Keys use a SHA-256 fingerprint instead of storing the raw email or IP. If Redis is unavailable, login fails closed with HTTP 503 rather than allowing unlimited attempts.
- `/dashboard`, `/dashboard.html`, `/api/dashboard/stats`, and `/api/private-stats` require a valid Mongo JWT. Dashboard data is collected by the Node/Ubuntu host, not the visitor's device.
- Browser navigation to a protected page redirects to `/login` when the Mongo JWT is missing or invalid. Protected API requests continue to return JSON `401` responses for client-side handling.
- The dashboard shows the authenticated greeting, configured station status, ADSBHub TCP and ADSB.lol re-api receiving data, local Ubuntu feeder checks, alert phone numbers currently configured in the server environment, and a main-server identity label.
- Main-server health reporting includes Ubuntu OS details, RAM used/available, CPU load, root-disk usage, MongoDB and Redis connection status (each with a bounded ping), system uptime, and Node process RSS memory. RAM uses `/proc/meminfo`; disk reporting uses filesystem metrics with an Ubuntu `df` fallback.
- The protected Dashboard **Visitor logs** tab shows anonymous public-page visitors grouped by IP address, along with parsed browser, device, operating-system, and unique page-path data. Logged-in sessions, API calls, assets, and protected routes are excluded.
- Visitor logs use bounded Redis storage: one hash and one unique-page set per IP address, a 24-hour TTL starting with the first recorded visit, a 10,000-record default cap, and a 50-page-per-visitor default cap. Repeated requests to the same page do not add records or pages. The Dashboard switch pauses/resumes future collection; existing records still age out within 24 hours.
- When deployed behind nginx or another reverse proxy, set `TRUST_PROXY_HOPS=1` only if the Node server is not directly public; this lets Express safely use the proxy-provided client IP for visitor grouping and rate limiting.
- The profile page allows a signed-in user to replace their JPEG, PNG, or WebP profile photo. Uploads are limited to 5 MB, checked against file signatures, stored with generated names, and old managed photos are removed after a successful replacement.
- The video generator no longer accepts a separate password. Its upload, delete, and generation APIs require Mongo/JWT login.
- Shared navigation is applied across the public pages. Logged-in users see a simple profile icon with **My Profile**, **Dashboard**, and **Logout**; Dashboard is intentionally not a primary navigation link.

### Related implementation files

| Area | Main files |
| --- | --- |
| Mongo/JWT auth | `controllers/authController.js`, `routes/authRoutes.js`, `middlewares/mongodbAuthMiddleware.js` |
| Redis Mongo login limiter | `middlewares/mongoLoginRateLimiter.js` |
| Dashboard and server metrics | `routes/privateStatsRoutes.js`, `public/dashboard.html`, `public/dashboard.js`, `public/dashboard.css` |
| Profile and photo upload | `public/profile.html`, `public/profile.js`, `public/profile.css` |
| Shared signed-in navigation | `public/nav-auth.js`, `public/shared-nav.css` |

## Technical details

### Data flow

1. The local SDR feed reader loads `aircraft.json`, preferring `READSB_AIRCRAFT_JSON_PATH` and falling back to `ADSB_FLIGHT_JSON_URL`.
2. Feed records are normalized and stored in Redis under `tracked-aircraft:*` keys.
3. Archive entries expire after five days. Newer partial feed messages preserve previously known aircraft fields where possible.
4. The archive page requests `/trackedaircrafts`, then handles filtering, sorting, grouping, and detail rendering in the browser.
5. A user can select **Predict Aircraft** in a detail popup to look up a valid six-character hex code. The server validates the input, calls HexDB with a five-second timeout, and caches successful responses for six hours.

### Stack

- **Runtime:** Node.js with CommonJS modules
- **HTTP:** Express 5, `axios`, `compression`, `cors`, `helmet`, `hpp`, and Socket.IO
- **Frontend:** static HTML, CSS, and browser JavaScript; Leaflet is vendored under `public/vendor/leaflet`
- **Data stores:** MySQL via `mysql2` and Redis via `ioredis`
- **Security controls:** JWT middleware, bcrypt password hashing, XSS cleaning, request rate limits, SQL-injection guarding, brute-force protection, and Helmet headers
- **Notifications and payments:** Nodemailer/Resend, Twilio, and Razorpay when configured

### Development notes

- `npm run osint:profiles` runs the separate Kundali profile-research utility. Its full usage and responsible-use guidance are in [test/README.md](test/README.md).
- The current `npm test` script is a placeholder; a repository-wide automated test suite has not been configured yet.
- The app uses a general rate limiter. Account and external-service routes may apply additional limits.
- The archive's HexDB data is supplementary registry information, not an authoritative flight record. It can be incomplete or out of date.

## Contributing

Keep changes scoped to their feature area, avoid committing credentials or production data, and validate server-side and browser-side JavaScript before submitting changes. For user-facing archive work, test both live-cache and sample-data states.

## License

This repository currently declares the `ISC` license in `package.json`.
