"use client";

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useReactFlow } from "@xyflow/react";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronRight,
  FileText,
  Image as ImageIcon,
  LayoutGrid,
  Link2,
  PenTool,
  RotateCw,
  ScanEye,
  Search,
} from "lucide-react";
import { LogoLoading, Popover, PopoverContent, PopoverTrigger, cn } from "@geiger/ui";
import NodeShell from "@/components/internal/nodes/shared/NodeShell";
import { isPlaygroundActive, PLAYGROUND_PROJECT } from "@/lib/playground/mode";

const REFRESH_MS = 30_000;
const MAX_INLINE_DATA_URL = 150_000;

const api = (path) => `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/api/${path}`;

const TYPE_LABELS = {
  custom: "Note",
  text: "Text",
  todo: "To-do",
  table: "Table",
  link: "Link",
  image: "Image",
  comment: "Comment",
  column: "Column",
  code: "Code",
  board: "Board",
  document: "Document",
  sketch: "Sketch",
  file: "File",
};

export const typeLabel = (type) =>
  TYPE_LABELS[type] || (type ? type.charAt(0).toUpperCase() + type.slice(1) : "Node");

const stripTags = (s) => String(s ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

// One-line text preview of a node, used in the picker list.
export function nodeSummary(node) {
  const d = node?.data || {};
  const firstItem = Array.isArray(d.items) ? d.items.find((it) => it?.text)?.text : "";
  const candidates = [
    d.title,
    d.label,
    d.text,
    d.content,
    firstItem,
    Array.isArray(d.columns) ? d.columns.join(" · ") : "",
    d.url,
    d.caption,
    d.fileName,
    typeof d.code === "string" ? d.code.split("\n")[0] : "",
  ];
  const hit = candidates.find((c) => typeof c === "string" && stripTags(c));
  return hit ? stripTags(hit).slice(0, 120) : "";
}

// Small, JSON-safe copy of a node for instant rendering; drops chrome-only keys and huge inline media.
export function toSnapshot(node) {
  const { reactions, outline, ...rest } = node?.data || {};
  const data = Object.fromEntries(
    Object.entries(rest).filter(
      ([, v]) => !(typeof v === "string" && v.startsWith("data:") && v.length > MAX_INLINE_DATA_URL),
    ),
  );
  return { type: node?.type || "custom", data };
}

const parseNodes = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export async function fetchMirrorBoards(projectId) {
  const qs = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";
  const res = await fetch(api(`sketches/link-targets${qs}`));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return Array.isArray(json.boards) ? json.boards : [];
}

export async function fetchBoardNodes(boardId, projectId) {
  const params = new URLSearchParams();
  if (projectId) params.set("projectId", projectId);
  // The personal home canvas is addressed by omitting boardId.
  if (boardId && boardId !== "home") params.set("boardId", boardId);
  const res = await fetch(api(`load-state?${params.toString()}`));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return parseNodes(json.nodes);
}

// Current project scope from the route (/project/[projectId]); the playground uses its seeded project.
export function useMirrorProjectId() {
  const params = useParams();
  const fromRoute = Array.isArray(params?.projectId) ? params.projectId[0] : params?.projectId;
  return fromRoute || (isPlaygroundActive() ? PLAYGROUND_PROJECT.id : null);
}

export function openSourceBoard(boardId, name) {
  if (!boardId) return;
  window.dispatchEvent(new CustomEvent("geiger:open-board", { detail: { boardId, name } }));
}

// Two-step picker: board, then one of its nodes.
export function MirrorSourcePicker({ projectId, excludeNodeId, onPick }) {
  const [boards, setBoards] = useState(null);
  const [board, setBoard] = useState(null);
  const [nodes, setNodes] = useState(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let alive = true;
    fetchMirrorBoards(projectId)
      .then((rows) => alive && setBoards(rows))
      .catch(() => {
        if (!alive) return;
        setBoards([]);
        setError("Couldn't load boards");
      });
    return () => {
      alive = false;
    };
  }, [projectId]);

  const openBoard = (b) => {
    setBoard(b);
    setNodes(null);
    setQuery("");
    setError("");
    fetchBoardNodes(b.id, projectId)
      .then((rows) => setNodes(rows.filter((n) => n?.id && n.type !== "mirror" && n.id !== excludeNodeId)))
      .catch(() => {
        setNodes([]);
        setError("Couldn't load this board");
      });
  };

  const q = query.trim().toLowerCase();
  const list = board ? nodes : boards;
  const filtered = useMemo(() => {
    if (!list) return null;
    if (!q) return list;
    return list.filter((item) =>
      board
        ? `${typeLabel(item.type)} ${nodeSummary(item)}`.toLowerCase().includes(q)
        : (item.name || "").toLowerCase().includes(q),
    );
  }, [list, q, board]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 min-w-0">
        {board && (
          <button
            type="button"
            onClick={() => {
              setBoard(null);
              setQuery("");
              setError("");
            }}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
            aria-label="Back to boards"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        )}
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold truncate">
          {board ? board.name : "Choose a board"}
        </span>
      </div>
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={board ? "Search nodes" : "Search boards"}
          className="w-full h-8 pl-7 pr-2 rounded-md bg-surface-card border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border-strong"
        />
      </div>
      <div className="max-h-64 overflow-y-auto -mx-1 px-1">
        {filtered === null ? (
          <div className="flex justify-center py-6">
            <LogoLoading size={32} />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            {error || (board ? "No nodes on this board" : "No boards found")}
          </p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {filtered.map((item) =>
              board ? (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onPick({ board, node: item })}
                  className="flex flex-col items-start gap-0.5 px-2 py-1.5 rounded-lg text-left hover:bg-surface-hover transition-colors"
                >
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    {typeLabel(item.type)}
                  </span>
                  <span className="text-xs text-foreground line-clamp-2 break-words w-full">
                    {nodeSummary(item) || <span className="text-muted-foreground italic">No text</span>}
                  </span>
                </button>
              ) : (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openBoard(item)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs text-foreground hover:bg-surface-hover transition-colors"
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="flex-1 truncate">{item.name}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                </button>
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Patch a mirror node with a freshly picked source.
export function sourcePatch({ board, node }, projectId) {
  return {
    sourceBoardId: board.id,
    sourceProjectId: projectId || null,
    sourceBoardName: board.name || "Untitled Board",
    sourceNodeId: node.id,
    snapshot: toSnapshot(node),
    fetchedAt: Date.now(),
  };
}

function Checkbox({ checked }) {
  return (
    <span
      className={cn(
        "mt-0.5 w-3.5 h-3.5 shrink-0 rounded-[4px] border flex items-center justify-center",
        checked ? "bg-foreground border-foreground text-background" : "border-border-strong",
      )}
    >
      {checked && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
    </span>
  );
}

function ItemList({ items }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((it, i) => (
        <li key={it.id || i} className="flex items-start gap-2 text-sm">
          {(it.kind === "todo" || "checked" in it) && <Checkbox checked={!!it.checked} />}
          <span className={cn("break-words min-w-0", it.checked && "line-through text-muted-foreground")}>
            {stripTags(it.text) || it.url || <span className="text-muted-foreground italic">Empty</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

// Read-only rendering of a snapshot, faithful enough to recognise the source node.
function MirrorPreview({ snapshot }) {
  const { type, data = {} } = snapshot || {};

  switch (type) {
    case "custom":
      return (
        <p
          className="text-sm whitespace-pre-wrap break-words"
          style={{
            fontWeight: data.bold ? 700 : undefined,
            fontStyle: data.italic ? "italic" : undefined,
            textDecoration: data.underline ? "underline" : undefined,
            textAlign: data.textAlign || undefined,
          }}
        >
          {data.label || <span className="text-muted-foreground italic">Empty note</span>}
        </p>
      );
    case "text":
      return (
        <p className="text-sm whitespace-pre-wrap break-words">
          {stripTags(data.text ?? data.label ?? data.content) || (
            <span className="text-muted-foreground italic">Empty text</span>
          )}
        </p>
      );
    case "todo":
      return <ItemList items={(Array.isArray(data.items) ? data.items : []).map((it) => ({ ...it, checked: !!it.checked }))} />;
    case "table": {
      const columns = Array.isArray(data.columns) ? data.columns : [];
      const rows = Array.isArray(data.rows) ? data.rows.slice(0, 12) : [];
      return (
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-surface-hover">
                {columns.map((c, i) => (
                  <th key={i} className="px-2 py-1 text-left font-semibold border-r border-border last:border-r-0 truncate">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, r) => (
                <tr key={r} className="border-t border-border">
                  {columns.map((_, c) => (
                    <td key={c} className="px-2 py-1 border-r border-border last:border-r-0 truncate">
                      {Array.isArray(row) ? row[c] : ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    case "link":
      return (
        <div className="flex items-start gap-2 min-w-0">
          <Link2 className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{data.title || hostOf(data.url || "")}</p>
            <p className="text-xs text-muted-foreground truncate">{data.url || "No URL"}</p>
          </div>
        </div>
      );
    case "image":
      return (
        <div className="flex flex-col gap-1.5 h-full min-h-0">
          {data.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.src} alt={data.alt || data.caption || ""} className="w-full flex-1 min-h-0 object-contain rounded-md" draggable={false} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <ImageIcon className="w-6 h-6" />
            </div>
          )}
          {data.caption && <p className="text-xs text-muted-foreground truncate">{data.caption}</p>}
        </div>
      );
    case "comment":
      return (
        <div className="flex flex-col gap-1">
          {data.authorName && <span className="text-xs font-semibold">{data.authorName}</span>}
          <p className="text-sm whitespace-pre-wrap break-words">{stripTags(data.label) || "Empty comment"}</p>
        </div>
      );
    case "column":
      return (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold truncate">{data.title || "Column"}</p>
          <ItemList items={Array.isArray(data.items) ? data.items.slice(0, 20) : []} />
        </div>
      );
    case "code": {
      const code = data.code ?? data.text ?? data.value ?? "";
      return (
        <div className="flex flex-col gap-1 min-h-0">
          {data.language && (
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{data.language}</span>
          )}
          <pre className="text-xs font-mono whitespace-pre-wrap break-words rounded-md bg-surface-hover p-2">{code || " "}</pre>
        </div>
      );
    }
    case "board":
    case "document":
    case "sketch":
    case "file": {
      const Icon = type === "board" ? LayoutGrid : type === "sketch" ? PenTool : FileText;
      return (
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="w-5 h-5 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium truncate">
            {data.label || data.caption || data.fileName || typeLabel(type)}
          </span>
        </div>
      );
    }
    default: {
      const summary = nodeSummary({ data });
      return (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">{typeLabel(type)} node</span>
          {summary && <p className="text-sm break-words">{summary}</p>}
        </div>
      );
    }
  }
}

const timeAgo = (ts) => {
  if (!ts) return "";
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
};

function MirrorNode({ id, data, selected, dragging }) {
  const { updateNodeData } = useReactFlow();
  const projectId = useMirrorProjectId();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | loading | missing | error
  const [checkedAt, setCheckedAt] = useState(null);

  const { sourceBoardId, sourceNodeId, sourceBoardName, snapshot } = data;
  const sourceProjectId = data.sourceProjectId ?? projectId;
  const snapshotRef = useRef(snapshot);
  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  const refresh = useCallback(async () => {
    if (!sourceBoardId || !sourceNodeId) return;
    setStatus("loading");
    try {
      const nodes = await fetchBoardNodes(sourceBoardId, sourceProjectId);
      const source = nodes.find((n) => n?.id === sourceNodeId);
      if (!source) {
        setStatus("missing");
        return;
      }
      const next = toSnapshot(source);
      // Only write when the source changed, so polling doesn't churn autosave.
      if (JSON.stringify(next) !== JSON.stringify(snapshotRef.current)) {
        updateNodeData(id, { snapshot: next, fetchedAt: Date.now() });
      }
      setStatus("idle");
      setCheckedAt(Date.now());
    } catch {
      setStatus("error");
    }
  }, [id, sourceBoardId, sourceNodeId, sourceProjectId, updateNodeData]);

  useEffect(() => {
    if (!sourceBoardId || !sourceNodeId) return undefined;
    const kick = setTimeout(refresh, 0);
    const timer = setInterval(refresh, REFRESH_MS);
    window.addEventListener("focus", refresh);
    return () => {
      clearTimeout(kick);
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [refresh, sourceBoardId, sourceNodeId]);

  const pick = (choice) => {
    updateNodeData(id, sourcePatch(choice, projectId));
    setPickerOpen(false);
    setStatus("idle");
    setCheckedAt(Date.now());
  };

  const picker = (trigger) => (
    <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        sideOffset={8}
        className="w-72 bg-surface-dialog border-border p-3 shadow-xl rounded-xl"
      >
        {pickerOpen && <MirrorSourcePicker projectId={projectId} excludeNodeId={id} onPick={pick} />}
      </PopoverContent>
    </Popover>
  );

  const hasSource = Boolean(sourceBoardId && sourceNodeId);

  return (
    <NodeShell id={id} data={data} selected={selected} dragging={dragging} minWidth={240} minHeight={140}>
      <div className="flex flex-col w-full h-full min-h-0 text-foreground">
        <div className="flex items-center gap-1.5 px-3 h-9 border-b border-border/60 shrink-0">
          <ScanEye className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="flex-1 min-w-0 truncate text-xs font-medium text-muted-foreground" title={sourceBoardName}>
            {hasSource ? sourceBoardName || "Untitled Board" : "Mirror"}
          </span>
          {hasSource && (
            <>
              <button
                type="button"
                onClick={refresh}
                className="nodrag p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
                title="Refresh"
                aria-label="Refresh mirror"
              >
                <RotateCw className={cn("w-3.5 h-3.5", status === "loading" && "animate-spin")} />
              </button>
              <button
                type="button"
                onClick={() => openSourceBoard(sourceBoardId, sourceBoardName)}
                className="nodrag flex items-center gap-1 px-1.5 py-1 rounded-md text-[11px] text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
                title="Go to board"
              >
                Go to board
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </>
          )}
        </div>

        {hasSource ? (
          <>
            <div className="nowheel flex-1 min-h-0 overflow-auto px-3 py-2.5 cursor-default">
              {snapshot ? (
                <MirrorPreview snapshot={snapshot} />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <LogoLoading size={32} />
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 px-3 h-7 border-t border-border/60 shrink-0 text-[10px] text-muted-foreground">
              <span className="uppercase tracking-wider font-semibold">{typeLabel(snapshot?.type)}</span>
              <span>·</span>
              <span className="truncate">
                {status === "missing"
                  ? "Source node was removed"
                  : status === "error"
                    ? "Couldn't reach source"
                    : `Synced ${timeAgo(checkedAt || data.fetchedAt)}`}
              </span>
              {selected &&
                picker(
                  <button type="button" className="nodrag ml-auto hover:text-foreground transition-colors shrink-0">
                    Change
                  </button>,
                )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 px-4 text-center">
            <p className="text-xs text-muted-foreground">Show a live copy of a node from another board.</p>
            {picker(
              <button
                type="button"
                className="nodrag inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/85 transition-colors"
              >
                <ScanEye className="w-3.5 h-3.5" />
                Choose source
              </button>,
            )}
          </div>
        )}
      </div>
    </NodeShell>
  );
}

export const nodeMeta = {
  type: "mirror",
  label: "Mirror",
  icon: ScanEye,
  cardColor: true,
  create: () => ({
    data: {
      sourceBoardId: null,
      sourceProjectId: null,
      sourceBoardName: "",
      sourceNodeId: null,
      snapshot: null,
      fetchedAt: null,
    },
    style: { width: 300, height: 220 },
  }),
};

export default memo(MirrorNode);
