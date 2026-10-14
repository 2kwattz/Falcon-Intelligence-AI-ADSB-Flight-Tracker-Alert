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
          |       |        |
          |       |        +--> Public aircraft registry lookup (HexDB)
          |       +-----------> MySQL (users, application data)
          +-------------------> Redis (archive cache and application cache)
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
| `db/` | MySQL connection-pool setup. |
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

# Optional dedicated Redis database for archive records. Defaults to database 1.
TRACKED_AIRCRAFTS_REDIS_DB=1

# Local readsb source. The server prefers the file when it exists.
READSB_AIRCRAFT_JSON_PATH=/run/readsb/aircraft.json
ADSB_FLIGHT_JSON_URL=http://127.0.0.1/data/aircraft.json
```

The following integrations are optional and only needed for their corresponding features:

| Feature | Relevant environment variables |
| --- | --- |
| JWT authentication | `JWT_SECRET_KEY`, `CLIENT_URL` |
| Resend email delivery | `RESEND_API_KEY`, `EMAIL_FROM` |
| Gmail SMTP mail delivery | `GMAIL_SMTP`, `GMAIL_SMTP_PASSWORD` |
| Twilio calls | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_CALLER_ID`, `TWILIO_CALL_TIMEOUT_SECONDS` |
| Razorpay payments | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` |
| ADSBHub live feed | `ADSBHUB_HOST`, `ADSBHUB_PORT`, `ADSBHUB_NO_DATA_WARNING_MS` |
| IP lookup | `IPINFO_API_KEY` |

Do not commit `.env` files or API credentials.

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

Authentication, admin, community, alert, payment, and AI endpoints live under their route prefixes (`/auth`, `/admin`, `/adsb`, `/ai`, and `/api`). Read the matching module in `routes/` before integrating with them, as many require authentication or an external credential.

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
