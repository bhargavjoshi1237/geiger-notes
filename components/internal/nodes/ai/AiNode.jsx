"use client";

import React, { memo, useCallback, useEffect, useRef } from "react";
import { MarkerType, useReactFlow, useStore } from "@xyflow/react";
import { Loader2, Play, Sparkles, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { LogoLoading } from "@geiger/ui";
import NodeShell, { useNodeDataUpdater } from "@/components/internal/nodes/shared/NodeShell";
import TextEditingTrait from "@/components/internal/nodes/traits/TextEditingTrait";

export const AI_ACTIONS = [
  { value: "summarize", label: "Summarize" },
  { value: "cluster", label: "Cluster" },
  { value: "brainstorm", label: "Brainstorm" },
  { value: "actions", label: "Action items" },
  { value: "custom", label: "Custom" },
];

export const nodeMeta = {
  type: "ai",
  label: "AI assistant",
  icon: Sparkles,
  cardColor: true,
  create: () => ({
    data: { action: "summarize", prompt: "", output: "", items: [], status: "idle", error: null, updatedAt: null },
    style: { width: 380, height: 360 },
  }),
};

const MAX_CONTEXT = 20000;
const NOTE = { w: 338, h: 68, gapX: 30, gapY: 24 };

const plain = (s) =>
  String(s ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
const csvCell = (v) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// Plain-text rendering of one connected node for the model.
function nodeToText(node) {
  const d = node?.data ?? {};
  switch (node?.type) {
    case "todo":
      return (d.items ?? []).map((it) => `- [${it.checked ? "x" : " "}] ${plain(it.text)}`).join("\n");
    case "table": {
      const rows = [d.columns ?? [], ...(d.rows ?? [])];
      return rows.map((r) => (Array.isArray(r) ? r.map(csvCell).join(",") : "")).join("\n");
    }
    case "column": {
      const lines = (d.items ?? []).map((it) => {
        if (it.kind === "todo") return `- [${it.checked ? "x" : " "}] ${plain(it.text)}`;
        if (it.kind === "link") return `- ${it.url || plain(it.text)}`;
        return `- ${plain(it.text)}`;
      });
      return [d.title ? `${d.title}:` : null, ...lines].filter(Boolean).join("\n");
    }
    case "comment":
      return `${d.authorName ? `${d.authorName}: ` : ""}${plain(d.label)}`;
    case "link":
      return [d.title || d.preview?.title, d.url].filter(Boolean).join(" — ");
    case "mindmap":
      return plain(d.text);
    case "code":
      return d.code ?? d.source ?? "";
    case "mermaid":
      return d.source ?? "";
    case "formula":
      return `${d.label || "Formula"}: ${d.value ?? "—"}${d.unit ? ` ${d.unit}` : ""}`;
    case "ai":
      return [d.output, ...(d.items ?? []).map((i) => `- ${i}`)].filter(Boolean).join("\n");
    case "text":
      return plain(d.text ?? d.label);
    default:
      return plain(d.label ?? d.text ?? d.title ?? d.name ?? "");
  }
}

// Text of every node connected to the AI node (either edge direction), capped for the request.
export function buildAiContext(id, nodes, edges) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const seen = new Set();
  const blocks = [];
  edges.forEach((e) => {
    if (e.source !== id && e.target !== id) return;
    const otherId = e.source === id ? e.target : e.source;
    if (seen.has(otherId)) return;
    seen.add(otherId);
    const text = nodeToText(byId.get(otherId)).trim();
    if (text) blocks.push(`[${byId.get(otherId)?.type ?? "node"}]\n${text}`);
  });
  return blocks.join("\n\n").slice(0, MAX_CONTEXT);
}

// Minimal markdown: paragraphs and "- " / "1. " bullet lists.
function RichText({ text }) {
  const blocks = String(text ?? "").split(/\n{2,}/);
  return blocks.map((block, i) => {
    const lines = block.split("\n").filter((l) => l.trim());
    const isList = lines.length > 0 && lines.every((l) => /^\s*([-*•]|\d+[.)])\s+/.test(l));
    if (isList) {
      return (
        <ul key={i} className="ml-4 list-disc space-y-0.5">
          {lines.map((l, j) => (
            <li key={j}>{l.replace(/^\s*([-*•]|\d+[.)])\s+/, "").replace(/\*\*/g, "")}</li>
          ))}
        </ul>
      );
    }
    return (
      <p key={i} className="whitespace-pre-wrap">
        {block.replace(/\*\*/g, "").trim()}
      </p>
    );
  });
}

const countConnected = (id, edges) =>
  new Set(edges.filter((e) => e.source === id || e.target === id).map((e) => (e.source === id ? e.target : e.source))).size;

function AiNode({ id, data, selected, dragging }) {
  const { getNodes, getEdges, setNodes, setEdges } = useReactFlow();
  const update = useNodeDataUpdater(id);
  const inFlight = useRef(false);
  const connected = useStore(useCallback((s) => countConnected(id, s.edges), [id]));
  const canEdit = useStore((s) => s.nodesDraggable);

  const action = data.action || "summarize";
  const status = data.status || "idle";
  const items = Array.isArray(data.items) ? data.items : [];
  const loading = status === "loading";

  // A reload mid-request leaves a stale "loading" status behind.
  useEffect(() => {
    if (data.status === "loading" && !inFlight.current) update({ status: "idle" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = async () => {
    if (inFlight.current) return;
    if (action === "custom" && !String(data.prompt ?? "").trim()) {
      toast.error("Write a prompt first.");
      return;
    }
    const context = buildAiContext(id, getNodes(), getEdges());
    if (!context && action !== "custom") {
      toast.error("Connect some notes to the AI node first.");
      return;
    }
    inFlight.current = true;
    update({ status: "loading", error: null });
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/api/ai/node`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, prompt: data.prompt ?? "", context }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
      update({
        output: body.text ?? "",
        items: Array.isArray(body.items) ? body.items : [],
        status: "done",
        error: null,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      update({ status: "error", error: e.message || "Something went wrong." });
    } finally {
      inFlight.current = false;
    }
  };

  const spawnNotes = () => {
    const self = getNodes().find((n) => n.id === id);
    if (!self) return;
    const list = items.length ? items : [data.output].filter(Boolean);
    if (!list.length) return;
    const width = self.measured?.width ?? self.width ?? 380;
    const cols = list.length > 4 ? 2 : 1;
    const stamp = Date.now();
    const notes = list.map((label, i) => ({
      id: `node-${stamp}-${i}-${Math.random().toString(36).slice(2, 7)}`,
      type: "custom",
      position: {
        x: Math.round(self.position.x + width + 80 + (i % cols) * (NOTE.w + NOTE.gapX)),
        y: Math.round(self.position.y + Math.floor(i / cols) * (NOTE.h + NOTE.gapY)),
      },
      data: { label },
      style: { width: NOTE.w, height: NOTE.h },
      ...(self.parentId ? { parentId: self.parentId } : {}),
    }));
    const marker = { type: MarkerType.ArrowClosed, width: 20, height: 20, color: "var(--edge-stroke)" };
    setNodes((ns) => [...ns, ...notes]);
    setEdges((es) => [
      ...es,
      ...notes.map((n) => ({
        id: `e-${id}-${n.id}-${stamp}`,
        source: id,
        target: n.id,
        type: "center",
        style: { stroke: "var(--edge-stroke)", strokeWidth: 2 },
        markerEnd: marker,
      })),
    ]);
    toast.success(list.length === 1 ? "Added 1 note" : `Added ${list.length} notes`);
  };

  const hasResult = !!(data.output || items.length);
  const itemsTitle = action === "cluster" ? "Themes" : action === "actions" ? "Action items" : "Items";

  return (
    <NodeShell id={id} data={data} selected={selected} dragging={dragging} minWidth={300} minHeight={220}>
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Sparkles className="h-4 w-4 shrink-0 text-foreground" />
          <span className="text-sm font-semibold text-foreground">AI assistant</span>
          <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
            {connected} connected
          </span>
          <button
            type="button"
            onClick={run}
            disabled={loading || !canEdit}
            className="nodrag ml-auto flex h-7 items-center gap-1.5 rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            {AI_ACTIONS.find((a) => a.value === action)?.label ?? "Run"}
          </button>
        </div>

        {selected && canEdit && (
          <div className="flex flex-col gap-2 border-b border-border px-3 py-2">
            <div className="nodrag flex flex-wrap gap-1">
              {AI_ACTIONS.map((a) => (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => update({ action: a.value })}
                  className={`h-6 rounded-md px-2 text-[11px] transition-colors ${
                    action === a.value
                      ? "bg-surface-hover text-foreground"
                      : "text-muted-foreground hover:bg-surface-hover/60 hover:text-foreground"
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
            {action === "custom" && (
              <TextEditingTrait>
                <textarea
                  value={data.prompt ?? ""}
                  onChange={(e) => update({ prompt: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) run();
                  }}
                  rows={2}
                  placeholder="Ask anything about the connected notes… (Ctrl+Enter to run)"
                  className="nowheel w-full resize-none rounded-md border border-border bg-surface-card px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </TextEditingTrait>
            )}
          </div>
        )}

        <div className="nowheel nodrag min-h-0 flex-1 cursor-text select-text overflow-y-auto px-3 py-2 text-sm leading-relaxed text-foreground scrollbar-subtle">
          {loading && !hasResult ? (
            <div className="flex h-full items-center justify-center">
              <LogoLoading size={36} />
            </div>
          ) : (
            <div className={`flex flex-col gap-2 ${loading ? "opacity-50" : ""}`}>
              {status === "error" && data.error && (
                <p className="rounded-md border border-red-500/20 bg-red-500/10 px-2 py-1.5 text-xs text-red-600 dark:text-red-400">
                  {data.error}
                </p>
              )}
              {data.output ? <RichText text={data.output} /> : null}
              {items.length > 0 && (
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{itemsTitle}</p>
                  <ul className="ml-4 list-disc space-y-0.5">
                    {items.map((it, i) => (
                      <li key={i}>{it}</li>
                    ))}
                  </ul>
                </div>
              )}
              {!hasResult && status !== "error" && (
                <p className="text-xs text-muted-foreground">
                  Connect notes, to-dos or tables to this node, pick an action and press run.
                </p>
              )}
            </div>
          )}
        </div>

        {hasResult && canEdit && (
          <div className="flex items-center gap-2 border-t border-border px-3 py-1.5">
            <span className="mr-auto truncate text-[10px] text-muted-foreground">
              {data.updatedAt ? new Date(data.updatedAt).toLocaleString() : ""}
            </span>
            <button
              type="button"
              onClick={spawnNotes}
              className="nodrag flex h-6 items-center gap-1.5 rounded-md px-2 text-[11px] text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              <StickyNote className="h-3.5 w-3.5" />
              Spawn as notes
            </button>
          </div>
        )}
      </div>
    </NodeShell>
  );
}

export default memo(AiNode);
