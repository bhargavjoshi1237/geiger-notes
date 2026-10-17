"use client";

import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { useReactFlow, useStore } from "@xyflow/react";
import { Network } from "lucide-react";
import NodeShell, { useNodeDataUpdater } from "@/components/internal/nodes/shared/NodeShell";
import TextEditingTrait from "@/components/internal/nodes/traits/TextEditingTrait";

export const MINDMAP_ROOT_COLOR = "#8b5cf6";
export const BRANCH_COLORS = ["#60a5fa", "#f472b6", "#4ade80", "#fb923c", "#facc15", "#22d3ee", "#c084fc", "#ef4444"];
const GAP_X = 64;
const GAP_Y = 16;
const FALLBACK = { w: 140, h: 40 };

export const nodeMeta = {
  type: "mindmap",
  label: "Mind map",
  icon: Network,
  cardColor: false,
  create: () => ({
    data: { text: "Central topic", depth: 0, color: MINDMAP_ROOT_COLOR, collapsed: false },
    style: {},
  }),
};

// Ids created by Tab/Enter that should mount straight into edit mode.
const pendingEdit = new Set();

const sizeOf = (n) => ({
  w: n?.measured?.width ?? n?.width ?? FALLBACK.w,
  h: n?.measured?.height ?? n?.height ?? FALLBACK.h,
});

const isMindmap = (n) => n?.type === "mindmap";

// Direct mindmap children of a topic (parent -> child edges), in edge order.
export function mindmapChildIds(parentId, nodes, edges) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return edges
    .filter((e) => e.source === parentId && e.target !== parentId && isMindmap(byId.get(e.target)))
    .map((e) => e.target)
    .filter((id, i, arr) => arr.indexOf(id) === i);
}

export function mindmapParentId(childId, nodes, edges) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return edges.find((e) => e.target === childId && e.source !== childId && isMindmap(byId.get(e.source)))?.source ?? null;
}

const readableOn = (color) => {
  let hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color || "")?.[1];
  if (!hex) return undefined;
  if (hex.length === 3) hex = hex.replace(/./g, (c) => c + c);
  const n = parseInt(hex, 16);
  const lum = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum > 150 ? "#111111" : "#ffffff";
};

// Hide (collapse) or reveal a topic's descendants; nested collapsed topics stay folded.
export function setMindmapCollapsed({ getNodes, getEdges, setNodes, setEdges }, id, collapsed) {
  const nodes = getNodes();
  const edges = getEdges();
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const next = new Map();
  const walk = (pid, visible, seen) => {
    mindmapChildIds(pid, nodes, edges).forEach((kid) => {
      if (seen.has(kid)) return;
      seen.add(kid);
      next.set(kid, !visible);
      walk(kid, visible && !byId.get(kid)?.data?.collapsed, seen);
    });
  };
  walk(id, !collapsed, new Set([id]));
  const hiddenOf = (nid) => (next.has(nid) ? next.get(nid) : !!byId.get(nid)?.hidden);

  setNodes((ns) =>
    ns.map((n) => {
      if (n.id === id) return { ...n, data: { ...n.data, collapsed } };
      return next.has(n.id) ? { ...n, hidden: next.get(n.id) } : n;
    }),
  );
  setEdges((es) =>
    es.map((e) =>
      next.has(e.source) || next.has(e.target) ? { ...e, hidden: hiddenOf(e.source) || hiddenOf(e.target) } : e,
    ),
  );
}

// Tidy horizontal tree layout of a topic's visible subtree; the topic itself stays put.
export function layoutMindmapSubtree({ getNodes, getEdges, setNodes }, rootId) {
  const nodes = getNodes();
  const edges = getEdges();
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const root = byId.get(rootId);
  if (!root) return;

  const children = new Map();
  const seen = new Set([rootId]);
  const collect = (pid) => {
    const kids = mindmapChildIds(pid, nodes, edges).filter((k) => !seen.has(k) && !byId.get(k)?.hidden);
    kids.forEach((k) => seen.add(k));
    kids.sort((a, b) => byId.get(a).position.y - byId.get(b).position.y);
    children.set(pid, kids);
    kids.forEach(collect);
  };
  collect(rootId);

  const heights = new Map();
  const heightOf = (nid) => {
    if (heights.has(nid)) return heights.get(nid);
    const kids = children.get(nid) || [];
    const own = sizeOf(byId.get(nid)).h;
    const stacked = kids.reduce((sum, k) => sum + heightOf(k), 0) + GAP_Y * Math.max(0, kids.length - 1);
    const h = Math.max(own, stacked);
    heights.set(nid, h);
    return h;
  };

  const positions = new Map();
  const place = (nid, x, top) => {
    const node = byId.get(nid);
    const { w, h } = sizeOf(node);
    const total = heightOf(nid);
    if (nid !== rootId) positions.set(nid, { x: Math.round(x), y: Math.round(top + (total - h) / 2) });
    const kids = children.get(nid) || [];
    const stacked = kids.reduce((sum, k) => sum + heightOf(k), 0) + GAP_Y * Math.max(0, kids.length - 1);
    let cy = top + (total - stacked) / 2;
    kids.forEach((k) => {
      place(k, x + w + GAP_X, cy);
      cy += heightOf(k) + GAP_Y;
    });
  };
  const rootH = sizeOf(root).h;
  place(rootId, root.position.x, root.position.y - (heightOf(rootId) - rootH) / 2);

  setNodes((ns) => ns.map((n) => (positions.has(n.id) ? { ...n, position: positions.get(n.id) } : n)));
}

// Append a child topic under parentId, connect it and select it in edit mode.
export function addMindmapTopic({ getNodes, getEdges, setNodes, setEdges }, parentId) {
  const nodes = getNodes();
  const edges = getEdges();
  const parent = nodes.find((n) => n.id === parentId);
  if (!parent) return null;
  if (parent.data?.collapsed) setMindmapCollapsed({ getNodes, getEdges, setNodes, setEdges }, parentId, false);

  const depth = (parent.data?.depth ?? 0) + 1;
  const kids = mindmapChildIds(parentId, nodes, edges)
    .map((k) => nodes.find((n) => n.id === k))
    .filter(Boolean);
  const parentColor = parent.data?.color || MINDMAP_ROOT_COLOR;
  const palette = BRANCH_COLORS.filter((c) => c !== parentColor);
  const color = depth === 1 ? palette[kids.length % palette.length] : parentColor;

  const { w: pw, h: ph } = sizeOf(parent);
  const x = parent.position.x + pw + GAP_X;
  const y = kids.length
    ? Math.max(...kids.map((k) => k.position.y + sizeOf(k).h)) + GAP_Y
    : parent.position.y + ph / 2 - FALLBACK.h / 2;

  const childId = `node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const child = {
    id: childId,
    type: "mindmap",
    position: { x: Math.round(x), y: Math.round(y) },
    data: { text: "", depth, color, collapsed: false },
    selected: true,
    ...(parent.parentId ? { parentId: parent.parentId } : {}),
  };
  pendingEdit.add(childId);
  setNodes((ns) => [...ns.map((n) => (n.selected ? { ...n, selected: false } : n)), child]);
  setEdges((es) => [
    ...es,
    {
      id: `e-${parentId}-${childId}-${Date.now()}`,
      source: parentId,
      target: childId,
      type: "center",
      style: { stroke: color, strokeWidth: depth === 1 ? 3 : 2 },
    },
  ]);
  return childId;
}

// Recolor a branch: the topic, its descendants and their connecting edges (the root recolors alone).
export function recolorMindmapBranch({ getNodes, getEdges, setNodes, setEdges }, id, color) {
  const nodes = getNodes();
  const edges = getEdges();
  const topic = nodes.find((n) => n.id === id);
  if (!topic) return;
  const ids = new Set([id]);
  if ((topic.data?.depth ?? 0) > 0) {
    const stack = [id];
    while (stack.length) {
      mindmapChildIds(stack.pop(), nodes, edges).forEach((k) => {
        if (!ids.has(k)) {
          ids.add(k);
          stack.push(k);
        }
      });
    }
  }
  setNodes((ns) => ns.map((n) => (ids.has(n.id) ? { ...n, data: { ...n.data, color } } : n)));
  if ((topic.data?.depth ?? 0) === 0) return;
  setEdges((es) =>
    es.map((e) => (ids.has(e.target) && e.type === "center" ? { ...e, style: { ...e.style, stroke: color } } : e)),
  );
}

// Settings live outside the React Flow provider, so they ask the topic node to run graph actions.
export const MINDMAP_ACTION_EVENT = "geiger:mindmap-action";
export const requestMindmapAction = (id, action, value) =>
  window.dispatchEvent(new CustomEvent(MINDMAP_ACTION_EVENT, { detail: { id, action, value } }));

const isTypingTarget = (t) =>
  !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || !!t.closest?.('[role="dialog"],[role="menu"],[data-radix-popper-content-wrapper]'));

function MindmapNode({ id, data, selected, dragging }) {
  const rf = useReactFlow();
  const update = useNodeDataUpdater(id);
  const [editing, setEditing] = useState(() => pendingEdit.has(id));
  const textareaRef = useRef(null);

  const depth = data.depth ?? 0;
  const color = data.color || MINDMAP_ROOT_COLOR;
  const text = data.text ?? "";
  const canEdit = useStore((s) => s.nodesDraggable);
  const soleSelection = useStore((s) => s.nodes.reduce((c, n) => c + (n.selected ? 1 : 0), 0) === 1);
  const childCount = useStore(
    useCallback(
      (s) => s.edges.reduce((c, e) => c + (e.source === id && s.nodeLookup.get(e.target)?.type === "mindmap" ? 1 : 0), 0),
      [id],
    ),
  );
  const isEditing = editing && selected && canEdit;

  useEffect(() => {
    pendingEdit.delete(id);
  }, [id]);

  useEffect(() => {
    if (!isEditing) return;
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [isEditing]);

  const addChild = useCallback(() => addMindmapTopic(rf, id), [rf, id]);
  const addSibling = useCallback(() => {
    const parentId = mindmapParentId(id, rf.getNodes(), rf.getEdges());
    addMindmapTopic(rf, parentId ?? id);
  }, [rf, id]);

  useEffect(() => {
    const onAction = (e) => {
      const { id: target, action, value } = e.detail || {};
      if (target !== id) return;
      if (action === "collapse") setMindmapCollapsed(rf, id, !!value);
      else if (action === "layout") layoutMindmapSubtree(rf, id);
      else if (action === "color") recolorMindmapBranch(rf, id, value);
      else if (action === "child") addMindmapTopic(rf, id);
    };
    window.addEventListener(MINDMAP_ACTION_EVENT, onAction);
    return () => window.removeEventListener(MINDMAP_ACTION_EVENT, onAction);
  }, [rf, id]);

  // Topic shortcuts while selected (not editing): Tab child, Enter sibling, F2/typing edits.
  useEffect(() => {
    if (!selected || isEditing || !soleSelection || !canEdit) return;
    const onKey = (e) => {
      if (e.isComposing || e.ctrlKey || e.metaKey || e.altKey || isTypingTarget(e.target)) return;
      if (e.key === "Tab") {
        e.preventDefault();
        e.stopPropagation();
        addChild();
      } else if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        addSibling();
      } else if (e.key === "F2" || (e.key.length === 1 && e.key !== " ")) {
        e.preventDefault();
        e.stopPropagation();
        if (e.key !== "F2") update({ text: e.key });
        setEditing(true);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [selected, isEditing, soleSelection, canEdit, addChild, addSibling, update]);

  const onEditKeyDown = (e) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Tab") {
      e.preventDefault();
      setEditing(false);
      addChild();
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      setEditing(false);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setEditing(false);
    }
  };

  const shape =
    depth === 0
      ? { className: "px-6 py-3 text-lg font-semibold shadow-md", style: { backgroundColor: color, color: readableOn(color) } }
      : depth === 1
        ? { className: "px-4 py-2 text-sm font-medium text-foreground border-2 shadow-sm", style: { borderColor: color, backgroundColor: "var(--node-default)" } }
        : {
            className: "px-3 py-1.5 text-sm text-foreground border",
            style: { borderColor: color, backgroundColor: `color-mix(in srgb, ${color} 14%, var(--node-default))` },
          };
  const textClass = "whitespace-pre-wrap break-words leading-snug";

  return (
    <NodeShell
      id={id}
      data={data}
      selected={selected}
      dragging={dragging}
      chrome={false}
      resizable={false}
      minWidth={64}
      minHeight={32}
      className="rounded-3xl"
    >
      <div
        className={`relative min-w-16 max-w-[320px] rounded-3xl ${shape.className}`}
        style={shape.style}
        onDoubleClick={() => canEdit && setEditing(true)}
      >
        {isEditing ? (
          <TextEditingTrait className="grid" onKeyDown={onEditKeyDown}>
            <span aria-hidden className={`invisible col-start-1 row-start-1 ${textClass}`}>
              {text + " "}
            </span>
            <textarea
              ref={textareaRef}
              rows={1}
              value={text}
              onChange={(e) => update({ text: e.target.value })}
              onBlur={() => setEditing(false)}
              placeholder="Topic"
              className={`col-start-1 row-start-1 resize-none overflow-hidden bg-transparent p-0 text-inherit placeholder:opacity-50 focus:outline-none ${textClass}`}
              style={{ font: "inherit", color: "inherit" }}
            />
          </TextEditingTrait>
        ) : (
          <div className={textClass}>{text || <span className="opacity-50">Topic</span>}</div>
        )}

        {childCount > 0 && (data.collapsed || selected) && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMindmapCollapsed(rf, id, !data.collapsed);
            }}
            title={data.collapsed ? "Expand" : "Collapse"}
            className="nodrag absolute -right-3 top-1/2 flex h-6 min-w-6 -translate-y-1/2 items-center justify-center rounded-full border-2 bg-background px-1 text-[10px] font-semibold text-foreground shadow-sm"
            style={{ borderColor: color }}
          >
            {data.collapsed ? `+${childCount}` : "−"}
          </button>
        )}
      </div>
    </NodeShell>
  );
}

export default memo(MindmapNode);
