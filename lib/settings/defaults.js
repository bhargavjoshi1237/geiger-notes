// Pure data describing user settings — safe to import from both client
// components and server route handlers (no React / icon imports here).
import { DEFAULT_EDGE, normalizeDefaultEdge } from "../canvas/edge-style.js";

// Tool ids that can be toggled on/off in the canvas toolbar.
export const TOOL_IDS = [
  "note",
  "link",
  "todo",
  "document",
  "board",
  "column",
  "comment",
  "table",
  "calendar",
  "clock",
  "image",
  "upload",
  "draw",
  "text",
  "shape",
  "sticker",
  "embed",
  "media",
  "code",
  "timer",
  "poll",
  "progress",
  "chart",
  "person",
  "palette",
  "mindmap",
  "mermaid",
  "formula",
  "ai",
  "mirror",
  "huddle",
];

// Tools shown in the toolbar out of the box; the rest live under the toolbar's "More" menu until switched on.
export const DEFAULT_TOOLBAR_TOOLS = TOOL_IDS.filter(
  (id) => !["embed", "media", "code", "timer", "poll", "progress", "chart", "person", "palette", "mindmap", "mermaid", "formula", "ai", "mirror", "huddle"].includes(id),
);

// Visual treatments for node chrome on the canvas; styled in app/globals.css via [data-node-style].
export const NODE_STYLES = [
  { id: "classic", label: "Classic", description: "Flat square cards" },
  { id: "soft", label: "Soft", description: "Rounded, bordered, light shadow" },
  { id: "outline", label: "Outline", description: "Hollow wireframe boxes" },
  { id: "sketch", label: "Sketch", description: "Hand-drawn edges and lettering" },
  { id: "sticky", label: "Sticky", description: "Paper sticky notes" },
  { id: "brutalist", label: "Brutalist", description: "Heavy borders, hard shadow" },
  { id: "elevated", label: "Elevated", description: "Borderless floating cards" },
  { id: "glass", label: "Glass", description: "Frosted, translucent panels" },
  { id: "bubble", label: "Bubble", description: "Extra-round, friendly cards" },
  { id: "accent", label: "Accent", description: "Thin border, bold left stripe" },
  { id: "neon", label: "Neon", description: "Glowing cyan outlines" },
  { id: "blueprint", label: "Blueprint", description: "Dashed lines on drafting blue" },
  { id: "terminal", label: "Terminal", description: "Green monospace on black" },
];

export const NODE_STYLE_IDS = NODE_STYLES.map((s) => s.id);

export const DEFAULT_SETTINGS = {
  // General — editing behaviour
  doubleClickToInsert: false,
  snapToGrid: false,
  showMinimap: false,
  // General — canvas
  canvasBackground: "dots",
  gridSize: 15,
  scrollMode: "pan",
  // General — canvas behaviour
  dragMode: "select",
  selectionMode: "partial",
  fitViewOnOpen: false,
  maxZoom: 2,
  minimapPosition: "bottom-right",
  // General — interface
  showClock: true,
  clockAnimation: true,
  // Defaults — style applied to newly drawn connections
  defaultEdge: { ...DEFAULT_EDGE },
  // Defaults — visual style of nodes on the canvas
  nodeStyle: "classic",
  // Defaults — which tools appear in the canvas toolbar
  toolbarTools: [...DEFAULT_TOOLBAR_TOOLS],
  // Tools the user has already been offered; anything newer is shown by default.
  toolbarCatalog: [...TOOL_IDS],
};

// Catalogue before toolbarCatalog existed, so older saved blobs only hide what they could have hidden.
const LEGACY_TOOL_IDS = TOOL_IDS.filter((id) => id !== "clock");

// Keep the saved visibility choices, but switch on tools added since the user last saved.
function mergeToolbarTools(p) {
  if (!Array.isArray(p.toolbarTools)) return DEFAULT_SETTINGS.toolbarTools;
  const tools = p.toolbarTools.filter((id) => TOOL_IDS.includes(id));
  const known = Array.isArray(p.toolbarCatalog) ? p.toolbarCatalog : LEGACY_TOOL_IDS;
  const added = TOOL_IDS.filter(
    (id) => !known.includes(id) && !tools.includes(id) && DEFAULT_TOOLBAR_TOOLS.includes(id),
  );
  return [...tools, ...added];
}

// Merge a (possibly partial / stale) persisted blob on top of the defaults so
// the app always has a complete, well-formed settings object to work with.
export function mergeSettings(partial) {
  // Drop retired keys so they aren't re-saved.
  const { defaultNote, alignmentGuides, ...p } = partial && typeof partial === "object" ? partial : {};
  return {
    ...DEFAULT_SETTINGS,
    ...p,
    defaultEdge: normalizeDefaultEdge(p.defaultEdge),
    nodeStyle: NODE_STYLE_IDS.includes(p.nodeStyle) ? p.nodeStyle : DEFAULT_SETTINGS.nodeStyle,
    toolbarTools: mergeToolbarTools(p),
    toolbarCatalog: [...TOOL_IDS],
  };
}
