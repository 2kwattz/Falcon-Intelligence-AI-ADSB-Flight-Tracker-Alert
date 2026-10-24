# Hindu Festival Automation

> This file uses the requested name. It documents the Hindu festival and occasion automation currently added to Falcon Intelligence; it does not implement a YouTube workflow.

## Purpose

The application retrieves the Hindu calendar for each day, retains a durable record in MongoDB, and makes the day’s Hindu festivals, vrats, observances, and special Panchang-day information available through a dedicated API.

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
