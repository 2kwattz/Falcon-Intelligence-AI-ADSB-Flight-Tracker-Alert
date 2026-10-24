# Static IP requirements

This note records every Falcon Intelligence flow for which the current code
requires, or conditionally depends on, a stable public IP address. It is a
deployment note; it deliberately does not contain an actual public IP, provider
credentials, or account identifiers.

## What “static IP” means here

For the two required flows below, the relevant address is the **public egress
IPv4 address** seen by the external provider when the Falcon host opens an
outbound connection. It is not the host's private `10.x`, `172.16-31.x`, or
`192.168.x` address. In a cloud deployment, use the VM/NAT gateway's reserved
or Elastic IP; on a site network, use a fixed ISP address or a NAT gateway with
a fixed address.

Do not send these flows through a rotating VPN, proxy, or load-balanced NAT
unless its outbound address is fixed and that address is registered with each
provider.

## Static public IP is required

| Flow | Why the fixed egress IP is required | Where it is configured or used | Effect if it changes |
| --- | --- | --- | --- |
| **ADSBHub TCP data access** | ADSBHub authorizes the Falcon host that reads its TCP/SBS feed by the public IP saved on the ADSBHub profile **Data Access** page. | `feedPartners/adsbHubTcpConn.js` opens an outbound TCP connection to `ADSBHUB_HOST` (default `data.adsbhub.org`) on `ADSBHUB_PORT` (default `5002`). The feed drives the live map and the Bangalore, Delhi, and Hyderabad remote-city alert pipeline. | The TCP connection can be accepted but deliver no SBS records, or be closed before data arrives. The live remote feed and all dependent remote-city alerts have no candidates. |
| **ADSB.lol re-api dashboard probe** | The re-api authorizes requests by the Ubuntu/Falcon host's public IP. | `routes/privateStatsRoutes.js` requests `ADSBLOL_RE_API_URL` (default `https://re-api.adsb.lol`) with the configured station circle while building protected dashboard statistics. | The ADSB.lol re-api dashboard card becomes unavailable and reports an authorization failure (HTTP 401/403). This does not stop local readsb processing or ADSBHub-based city alerts. |

### One-time and change procedure

1. Reserve the Falcon host's public egress IP before registering it with either
   provider.
2. Save that same public IP in the ADSBHub profile **Data Access** page for the
   TCP data-access flow.
3. Register that public IP with ADSB.lol for the re-api feature.
4. Restart or reconnect Falcon and verify the protected dashboard reports both
   the ADSBHub TCP feed and the ADSB.lol re-api as receiving.
5. Before moving the host, changing ISP/NAT/VPN, or changing cloud egress,
   register the new address with both providers first. Keep the old address
   registered only for the overlap permitted by the provider, then remove it.

No inbound public port is required by either of these two code paths: both start
outbound connections from the Falcon host. A stable *ingress* IP for the public
website is a separate DNS/reverse-proxy decision, not an authorization
requirement identified in this repository.

## Aircraft-data sharing / feeder uploads

Falcon's dashboard lists the local process status of these feeder clients:
Flightradar24, AirNav Radar/RadarBox, ADSBexchange, FlightAware,
Airplanes.live, ADSB.lol, and ADSBHub. In particular, ADSBexchange is detected
as an `adsbexchange-feed` or `adsbx` system service/process.

The Falcon application **does not upload ADS-B data to any of those networks**.
It only inspects whether an independently installed Ubuntu feeder service or
process is running. Therefore the repository has no feeder endpoint, API key,
or static-IP setting to configure for ADSBexchange or the other upload clients.
The dashboard's “active” state also does not confirm that a provider accepted
the upload.

Use the following rule for each separately installed feeder client:

| Situation | Static IP decision |
| --- | --- |
| The provider's feeder setup, account, firewall, or support process explicitly binds/allowlists the receiver's public IP | **Required for that provider integration.** Reserve the receiver/NAT egress IP and update the provider before it changes. This is provider-owned configuration, outside Falcon. |
| The provider identifies the receiver with a feeder key, sharing key, station ID, certificate, or account only | **Not required by Falcon.** A stable IP is still operationally useful, but it is not a repository-enforced requirement. |
| The provider has not documented an IP restriction for the deployed feeder | **Do not register an IP speculatively.** Confirm the current provider requirement in its feeder portal or support channel. |

This distinction is important: running an ADSBexchange (or other) feeder on the
same machine as Falcon does not automatically mean Falcon's static-IP settings
authorize the feeder. Each service has its own account and provider policy.

## Connections that do not currently require a static public IP

The following code paths need normal outbound connectivity and their respective
credentials/configuration, but the repository contains no IP-based
authorization requirement for them:

- Local `readsb`/SDR JSON, Redis, MySQL, MongoDB, and graphs1090 operations.
- Gmail SMTP, Resend, Twilio, Razorpay, Gemini, TathaAstu, HexDB, and the
  public aircraft/map APIs.
- The local/default readsb HTTP endpoint and the optional ComfyUI endpoint.
  ComfyUI defaults to a private-LAN address; if it is placed on another network,
  secure it with private networking, a VPN, or appropriate access controls
  rather than exposing it solely to obtain a public static IP.
- Browser requests to Falcon and public map-tile requests. Those originate from
  the visitor's network, not from the Falcon server's egress IP.

## Source-of-truth references

- `feedPartners/adsbHubTcpConn.js` — outbound ADSBHub TCP connection and the
  runtime warning that the server public IP must be saved on the ADSBHub Data
  Access page.
- `routes/privateStatsRoutes.js` — ADSB.lol re-api request and explicit 401/403
  message directing the operator to register the Ubuntu host public IP.
- `routes/privateStatsRoutes.js` — `feederClients` and `inspectFeederClient`,
  which show that Falcon observes local feeder processes only; it does not send
  those providers an upload.

