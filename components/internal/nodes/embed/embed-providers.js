import {
  AppWindow,
  Codepen,
  Codesandbox,
  Figma,
  FileText,
  Map as MapIcon,
  Music,
  Presentation,
  Sheet,
  SquareKanban,
  Video,
  Youtube,
} from "lucide-react";

const HEADER = 36;

// Default node sizes per embed shape (header bar included).
const SIZE = {
  video: { width: 480, height: 270 + HEADER },
  vertical: { width: 300, height: 533 + HEADER },
  doc: { width: 480, height: 600 },
  board: { width: 640, height: 420 },
  map: { width: 480, height: 360 },
  track: { width: 360, height: 152 + HEADER },
  playlist: { width: 360, height: 352 + HEADER },
  generic: { width: 560, height: 400 },
};

// Parse YouTube "t"/"start" values like 90, 90s, 1m30s, 1h2m3s.
function parseStart(value) {
  if (!value) return 0;
  if (/^\d+$/.test(value)) return Number(value);
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(value);
  return m ? Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0) : 0;
}

function youtube(url, host) {
  let id = null;
  let vertical = false;
  if (host === "youtu.be") id = url.pathname.slice(1).split("/")[0];
  else if (url.pathname === "/watch") id = url.searchParams.get("v");
  else {
    const m = /^\/(shorts|embed|live|v)\/([\w-]+)/.exec(url.pathname);
    if (m) {
      id = m[2];
      vertical = m[1] === "shorts";
    }
  }
  const list = url.searchParams.get("list");
  if (!id && !list) return null;
  const params = new URLSearchParams();
  const start = parseStart(url.searchParams.get("t") || url.searchParams.get("start"));
  if (start) params.set("start", String(start));
  if (list) params.set("list", list);
  const path = id ? `embed/${id}` : "embed/videoseries";
  const qs = params.toString();
  return {
    embedUrl: `https://www.youtube-nocookie.com/${path}${qs ? `?${qs}` : ""}`,
    size: vertical ? SIZE.vertical : SIZE.video,
  };
}

function vimeo(url, host) {
  if (host === "player.vimeo.com") return { embedUrl: url.toString(), size: SIZE.video };
  const m = /^\/(?:.*\/)?(\d+)(?:\/([\da-f]+))?\/?$/.exec(url.pathname);
  if (!m) return null;
  const hash = m[2] || url.searchParams.get("h");
  return { embedUrl: `https://player.vimeo.com/video/${m[1]}${hash ? `?h=${hash}` : ""}`, size: SIZE.video };
}

function loom(url) {
  const m = /^\/(?:share|embed)\/([\da-f]+)/i.exec(url.pathname);
  return m ? { embedUrl: `https://www.loom.com/embed/${m[1]}`, size: SIZE.video } : null;
}

function figma(url) {
  if (url.pathname.startsWith("/embed")) return { embedUrl: url.toString(), size: SIZE.board };
  if (!/^\/(file|design|proto|board|slides|deck)\//.test(url.pathname)) return null;
  return {
    embedUrl: `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url.toString())}`,
    size: SIZE.board,
  };
}

function google(url) {
  const m = /^\/(document|spreadsheets|presentation)\/d\/(e\/)?([\w-]+)/.exec(url.pathname);
  if (!m) return null;
  const [, kind, published, id] = m;
  const base = `https://docs.google.com/${kind}/d/${published || ""}${id}`;
  if (published) {
    if (kind === "document") return { embedUrl: `${base}/pub?embedded=true`, size: SIZE.doc };
    if (kind === "spreadsheets") return { embedUrl: `${base}/pubhtml?widget=true&headers=false`, size: SIZE.board };
    return { embedUrl: `${base}/embed`, size: SIZE.video };
  }
  if (kind === "presentation") return { embedUrl: `${base}/embed`, size: SIZE.video };
  return { embedUrl: `${base}/preview`, size: kind === "document" ? SIZE.doc : SIZE.board };
}

function googleMaps(url) {
  if (url.pathname.startsWith("/maps/embed")) return { embedUrl: url.toString(), size: SIZE.map };
  const params = new URLSearchParams({ output: "embed" });
  const q = url.searchParams.get("q") || url.searchParams.get("query");
  const place = /\/maps\/(?:place|search)\/([^/]+)/.exec(url.pathname)?.[1];
  const at = /@(-?[\d.]+),(-?[\d.]+)(?:,([\d.]+)z)?/.exec(url.pathname);
  if (q) params.set("q", q);
  else if (place) params.set("q", decodeURIComponent(place.replace(/\+/g, " ")));
  else if (at) params.set("q", `${at[1]},${at[2]}`);
  else return null;
  if (at) {
    params.set("ll", `${at[1]},${at[2]}`);
    if (at[3]) params.set("z", String(Math.round(Number(at[3]))));
  }
  return { embedUrl: `https://maps.google.com/maps?${params.toString()}`, size: SIZE.map };
}

function spotify(url) {
  const m = /^\/(?:intl-[\w-]+\/)?(?:embed\/)?(track|album|playlist|episode|show|artist)\/([\w]+)/.exec(url.pathname);
  if (!m) return null;
  return {
    embedUrl: `https://open.spotify.com/embed/${m[1]}/${m[2]}`,
    size: m[1] === "track" || m[1] === "episode" ? SIZE.track : SIZE.playlist,
  };
}

function codepen(url) {
  const m = /^\/([\w-]+)\/(?:pen|full|details|embed)\/([\w]+)/.exec(url.pathname);
  return m ? { embedUrl: `https://codepen.io/${m[1]}/embed/${m[2]}?default-tab=result`, size: SIZE.board } : null;
}

function codesandbox(url) {
  const m = /^\/(?:s|embed|p\/sandbox|p\/devbox|p\/github\/[^/]+)\/([\w-]+)/.exec(url.pathname);
  if (!m) return null;
  const slug = m[1].split("-").pop();
  return { embedUrl: `https://codesandbox.io/embed/${slug}`, size: SIZE.board };
}

function miro(url) {
  const m = /^\/app\/(?:board|live-embed)\/([^/]+)/.exec(url.pathname);
  return m ? { embedUrl: `https://miro.com/app/live-embed/${m[1]}/?embedMode=view_only_without_ui`, size: SIZE.board } : null;
}

export const EMBED_PROVIDERS = [
  { id: "youtube", name: "YouTube", icon: Youtube, match: (h) => /(^|\.)youtube(-nocookie)?\.com$/.test(h) || h === "youtu.be", resolve: youtube },
  { id: "vimeo", name: "Vimeo", icon: Video, match: (h) => /(^|\.)vimeo\.com$/.test(h), resolve: vimeo },
  { id: "loom", name: "Loom", icon: Video, match: (h) => /(^|\.)loom\.com$/.test(h), resolve: loom },
  { id: "figma", name: "Figma", icon: Figma, match: (h) => /(^|\.)figma\.com$/.test(h), resolve: figma },
  { id: "google-docs", name: "Google Docs", icon: FileText, match: (h) => h === "docs.google.com", resolve: google },
  { id: "google-maps", name: "Google Maps", icon: MapIcon, match: (h) => /^(www\.|maps\.)?google\.[a-z.]+$/.test(h), resolve: googleMaps },
  { id: "spotify", name: "Spotify", icon: Music, match: (h) => h === "open.spotify.com", resolve: spotify },
  { id: "codepen", name: "CodePen", icon: Codepen, match: (h) => /(^|\.)codepen\.io$/.test(h), resolve: codepen },
  { id: "codesandbox", name: "CodeSandbox", icon: Codesandbox, match: (h) => /(^|\.)codesandbox\.io$/.test(h), resolve: codesandbox },
  { id: "miro", name: "Miro", icon: SquareKanban, match: (h) => /(^|\.)miro\.com$/.test(h), resolve: miro },
];

const GENERIC = { id: "web", name: "Website", icon: AppWindow };

// Refine the Google Docs label/icon by document kind.
function googleFlavor(embedUrl) {
  if (embedUrl.includes("/spreadsheets/")) return { name: "Google Sheets", icon: Sheet };
  if (embedUrl.includes("/presentation/")) return { name: "Google Slides", icon: Presentation };
  return {};
}

// Turn a pasted share URL into { provider, embedUrl, originalUrl, size }, or null when it can't be embedded.
export function resolveEmbed(raw) {
  const trimmed = (raw || "").trim();
  if (!trimmed) return null;
  let url;
  try {
    url = new URL(/^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.protocol === "http:") url.protocol = "https:"; // avoid mixed-content blocking
  const host = url.hostname.toLowerCase();

  for (const provider of EMBED_PROVIDERS) {
    if (!provider.match(host)) continue;
    const hit = provider.resolve(url, host);
    if (!hit) break;
    const flavor = provider.id === "google-docs" ? googleFlavor(hit.embedUrl) : {};
    return {
      provider: { id: provider.id, name: flavor.name || provider.name, icon: flavor.icon || provider.icon },
      embedUrl: hit.embedUrl,
      originalUrl: url.toString(),
      size: hit.size,
    };
  }
  if (!host.includes(".")) return null;
  return { provider: GENERIC, embedUrl: url.toString(), originalUrl: url.toString(), size: SIZE.generic };
}

export const EMBED_DEFAULT_SIZE = SIZE.video;
