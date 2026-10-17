// Per-board canvas appearance (background, pattern, theme), stored in the board row's metadata.appearance.

export const DEFAULT_APPEARANCE = {
  background: {
    type: "none",
    color: "",
    gradient: { preset: "dusk", kind: "linear", angle: 135, from: "#1e1b4b", to: "#0f766e" },
    image: { url: "", fit: "cover", attach: "screen", blur: 0, dim: 0 },
    video: { url: "", blur: 0, dim: 0.2 },
    animated: { preset: "aurora" },
  },
  pattern: { variant: "inherit", color: "", opacity: 1, size: null, gap: null, majorEvery: 0 },
  theme: "inherit",
};

export const BACKGROUND_TYPES = [
  { value: "none", label: "None" },
  { value: "color", label: "Color" },
  { value: "gradient", label: "Gradient" },
  { value: "image", label: "Image" },
  { value: "video", label: "Video" },
  { value: "animated", label: "Live" },
];

export const GRADIENT_PRESETS = [
  { id: "dusk", label: "Dusk", css: "linear-gradient(135deg, #1e1b4b 0%, #4c1d95 45%, #0f766e 100%)" },
  { id: "ocean", label: "Ocean", css: "linear-gradient(160deg, #0c4a6e 0%, #0e7490 50%, #164e63 100%)" },
  { id: "meadow", label: "Meadow", css: "linear-gradient(135deg, #ecfccb 0%, #bbf7d0 50%, #a5f3fc 100%)" },
  { id: "peach", label: "Peach", css: "linear-gradient(135deg, #fff7ed 0%, #fed7aa 50%, #fecdd3 100%)" },
  { id: "graphite", label: "Graphite", css: "radial-gradient(circle at 30% 20%, #3f3f46 0%, #18181b 60%, #09090b 100%)" },
  { id: "paper", label: "Paper", css: "linear-gradient(180deg, #fafaf9 0%, #f5f5f4 100%)" },
  { id: "sunset", label: "Sunset", css: "linear-gradient(135deg, #f97316 0%, #db2777 55%, #7c3aed 100%)" },
  { id: "mint", label: "Mint", css: "radial-gradient(circle at 70% 30%, #d1fae5 0%, #ccfbf1 40%, #e0f2fe 100%)" },
  { id: "mesh", label: "Mesh", css: "radial-gradient(at 20% 20%, #6366f1 0px, transparent 50%), radial-gradient(at 80% 10%, #ec4899 0px, transparent 50%), radial-gradient(at 50% 90%, #14b8a6 0px, transparent 50%), #0f172a" },
];

export const IMAGE_PRESETS = [
  { id: "mountains", label: "Mountains", url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2400&auto=format&fit=crop" },
  { id: "forest", label: "Forest", url: "https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=2400&auto=format&fit=crop" },
  { id: "desk", label: "Desk", url: "https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?q=80&w=2400&auto=format&fit=crop" },
  { id: "abstract", label: "Abstract", url: "https://images.unsplash.com/photo-1557672172-298e090bd0f1?q=80&w=2400&auto=format&fit=crop" },
  { id: "paper", label: "Paper", url: "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?q=80&w=2400&auto=format&fit=crop" },
  { id: "space", label: "Space", url: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=2400&auto=format&fit=crop" },
];

export const ANIMATED_PRESETS = [
  { id: "aurora", label: "Aurora" },
  { id: "drift", label: "Drift" },
  { id: "grain", label: "Grain" },
];

export const PATTERN_VARIANTS = [
  { value: "inherit", label: "Default" },
  { value: "dots", label: "Dots" },
  { value: "lines", label: "Lines" },
  { value: "cross", label: "Cross" },
  { value: "none", label: "None" },
];

const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);

// Deep-merge a stored (possibly partial / older) appearance over the defaults.
export function mergeAppearance(raw) {
  const r = isObj(raw) ? raw : {};
  const bg = isObj(r.background) ? r.background : {};
  const d = DEFAULT_APPEARANCE;
  return {
    background: {
      ...d.background,
      ...bg,
      gradient: { ...d.background.gradient, ...(isObj(bg.gradient) ? bg.gradient : {}) },
      image: { ...d.background.image, ...(isObj(bg.image) ? bg.image : {}) },
      video: { ...d.background.video, ...(isObj(bg.video) ? bg.video : {}) },
      animated: { ...d.background.animated, ...(isObj(bg.animated) ? bg.animated : {}) },
    },
    pattern: { ...d.pattern, ...(isObj(r.pattern) ? r.pattern : {}) },
    theme: ["light", "dark"].includes(r.theme) ? r.theme : "inherit",
  };
}

export function gradientCss(g) {
  if (g?.preset && g.preset !== "custom") {
    const preset = GRADIENT_PRESETS.find((p) => p.id === g.preset);
    if (preset) return preset.css;
  }
  const from = g?.from || "#1e1b4b";
  const to = g?.to || "#0f766e";
  return g?.kind === "radial"
    ? `radial-gradient(circle at center, ${from} 0%, ${to} 100%)`
    : `linear-gradient(${g?.angle ?? 135}deg, ${from} 0%, ${to} 100%)`;
}

// Effective pattern: per-board overrides on top of the user's canvas settings.
export function resolvePattern(pattern, settings) {
  const p = pattern || {};
  const variant = p.variant && p.variant !== "inherit" ? p.variant : settings.canvasBackground || "dots";
  const gap = p.gap || settings.gridSize || 15;
  return {
    variant,
    gap,
    size: p.size || (variant === "cross" ? 6 : 1),
    color: p.color || "var(--canvas-dots)",
    opacity: p.opacity ?? 1,
    majorEvery: Number(p.majorEvery) || 0,
  };
}

// YouTube video id from a watch/share/shorts/embed/live link, or null for anything else.
export function youtubeId(raw) {
  const trimmed = (raw || "").trim();
  if (!trimmed) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    const host = url.hostname.toLowerCase().replace(/^(www|m|music)\./, "");
    if (host === "youtu.be") return url.pathname.slice(1).split("/")[0] || null;
    if (!/^youtube(-nocookie)?\.com$/.test(host)) return null;
    if (url.pathname === "/watch") return url.searchParams.get("v");
    return /^\/(?:shorts|embed|live|v)\/([\w-]+)/.exec(url.pathname)?.[1] || null;
  } catch {
    return null;
  }
}

export const youtubeThumb = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

export const hasBackdrop =(a) => a?.background?.type && a.background.type !== "none";
