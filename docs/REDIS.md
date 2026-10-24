# Redis in Falcon Intelligence

Redis is the project's fast, temporary operational memory.

## Summary

Redis is not the permanent database for accounts or city settings. Falcon uses
it for data that must be fast, temporary, atomic, or automatically cleaned up:

* five-day local aircraft records for the Intelligence Archive;
* alert-email and call cooldowns;
* login-attempt limits;
* short-lived receiver facts and normal response caches;
* legacy MySQL profile/community caches; and
* bounded anonymous visitor logs and their on/off setting.

```text
Fast data that can expire?       Redis
Authoritative users/config?      MySQL or MongoDB
Current ADSBHub live feed?       Node process memory
```

Redis is expected to forget data. Restarting, flushing, eviction, or waiting for
a key TTL can remove caches, archive records, cooldowns, and visitor logs.

## Connections and separation

The code uses two `ioredis` clients.

| Client | File | Database | Use |
| --- | --- | --- | --- |
| General | `redis/redisClient.js` | Default Redis DB (normally `0`) | Limits, cooldowns, temporary cache, visitor logs. |
| Archive | `redis/trackedAircraftRedisClient.js` | `TRACKED_AIRCRAFTS_REDIS_DB`, default `1` | Five-day tracked-aircraft archive. |

The archive client uses `TRACKED_AIRCRAFTS_REDIS_HOST` and
`TRACKED_AIRCRAFTS_REDIS_PORT` if supplied, otherwise `REDIS_HOST` and
`REDIS_PORT`; its final fallback is `127.0.0.1:6379`. The general client uses
`REDIS_HOST` and `REDIS_PORT`.

Database separation stops short-lived general keys from mixing with five-day
archive JSON. It is a logical separation, not a security boundary, if both
databases are on the same Redis server.

## Why Redis is the right tool here

Redis gives the project fast reads/writes for polling loops, automatic TTL
cleanup, atomic `SET ... NX EX` notification locks, hashes/sets/sorted sets for
visitor records, Lua scripts for atomic multi-step updates, and cursor-based
scans for the archive. MySQL and MongoDB remain the durable source of truth.

## Every key family

### 1. Five-day Intelligence Archive (archive database)

| Key | Value | TTL | Purpose |
| --- | --- | --- | --- |
| `tracked-aircraft:<ICAO_HEX>` | JSON merged latest local ADS-B/city-match record | 5 days | Drives `/trackedaircrafts` and the public archive page. |

`cacheTrackedAircraft()` uppercases and trims the hex, removes empty fields,
and merges a new message into existing JSON. That stops sparse ADS-B messages
from erasing previous callsign, registration, aircraft type, description, and
operator data. A changed record gains `trackedAt` and `lastUpdatedAt` and is
written with `EX 432000`. An unchanged record only receives `EXPIRE`, so
`trackedAt` records a data change, not necessarily the newest radio message.

The archive API scans `tracked-aircraft:*` in batches of 100, uses `MGET`,
skips malformed JSON, sorts descending by `trackedAt`, and returns all current
records. The browser handles filtering and pagination. See
[INTELLIGENCE_ARCHIVE.md](INTELLIGENCE_ARCHIVE.md) for the complete page flow.

### 2. Local/Vadodara alert and receiver keys (general database)

| Key | Value | TTL | Why it exists |
| --- | --- | --- | --- |
| `flight-alert:call:<hex>:<phone>` | Timestamp | 20 min | Allows one call per aircraft/phone cooldown. |
| `flight-alert:email:<hex>:<email>` | Timestamp | 20 min | Allows one normal email per aircraft/email cooldown. |
| `flight-alert:anti-email:<hex>:<email>` | Timestamp | 20 min | Separates no-call/high-altitude email cooldown. |
| `aircraft:firstseen:<hex>` | First-seen timestamp | 15 sec | Lets missing metadata arrive for up to 10 seconds. |
| `aircraft:last-altitude:<hex>` | Numeric altitude | 60 sec | Provides a brief altitude fallback. |
| `aircraft:<hex>` | JSON local snapshot | 30 min | General local processing cache; written `NX`. |

The alert keys use atomic `SET` with `NX` and `EX`. Only the first simultaneous
attempt gets `OK` and may deliver an alert. The lock is created before Gmail or
Twilio is called, so a provider failure is logged but is not immediately retried.

`aircraft:<hex>` is not the archive. It is a short 30-minute, write-once
processing cache; `tracked-aircraft:<hex>` is the five-day merged archive.

### 3. Remote-city alert keys (general database)

Remote city logic prefixes keys with the city ID. Their TTL is the configured
city `expirySeconds` value.

| Key | Value | Purpose |
| --- | --- | --- |
| `<city>-flight-alert:email:<hex>:<email>` | Timestamp, `NX EX` | Suppresses repeated city normal-alert email. |
| `<city>-anti-alert:email:<hex>:<email>` | Timestamp, `NX EX` | Suppresses repeated high-altitude/no-call email. |
| `<city>-flight-alert:call:<hex>:<phone>` | Timestamp, `NX EX` | Suppresses repeated calls. |
| `<city>-matched-aircraft:<hex>` | JSON enriched match | Temporarily holds a remote match when that city enables match caching. |

City radius, enabled state, and recipients are not Redis data. MongoDB is the
authority for those settings; the server loads them into the running city config.

### 4. Login protection keys

| Key | Value | TTL | Behaviour |
| --- | --- | --- | --- |
| `auth:mongo:login:<sha256>` | Attempt count | 1 hour | Mongo dashboard login limiter; max 10 attempts per normalized identifier/IP pair. |
| `login:<userId-or-identifier>:<ip>` | Failed attempt count | 15 min | Legacy MySQL login brute-force protection; max 10 attempts. |

The Mongo limiter hashes identifier and IP before it makes its key. Its Lua
script atomically increments and sets expiry only on the first attempt. If Redis
fails, Mongo dashboard login returns HTTP 503: this is intentionally fail closed.

Legacy login counters are incremented after unknown-user or incorrect-password
attempts and deleted after a successful login. They contain direct
identifier/IP-derived key components, so Redis access must be restricted.

### 5. Legacy MySQL response caches

| Key | Value | TTL | Purpose |
| --- | --- | --- | --- |
| `user:<userId>` | JSON legacy profile | 24 hours | Reduces profile reads from MySQL. |
| `all_communities:<page>:<limit>` | JSON page of communities | 20 minutes | Reduces list/count queries. |
| `communityDetails:<slug>` | JSON community detail response | 1 hour | Reduces individual community reads. |

These are performance copies only. MySQL is still authoritative. Profile update
routes refresh cached fields, and password update deletes the cached profile.

### 6. Anonymous visitor logs

Only unauthenticated HTML visits to approved public pages are logged. API calls,
assets, protected pages, and signed-in visits are excluded.

| Key | Redis type | TTL | Contents |
| --- | --- | --- | --- |
| `visitor-log:visitor:<hmac>` | Hash | 24 hours | IP, browser, device, OS, first seen, last seen. |
| `visitor-log:visitor:<hmac>:pages` | Set | 24 hours | Distinct public page paths. |
| `visitor-log:index` | Sorted set | 24 hours + 60 sec | Visitor HMAC IDs scored by latest visit. |
| `visitor-log:settings:enabled` | String `1`/`0` | None | Controls future visitor logging. |

The visitor ID is HMAC-SHA-256 of the IP using `VISITOR_LOG_HASH_SECRET` (or a
JWT-secret fallback). The raw IP remains in the visitor hash because the
dashboard displays it; it is not used as the sorted-set member.

One Lua script prunes old index entries, enforces capacity, creates visitor
records, adds distinct pages, updates last-seen data, and applies TTLs atomically.
Defaults are 10,000 visitors, 50 pages per visitor, and 100 dashboard results;
the `VISITOR_LOG_*` environment variables can adjust them within coded bounds.

## Full data-flow map

```text
Local readsb poll → archive DB tracked-aircraft:* → Intelligence Archive
                 → general DB cooldown/fact/cache keys → Vadodara alerts

Remote ADSBHub poll → general DB city cooldown/match keys → remote city alerts

Login request → general DB attempt key → allow, reject, or retry later
Public HTML visit → general DB hash/set/index → dashboard visitor logs
MySQL read → general DB response cache → faster next response
```

## What a Redis outage means

| Feature | Effect when Redis is unavailable |
| --- | --- |
| Mongo dashboard login | Fails with HTTP 503, by design. |
| Intelligence Archive write | Logs an error but should not stop local alert processing. |
| Intelligence Archive read | Returns HTTP 500. |
| Alert cooldowns | Can block delivery/processing paths; inspect logs and do not assume retries are safe. |
| Visitor logs | Public page still works; the visit is skipped and dashboard reports unavailable. |
| Legacy profile/community cache | Redis call failures can affect legacy route responses; restore Redis promptly. |
| Dashboard | Shows Redis health through a bounded ping. |

## Operations and safety

1. Keep Redis private—never expose port 6379 to the public internet.
2. Use deployment-level authentication/TLS where required. Current client code
   selects host, port, and database; secure connectivity must be provided by the
   environment.
3. Do not run `FLUSHALL` or broad `FLUSHDB` commands on a shared system. They
   remove alert cooldowns and can erase archive/visitor data.
4. Redis data can contain aircraft payloads, recipient identifiers, account
   identifiers, profile data, and visitor IP information. Limit operator access.
5. Monitor connection errors, memory pressure, evictions, and TTL behaviour.

## Safe inspection

Run these only on a trusted host with authorized Redis access. Do not dump
personal or sensitive values into logs. Use `SCAN`, not `KEYS *`, on production.

```bash
# General key families, without reading values.
redis-cli --scan --pattern 'auth:mongo:login:*'
redis-cli --scan --pattern 'flight-alert:*'
redis-cli --scan --pattern 'visitor-log:*'

# Archive database (default DB 1).
redis-cli -n 1 --scan --pattern 'tracked-aircraft:*'
redis-cli -n 1 TTL tracked-aircraft:800E42

# Basic health.
redis-cli PING
redis-cli INFO memory
```

## Code map

| File | Redis responsibility |
| --- | --- |
| `redis/redisClient.js` | General client connection. |
| `redis/trackedAircraftRedisClient.js` | Archive client/database selection. |
| `redis/trackedAircraftCache.js` | Archive merge, TTL, scan, read. |
| `routes/adsbRoutes.js` | Local cooldowns and temporary aircraft facts. |
| `routes/apiRoutes.js` | Remote-city cooldowns and match cache. |
| `middlewares/mongoLoginRateLimiter.js` | Atomic dashboard login limiter. |
| `routes/authRouter.js` | Legacy login/profile cache keys. |
| `routes/communityRouter.js` | Community response caches. |
| `services/anonymousVisitorLogs.js` | Visitor hashes, sets, index, setting. |
