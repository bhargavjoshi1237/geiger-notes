import { NextResponse } from "next/server";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import http from "node:http";
import https from "node:https";
import zlib from "node:zlib";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

const TIMEOUT_MS = 5000;
const MAX_BYTES = 512 * 1024;
const MAX_REDIRECTS = 3;
const ALLOWED_PORTS = new Set(["", "80", "443", "8080", "8443"]);
const USER_AGENT = "Mozilla/5.0 (compatible; GeigerNotesBot/1.0; +link-preview)";
// Providers whose pages bury metadata past the byte cap; their public oEmbed APIs are used instead.
const OEMBED = [
  { test: /(^|\.)youtube\.com$|^youtu\.be$/, endpoint: "https://www.youtube.com/oembed", site: "YouTube" },
  { test: /(^|\.)vimeo\.com$/, endpoint: "https://vimeo.com/api/oembed.json", site: "Vimeo" },
];

class PreviewError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// ── Address policy (SSRF) ─────────────────────────────────────────────

const v4ToInt = (ip) => ip.split(".").reduce((acc, o) => (acc << 8) + Number(o), 0) >>> 0;
const inV4 = (n, base, bits) => bits === 0 || n >>> (32 - bits) === v4ToInt(base) >>> (32 - bits);

const V4_BLOCKED = [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16],
  ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15],
  ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
];

function isBlockedV4(ip) {
  const n = v4ToInt(ip);
  return V4_BLOCKED.some(([base, bits]) => inV4(n, base, bits));
}

// Expand an IPv6 literal to 8 numeric hextets (handles "::" and a trailing dotted IPv4).
function expandV6(ip) {
  let addr = ip.split("%")[0].toLowerCase();
  const dotted = addr.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (dotted) {
    const n = v4ToInt(dotted[1]);
    addr = addr.slice(0, -dotted[1].length) + `${(n >>> 16).toString(16)}:${(n & 0xffff).toString(16)}`;
  }
  const [head, tail] = addr.split("::");
  const h = head ? head.split(":") : [];
  const t = tail !== undefined && tail ? tail.split(":") : [];
  const fill = addr.includes("::") ? Array(8 - h.length - t.length).fill("0") : [];
  return [...h, ...fill, ...t].map((x) => parseInt(x, 16) || 0);
}

function isBlockedV6(ip) {
  const w = expandV6(ip);
  const embeddedV4 = `${w[6] >> 8}.${w[6] & 255}.${w[7] >> 8}.${w[7] & 255}`;
  const zeroPrefix = w.slice(0, 5).every((x) => x === 0);
  if (zeroPrefix && w[5] === 0xffff) return isBlockedV4(embeddedV4); // ::ffff:a.b.c.d mapped
  if (zeroPrefix && w[5] === 0) return true; // ::, ::1 and deprecated IPv4-compatible
  if (w[0] === 0x64 && w[1] === 0xff9b) return isBlockedV4(embeddedV4); // NAT64
  if (w[0] === 0x2002) return isBlockedV4(`${w[1] >> 8}.${w[1] & 255}.${w[2] >> 8}.${w[2] & 255}`); // 6to4
  if ((w[0] & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
  if ((w[0] & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((w[0] & 0xffc0) === 0xfec0) return true; // fec0::/10 site-local
  if ((w[0] & 0xff00) === 0xff00) return true; // ff00::/8 multicast
  if (w[0] === 0x2001 && w[1] === 0x0db8) return true; // documentation
  return false;
}

const isBlockedAddress = (ip) => {
  const family = isIP(ip);
  if (family === 4) return isBlockedV4(ip);
  if (family === 6) return isBlockedV6(ip);
  return true;
};

// Resolve every address for the host and refuse if any is non-public.
async function resolvePublic(hostname) {
  let addresses;
  try {
    addresses = await lookup(hostname, { all: true });
  } catch {
    throw new PreviewError("Host could not be resolved", 400);
  }
  if (!addresses.length || addresses.some((a) => isBlockedAddress(a.address))) {
    throw new PreviewError("Host is not allowed", 403);
  }
  return addresses;
}

// Socket-level lookup that re-validates, so DNS rebinding between check and connect can't slip through.
function safeLookup(hostname, options, callback) {
  resolvePublic(hostname).then(
    (addresses) => {
      if (options?.all) callback(null, addresses);
      else callback(null, addresses[0].address, addresses[0].family);
    },
    (err) => callback(err),
  );
}

function parseTarget(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new PreviewError("Invalid URL", 400);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new PreviewError("Only http(s) URLs are allowed", 400);
  if (url.username || url.password) throw new PreviewError("Credentials in URL are not allowed", 400);
  if (!ALLOWED_PORTS.has(url.port)) throw new PreviewError("Port is not allowed", 403);
  url.hash = "";
  return url;
}

// ── Fetching ──────────────────────────────────────────────────────────

function requestOnce(url, signal) {
  return new Promise((resolve, reject) => {
    const lib = url.protocol === "https:" ? https : http;
    const req = lib.request(
      url,
      {
        method: "GET",
        signal,
        lookup: safeLookup,
        headers: {
          "user-agent": USER_AGENT,
          accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
          "accept-encoding": "gzip, deflate, br",
          "accept-language": "en-US,en;q=0.8",
        },
      },
      resolve,
    );
    req.on("error", reject);
    req.end();
  });
}

function decompress(res) {
  const enc = String(res.headers["content-encoding"] || "").toLowerCase();
  if (enc === "gzip" || enc === "x-gzip") return res.pipe(zlib.createGunzip());
  if (enc === "deflate") return res.pipe(zlib.createInflate());
  if (enc === "br") return res.pipe(zlib.createBrotliDecompress());
  return res;
}

// Read at most MAX_BYTES of the (decompressed) body, then cut the connection.
function readCapped(res, signal) {
  return new Promise((resolve, reject) => {
    const stream = decompress(res);
    const chunks = [];
    let size = 0;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      res.destroy();
      resolve(Buffer.concat(chunks, size));
    };
    stream.on("data", (chunk) => {
      const room = MAX_BYTES - size;
      chunks.push(chunk.length > room ? chunk.subarray(0, room) : chunk);
      size += Math.min(chunk.length, room);
      if (size >= MAX_BYTES) finish();
    });
    const fail = (err) => {
      if (size > 0) return finish();
      done = true;
      res.destroy();
      reject(err);
    };
    stream.on("end", finish);
    stream.on("error", fail);
    res.on("error", fail);
    signal.addEventListener("abort", () => !done && fail(new Error("aborted")), { once: true });
  });
}

async function fetchFollowing(startUrl, signal) {
  let url = startUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await resolvePublic(url.hostname.replace(/^\[|\]$/g, ""));
    const res = await requestOnce(url, signal);
    const status = res.statusCode || 0;
    if (status >= 300 && status < 400 && res.headers.location) {
      res.resume();
      url = parseTarget(new URL(res.headers.location, url).toString());
      continue;
    }
    if (status < 200 || status >= 300) {
      res.resume();
      throw new PreviewError(`Upstream responded ${status}`, 502);
    }
    return { res, url };
  }
  throw new PreviewError("Too many redirects", 502);
}

// ── Parsing ───────────────────────────────────────────────────────────

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'" };

function decodeEntities(str) {
  return str.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+\d*);/gi, (m, code) => {
    const lower = code.toLowerCase();
    if (lower.startsWith("#x")) return safeCodePoint(parseInt(lower.slice(2), 16), m);
    if (lower.startsWith("#")) return safeCodePoint(parseInt(lower.slice(1), 10), m);
    return ENTITIES[lower] ?? m;
  });
}

function safeCodePoint(n, fallback) {
  try {
    return String.fromCodePoint(n);
  } catch {
    return fallback;
  }
}

const clean = (value, max) => {
  if (!value) return null;
  const text = decodeEntities(String(value)).replace(/\s+/g, " ").trim();
  return text ? text.slice(0, max) : null;
};

function parseAttrs(tag) {
  const attrs = {};
  const re = /([a-zA-Z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  let m;
  while ((m = re.exec(tag))) attrs[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? "";
  return attrs;
}

function absolutize(value, base) {
  if (!value) return null;
  try {
    const u = new URL(decodeEntities(value.trim()), base);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

function decodeBody(buf, contentType) {
  const fromHeader = /charset=([\w-]+)/i.exec(contentType || "")?.[1];
  const sniff = buf.subarray(0, 2048).toString("latin1");
  const fromMeta = /<meta[^>]+charset=["']?([\w-]+)/i.exec(sniff)?.[1];
  for (const label of [fromHeader, fromMeta, "utf-8"]) {
    if (!label) continue;
    try {
      return new TextDecoder(label).decode(buf);
    } catch {
      // Unknown label: try the next candidate.
    }
  }
  return buf.toString("utf8");
}

function parseHtml(html, base) {
  const meta = {};
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    const a = parseAttrs(tag);
    const key = (a.property || a.name || a.itemprop || "").toLowerCase();
    if (key && a.content !== undefined && !(key in meta)) meta[key] = a.content;
  }

  const icons = [];
  for (const tag of html.match(/<link\b[^>]*>/gi) || []) {
    const a = parseAttrs(tag);
    const rel = (a.rel || "").toLowerCase().split(/\s+/);
    if (!a.href) continue;
    if (rel.includes("icon")) icons.push({ href: a.href, rank: 0 });
    else if (rel.includes("apple-touch-icon")) icons.push({ href: a.href, rank: 1 });
  }
  icons.sort((x, y) => x.rank - y.rank);

  const titleTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1];
  const pick = (...keys) => keys.map((k) => meta[k]).find((v) => v && v.trim());

  return {
    title: clean(pick("og:title", "twitter:title") || titleTag, 300),
    description: clean(pick("og:description", "twitter:description", "description"), 500),
    image: absolutize(pick("og:image:secure_url", "og:image", "og:image:url", "twitter:image", "twitter:image:src"), base),
    siteName: clean(pick("og:site_name", "application-name", "apple-mobile-web-app-title"), 120),
    favicon: icons.map((i) => absolutize(i.href, base)).find(Boolean) || null,
  };
}

async function tryOembed(url, signal) {
  const provider = OEMBED.find((p) => p.test.test(url.hostname.replace(/^www\./, "")));
  if (!provider) return null;
  try {
    const endpoint = new URL(`${provider.endpoint}?format=json&url=${encodeURIComponent(url.toString())}`);
    const { res } = await fetchFollowing(endpoint, signal);
    const json = JSON.parse((await readCapped(res, signal)).toString("utf8"));
    if (!json?.title) return null;
    return {
      title: clean(json.title, 300),
      description: json.author_name ? clean(`by ${json.author_name}`, 500) : null,
      image: absolutize(json.thumbnail_url, url),
      siteName: provider.site,
      favicon: new URL("/favicon.ico", provider.endpoint).toString(),
      url: url.toString(),
    };
  } catch {
    return null;
  }
}

const safeDecode = (s) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

const siteFallback = (url) => url.hostname.replace(/^www\./, "");

// GET /api/link-preview?url=<http(s) url> -> { title, description, image, favicon, siteName, url }
export async function GET(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const target = parseTarget(new URL(request.url).searchParams.get("url") || "");
    const oembed = await tryOembed(target, controller.signal);
    if (oembed) return NextResponse.json(oembed, { headers: { "Cache-Control": "private, max-age=3600" } });
    const { res, url } = await fetchFollowing(target, controller.signal);
    const contentType = String(res.headers["content-type"] || "").toLowerCase();
    const base = { title: null, description: null, image: null, siteName: siteFallback(url), url: url.toString() };
    const defaultFavicon = new URL("/favicon.ico", url).toString();

    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      res.resume();
      const isImage = contentType.startsWith("image/");
      const fileName = safeDecode(url.pathname.split("/").pop() || "") || null;
      return NextResponse.json(
        { ...base, title: fileName, image: isImage ? url.toString() : null, favicon: defaultFavicon },
        { headers: { "Cache-Control": "private, max-age=3600" } },
      );
    }

    const html = decodeBody(await readCapped(res, controller.signal), contentType);
    const parsed = parseHtml(html, url);
    return NextResponse.json(
      {
        ...base,
        ...parsed,
        siteName: parsed.siteName || base.siteName,
        favicon: parsed.favicon || defaultFavicon,
      },
      { headers: { "Cache-Control": "private, max-age=3600" } },
    );
  } catch (err) {
    if (err instanceof PreviewError) return NextResponse.json({ error: err.message }, { status: err.status });
    if (controller.signal.aborted) return NextResponse.json({ error: "Timed out" }, { status: 504 });
    console.error("[API link-preview]", err?.message || err);
    return NextResponse.json({ error: "Preview unavailable" }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
