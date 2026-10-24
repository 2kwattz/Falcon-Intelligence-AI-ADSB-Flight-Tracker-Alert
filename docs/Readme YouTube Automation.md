# Hindu Festival Automation

> This file uses the requested name. It documents the Hindu festival and occasion automation currently added to Falcon Intelligence; it does not implement a YouTube workflow.

## Purpose

The application has two related calendar data paths. The provider-backed service retrieves a current daily calendar and retains a short-lived MongoDB record. The dataset-backed dashboard feature reads the bundled 2026–2027 Vadodara calendar dataset from MongoDB for fast, predictable daily detail and YouTube planning.

The feature uses TathaAstu as the upstream Hindu calendar provider. The provider key remains server-side and is never delivered to browser code.

## Public API

| Request | Purpose |
| --- | --- |
| `GET /api/hindu-festivals/today` | Get today’s Hindu calendar occasions. |
| `GET /api/hindu-festivals/:date` | Get occasions for a date in `YYYY-MM-DD` form. |
| `GET /api/hindu-calendar/daily` | Older compatibility alias for the same daily request. |

Examples:

```text
GET /api/hindu-festivals/today
GET /api/hindu-festivals/2026-11-08?region=IN-GJ&lang=hi
GET /api/hindu-festivals/2026-11-08?lat=22.3072&lon=73.1812&tz=Asia/Kolkata
```

The response contains a normalized `occasions` array and the complete provider
calendar response in `calendar`. This includes festivals, vrats, observances,
Panchang facts, and other special-day fields returned by the provider. Requests
with identical daily parameters are held in the service's short in-memory cache
for 24 hours, so repeated page/API requests do not consume extra provider quota.

## Dashboard automation API

The Mongo/JWT-protected dashboard uses a small automation API in addition to the
public calendar endpoints:

| Request | Purpose |
| --- | --- |
| `GET /api/dashboard/youtube-automation/today` | Read today's stored calendar record and whether it already exists. |
| `POST /api/dashboard/youtube-automation/today` | Find or synchronize today's record now, then return the normalized result. |

The dashboard routes require the Mongo dashboard session (`mongoToken` or a
valid Bearer token). They are intended for the YouTube automation workflow;
they do not expose the provider key.

## Dataset-backed dashboard calendar

The **Dashboard → Extras** tab contains **What is special today?**. It uses the
imported calendar dataset rather than calling the external provider during a
normal dashboard load.

```text
extraDatasets/hindu_calendar_2026_2027.json
        │ one-time/idempotent importer
        ▼
MongoDB: hindu_calendar_dataset_days
        │ indexed lookup by Asia/Kolkata date
        ▼
Dashboard summary → View details
```

The initial dashboard request returns only a compact summary: date, weekday,
location, Hindu month, listed observances, and dataset version. This keeps the
Extras tab fast. Selecting **View details** requests the complete curated and
calculated record for that date. The large original provider payload remains
excluded from ordinary dashboard responses.

When a date has no listed observance, the compact response includes its assigned
mantra-video card. The card shows the English and Hindi mantra names, Devanagari
chant text, transliteration, associated deity, and repetition/mala count so an
operator can choose it for a devotional video. These are source dataset fields,
not AI-generated translations. Full chanting, timing, sourcing, and production
instructions remain in the full-details record, keeping the normal dashboard
load small.

All three dataset endpoints are protected by the Mongo dashboard session:

| Request | Purpose |
| --- | --- |
| `GET /api/dashboard/hindu-calendar/today` | Small summary of the current Asia/Kolkata calendar day. |
| `GET /api/dashboard/hindu-calendar/mantra-deities` | Deities represented by imported mantra-video records and their video counts. |
| `GET /api/dashboard/hindu-calendar/:date` | Full stored day details for a valid `YYYY-MM-DD` date. |
| `GET /api/dashboard/hindu-calendar/:date/original-json` | Original provider JSON and preservation metadata for that date. |

The dataset covers 730 civil dates from 2026-01-01 through 2027-12-31 for
Vadodara, Gujarat, India. A date outside that coverage returns no record; it
does not silently call the external provider.

### Importing or refreshing the dataset

Run the importer from the repository root after setting `MONGO_URI`:

```bash
node scripts/importHinduCalendarDataset.js
```

The importer validates each date, writes in batches of 100, and upserts by
`calendarDate`, so it is safe to run again after replacing the source file. It
stores compact `mantraVideos` cards and removes the retired fallback-topic and
AI-translation fields during every refresh. It records the source SHA-256
checksum, dataset metadata, import time, and record count in the
`hindu_calendar_dataset_imports` collection.

The **Included deities** popup in Dashboard → Extras reads the imported
`mantraVideos` records and groups them by deity. It shows the English and Hindi
deity names plus the number of available mantra-video entries, so it updates
automatically after each dataset import.

## What is retrieved and stored

The service calls the provider’s detailed daily calendar endpoint, not a public-holiday-only API. The result contains:

- Festivals and religious observances.
- Vrats, including observance-day information where supplied.
- Provider event arrays, when available.
- Active Panchang special-day flags, such as Ekadashi.
- The complete original daily calendar response, preserving Hindu month, tithi, nakshatra, timings, and fields added by the provider in future.

Each stored record has an `occasions` array for direct use in the app and a `calendar` object containing the full provider response.

## Daily automation flow

```text
11:00 AM Asia/Kolkata (if no unexpired record exists)
        |
        v
TathaAstu calendar/day request
        |
        v
Normalize festivals, vrats, events, and special-day flags into occasions[]
        |
        v
MongoDB upsert: one record per calendar date and location/tradition context
```

The schedule starts only after MongoDB successfully connects. If the server starts after 11:00 AM and no record exists for the current date, it performs one catch-up sync. The scheduler uses a self-rescheduling timer and does not keep a shutting-down process alive.

## Storage and retention

Records are stored in MongoDB’s `hinducalendardailyrecords` collection through `models/HinduCalendarDailyRecord.js`.

The unique key is:

```text
calendarDate + contextKey
```

This means the same date can be retained separately for different locations, regions, languages, or traditions without overwriting another result. The feature does not store festival records in Redis.

Every API request first checks MongoDB for an unexpired record for its date and
calendar context. If one exists, it is returned without calling TathaAstu. If
not, the provider is called once and its response is upserted. MongoDB deletes
each record automatically two days after it was retrieved through a TTL index.

The imported reference dataset is separate. It is stored in
`hindu_calendar_dataset_days` through `models/HinduCalendarDatasetDay.js`, uses
a unique `calendarDate` index plus year/month and observance indexes, and has no
TTL. The stored display document excludes the original provider response; that
response and its preservation metadata are select-false fields returned only by
the explicit original-JSON dashboard endpoint.

## Configuration

Add the required provider key to the server environment:

```dotenv
TATHAASTU_API_KEY=your_private_provider_key
```

Optional settings:

```dotenv
# Uses TathaAstu location 1 (New Delhi) if neither location nor coordinates are supplied.
HINDU_CALENDAR_LOCATION_ID=1

# Use coordinates instead of a provider location ID.
HINDU_CALENDAR_LAT=22.3072
HINDU_CALENDAR_LON=73.1812
HINDU_CALENDAR_TIME_ZONE=Asia/Kolkata

# Optional regional convention, language, and attached festival content.
HINDU_CALENDAR_REGION=IN-GJ
HINDU_CALENDAR_LANG=en
HINDU_CALENDAR_CONTENT=significance
```

Set either `HINDU_CALENDAR_LOCATION_ID` or both coordinate values. Do not commit the API key to Git or place it in client-side JavaScript.

## Main files

| File | Responsibility |
| --- | --- |
| `routes/hinduCalendarRoutes.js` | `Get Hindu Festivals` API routes and input validation. |
| `services/hinduCalendarService.js` | Secure provider client, response normalization, and short in-memory request cache. |
| `services/hinduCalendarDailySync.js` | 11:00 AM daily scheduler, catch-up behavior, and MongoDB upsert. |
| `models/HinduCalendarDailyRecord.js` | MongoDB schema for the retained daily records. |
| `models/HinduCalendarDatasetDay.js` | Indexed persistent schema for the imported 2026–2027 reference dataset. |
| `scripts/importHinduCalendarDataset.js` | Idempotent batched JSON-to-MongoDB dataset importer. |
| `routes/privateStatsRoutes.js` | Protected dataset summary, detail, and original-JSON dashboard endpoints. |
| `public/dashboard.html`, `public/dashboard.js`, `public/dashboard.css` | Extras-tab summary and full-details dialog. |
| `src/server.js` | Starts the scheduler after MongoDB connects and mounts the API routes. |

## Falcon Intelligence isolation

This feature is intentionally separate from the flight tracker:

- It does not read, write, flush, or otherwise use Falcon’s Redis data.
- It does not alter ADS-B feeds, aircraft polling intervals, city alert logic, or aircraft routes.
- Its only recurring work is one calendar-provider request per day.
- It starts after MongoDB connectivity is confirmed, so a MongoDB outage does not block normal Express or tracker startup.

## Tests completed

The following tests validate the provider client, 11:00 AM schedule calculation and catch-up behavior, date validation, and `Get Hindu Festivals` endpoint flow:

```bash
node --test test/hinduCalendarService.test.js test/hinduCalendarDailySync.test.js test/hinduFestivalRoutes.test.js
```

The live provider requires `TATHAASTU_API_KEY`. Without it, TathaAstu correctly responds with `401 authentication_required`; configure the key before testing a real festival response.
