// Pure edge-style vocabulary shared by the canvas, the edge sidebar and the Defaults settings (no React here).

export const EDGE_PATHS = [
  { value: "curve", label: "Curve" },
  { value: "straight", label: "Straight" },
  { value: "step", label: "Step" },
  { value: "smoothstep", label: "Rounded" },
  { value: "bezier", label: "Bezier" },
];

export const ARROW_SHAPES = [
  { value: "none", label: "None" },
  { value: "arrow", label: "Arrow" },
  { value: "open", label: "Open" },
  { value: "circle", label: "Circle" },
  { value: "diamond", label: "Diamond" },
  { value: "bar", label: "Bar" },
];

export const ARROW_SIZES = [
  { value: "sm", label: "S", scale: 0.75 },
  { value: "md", label: "M", scale: 1 },
  { value: "lg", label: "L", scale: 1.5 },
];

export const DASH_PATTERNS = [
  { value: "solid", label: "Solid", dasharray: undefined },
  { value: "dashed", label: "Dashed", dasharray: "6 6" },
  { value: "dotted", label: "Dotted", dasharray: "1 6" },
  { value: "long", label: "Long dash", dasharray: "14 8" },
];

export const FLOW_ANIMATIONS = [
  { value: "none", label: "None" },
  { value: "dash", label: "Flowing dash" },
  { value: "dot", label: "Travelling dot" },
];

export const STROKE_WIDTHS = [1, 2, 3, 4, 6];

export const DEFAULT_EDGE = {
  stroke: "var(--edge-stroke)",
  strokeWidth: 2,
  dash: "solid",
  path: "curve",
  arrowStart: "none",
  arrowEnd: "arrow",
  arrowSize: "md",
  flow: "none",
  sketchy: false,
};

// Scale a stroke dash pattern with the line width so dots stay round on thick lines.
export function dasharrayFor(dash, strokeWidth = 2) {
  const base = DASH_PATTERNS.find((d) => d.value === dash)?.dasharray;
  if (!base) return undefined;
  const k = Math.max(1, strokeWidth / 2);
  return base
    .split(" ")
    .map((n) => Number(n) * k)
    .join(" ");
}

// Classify any stored dasharray (legacy "5 5", "6 6", "0", scaled values) back into a pattern key.
export function dashOf(edge) {
  if (edge?.data?.dash) return edge.data.dash;
  const raw = edge?.style?.strokeDasharray;
  if (!raw || raw === "0" || raw === "none") return "solid";
  const [a, b] = String(raw).split(/[\s,]+/).map(Number);
  if (a <= 2) return "dotted";
  if (a >= 12 || a > b) return "long";
  return "dashed";
}

// Arrow shape at one end, falling back to legacy React Flow marker objects on older edges.
export function arrowOf(edge, side) {
  const key = side === "start" ? "arrowStart" : "arrowEnd";
  if (edge?.data?.[key]) return edge.data[key];
  const marker = side === "start" ? edge?.markerStart : edge?.markerEnd;
  if (!marker) return "none";
  return marker.type === "arrow" ? "open" : "arrow";
}

// Move a legacy edge's React Flow marker objects into data so arrows follow later colour/width changes.
export function upgradeEdge(edge) {
  if (edge?.data?.arrowEnd !== undefined || edge?.data?.arrowStart !== undefined) return edge;
  return {
    ...edge,
    markerStart: undefined,
    markerEnd: undefined,
    data: {
      ...edge.data,
      arrowStart: arrowOf(edge, "start"),
      arrowEnd: arrowOf(edge, "end"),
      dash: dashOf(edge),
      flow: edge.animated ? "dash" : edge.data?.flow || "none",
    },
  };
}

// Upgrade older default-edge settings ({ dashed, arrowhead }) to the current vocabulary.
export function normalizeDefaultEdge(raw) {
  const d = raw && typeof raw === "object" ? raw : {};
  return {
    ...DEFAULT_EDGE,
    ...d,
    dash: d.dash || (d.dashed ? "dashed" : "solid"),
    arrowEnd: d.arrowEnd || (d.arrowhead === false ? "none" : "arrow"),
    flow: d.flow || (d.animated ? "dash" : "none"),
  };
}

// Edge fields for a brand-new connection drawn with the user's defaults.
export function newEdgeProps(rawDefaults) {
  const d = normalizeDefaultEdge(rawDefaults);
  return {
    type: "center",
    animated: d.flow === "dash",
    style: {
      stroke: d.stroke,
      strokeWidth: d.strokeWidth,
      strokeDasharray: dasharrayFor(d.dash, d.strokeWidth),
    },
    data: {
      path: d.path,
      dash: d.dash,
      arrowStart: d.arrowStart,
      arrowEnd: d.arrowEnd,
      arrowSize: d.arrowSize,
      flow: d.flow,
      sketchy: !!d.sketchy,
    },
  };
}

// Style for the in-progress connection line so it previews the edge about to be drawn.
export function connectionLineStyleFor(rawDefaults) {
  const d = normalizeDefaultEdge(rawDefaults);
  return {
    stroke: d.stroke,
    strokeWidth: d.strokeWidth,
    strokeDasharray: dasharrayFor(d.dash, d.strokeWidth),
  };
}
