// Pure data describing user settings — safe to import from both client
// components and server route handlers (no React / icon imports here).

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
  "image",
  "upload",
  "draw",
];

export const DEFAULT_SETTINGS = {
  // General — editing behaviour
  doubleClickToInsert: false,
  snapToGrid: false,
  showMinimap: false,
  // General — interface
  showClock: true,
  clockAnimation: true,
  // Defaults — style applied to newly drawn connections
  defaultEdge: {
    stroke: "#71717a",
    strokeWidth: 2,
    animated: false,
    dashed: false,
  },
  // Defaults — which tools appear in the canvas toolbar
  toolbarTools: [...TOOL_IDS],
};

// Merge a (possibly partial / stale) persisted blob on top of the defaults so
// the app always has a complete, well-formed settings object to work with.
export function mergeSettings(partial) {
  const p = partial && typeof partial === "object" ? partial : {};
  return {
    ...DEFAULT_SETTINGS,
    ...p,
    defaultEdge: {
      ...DEFAULT_SETTINGS.defaultEdge,
      ...(p.defaultEdge && typeof p.defaultEdge === "object" ? p.defaultEdge : {}),
    },
    toolbarTools: Array.isArray(p.toolbarTools)
      ? p.toolbarTools
      : DEFAULT_SETTINGS.toolbarTools,
  };
}
