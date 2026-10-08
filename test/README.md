# Kundali

Kundali is a terminal tool that checks a username against a built-in list of public
profile URL patterns. Use it only for accounts you own or research you are authorized
to perform.

It does not sign in, reset passwords, bypass platform controls, or use data brokers.
A username match is not proof that a particular person owns that account.

## Quick start

From the project root, run:

```bash
node profilehunt.js
```

Or use the npm shortcut:

```bash
npm run osint:profiles
```

Both commands open the same interactive tool. You do not need to include a username
in the command; Kundali asks for it after starting.

## What Kundali does

1. Takes a username or email address.
2. For an email address, uses the text before `@` as a possible username. For example,
   `alex@example.com` becomes `alex`.
3. Creates public profile URLs from its registry of 90+ developer, social, gaming,
   creator, and community platforms.
4. Requests those public URLs at a limited rate.
5. Uses strict checks to reduce false positives.
6. Shows results as a colored table, JSON, or CSV.

It requires Node.js 18+ (recommended), an internet connection, and working DNS. No
extra packages are needed for Kundali itself. Sensitive-platform entries are skipped
during active scans.

## Interactive mode

Kundali asks these questions when started without arguments:

| Question | What it means |
| --- | --- |
| Username or email address | The identifier to check. |
| Gravatar check | For email input only. Choose `y` to check the public Gravatar endpoint for that exact email. |
| Platforms to check | Leave blank for the entire active registry, or type names such as `GitHub,Reddit,Instagram`. |
| Output format | `table` is easy to read; `json` and `csv` are for other programs. |
| Result visibility | Choose `found`, `uncertain`, or `all`; explained below. |
| Concurrent requests | Number of simultaneous requests. Default: `4`. |
| Request timeout | Maximum time for one request in milliseconds. Default: `8000`. |

### Result visibility

| Choice | Shows |
| --- | --- |
| `found` | High-confidence profile matches only. This is the default. |
| `uncertain` | `FOUND`, `UNVERIFIED`, and `UNKNOWN` results. |
| `all` | Every result, including `NOT_FOUND`. |

## Result meanings

| Status | Meaning |
| --- | --- |
| `FOUND` | Kundali found strong public page evidence. This is still not identity proof. |
| `UNVERIFIED` | A platform returned a successful public response, but Kundali could not confirm it was a profile page. |
| `NOT_FOUND` | The platform clearly returned a missing-page response, such as HTTP 404 or a known not-found message. |
| `UNKNOWN` | Kundali could not decide. This may be a DNS issue, timeout, rate limit, access restriction, or login page. |

The normal table only shows `FOUND` results. This prevents generic success pages from
being presented as confirmed profiles.

## Strict verification

An HTTP `200 OK` response alone is not enough for a `FOUND` result. Many platforms
return a normal-looking page even when a username does not exist.

For a regular platform profile, Kundali requires:

1. The final URL is still on the expected platform and contains the requested username.
2. The page title contains the requested username.
3. The page has either a matching canonical URL or profile metadata (`og:type=profile`).

If any of these checks are missing, Kundali returns `UNVERIFIED`. This reduces false
positives, but can hide real profiles on sites that return generic, login-only, or
JavaScript-rendered pages to command-line requests.

## Colors

In an interactive terminal, Kundali uses green for `FOUND`, red for `NOT_FOUND`,
yellow for `UNKNOWN` and `UNVERIFIED`, and cyan for headings and the banner.

To turn off colors:

```bash
NO_COLOR=1 node profilehunt.js
```

JSON and CSV never contain terminal color codes.

## Command-line options

Interactive mode is the easiest way to use Kundali. Options are useful for repeatable
checks and automation.

| Option | What it does |
| --- | --- |
| `--username <name>` | Explicitly sets a username. |
| `--email <address>` | Explicitly sets an email address. Its local part becomes the username candidate. |
| `--email-exact` | Also checks the exact email at public Gravatar. Requires an email address. |
| `--platform <a,b,...>` | Limits the scan to platform names. Names are case-insensitive. |
| `--format <table\|json\|csv>` | Chooses the output format. Default: `table`. |
| `--show-unverified` | Adds `UNVERIFIED` responses to the table. |
| `--show-unknown` | Adds `UNKNOWN` responses to the table. |
| `--show-not-found` | Adds `NOT_FOUND` responses to the table. |
| `--show-all` | Adds all non-found statuses to the table. |
| `--concurrency <1-8>` | Sets simultaneous requests. Default: `4`. |
| `--timeout <milliseconds>` | Sets a per-request timeout from `1000` to `30000`. Default: `8000`. |
| `--list-platforms` | Prints the registry without making web requests. |
| `-h`, `--help` | Shows built-in help. |

## Examples

Start the interactive version:

```bash
node profilehunt.js
```

Check one username on selected platforms and show all result states:

```bash
node profilehunt.js octocat --platform "GitHub,Reddit,Instagram" --show-all
```

Save results as JSON:

```bash
node profilehunt.js octocat --format json > results.json
```

Check an email's username part and the optional exact-email Gravatar profile:

```bash
node profilehunt.js --email name@example.com --email-exact --format json
```

List platform names and URL patterns without scanning:

```bash
node profilehunt.js --list-platforms
```

## Email handling

Kundali does not perform a broad email-to-account search. Most social platforms do
not offer an appropriate public lookup for that. Email input only produces a username
candidate from the text before `@`.

The optional `--email-exact` check is different. It checks the public Gravatar
endpoint using a SHA-256 hash of the lowercased email address. The raw email address
is not placed in the Gravatar profile URL.

## Troubleshooting

### A profile I know exists is `UNVERIFIED`

The platform may be returning a generic, login, or JavaScript-rendered page. Choose
`uncertain` in interactive mode, or use `--show-unverified`, to inspect the response.

### Everything is `UNKNOWN`

Check your internet connection and DNS. `getaddrinfo EAI_AGAIN` means the machine
could not resolve a platform domain. A platform can also return `UNKNOWN` when it
limits requests or requires sign-in.

### I want fewer platforms

Enter a comma-separated platform list in the prompt, or use `--platform`. Run this to
see every available platform name:

```bash
node profilehunt.js --list-platforms
```

### I want more detail in the table

Choose `uncertain` or `all` in interactive mode. For a command, use `--show-all`.

## Responsible use

Use Kundali only for accounts you own or research you are allowed to perform. Respect
each platform's rules and people's privacy, and do not treat username reuse as proof
of identity.
