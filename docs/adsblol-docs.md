# ADSB.lol re-api / readsb HTTP API — Developer Reference

**Reviewed:** 2026-10-24  
**Hosted base URL:** `https://re-api.adsb.lol/`  
**Method:** `GET`  
**Format:** JSON (except the simple status check, for which the docs only guarantee HTTP 200 during normal operation)  
**Scope:** ADSB.lol's network-wide readsb aggregation API.

> **Documentation scope:** ADSB.lol's own documentation says its `re-api` is the readsb HTTP API, and refers users to wiedehopf/readsb's `README-json.md` for query syntax. The queries and filters below are **documented readsb functionality**, not a guarantee that every combination has been separately tested on ADSB.lol's hosted gateway. This is **not** the older ADSB.lol v2 API. Examples are templates, not recorded successful requests. Actual data availability depends on feed coverage and access privileges.

## 1. Sources

1. [ADSB.lol: re-api official documentation](https://www.adsb.lol/docs/feeders-only/re-api/) — hosted URL, feeder access, license, documentation link.
2. [wiedehopf/readsb: README-json.md](https://github.com/wiedehopf/readsb/blob/dev/README-json.md) — primary query syntax, filters, response fields, local JSON and trace formats.
3. [wiedehopf/readsb: README-api.md](https://github.com/wiedehopf/readsb/blob/dev/README-api.md) — how to enable and reverse-proxy readsb's local HTTP API.

## 2. Access, request format, units

ADSB.lol describes the API as accessible from **your feeder station's public IP address**, or via a VPN/proxy originating from that IP. It also offers API keys on request. Its public `re-api` page does **not** document a specific API-key HTTP header or query parameter, so do not invent an `Authorization` scheme. The listed license is **ODbL 1.0**; confirm attribution/share-alike obligations for redistribution.

- Use a **GET** request; query parameters go after `?` and can be combined with `&`.
- No JSON request body is necessary.
- Coordinates: decimal latitude and longitude; geographical distances: **nautical miles (NM / nmi)**.
- Aircraft altitudes: **feet**; aircraft speeds: **knots**; bearings/headings: **degrees**.
- `200 NM = 370.4 km`.
- The project does not publish a fixed hosted re-api quota, global radius cap, or guaranteed polling interval on its re-api page. Do **not** assume unlimited access.

```bash
curl --fail-with-body --compressed -sS \
  'https://re-api.adsb.lol/?circle=22.326207,73.210664,200'
```

When calling the same API on a **local readsb installation** configured with `--net-api-port 8042`, use `http://localhost:8042/` as the base instead. Local access does not automatically give access to ADSB.lol's aggregated network data.

## 3. Endpoint directory

Technically these are **query modes at the same `/` path**, not distinct REST paths. Supply one base query mode per request and optionally add filters.

| # | Query | Required value | Description |
|---|---|---|---|
| 1 | `circle` | `lat,lon,radius_nmi` | All positioned aircraft inside a radius |
| 2 | `closest` | `lat,lon,radius_nmi` | Closest eligible positioned aircraft within radius |
| 3 | `box` | `south,north,west,east` | Aircraft inside coordinate bounding box |
| 4 | `all_with_pos` | No value | Aircraft with positions received in last 60 s, or last 40 min for ADS-C |
| 5 | `all` | No value | `all_with_pos` plus aircraft with Mode S messages received within last 30 s |
| 6 | `find_hex` | `hex[,hex...]` | Exact ICAO/hex match; up to 1,000 identifiers |
| 7 | `hexList` / `hexlist` | `hex[,hex...]` | Documented alias/example for `find_hex` (example uses lowercase `hexlist`) |
| 8 | `find_callsign` | `callsign[,callsign...]` | Exact callsign matches; up to 1,000 or 8,000 request characters |
| 9 | `find_reg` | `registration[,registration...]` | Exact registration matches; up to 1,000 or 8,000 request characters |
| 10 | `find_type` | `ICAO_type[,ICAO_type...]` | Aircraft ICAO type designator matching |
| 11 | `find_squawk` | `squawk[,squawk...]` | Aircraft with matching squawk codes |
| 12 | `status` | No value | Health check; HTTP 200 during normal operation |

`find_squawk` is explicitly listed as a base mode even though the readsb README does not separately elaborate its behavior. `hexList` is an alias, not a different search operation.

## 4. Query specifications, descriptions and examples

### 4.1 `circle` — aircraft inside a circular area

**Syntax:** `GET /?circle=<latitude>,<longitude>,<radius_nmi>`  
**Returns:** All eligible aircraft with a valid position within the requested radius. For each aircraft, also provides `dst` (distance from center, NM) and `dir` (bearing from center, degrees).

```http
GET https://re-api.adsb.lol/?circle=22.326207,73.210664,200
```

**Use cases:** regional aircraft monitoring, proximity alerts, city dashboards. `200` is **200 nautical miles**, not kilometers.

### 4.2 `closest` — one nearest aircraft

**Syntax:** `GET /?closest=<latitude>,<longitude>,<radius_nmi>`  
**Returns:** The closest eligible aircraft in range; also includes `dst` and `dir`. An empty `aircraft` array is possible when none qualifies.

```http
GET https://re-api.adsb.lol/?closest=22.326207,73.210664,100
```

**Use cases:** nearest-aircraft widget or a quick nearby-aircraft check.

### 4.3 `box` — geographic rectangle

**Syntax:** `GET /?box=<south_lat>,<north_lat>,<west_lon>,<east_lon>`  
**Returns:** Aircraft inside the specified latitude/longitude rectangle.

```http
GET https://re-api.adsb.lol/?box=21,24,72,75
```

**Use cases:** rectangular map viewport, state/region search. Observe the order: **south, north, west, east**.

### 4.4 `all_with_pos` — aircraft with recently received positions

**Syntax:** `GET /?all_with_pos`  
**Returns:** Aircraft for which a position was received in the **last minute**, or **last 40 minutes for ADS-C**.

```http
GET https://re-api.adsb.lol/?all_with_pos
```

**Use cases:** aggregate overview and filtered bulk queries. Network-wide results may be large; check access privileges and performance.

### 4.5 `all` — all recently observed targets

**Syntax:** `GET /?all`  
**Returns:** Everything in `all_with_pos`, plus aircraft from which Mode S messages were received in the **last 30 seconds**, even when no position is known.

```http
GET https://re-api.adsb.lol/?all
```

**Use cases:** detect Mode S-only aircraft; do not require all results to have `lat`/`lon`.

### 4.6 `find_hex` — exact hex/ICAO address

**Syntax:** `GET /?find_hex=<hex1>[,<hex2>...]`  
**Returns:** Exact matches for one or more aircraft addresses. **Limit: 1,000 identifiers** documented.

```http
GET https://re-api.adsb.lol/?find_hex=800123
GET https://re-api.adsb.lol/?find_hex=800123,800456
```

**Use cases:** tracking known transponders. ICAO addresses can be reassigned; non-ICAO addresses can have a `~` prefix in responses.

### 4.7 `hexList` / `hexlist` — alias of `find_hex`

**Syntax:** `GET /?hexlist=<hex1>[,<hex2>...]`  
**Returns:** Same type of exact hex matches as `find_hex`. The readsb docs refer to `hexList` as an alias and demonstrate lowercase `hexlist` in their curl example; **use lowercase as demonstrated**.

```http
GET https://re-api.adsb.lol/?hexlist=3CD6E3
```

**Use cases:** compatibility with tooling already using the readsb alias. Prefer `find_hex` for clarity.

### 4.8 `find_callsign` — exact callsign

**Syntax:** `GET /?find_callsign=<callsign1>[,<callsign2>...]`  
**Returns:** Aircraft with exact callsign matches. **Limit: 1,000 callsigns or 8,000 request characters**.

```http
GET https://re-api.adsb.lol/?find_callsign=AIC101
GET https://re-api.adsb.lol/?find_callsign=AIC101,IGO123
```

**Use cases:** flight-specific lookups. Callsign values in responses may be padded with spaces; normalize them on your side. These sample callsigns are examples only.

### 4.9 `find_reg` — exact registration

**Syntax:** `GET /?find_reg=<registration1>[,<registration2>...]`  
**Returns:** Exact registration matches; dependent on registration metadata. **Limit: 1,000 registrations or 8,000 request characters**.

```http
GET https://re-api.adsb.lol/?find_reg=VT-ABC
```

**Use cases:** registration-based aircraft lookup. The registration shown here is illustrative.

### 4.10 `find_type` — ICAO type designator

**Syntax:** `GET /?find_type=<type1>[,<type2>...]`  
**Returns:** Aircraft matching given ICAO type codes (for example A320, A321, B738, C17).

```http
GET https://re-api.adsb.lol/?find_type=A320,B738
GET https://re-api.adsb.lol/?find_type=C17
```

**Use cases:** aircraft fleet/type dashboards. Type metadata might be missing for some addresses; `C17` means the ICAO type designator, not a wildcard callsign.

### 4.11 `find_squawk` — transponder squawk

**Syntax:** `GET /?find_squawk=<squawk1>[,<squawk2>...]`  
**Returns:** Aircraft matching specified Mode A squawk codes.

```http
GET https://re-api.adsb.lol/?find_squawk=7700
GET https://re-api.adsb.lol/?find_squawk=7700,7600,7500
```

**Use cases:** emergency-code monitoring. Codes alone are not proof of an incident; validate associated aircraft details.

### 4.12 `status` — health check

**Syntax:** `GET /?status`  
**Returns:** HTTP status **200** during normal operation. The upstream docs **do not guarantee a particular JSON body** for this check.

```bash
curl -i 'https://re-api.adsb.lol/?status'
```

**Use cases:** availability probes. A 401/403 from the hosted gateway may indicate access restrictions, not backend failure.

## 5. Optional filters and format switches

Append these to a base query. For example: `/?circle=22.326207,73.210664,200&filter_mil&filter_with_pos`.

| Parameter | Value format | Function | Example suffix |
|---|---|---|---|
| `filter_callsign_exact` | Callsign (multiple exact matches supported) | Exact callsign | `&filter_callsign_exact=AIC101` |
| `filter_callsign_prefix` | Prefix | Callsign starts with text | `&filter_callsign_prefix=AIC` |
| `filter_squawk` | Squawk list | Restrict to squawk codes | `&filter_squawk=7700,7600` |
| `filter_with_pos` | Presence-only | Include only aircraft with valid positions | `&filter_with_pos` |
| `filter_type` | ICAO type code list | Restrict to aircraft types | `&filter_type=C17,A400` |
| `below_alt_baro` | Feet | Uncorrected barometric altitude below threshold | `&below_alt_baro=10000` |
| `above_alt_baro` | Feet | Uncorrected barometric altitude above threshold | `&above_alt_baro=5000` |
| `filter_mil` | Presence-only | Match military database flag | `&filter_mil` |
| `filter_pia` | Presence-only | Match PIA flag | `&filter_pia` |
| `filter_ladd` | Presence-only | Match LADD flag | `&filter_ladd` |
| `filter_uuid` | Receiver UUID prefix | Filter by receiver UUID | `&filter_uuid=<uuid>` |
| `jv2` | Presence-only | Change output to ADS-B Exchange v2-compatible layout | `&jv2` |

**Filter details and caveats:**

- The military, PIA and LADD filters are **OR-ed when combined**. Most other filters narrow the result set.
- `filter_uuid` only works if readsb was compiled with `WITH_UUIDS=yes`; only the **first half** of the receiver UUID is needed. Do not assume ADSB.lol enables this option.
- Barometric altitude filters treat `"ground"` as zero feet.
- `filter_mil` uses the aircraft database military flag; it is neither an exhaustive nor authoritative list of all military flights.
- `jv2` switches the response timestamp `now` to **milliseconds** and uses `total` rather than `resultCount` for count. `ptime` remains milliseconds.
- The readsb README does not specify the exact inclusivity of altitude bounds (`<` vs `<=`), or the body content of `?status`. Avoid relying on undocumented edge behavior.

### Filtered examples

**Military aircraft around Vadodara:**
```http
GET https://re-api.adsb.lol/?circle=22.326207,73.210664,200&filter_mil
```

**C-17s around Vadodara:**
```http
GET https://re-api.adsb.lol/?circle=22.326207,73.210664,200&filter_type=C17
```

**Civil flights with callsign prefix AIC:**
```http
GET https://re-api.adsb.lol/?circle=22.326207,73.210664,200&filter_callsign_prefix=AIC
```

**Aircraft at barometric altitude between 5,000 and 20,000 feet:**
```http
GET https://re-api.adsb.lol/?circle=22.326207,73.210664,200&above_alt_baro=5000&below_alt_baro=20000
```

**Emergency squawk codes around Vadodara:**
```http
GET https://re-api.adsb.lol/?circle=22.326207,73.210664,200&filter_squawk=7700,7600,7500
```

**Positioned aircraft only, ADS-B Exchange v2 response compatibility:**
```http
GET https://re-api.adsb.lol/?all_with_pos&jv2
```

## 6. JSON response structure

**Representative illustration (not a captured live response):**

```json
{
  "now": 1792800000.0,
  "resultCount": 1,
  "ptime": 2,
  "aircraft": [
    {
      "hex": "800123",
      "type": "adsb_icao",
      "flight": "EXAMPLE ",
      "r": "VT-ABC",
      "t": "A320",
      "lat": 22.5,
      "lon": 73.3,
      "alt_baro": 18000,
      "gs": 420.5,
      "track": 270.0,
      "squawk": "2000",
      "seen": 0.5,
      "seen_pos": 0.8,
      "dst": 11.4,
      "dir": 18.0,
      "dbFlags": 0
    }
  ]
}
```

Top-level fields:

| Field | Type | Meaning |
|---|---|---|
| `now` | Number | Time snapshot was cached, Unix epoch seconds (milliseconds when `jv2`) |
| `aircraft` | Array of objects | Matching aircraft |
| `resultCount` | Integer | Number of aircraft (normal mode) |
| `total` | Integer | Aircraft count in `jv2` mode |
| `ptime` | Number | Milliseconds used to parse request and generate result |

**Aircraft fields are optional** when their values are unavailable. Never assume `lat`, `lon`, `flight`, `r`, or `t` exists.

### 6.1 Identification and source

| Field | Description |
|---|---|
| `hex` | Six-digit 24-bit ICAO address; `~` prefix can denote non-ICAO address |
| `type` | Current/best aircraft-message source (values below) |
| `flight` | Callsign / flight identifier (typically 8 characters including possible spaces) |
| `r` | Database-supplied registration |
| `t` | Database-supplied ICAO aircraft type designator |
| `desc` | Optional longer aircraft type name, if database supports it |
| `category` | ADS-B emitter category (A0–D7) |
| `dbFlags` | Database classification bitmask |

`type` values documented by readsb: `adsb_icao`, `adsb_icao_nt`, `adsr_icao`, `tisb_icao`, `adsc`, `mlat`, `other`, `mode_s`, `adsb_other`, `adsr_other`, `tisb_other`, `tisb_trackfile`.

`dbFlags` bitmask: `1` military, `2` interesting, `4` PIA, `8` LADD. Combine with bitwise AND; for example `Boolean(dbFlags & 1)` indicates the military bit.

### 6.2 Position, speed and altitude

| Field | Unit / interpretation |
|---|---|
| `lat`, `lon` | Decimal degrees |
| `alt_baro` | Barometric altitude, feet; may be string `"ground"` |
| `alt_geom` | GNSS/INS geometric altitude, feet, WGS84 ellipsoid |
| `gs` | Groundspeed, knots |
| `ias` | Indicated airspeed, knots |
| `tas` | True airspeed, knots |
| `mach` | Mach number |
| `track` | True ground track, degrees |
| `track_rate` | Track rate, degrees per second |
| `roll` | Bank angle, degrees (negative = left) |
| `mag_heading` | Magnetic heading, degrees |
| `true_heading` | True heading, degrees |
| `baro_rate` | Barometric climb/descent rate, feet/minute |
| `geom_rate` | Geometric climb/descent rate, feet/minute |
| `dst` | Nautical miles from `circle`/`closest` center |
| `dir` | True bearing from `circle`/`closest` center, degrees |
| `lastPosition` | Last known position object when regular lat/lon become stale; fields can include `lat`, `lon`, `nic`, `rc`, `seen_pos` |
| `rr_lat`, `rr_lon` | Rough estimated position from receiver geography, when configured |

### 6.3 Navigation and transponder

| Field | Description |
|---|---|
| `squawk` | Four-digit Mode A squawk encoded as octal digits |
| `emergency` | ADS-B emergency status; values `none`, `general`, `lifeguard`, `minfuel`, `nordo`, `unlawful`, `downed`, `reserved` |
| `nav_qnh` | Barometric setting, hPa |
| `nav_altitude_mcp` | Selected altitude on mode-control panel/flight-control unit |
| `nav_altitude_fms` | Selected FMS altitude |
| `nav_heading` | Selected heading |
| `nav_modes` | Active modes, potentially `autopilot`, `vnav`, `althold`, `approach`, `lnav`, `tcas` |
| `alert` | Flight-status alert bit |
| `spi` | Special-position-identification bit |

### 6.4 Integrity, recency, messages

| Field | Description |
|---|---|
| `nic` | Navigation Integrity Category |
| `rc` | Radius of Containment, meters |
| `version` | ADS-B version |
| `nic_baro` | Barometric-altitude integrity category |
| `nac_p`, `nac_v` | Navigation accuracy: position / velocity |
| `sil`, `sil_type` | Source integrity level / interpretation (`unknown`, `perhour`, `persample`) |
| `gva` | Geometric Vertical Accuracy |
| `sda` | System Design Assurance |
| `mlat` | List of fields derived from MLAT |
| `tisb` | List of fields derived from TIS-B |
| `messages` | Count of Mode S messages attributed to aircraft |
| `seen` | Seconds since latest received message |
| `seen_pos` | Seconds since latest position update |
| `rssi` | Recent average signal strength, dBFS (negative) |

### 6.5 Derived and experimental fields

| Field | Description |
|---|---|
| `wd`, `ws` | Calculated wind direction/speed |
| `oat`, `tat` | Calculated outside/total air temperature, °C |
| `acas_ra` | Experimental ACAS resolution-advisory format; can change |
| `gpsOkBefore` | Experimental GPS degradation indication, shown temporarily |

## 7. Working code samples

### cURL + jq

```bash
curl --compressed -fsS \
  'https://re-api.adsb.lol/?circle=22.326207,73.210664,200&filter_with_pos' \
  | jq '.aircraft[] | {hex,flight,t,lat,lon,seen_pos,dst}'
```

### Node.js 18+ (fetch)

```js
const base = 'https://re-api.adsb.lol/';
const params = new URLSearchParams({
  circle: '22.326207,73.210664,200',
  filter_with_pos: ''
});

async function getAircraft() {
  const response = await fetch(`${base}?${params}`, {
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error(`re-api HTTP ${response.status}`);
  const data = await response.json();
  if (!Array.isArray(data.aircraft)) throw new Error('Unexpected aircraft response');
  return data.aircraft
    .filter(a => Number.isFinite(a.lat) && Number.isFinite(a.lon))
    .map(a => ({
      hex: a.hex,
      callsign: typeof a.flight === 'string' ? a.flight.trim() : null,
      type: a.t ?? null,
      lat: a.lat,
      lon: a.lon,
      distanceNm: a.dst ?? null,
      positionAgeSeconds: a.seen_pos ?? null
    }));
}

getAircraft().then(console.log).catch(console.error);
```

### Python 3 standard library

```python
import json
from urllib.parse import urlencode
from urllib.request import urlopen

params = urlencode({'circle': '22.326207,73.210664,200'})
url = f'https://re-api.adsb.lol/?{params}'
with urlopen(url, timeout=10) as response:
    data = json.load(response)
for aircraft in data.get('aircraft', []):
    print(aircraft.get('hex'), (aircraft.get('flight') or '').strip(),
          aircraft.get('lat'), aircraft.get('lon'))
```

## 8. Local readsb API vs hosted re-api

readsb can expose its own built-in HTTP API:

```bash
readsb [other options] --net-api-port 8042
curl -sS 'http://localhost:8042/?hexlist=3CD6E3' | jq
```

Or use a Unix socket with nginx as shown in [README-api.md](https://github.com/wiedehopf/readsb/blob/dev/README-api.md). This local readsb instance is distinct from ADSB.lol's network aggregation service.

### Readsb-generated JSON files (not hosted re-api query modes)

When enabled and served through tar1090/readsb's web server, local files can be available under such paths as:

| File | Purpose | Typical local URL |
|---|---|---|
| `aircraft.json` | Recently seen aircraft | `http://your-receiver/tar1090/data/aircraft.json` |
| `receiver.json` | Receiver metadata, version, position, JSON refresh | `http://your-receiver/tar1090/data/receiver.json` |
| `stats.json` | Decoder, local/remote messages, CPR, signal/CPU stats | `http://your-receiver/tar1090/data/stats.json` |

File output is normally written under `/run/readsb` if using `--write-json`. The `stats.json` periods include `latest`, `last1min`, `last5min`, `last15min`, `total`. readsb also documents **trace JSON files** (individual aircraft track history), but the hosted `re-api` documentation does **not** promise a trace endpoint at this hostname. Do not confuse those files with `GET /?circle=...`.

## 9. Operational notes and limitations

1. **Authorization:** If the hosted re-api rejects a request, confirm it originates from a registered ADSB.lol feeder station IP or use an approved access method. Authentication details for external keys must be obtained from ADSB.lol.
2. **Freshness:** `seen` is the age of the latest aircraft message; `seen_pos` is the age of its latest position. They are not interchangeable.
3. **No position:** Mode S-only targets may have no `lat`/`lon`; do not treat them as being at `0,0`.
4. **Stale positions:** Check position recency before issuing proximity alerts, especially for ADS-C data with a longer freshness window.
5. **Aircraft database metadata:** `r`, `t`, `desc`, and `dbFlags` depend on aircraft database availability and accuracy.
6. **Military filter:** `filter_mil` means a database flag; it cannot identify every military aircraft and can misclassify aircraft.
7. **429/quota:** The public re-api page does not specify a numeric request limit. If rate-limited, back off. Avoid retry loops with no delays.
8. **Payloads:** `all`/`all_with_pos` can return very large outputs. Prefer bounded geography and selective filters where possible.
9. **Errors:** The docs explicitly specify HTTP 200 for `?status` in normal operation, but do not publish a complete hosted error-status/body schema. Handle non-2xx responses robustly without assuming a JSON error object.
10. **Compatibility:** `jv2` adapts response format but does not imply that every ADS-B Exchange endpoint is implemented by readsb or ADSB.lol.

## 10. Concise endpoint cheat sheet

```text
BASE: https://re-api.adsb.lol/
METHOD: GET

/?circle=LAT,LON,RADIUS_NM
/?closest=LAT,LON,RADIUS_NM
/?box=SOUTH,NORTH,WEST,EAST
/?all_with_pos
/?all
/?find_hex=HEX[,HEX...]
/?hexlist=HEX[,HEX...]
/?find_callsign=CALLSIGN[,CALLSIGN...]
/?find_reg=REG[,REG...]
/?find_type=ICAO_TYPE[,ICAO_TYPE...]
/?find_squawk=SQUAWK[,SQUAWK...]
/?status

OPTIONAL FILTERS (append to a base query using &):
  filter_callsign_exact=CALLSIGN
  filter_callsign_prefix=PREFIX
  filter_squawk=CODE[,CODE...]
  filter_with_pos
  filter_type=TYPE[,TYPE...]
  below_alt_baro=ALTITUDE_FT
  above_alt_baro=ALTITUDE_FT
  filter_mil
  filter_pia
  filter_ladd
  filter_uuid=UUID_PREFIX     [requires build support]
  jv2                         [changes JSON output format]
```

**Verification status:** Query syntax and readsb semantics checked against upstream README documentation on 2026-10-24. No claim of individual live-hosted endpoint verification is made.
