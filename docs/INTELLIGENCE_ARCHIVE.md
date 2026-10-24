# Intelligence Archive

The Intelligence Archive is Falcon Intelligence’s public, Redis-backed view of
recently observed aircraft. It is designed for investigation of the **latest
known state of each aircraft**, not as a permanent replay of every received
ADS-B message.

The main archive page is available at `/tracked-aircrafts`. It presents the
five-day cache produced by the local/Vadodara tracking pipeline and lets a user
search, filter, sort, inspect, and map retained aircraft payloads.

## Scope and access

| Item | Behaviour |
| --- | --- |
| Page | `GET /tracked-aircrafts` serves `public/tracked-aircrafts.html`. |
| Archive API | `GET /trackedaircrafts` returns the Redis-backed Vadodara/local archive. |
| Authentication | The archive page and its JSON API are public; they do not require a Mongo/JWT session. |
| Retention | Each ICAO/Mode-S record expires five days after its most recent cache refresh. |
| Record model | One Redis key per normalized ICAO hex code, so a record represents an aircraft’s latest retained payload rather than its complete movement history. |
| Other city choices | Bengaluru, Delhi, and Hyderabad in the page selector are **live-only** feeds. They are not written to or read from this five-day archive. |

## End-to-end flow

```text
readsb aircraft.json (preferred) ─┐
                                  ├─> Vadodara polling pipeline ─> Redis key per hex
HTTP ADS-B feed (fallback) ───────┘             │                         │
                                                │                         └─> GET /trackedaircrafts
                                                └─> alert matching                │
                                                                               browser page
                                                                                   │
                                                               filters / details / map / registry lookup
```

### 1. Feed acquisition

`routes/adsbRoutes.js` starts the local ADS-B polling loop when the module is
loaded. The default interval is two seconds; configure it with
`ADSB_TRACKING_INTERVAL_MS` (the effective minimum is one second).

For each poll, the server:

1. Attempts to read `READSB_AIRCRAFT_JSON_PATH` first.
2. If that read fails, requests `ADSB_FLIGHT_JSON_URL`.
3. Uses the feed’s `aircraft` array (readsb-shaped data).
4. Sends every received aircraft through the Vadodara processing path.

`GET /adsb/aircrafts` runs the same fetch/process operation on demand and
returns the current feed response. It is useful for diagnostics, but the page
itself uses `/trackedaircrafts`.

### 2. Archive write and enrichment

Every feed aircraft with a non-empty `hex` is offered to
`cacheTrackedAircraft()` before alert-catalogue matching. The cache normalizes
the hex code by trimming it and converting it to uppercase, then writes to:

```text
tracked-aircraft:<ICAO_HEX>
```

The cache uses the dedicated Redis client in
`redis/trackedAircraftRedisClient.js`. It defaults to logical Redis database
`1`; configure it independently when needed:

| Variable | Purpose | Default |
| --- | --- | --- |
| `TRACKED_AIRCRAFTS_REDIS_HOST` | Archive Redis host | `REDIS_HOST`, then `127.0.0.1` |
| `TRACKED_AIRCRAFTS_REDIS_PORT` | Archive Redis port | `REDIS_PORT`, then `6379` |
| `TRACKED_AIRCRAFTS_REDIS_DB` | Archive Redis logical database | `1` |

The writer removes empty fields and merges new feed values with the previously
cached record. This preserves identity fields that ADS-B messages often omit,
including registration, callsign, aircraft type, type code, description, and
operator. A changed record receives new `trackedAt` and `lastUpdatedAt` ISO
timestamps. If the payload is unchanged, the cache does not rewrite it but
extends its five-day TTL. Therefore, `trackedAt` denotes when retained data last
changed, not necessarily the most recent radio message for an otherwise
unchanged aircraft.

If an aircraft matches the Vadodara alert catalogue, the processing path writes
again with the alert-catalogue metadata merged into the complete raw ADS-B
payload. Cache failures are logged but do not stop alert processing.

### 3. Archive retrieval API

`GET /trackedaircrafts` calls `getTrackedAircrafts()`, which scans Redis for
`tracked-aircraft:*`, fetches the matching values, ignores malformed JSON
entries, and sorts retained records by descending `trackedAt`.

The route also derives a type summary. It treats `typeCode`, then feed field
`t`, then `UNKNOWN` as the aircraft type.

Successful response shape:

```json
{
  "status": true,
  "count": 1,
  "aircraftTypeCounts": { "C17": 1 },
  "aircraftData": [
    {
      "hex": "800E42",
      "flight": "KC3813",
      "typeCode": "C17",
      "trackedAt": "2026-10-24T10:30:00.000Z",
      "aircraftTypeCount": 1
    }
  ]
}
```

The API returns the full current archive in one response; server-side filtering
and pagination are not implemented. Browser-side pagination displays 50
matching records at a time.

On a Redis/cache error the response is HTTP 500 with:

```json
{ "status": false, "message": "Unable to retrieve tracked aircraft data" }
```

## Browser page flow

On page load, `public/tracked-aircrafts.js` selects **Vadodara Airspace** and
fetches `/trackedaircrafts` with `Accept: application/json` and `cache:
"no-store"`.

1. The page stores the returned aircraft in memory.
2. It builds filter options from the returned data.
3. It filters, sorts, groups, and paginates records in the browser.
4. It shows the connection state, local page-load time, summary metrics, and
   date-grouped result tables.
5. `Refresh data` repeats the request. It does not force a new receiver poll;
   it reads whatever is currently in Redis.

The summary cards show the total loaded records, records matching active
filters, distinct recognized types, and distinct UTC observation dates.

### Search, filters, and sorting

The free-text search examines every value in the raw retained object, including
nested objects serialized as JSON. Advanced filtering supports:

| Filter | Matching behaviour |
| --- | --- |
| Date range | UTC date derived from `trackedAt`, `lastUpdatedAt`, `lastSeen`, or `positionSeen`. |
| Aircraft type, registration, operator | Values resolved from the common normalized and feed field names. |
| Feed / transponder | The raw `type` field. |
| Emergency status | The raw `emergency` field; missing values are treated as `none`. |
| Altitude | `alt_baro`, then `alt_geom`, then `altitude`, measured in feet. |
| Speed | `gs`, then `tas`, then `speed`, measured in knots. |
| Maximum age | Minutes since the selected observation timestamp. |
| Any payload field | A chosen raw field whose string/JSON representation contains a supplied value. |

Available sorts are most-recent observation (default), oldest observation,
callsign A–Z, highest altitude, and highest speed. Results are grouped by UTC
observation date, and each page contains up to 50 results.

### Airspace selector

The page shares a selector with three live airspace views:

| Selection | Data endpoint | Behaviour |
| --- | --- | --- |
| Vadodara Airspace | `/trackedaircrafts` | Five-day Redis archive. |
| Bengaluru Airspace | `/api/adsbhub-tcp/nearby/12.9716/77.5946/100?limit=500` | Live only; first checks `/api/bangalore-iaf-alert-status`. |
| Delhi Airspace | `/api/adsbhub-tcp/nearby/28.6139/77.2090/100?limit=500` | Live only; first checks `/api/delhi-iaf-alert-status`. |
| Hyderabad Airspace | `/api/adsbhub-tcp/nearby/17.3850/78.4867/100?limit=500` | Live only; first checks `/api/hyderabad-iaf-alert-status`. |

The non-Vadodara choices reset filters and normalize live results into the
same display structure. If a city’s dashboard-controlled tracking is disabled,
the page shows “Airspace tracking disabled” rather than requesting its live
nearby-aircraft feed.

## Aircraft details

Selecting **View details** opens a modal containing every available retained
field. It also provides these optional enrichments:

* If a valid six-character ICAO/Mode-S hex code is present, **Predict Aircraft**
  calls `GET /aircraft-lookup/:hex`.
* If valid latitude and longitude are present, the modal lazily loads vendored
  Leaflet and renders a satellite-based last-position map, including a
  heading-oriented aircraft marker and an OpenStreetMap link.

The map represents the last position in the retained feed payload; it is not a
flight track or a real-time guarantee.

### Registry lookup API

`GET /aircraft-lookup/:hex` accepts only a six-character hexadecimal ICAO/Mode-S
identifier. It calls HexDB server-side with a five-second timeout, normalizes
the response, and returns registration, type, model, manufacturer, operator
code, and registered owner when available.

The route maintains an in-memory, bounded cache of up to 500 lookups for six
hours. Responses identify cache use with `cached: true` or `cached: false`.
Invalid hex values return HTTP 400, a missing HexDB record returns HTTP 404,
and provider/network failures return HTTP 502. HexDB information is
supplementary registry data and can be incomplete or out of date.

## Freshness, limitations, and operational notes

* Archive expiry is five days, configured in code as
  `TRACKED_AIRCRAFT_TTL_SECONDS`; it is not a configurable environment value.
* The archive does not retain a time series. A single ICAO hex key is updated
  as new observations arrive.
* Records without a usable `hex` are not archived.
* A healthy archive endpoint proves Redis could be read; it does not prove the
  receiver or upstream feed is fresh. Check `/adsb/aircrafts`, server logs, and
  receiver health when diagnosing stale data.
* The archive endpoint has no authentication of its own, but normal application
  middleware such as general rate limiting and request guards runs before it.
* The frontend escapes displayed feed and registry values before inserting them
  into the page. The full raw payload is intentionally exposed in the detail
  modal, so only ingest sources appropriate for public display.

## Key implementation files

| File | Responsibility |
| --- | --- |
| `routes/adsbRoutes.js` | Local readsb/HTTP feed polling, archive write invocation, and Vadodara alert enrichment. |
| `redis/trackedAircraftCache.js` | Per-aircraft merge, five-day TTL, Redis scan/read, and archive sort. |
| `redis/trackedAircraftRedisClient.js` | Isolated archive Redis connection and database selection. |
| `routes/trackedAircraftRoutes.js` | Page, archive JSON, type counts, and HexDB lookup routes. |
| `public/tracked-aircrafts.html` | Page structure, filter controls, results container, and detail dialog. |
| `public/tracked-aircrafts.js` | Fetching, live-view normalization, filtering, sorting, pagination, details, map, and registry UI. |
| `public/tracked-aircrafts.css` | Archive layout, responsive presentation, and dialog/map styling. |
| `src/server.js` | Mounts the tracked-aircraft routes at the application root. |

## Quick verification

With the server and Redis running, use these checks:

```bash
curl http://127.0.0.1:3001/adsb/aircrafts
curl http://127.0.0.1:3001/trackedaircrafts
curl http://127.0.0.1:3001/aircraft-lookup/800E42
```

Then open `http://127.0.0.1:3001/tracked-aircrafts`, confirm the archive
connection status, try a text filter, open a record, and verify that its raw
payload and last-known-position map agree with the API response. Use a
controlled dummy feed only with isolated notification credentials: the
Vadodara processing pipeline can also evaluate alert logic while it populates
the archive.
