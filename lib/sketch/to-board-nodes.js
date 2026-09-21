// Convert a selection of Excalidraw elements into React Flow board nodes and
// edges. Pure functions only — no Supabase, no React — so the mapping stays
// readable and independently checkable; it is the fiddly part of the push.
//
// Scene coordinates and flow coordinates are both unrotated pixel spaces, so
// the translation is an offset, not a transform.

// Mirrors columnNodeDefaults() / COLUMN_DEFAULT_SIZE in
// components/internal/nodes/ColumnNode.jsx, inlined so this module (and the
// route that uses it) stays free of React and @xyflow/react.
const COLUMN_DEFAULT_WIDTH = 338 + 16 * 2 + 2 * 2;
const columnNodeDefaults = () => ({ title: "New Column", items: [] });

// The minimums the existing nodes enforce through NodeResizeControl.
const MIN_NODE_WIDTH = 200;
const MIN_NODE_HEIGHT = 68;

// A select-all on a large sketch must not produce an unusable board.
export const MAX_PUSH_ELEMENTS = 200;

const SHAPE_TYPES = new Set(["rectangle", "diamond", "ellipse"]);

const SKIP_REASONS = {
  line: "Lines have no node equivalent",
  freedraw: "Freehand strokes have no node equivalent",
  arrow: "Arrow has an unattached end",
  embeddable: "Embeds have no node equivalent",
  iframe: "Embeds have no node equivalent",
  image: "Image could not be uploaded",
  rotated: "Rotated shapes land axis-aligned",
  capped: `Only the first ${MAX_PUSH_ELEMENTS} elements were converted`,
};

function newId() {
  return crypto.randomUUID();
}

function tally(skipped, type, reason, count = 1) {
  const existing = skipped.find((s) => s.type === type && s.reason === reason);
  if (existing) existing.count += count;
  else skipped.push({ type, reason, count });
}

// A shape's label is the text element bound to it; that text must not also
// become a node of its own.
function indexBoundText(elements) {
  const byId = new Map(elements.map((el) => [el.id, el]));
  const consumed = new Set();
  const labelFor = new Map();

  for (const el of elements) {
    if (!Array.isArray(el.boundElements)) continue;
    for (const bound of el.boundElements) {
      if (bound?.type !== "text") continue;
      const text = byId.get(bound.id);
      if (!text) continue;
      consumed.add(text.id);
      labelFor.set(el.id, (text.text ?? "").trim());
    }
  }

  // Cover the other direction too: a text element points back with containerId.
  for (const el of elements) {
    if (el.type !== "text" || !el.containerId) continue;
    consumed.add(el.id);
    if (!labelFor.has(el.containerId)) {
      labelFor.set(el.containerId, (el.text ?? "").trim());
    }
  }

  return { consumed, labelFor };
}

function boundingBox(elements) {
  let minX = Infinity;
  let minY = Infinity;
  for (const el of elements) {
    if (Number.isFinite(el.x)) minX = Math.min(minX, el.x);
    if (Number.isFinite(el.y)) minY = Math.min(minY, el.y);
  }
  return {
    minX: Number.isFinite(minX) ? minX : 0,
    minY: Number.isFinite(minY) ? minY : 0,
  };
}

/**
 * @param {Array} elements  the selected Excalidraw elements
 * @param {Object} files    the scene's files map (used only to look images up)
 * @param {{x:number,y:number}} anchor  where the cluster's top-left lands
 * @param {{ imageUrls?: Record<string,string> }} [options]
 *        imageUrls maps an Excalidraw fileId to an already-uploaded public URL;
 *        an image with no entry is skipped and reported.
 * @returns {{ nodes: Array, edges: Array, skipped: Array }}
 */
export function toBoardNodes(elements, files, anchor, options = {}) {
  const imageUrls = options.imageUrls ?? {};
  const skipped = [];

  // Excalidraw keeps isDeleted tombstones in the scene; converting them would
  // resurrect erased shapes.
  const live = (Array.isArray(elements) ? elements : []).filter(
    (el) => el && !el.isDeleted
  );

  const capped = live.slice(0, MAX_PUSH_ELEMENTS);
  if (live.length > capped.length) {
    tally(skipped, "capped", SKIP_REASONS.capped, live.length - capped.length);
  }

  const { consumed, labelFor } = indexBoundText(capped);
  const { minX, minY } = boundingBox(capped);
  const origin = { x: anchor?.x ?? 0, y: anchor?.y ?? 0 };

  const at = (el) => ({
    x: Math.round(origin.x + (el.x ?? 0) - minX),
    y: Math.round(origin.y + (el.y ?? 0) - minY),
  });
  const sized = (el) => ({
    width: Math.max(Math.round(el.width ?? 0), MIN_NODE_WIDTH),
    height: Math.max(Math.round(el.height ?? 0), MIN_NODE_HEIGHT),
  });

  const nodes = [];
  const edges = [];
  // Excalidraw element id -> the board node it became, so arrows can resolve
  // their endpoints.
  const nodeForElement = new Map();
  const framed = new Set();
  let rotated = 0;

  // Frames first: their children become column items rather than loose nodes.
  for (const el of capped) {
    if (el.type !== "frame" && el.type !== "magicframe") continue;

    const children = capped
      .filter((child) => child.frameId === el.id && child.id !== el.id)
      .sort((a, b) => (a.y ?? 0) - (b.y ?? 0));

    for (const child of children) framed.add(child.id);

    const node = {
      id: newId(),
      type: "column",
      position: at(el),
      data: {
        ...columnNodeDefaults(),
        title: (el.name ?? "").trim() || "New Column",
        items: children
          .filter((child) => !consumed.has(child.id))
          .map((child) => ({
            id: newId(),
            kind: "text",
            backgroundColor: null,
            text:
              labelFor.get(child.id) ??
              (child.type === "text" ? (child.text ?? "").trim() : ""),
          })),
      },
      style: { width: COLUMN_DEFAULT_WIDTH },
    };
    nodes.push(node);
    nodeForElement.set(el.id, node);
  }

  for (const el of capped) {
    if (nodeForElement.has(el.id)) continue;
    if (consumed.has(el.id) || framed.has(el.id)) continue;
    if (el.angle) rotated += 1;

    if (SHAPE_TYPES.has(el.type)) {
      const node = {
        id: newId(),
        type: "custom",
        position: at(el),
        data: { label: labelFor.get(el.id) ?? "" },
        style: sized(el),
      };
      nodes.push(node);
      nodeForElement.set(el.id, node);
      continue;
    }

    if (el.type === "text") {
      const node = {
        id: newId(),
        type: "custom",
        position: at(el),
        data: { label: (el.text ?? "").trim() },
        style: sized(el),
      };
      nodes.push(node);
      nodeForElement.set(el.id, node);
      continue;
    }

    if (el.type === "image") {
      const url = imageUrls[el.fileId];
      if (!url) {
        tally(skipped, "image", SKIP_REASONS.image);
        continue;
      }
      const node = {
        id: newId(),
        type: "image",
        position: at(el),
        data: { label: "Image", src: url, alt: "Sketch image" },
        style: sized(el),
      };
      nodes.push(node);
      nodeForElement.set(el.id, node);
      continue;
    }

    if (el.type === "arrow") continue; // resolved in the edge pass below
    tally(skipped, el.type, SKIP_REASONS[el.type] ?? "Unsupported element");
  }

  // Arrows last, so both endpoints are resolvable.
  for (const el of capped) {
    if (el.type !== "arrow" || framed.has(el.id)) continue;
    const source = nodeForElement.get(el.startBinding?.elementId);
    const target = nodeForElement.get(el.endBinding?.elementId);
    if (!source || !target || source.id === target.id) {
      tally(skipped, "arrow", SKIP_REASONS.arrow);
      continue;
    }
    edges.push({
      id: newId(),
      type: "center",
      source: source.id,
      target: target.id,
      markerEnd: { type: "arrowclosed", width: 20, height: 20 },
    });
  }

  if (rotated) tally(skipped, "rotated", SKIP_REASONS.rotated, rotated);

  return { nodes, edges, skipped };
}

// One line per skip group, for the summary toast.
export function describeSkipped(skipped) {
  return skipped
    .map((s) => `${s.count} ${s.type}${s.count === 1 ? "" : "s"} skipped`)
    .join(", ");
}
