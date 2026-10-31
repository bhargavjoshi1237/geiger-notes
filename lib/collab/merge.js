// Session merge: what a past session would change on the current board, and the board that results.

// Per-client React Flow state, so selecting or measuring a node never reads as a change.
const VIEW_ONLY_KEYS = new Set(["selected", "dragging", "resizing", "measured", "positionAbsolute", "computed", "internals"]);

function parseState(value) {
  if (!value) return [];
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  return Array.isArray(parsed) ? parsed : [];
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortKeys(value[key])]));
}

function fingerprint(item) {
  const content = Object.fromEntries(Object.entries(item).filter(([key]) => !VIEW_ONLY_KEYS.has(key)));
  return JSON.stringify(sortKeys(content));
}

function diffItems(incoming, current) {
  const currentById = new Map(current.map((item) => [item.id, fingerprint(item)]));
  const added = [];
  const changed = [];
  for (const item of incoming) {
    if (!currentById.has(item.id)) added.push(item);
    else if (currentById.get(item.id) !== fingerprint(item)) changed.push(item);
  }
  return { added, changed };
}

// Null when the session's saved board can't be read.
export function computeMergeDiff(session, nodes = [], edges = []) {
  let sNodes;
  let sEdges;
  try {
    sNodes = parseState(session?.state_nodes);
    sEdges = parseState(session?.state_edges);
  } catch (e) {
    console.error("[collab.merge] unreadable session state", e);
    return null;
  }

  const { added: newNodes, changed: changedNodes } = diffItems(sNodes, nodes);
  const { added: newEdges, changed: changedEdges } = diffItems(sEdges, edges);
  const sessionNodeIds = new Set(sNodes.map((n) => n.id));
  const edgeChanges = newEdges.length + changedEdges.length;

  return {
    sNodes,
    sEdges,
    newNodes,
    changedNodes,
    edgeChanges,
    localNodes: nodes.filter((n) => !sessionNodeIds.has(n.id)),
    total: newNodes.length + changedNodes.length + edgeChanges,
    // Sessions don't record their board, but one started here always shares node ids with it.
    fromOtherBoard: sNodes.length > 0 && nodes.length > 0 && newNodes.length === sNodes.length,
  };
}

// Session versions win; anything only on the board is kept.
export function buildMergedBoard(diff, edges = []) {
  const sessionEdgeIds = new Set(diff.sEdges.map((e) => e.id));
  return {
    nodes: [...diff.sNodes, ...diff.localNodes],
    edges: [...diff.sEdges, ...edges.filter((e) => !sessionEdgeIds.has(e.id))],
  };
}

export function mergeStatus(session, diff) {
  if (session?.rollback) return "merged";
  if (!diff || diff.total === 0) return "none";
  return diff.fromOtherBoard ? "other" : "ready";
}

const TYPE_LABELS = { custom: "Note" };

export function nodeTypeLabel(node) {
  const type = node?.type || "custom";
  return TYPE_LABELS[type] || type.charAt(0).toUpperCase() + type.slice(1);
}

export function nodeLabel(node) {
  const data = node?.data || {};
  const text = [data.label, data.title, data.name].find((v) => typeof v === "string" && v.trim());
  const plain = text ? text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "";
  return plain || "Untitled";
}
