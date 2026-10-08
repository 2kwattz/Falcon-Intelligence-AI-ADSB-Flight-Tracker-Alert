#!/usr/bin/env node
"use strict";

/**
 * Public-profile discovery helper.
 *
 * Use only for accounts you own or investigations you are authorized to do.
 * This tool makes ordinary, low-rate HTTP requests.  It does not log in,
 * bypass access controls, query data brokers, or attempt password resets.
 */

const http = require("node:http");
const https = require("node:https");
const crypto = require("node:crypto");
const readline = require("node:readline/promises");

const USERNAME_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9._-]{0,98}[a-zA-Z0-9])?$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 4;
const BODY_LIMIT = 24 * 1024;
const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
};
const BANNER = `
 _  __                 _       _ _
| |/ /_   _ _ __   __| | __ _| | |
| ' /| | | | '_ \\ / _  |/ _  | | |
| . \\| |_| | | | | (_| | (_| | | |
|_|\\_\\__,_|_| |_|\\__,_|\\__,_|_|_|
    public profile discovery
   by @2kwattz | Roshan Bhatia`;

// Add platforms here as they are verified. `path` must contain {username}.
// Platforms which require a login or do not have a stable public URL are omitted.
const PLATFORMS = [
  ["GitHub", "Developer", "https://github.com/{username}"],
  ["GitLab", "Developer", "https://gitlab.com/{username}"],
  ["Codeberg", "Developer", "https://codeberg.org/{username}"],
  ["Bitbucket", "Developer", "https://bitbucket.org/{username}/"],
  ["Gitea.com", "Developer", "https://gitea.com/{username}"],
  ["SourceForge", "Developer", "https://sourceforge.net/u/{username}/profile/"],
  ["npm", "Developer", "https://www.npmjs.com/~{username}"],
  ["RubyGems", "Developer", "https://rubygems.org/profiles/{username}"],
  ["Packagist", "Developer", "https://packagist.org/users/{username}/"],
  ["Docker Hub", "Developer", "https://hub.docker.com/u/{username}"],
  ["DEV Community", "Developer", "https://dev.to/{username}"],
  ["Hashnode", "Developer", "https://hashnode.com/@{username}"],
  ["Hugging Face", "Developer", "https://huggingface.co/{username}"],
  ["Kaggle", "Developer", "https://www.kaggle.com/{username}"],
  ["LeetCode", "Developer", "https://leetcode.com/u/{username}/"],
  ["HackerRank", "Developer", "https://www.hackerrank.com/profile/{username}"],
  ["Replit", "Developer", "https://replit.com/@{username}"],
  ["CodePen", "Developer", "https://codepen.io/{username}"],
  ["JSFiddle", "Developer", "https://jsfiddle.net/user/{username}/"],
  ["Reddit", "Community", "https://www.reddit.com/user/{username}/"],
  ["Hacker News", "Community", "https://news.ycombinator.com/user?id={username}"],
  ["Product Hunt", "Community", "https://www.producthunt.com/@{username}"],
  ["Quora", "Community", "https://www.quora.com/profile/{username}"],
  ["Goodreads", "Community", "https://www.goodreads.com/{username}"],
  ["Chess.com", "Gaming", "https://www.chess.com/member/{username}"],
  ["Lichess", "Gaming", "https://lichess.org/@/{username}"],
  ["itch.io", "Gaming", "https://{username}.itch.io/"],
  ["Game Jolt", "Gaming", "https://gamejolt.com/@{username}"],
  ["PSNProfiles", "Gaming", "https://psnprofiles.com/{username}"],
  ["Speedrun.com", "Gaming", "https://www.speedrun.com/users/{username}"],
  ["Keybase", "Identity", "https://keybase.io/{username}"],
  ["X", "Social", "https://x.com/{username}"],
  ["Facebook", "Social", "https://www.facebook.com/{username}"],
  ["Instagram", "Social", "https://www.instagram.com/{username}/"],
  ["Threads", "Social", "https://www.threads.com/@{username}"],
  ["TikTok", "Social", "https://www.tiktok.com/@{username}"],
  ["Snapchat", "Social", "https://www.snapchat.com/add/{username}"],
  ["Telegram", "Social", "https://t.me/{username}"],
  ["Bluesky", "Social", "https://bsky.app/profile/{username}.bsky.social"],
  ["Mastodon.social", "Social", "https://mastodon.social/@{username}"],
  ["Pixelfed.social", "Social", "https://pixelfed.social/{username}"],
  ["Cara", "Social", "https://cara.app/{username}"],
  ["Plurk", "Social", "https://www.plurk.com/{username}"],
  ["Pinterest", "Social", "https://www.pinterest.com/{username}/"],
  ["Tumblr", "Social", "https://{username}.tumblr.com/"],
  ["LiveJournal", "Social", "https://{username}.livejournal.com/"],
  ["Dreamwidth", "Social", "https://{username}.dreamwidth.org/"],
  ["VK", "Social", "https://vk.com/{username}"],
  ["Minds", "Social", "https://www.minds.com/{username}"],
  ["Gab", "Social", "https://gab.com/{username}"],
  ["Truth Social", "Social", "https://truthsocial.com/@{username}"],
  ["Twitch", "Streaming", "https://www.twitch.tv/{username}"],
  ["Kick", "Streaming", "https://kick.com/{username}"],
  ["DLive", "Streaming", "https://dlive.tv/{username}"],
  ["YouTube", "Video", "https://www.youtube.com/@{username}"],
  ["Vimeo", "Video", "https://vimeo.com/{username}"],
  ["Dailymotion", "Video", "https://www.dailymotion.com/{username}"],
  ["Rumble", "Video", "https://rumble.com/c/{username}"],
  ["SoundCloud", "Audio", "https://soundcloud.com/{username}"],
  ["Spotify", "Audio", "https://open.spotify.com/user/{username}"],
  ["Bandcamp", "Audio", "https://{username}.bandcamp.com/"],
  ["Mixcloud", "Audio", "https://www.mixcloud.com/{username}/"],
  ["Last.fm", "Audio", "https://www.last.fm/user/{username}"],
  ["Discogs", "Audio", "https://www.discogs.com/user/{username}"],
  ["Newgrounds", "Community", "https://{username}.newgrounds.com/"],
  ["Letterboxd", "Community", "https://letterboxd.com/{username}/"],
  ["MyAnimeList", "Community", "https://myanimelist.net/profile/{username}"],
  ["AniList", "Community", "https://anilist.co/user/{username}"],
  ["Flickr", "Photography", "https://www.flickr.com/people/{username}/"],
  ["Unsplash", "Photography", "https://unsplash.com/@{username}"],
  ["500px", "Photography", "https://500px.com/p/{username}"],
  ["VSCO", "Photography", "https://vsco.co/{username}"],
  ["Behance", "Design", "https://www.behance.net/{username}"],
  ["Dribbble", "Design", "https://dribbble.com/{username}"],
  ["ArtStation", "Design", "https://www.artstation.com/{username}"],
  ["DeviantArt", "Design", "https://{username}.deviantart.com/"],
  ["Medium", "Writing", "https://medium.com/@{username}"],
  ["Wattpad", "Writing", "https://www.wattpad.com/user/{username}"],
  ["WordPress.com", "Writing", "https://{username}.wordpress.com/"],
  ["Substack", "Writing", "https://{username}.substack.com/"],
  ["LinkedIn", "Professional", "https://www.linkedin.com/in/{username}/"],
  ["SlideShare", "Professional", "https://www.slideshare.net/{username}"],
  ["About.me", "Professional", "https://about.me/{username}"],
  ["Ko-fi", "Creator", "https://ko-fi.com/{username}"],
  ["Buy Me a Coffee", "Creator", "https://buymeacoffee.com/{username}"],
  ["Patreon", "Creator", "https://www.patreon.com/{username}"],
  ["Liberapay", "Creator", "https://liberapay.com/{username}"],
  ["Gumroad", "Creator", "https://{username}.gumroad.com/"],
  ["Linktree", "Creator", "https://linktr.ee/{username}"],
  ["Carrd", "Creator", "https://{username}.carrd.co/"],
  ["Steam Community", "Gaming", "https://steamcommunity.com/id/{username}"],
  ["Tinder", "Dating", "https://tinder.com/@{username}"],
].map(([name, category, template]) => ({ name, category, template }));

function usage(exitCode = 0) {
  const message = `
Usage:
  node test/osint-profile-hunt.js <username-or-email> [options]

Options:
  --username <name>             Explicitly set a username.
  --email <address>             Use the email local-part as the username candidate.
  --email-exact                 Also check the public Gravatar profile for the exact email.
  --platform <a,b,...>          Restrict checks by platform name (case-insensitive).
  --format <table|json|csv>     Output format (default: table).
  --show-unverified             Include public responses lacking strict profile evidence.
  --show-unknown                Include access-limited and failed requests.
  --show-not-found              Include confirmed missing-profile responses.
  --show-all                    Include unverified, unknown, and not-found responses.
  --concurrency <1-8>           Parallel requests (default: 4).
  --timeout <milliseconds>      Per-request timeout (default: 8000).
  --list-platforms              Print the built-in registry; makes no requests.
  -h, --help                    Show this help.

Email input is not a cross-platform email search: public social networks generally
do not offer legitimate email-to-profile lookup. By default its local-part is used
as a username candidate. Results are public URL candidates, not identity proof.
`;
  process.stdout.write(message);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const opts = {
    format: "table", concurrency: 4, timeout: DEFAULT_TIMEOUT_MS, platform: null, emailExact: false,
    showUnverified: false, showUnknown: false, showNotFound: false,
  };
  const positionals = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") usage();
    if (arg === "--list-platforms") opts.list = true;
    else if (arg === "--email-exact") opts.emailExact = true;
    else if (arg === "--show-unverified") opts.showUnverified = true;
    else if (arg === "--show-unknown") opts.showUnknown = true;
    else if (arg === "--show-not-found") opts.showNotFound = true;
    else if (arg === "--show-all") opts.showUnverified = opts.showUnknown = opts.showNotFound = true;
    else if (["--username", "--email", "--platform", "--format", "--concurrency", "--timeout"].includes(arg)) {
      const value = argv[++i];
      if (!value || value.startsWith("--")) throw new Error(`${arg} requires a value.`);
      opts[arg.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = value;
    } else if (arg.startsWith("-")) throw new Error(`Unknown option: ${arg}`);
    else positionals.push(arg);
  }
  if (positionals.length > 1) throw new Error("Provide only one username or email address.");
  if (opts.username && opts.email) throw new Error("Use either --username or --email, not both.");
  setInput(opts, opts.username || opts.email || positionals[0], Boolean(opts.email));
  opts.concurrency = Number(opts.concurrency);
  opts.timeout = Number(opts.timeout);
  if (!Number.isInteger(opts.concurrency) || opts.concurrency < 1 || opts.concurrency > 8) throw new Error("--concurrency must be an integer from 1 to 8.");
  if (!Number.isFinite(opts.timeout) || opts.timeout < 1000 || opts.timeout > 30000) throw new Error("--timeout must be between 1000 and 30000 milliseconds.");
  if (!["table", "json", "csv"].includes(opts.format)) throw new Error("--format must be table, json, or csv.");
  return opts;
}

function setInput(opts, input, explicitlyEmail = false) {
  opts.input = input && input.trim();
  opts.inputType = explicitlyEmail || (opts.input && EMAIL_RE.test(opts.input)) ? "email" : "username";
  opts.username = opts.inputType === "email" && opts.input ? opts.input.split("@")[0] : opts.input;
}

async function ask(question, fallback = "") {
  const answer = (await this.question(question)).trim();
  return answer || fallback;
}

async function promptForOptions(opts) {
  if (!process.stdin.isTTY) {
    throw new Error("No identifier was supplied. Run with --help to see non-interactive usage.");
  }

  const prompt = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    printBanner();
    process.stdout.write("Use only for accounts you own or research you are authorized to conduct.\n\n");
    const identifier = await ask.call(prompt, "Username or email address: ");
    setInput(opts, identifier);

    if (opts.inputType === "email") {
      const exact = await ask.call(prompt, "Also check the public Gravatar profile for this exact email? [y/N]: ", "n");
      opts.emailExact = /^y(es)?$/i.test(exact);
    }

    const platforms = await ask.call(prompt, "Platforms to check (comma-separated; leave blank for all): ");
    if (platforms) opts.platform = platforms;
    opts.format = await ask.call(prompt, "Output format [table/json/csv] (table): ", "table");
    const visibility = (await ask.call(prompt, "Result visibility [found/uncertain/all] (found): ", "found")).toLowerCase();
    if (!{"found": true, "uncertain": true, "all": true}.hasOwnProperty(visibility)) throw new Error("Result visibility must be found, uncertain, or all.");
    opts.showUnverified = visibility === "uncertain" || visibility === "all";
    opts.showUnknown = visibility === "uncertain" || visibility === "all";
    opts.showNotFound = visibility === "all";
    opts.concurrency = await ask.call(prompt, "Concurrent requests [1-8] (4): ", "4");
    opts.timeout = await ask.call(prompt, "Request timeout in milliseconds (8000): ", "8000");
  } finally {
    prompt.close();
  }

  opts.concurrency = Number(opts.concurrency);
  opts.timeout = Number(opts.timeout);
  if (!["table", "json", "csv"].includes(opts.format)) throw new Error("Output format must be table, json, or csv.");
  if (!Number.isInteger(opts.concurrency) || opts.concurrency < 1 || opts.concurrency > 8) throw new Error("Concurrent requests must be an integer from 1 to 8.");
  if (!Number.isFinite(opts.timeout) || opts.timeout < 1000 || opts.timeout > 30000) throw new Error("Request timeout must be between 1000 and 30000 milliseconds.");
  return opts;
}

function request(url, timeout, redirects = 0) {
  return new Promise((resolve) => {
    const client = url.startsWith("https:") ? https : http;
    const req = client.get(url, {
      headers: {
        "user-agent": "PublicProfileDiscovery/1.0 (+authorized-research)",
        accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
        range: "bytes=0-24575",
      },
      timeout,
    }, (res) => {
      const location = res.headers.location;
      if (location && [301, 302, 303, 307, 308].includes(res.statusCode) && redirects < MAX_REDIRECTS) {
        res.resume();
        return resolve(request(new URL(location, url).toString(), timeout, redirects + 1));
      }
      let bytes = 0;
      const chunks = [];
      res.on("data", (chunk) => {
        if (bytes < BODY_LIMIT) chunks.push(chunk.subarray(0, BODY_LIMIT - bytes));
        bytes += chunk.length;
        if (bytes >= BODY_LIMIT) res.destroy();
      });
      res.on("close", () => resolve({ status: res.statusCode || 0, url, body: Buffer.concat(chunks).toString("utf8") }));
      res.on("end", () => resolve({ status: res.statusCode || 0, url, body: Buffer.concat(chunks).toString("utf8") }));
    });
    req.on("timeout", () => req.destroy(new Error("Timed out")));
    req.on("error", (error) => resolve({ status: 0, url, error: error.message, body: "" }));
  });
}

function tagMatches(tags, firstPattern, secondPattern) {
  return tags.some((tag) => firstPattern.test(tag) && secondPattern.test(tag));
}

function attributeValue(tag, attribute) {
  const escaped = attribute.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = tag.match(new RegExp(`\\b${escaped}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "i"));
  return match ? match[2] : "";
}

function decodeHtml(value) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number(decimal)))
    .replace(/&(amp|quot|apos|lt|gt);/gi, (_, entity) => ({ amp: "&", quot: '"', apos: "'", lt: "<", gt: ">" })[entity.toLowerCase()]);
}

function isInstagramProfileUrl(value, username) {
  try {
    const url = new URL(value, "https://www.instagram.com/");
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const actualPath = decodeURIComponent(url.pathname).replace(/\/$/, "").toLowerCase();
    const expectedPath = `/${username}`.toLowerCase();
    return host === "instagram.com" && actualPath === expectedPath;
  } catch {
    return false;
  }
}

function verifyInstagramProfilePage(response, profileUrl, username) {
  if (!isInstagramProfileUrl(profileUrl, username) || !isInstagramProfileUrl(response.url, username)) return [];

  const metaTags = response.body.match(/<meta\b[^>]*>/gi) || [];
  const linkTags = response.body.match(/<link\b[^>]*>/gi) || [];
  const metaContent = (name) => metaTags
    .filter((tag) => [attributeValue(tag, "property"), attributeValue(tag, "name")].some((value) => value.toLowerCase() === name))
    .map((tag) => attributeValue(tag, "content"));
  const canonicalUrls = linkTags
    .filter((tag) => attributeValue(tag, "rel").toLowerCase().split(/\s+/).includes("canonical"))
    .map((tag) => attributeValue(tag, "href"));
  const normalizedTitle = decodeHtml(metaContent("og:title").join(" ")).toLowerCase();
  const hasHandle = normalizedTitle.includes(`@${username.toLowerCase()}`);
  const canonicalMatches = canonicalUrls.some((url) => isInstagramProfileUrl(url, username));
  const ogUrlMatches = metaContent("og:url").some((url) => isInstagramProfileUrl(url, username));
  const hasProfileType = metaContent("og:type").some((value) => value.toLowerCase() === "profile");

  if (!hasHandle || !canonicalMatches || !ogUrlMatches || !hasProfileType) return [];
  return ["matching final URL", "canonical URL", "og:url", "og:title handle", "profile metadata"];
}

function verifyProfilePage(response, profileUrl, username) {
  let expected;
  let final;
  try {
    expected = new URL(profileUrl);
    final = new URL(response.url);
  } catch {
    return [];
  }

  const normalizedHost = (hostname) => hostname.toLowerCase().replace(/^www\./, "");
  if (normalizedHost(expected.hostname) !== normalizedHost(final.hostname)) return [];

  const token = encodeURIComponent(username).toLowerCase();
  const finalTarget = `${final.pathname}${final.search}`.toLowerCase();
  if (!finalTarget.includes(token)) return [];

  const body = response.body || "";
  const title = body.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1].replace(/<[^>]+>/g, " ").toLowerCase() || "";
  const hasTitle = title.includes(username.toLowerCase());
  const linkTags = body.match(/<link\b[^>]*>/gi) || [];
  const metaTags = body.match(/<meta\b[^>]*>/gi) || [];
  const hasCanonical = tagMatches(linkTags, /\brel\s*=\s*["'][^"']*\bcanonical\b[^"']*["']/i, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  const hasProfileType = tagMatches(metaTags, /\b(?:property|name)\s*=\s*["']og:type["']/i, /\bcontent\s*=\s*["']profile["']/i)
    || tagMatches(metaTags, /\bcontent\s*=\s*["']profile["']/i, /\b(?:property|name)\s*=\s*["']og:type["']/i);

  const evidence = [];
  if (hasTitle) evidence.push("title");
  if (hasCanonical) evidence.push("canonical URL");
  if (hasProfileType) evidence.push("profile metadata");
  return hasTitle && (hasCanonical || hasProfileType) ? evidence : [];
}

function classify(response, profileUrl, username, options = {}) {
  if (response.status === 404 || response.status === 410) return ["not_found", "No public page (HTTP " + response.status + ")"];
  if (response.status === 401 || response.status === 403 || response.status === 429) return ["unknown", `Access limited (HTTP ${response.status})`];
  if (response.status >= 200 && response.status < 300) {
    const text = response.body.toLowerCase();
    if (/page not found|profile not found|user not found|this account doesn't exist|couldn't find this account|page isn't available|does not exist|no longer available/.test(text)) return ["not_found", "Platform returned a not-found page"];
    if (options.gravatar && /"entry"\s*:\s*\[/.test(text)) return ["found", "Verified public Gravatar profile"];
    if (options.instagram) {
      const evidence = verifyInstagramProfilePage(response, profileUrl, username);
      if (evidence.length) return ["found", `Verified official Instagram profile by ${evidence.join(" + ")}`];
      return ["unverified", `HTTP ${response.status}; insufficient official Instagram profile evidence`];
    }
    const evidence = verifyProfilePage(response, profileUrl, username);
    if (evidence.length) return ["found", `Verified by ${evidence.join(" + ")}`];
    return ["unverified", `HTTP ${response.status}; insufficient profile evidence`];
  }
  return ["unknown", response.error || `HTTP ${response.status || "request failed"}`];
}

async function mapLimit(items, limit, action) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await action(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function probePlatform(platform, username, timeout) {
  const profileUrl = platform.template.replace("{username}", encodeURIComponent(username));
  const response = await request(profileUrl, timeout);
  const [status, detail] = classify(response, profileUrl, username, { instagram: platform.name === "Instagram" });
  return { platform: platform.name, category: platform.category, url: profileUrl, finalUrl: response.url, status, detail };
}

async function probeGravatar(email, timeout) {
  const hash = crypto.createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
  const url = `https://gravatar.com/${hash}.json`;
  const response = await request(url, timeout);
  const [status, detail] = classify(response, url, email, { gravatar: true });
  return { platform: "Gravatar", category: "Identity", url, finalUrl: response.url, status, detail };
}

function csv(value) { return `"${String(value).replaceAll('"', '""')}"`; }
function colorEnabled() {
  return !process.env.NO_COLOR && (Boolean(process.stdout.isTTY) || (process.env.FORCE_COLOR && process.env.FORCE_COLOR !== "0"));
}
function paint(text, ...styles) {
  return colorEnabled() ? styles.map((style) => ANSI[style]).join("") + text + ANSI.reset : text;
}
function paintStatus(status) {
  const style = { found: "green", not_found: "red", unknown: "yellow", unverified: "yellow", registry: "cyan" }[status.toLowerCase()];
  return style ? paint(status, "bold", style) : status;
}
function printBanner() { process.stdout.write(`\n${paint(BANNER, "bold", "cyan")}\n\n`); }

function tableRow(values, widths, { header = false } = {}) {
  const cells = values.map((value, index) => {
    const padded = String(value).padEnd(widths[index]);
    if (header) return paint(padded, "bold", "cyan");
    if (index === 0) return paintStatus(padded);
    if (index === 1) return paint(padded, "bold");
    return padded;
  });
  return `| ${cells.join(" | ")} |`;
}

function printResults(results, format, { showUnverified = false, showUnknown = false, showNotFound = false } = {}) {
  if (format === "json") return process.stdout.write(JSON.stringify(results, null, 2) + "\n");
  if (format === "csv") {
    process.stdout.write("platform,category,status,url,detail\n" + results.map((r) => [r.platform, r.category, r.status, r.url, r.detail].map(csv).join(",")).join("\n") + "\n");
    return;
  }
  const registry = results.every((r) => r.status === "registry");
  const rows = registry ? results : results.filter((r) => r.status === "found"
    || (showUnverified && r.status === "unverified")
    || (showUnknown && r.status === "unknown")
    || (showNotFound && r.status === "not_found"));
  if (!rows.length) {
    process.stdout.write(`${paint("KUNDALI SCAN RESULTS", "bold", "cyan")}\n${paint("No high-confidence public profiles found.", "bold", "yellow")}\n`);
    process.stdout.write(`${paint(`Unverified: ${results.filter((r) => r.status === "unverified").length}`, "yellow")}  |  ${paint(`Not found: ${results.filter((r) => r.status === "not_found").length}`, "red")}  |  ${paint(`Unknown: ${results.filter((r) => r.status === "unknown").length}`, "yellow")}\n`);
    process.stdout.write(`${paint("Tip:", "bold", "cyan")} Use --show-unverified, --show-unknown, --show-not-found, or --show-all to expand results.\n`);
    return;
  }
  const table = rows.map((r) => [r.status.toUpperCase(), r.platform, r.url]);
  const headers = ["STATUS", "PLATFORM", "PUBLIC PROFILE URL"];
  const widths = headers.map((header, index) => Math.max(header.length, ...table.map((row) => row[index].length)));
  const border = `+-${widths.map((width) => "-".repeat(width)).join("-+-")}-+`;
  process.stdout.write(`${paint("KUNDALI SCAN RESULTS", "bold", "cyan")}\n`);
  process.stdout.write(`${paint(border, "dim")}\n${tableRow(headers, widths, { header: true })}\n${paint(border, "dim")}\n`);
  for (const row of table) process.stdout.write(`${tableRow(row, widths)}\n`);
  process.stdout.write(`${paint(border, "dim")}\n`);
  if (!registry) {
    process.stdout.write(`${paint(`Found: ${results.filter((r) => r.status === "found").length}`, "bold", "green")}  |  ${paint(`Unverified: ${results.filter((r) => r.status === "unverified").length}`, "yellow")}  |  ${paint(`Not found: ${results.filter((r) => r.status === "not_found").length}`, "red")}  |  ${paint(`Unknown: ${results.filter((r) => r.status === "unknown").length}`, "yellow")}\n`);
    process.stdout.write(`${paint("Verification:", "bold", "cyan")} FOUND requires a matching final URL, page title, and canonical URL or profile metadata; it is not proof of account ownership.\n`);
  }
}

async function main() {
  let opts;
  try { opts = parseArgs(process.argv.slice(2)); } catch (error) { process.stderr.write(`Error: ${error.message}\n`); return usage(2); }
  if (opts.list) {
    if (opts.format === "table") printBanner();
    return printResults(PLATFORMS.map((p) => ({ platform: p.name, category: p.category, status: "registry", url: p.template, detail: "" })), opts.format, opts);
  }
  let prompted = false;
  if (!opts.input) {
    opts = await promptForOptions(opts);
    prompted = true;
  }
  if (!prompted && opts.format === "table") printBanner();
  if (opts.inputType === "email" && !EMAIL_RE.test(opts.input)) throw new Error("Enter a valid email address.");
  if (opts.emailExact && opts.inputType !== "email") throw new Error("--email-exact requires an email address.");
  if (!USERNAME_RE.test(opts.username)) throw new Error("Username may contain letters, numbers, dots, underscores, and hyphens (1–100 characters).");

  let platforms = PLATFORMS;
  if (opts.platform) {
    const wanted = new Set(opts.platform.split(",").map((name) => name.trim().toLowerCase()));
    platforms = PLATFORMS.filter((p) => wanted.has(p.name.toLowerCase()));
    if (!platforms.length) throw new Error("No registry platforms match --platform. Run --list-platforms to see names.");
  }
  const excludedPlatforms = platforms.filter((platform) => platform.category === "");
  platforms = platforms.filter((platform) => platform.category !== "");
  if (excludedPlatforms.length) process.stderr.write(`Skipping ${excludedPlatforms.length} sensitive-platform entry.\n`);
  process.stderr.write(`Checking ${platforms.length} public profile URL patterns for "${opts.username}" at concurrency ${opts.concurrency}.\n`);
  const results = await mapLimit(platforms, opts.concurrency, (platform) => probePlatform(platform, opts.username, opts.timeout));
  if (opts.emailExact) results.push(await probeGravatar(opts.input, opts.timeout));
  printResults(results, opts.format, opts);
}

if (require.main === module) {
  main().catch((error) => { process.stderr.write(`Error: ${error.message}\n`); process.exitCode = 1; });
}

module.exports = { PLATFORMS, classify, main, parseArgs, probePlatform, promptForOptions };
