import React, { memo } from "react";
import {
  Handle,
  Position,
  NodeResizeControl,
  useReactFlow,
  useConnection,
} from "@xyflow/react";
import { ArrowRight, Check, ExternalLink, Plus, X } from "lucide-react";
import Reactions from "../ui/Reactions";
import CommentComposer, { useCommentAuthor } from "../ui/CommentComposer";
import { ResizeHandle } from "@geiger/ui";
import TextEditingTrait from "./traits/TextEditingTrait";

// Sidebar drag types the column accepts, plus the item kind each one creates.
export const COLUMN_CHILD_TYPES = ["custom", "link", "todo", "comment"];

// A card must render at the canvas default width of a custom node, so the
// column is that width plus its body padding (p-4) and its own border (2px).
const CARD_WIDTH = 338;
const CARD_MIN_HEIGHT = 68;
const COLUMN_CHROME = 16 * 2 + 2 * 2;
export const COLUMN_DEFAULT_WIDTH = CARD_WIDTH + COLUMN_CHROME;
// Width only — height is left to React Flow so a column hugs its cards.
export const COLUMN_DEFAULT_SIZE = { width: COLUMN_DEFAULT_WIDTH };
export const COLUMN_MAX_ITEMS = 100;

const KIND_FOR_DRAG_TYPE = {
  custom: "text",
  link: "link",
  todo: "todo",
  comment: "comment",
};

// Approximate canvas footprint per node type, used for drop hit-testing when
// React Flow has not measured the node yet.
const FALLBACK_SIZE = {
  column: { w: COLUMN_DEFAULT_WIDTH, h: 170 },
  custom: { w: CARD_WIDTH, h: CARD_MIN_HEIGHT },
  link: { w: CARD_WIDTH, h: CARD_MIN_HEIGHT },
  todo: { w: CARD_WIDTH, h: 120 },
  comment: { w: 300, h: CARD_MIN_HEIGHT },
  table: { w: CARD_WIDTH, h: 180 },
  board: { w: 240, h: CARD_MIN_HEIGHT },
  document: { w: 240, h: CARD_MIN_HEIGHT },
  image: { w: 200, h: 250 },
  file: { w: 200, h: 80 },
  clock: { w: 156, h: 156 },
  calendar: { w: 200, h: 200 },
};

const KIND_PLACEHOLDER = {
  text: "Start typing...",
  link: "Paste a link...",
  todo: "Add a task...",
};

let itemCounter = 0;
export const makeColumnItemId = () => `colitem-${Date.now()}-${itemCounter++}`;

export const makeColumnItem = (kind = "text", seed = {}) => {
  const base = {
    id: seed.id || makeColumnItemId(),
    kind,
    backgroundColor: seed.backgroundColor ?? null,
  };
  if (kind === "link")
    return { ...base, text: seed.text ?? "", url: seed.url ?? "" };
  if (kind === "todo")
    return { ...base, text: seed.text ?? "", checked: !!seed.checked };
  if (kind === "comment")
    return {
      ...base,
      text: seed.text ?? "",
      avatarUserId: seed.avatarUserId ?? null,
      authorName: seed.authorName ?? null,
    };
  return { ...base, text: seed.text ?? "" };
};

export const columnNodeDefaults = () => ({ title: "New Column", items: [] });

// Expand a standalone canvas node into column items; a to-do unfolds per entry.
// Each item keeps its source node's background so it matches the canvas look.
export const itemsFromNode = (node) => {
  const nodeData = node?.data ?? {};
  const backgroundColor = nodeData.backgroundColor ?? null;
  if (node?.type === "link") {
    return [makeColumnItem("link", { url: nodeData.url ?? "", backgroundColor })];
  }
  if (node?.type === "comment") {
    return [
      makeColumnItem("comment", {
        text: nodeData.label ?? "",
        avatarUserId: nodeData.avatarUserId ?? null,
        authorName: nodeData.authorName ?? null,
        backgroundColor,
      }),
    ];
  }
  if (node?.type === "todo") {
    const entries = Array.isArray(nodeData.items) ? nodeData.items : [];
    if (entries.length === 0) return [makeColumnItem("todo", { backgroundColor })];
    return entries
      .slice(0, COLUMN_MAX_ITEMS)
      .map((it) =>
        makeColumnItem("todo", {
          text: it.text ?? "",
          checked: it.checked,
          backgroundColor,
        }),
      );
  }
  return [makeColumnItem("text", { text: nodeData.label ?? "", backgroundColor })];
};

const num = (value, fallback) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

export const nodeSize = (node) => {
  const fallback = FALLBACK_SIZE[node?.type] ?? {
    w: CARD_WIDTH,
    h: CARD_MIN_HEIGHT,
  };
  return {
    w: num(node?.measured?.width, num(node?.width, num(node?.style?.width, fallback.w))),
    h: num(node?.measured?.height, num(node?.height, num(node?.style?.height, fallback.h))),
  };
};

export const findColumnAtPoint = (allNodes, point, excludeId) =>
  (allNodes ?? []).find((n) => {
    if (n.type !== "column" || n.id === excludeId) return false;
    const size = nodeSize(n);
    return (
      point.x >= n.position.x &&
      point.x <= n.position.x + size.w &&
      point.y >= n.position.y &&
      point.y <= n.position.y + size.h
    );
  }) ?? null;

// Returns the updated node list, or the same reference when nothing changed.
export const insertItemsIntoColumn = (allNodes, columnId, items) => {
  const incoming = (items ?? []).slice(0, COLUMN_MAX_ITEMS);
  if (incoming.length === 0) return allNodes;
  let changed = false;
  const next = allNodes.map((n) => {
    if (n.id !== columnId || n.type !== "column") return n;
    const current = Array.isArray(n.data?.items) ? n.data.items : [];
    if (current.length >= COLUMN_MAX_ITEMS) return n;
    changed = true;
    return {
      ...n,
      data: {
        ...n.data,
        items: [...current, ...incoming].slice(0, COLUMN_MAX_ITEMS),
      },
    };
  });
  return changed ? next : allNodes;
};

// Sidebar drop routing: drop point + drag type -> updated nodes or null.
export const dropIntoColumnAtPoint = (allNodes, point, dragType) => {
  const kind = KIND_FOR_DRAG_TYPE[dragType];
  if (!kind) return null;
  const column = findColumnAtPoint(allNodes, point);
  if (!column) return null;
  const next = insertItemsIntoColumn(allNodes, column.id, [makeColumnItem(kind)]);
  return next === allNodes ? null : next;
};

// Existing-node drag routing: dragged snapshot -> updated nodes or null.
export const absorbDraggedNode = (allNodes, dragged) => {
  if (!dragged || !COLUMN_CHILD_TYPES.includes(dragged.type)) return null;
  const size = nodeSize(dragged);
  const center = {
    x: dragged.position.x + size.w / 2,
    y: dragged.position.y + size.h / 2,
  };
  const column = findColumnAtPoint(allNodes, center, dragged.id);
  if (!column) return null;
  const next = insertItemsIntoColumn(
    allNodes.filter((n) => n.id !== dragged.id),
    column.id,
    itemsFromNode(dragged),
  );
  return next === allNodes ? null : next;
};

const toHref = (url) => {
  const trimmed = (url || "").trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

// Split out so the author lookup only runs for cards that actually need it.
const CommentCardBody = ({ item, onChange }) => {
  const author = useCommentAuthor(item);
  return (
    <CommentComposer
      author={author}
      value={item.text ?? ""}
      onChange={(value) => onChange(item.id, { text: value })}
      onSend={() =>
        onChange(item.id, {
          avatarUserId: author.userId ?? item.avatarUserId ?? null,
          authorName: author.userName ?? item.authorName ?? null,
        })
      }
    />
  );
};

// One card. It wears the same chrome a canvas node does — the node-default
// fill, the transparent-until-hover border and the 68px floor — so a node
// dropped into a column reads identically to the same node on the canvas.
const ColumnCard = ({ item, onChange, onToggle, onRemove }) => {
  const href = item.kind === "link" ? toHref(item.url) : null;
  const isComment = item.kind === "comment";

  return (
    <div
      className="group/card relative flex w-full border-2 border-transparent transition-colors hover:border-border"
      style={{
        minHeight: CARD_MIN_HEIGHT,
        backgroundColor:
          item.backgroundColor ||
          (isComment ? "var(--comment-bg)" : "var(--node-default)"),
      }}
    >
      {isComment ? (
        <CommentCardBody item={item} onChange={onChange} />
      ) : (
        <div
          className={`flex w-full items-center gap-2.5 ${
            item.kind === "todo" ? "p-6" : "p-4"
          }`}
        >
          {item.kind === "todo" && (
            <button
              type="button"
              onClick={() => onToggle(item.id)}
              title={item.checked ? "Mark as not done" : "Mark as done"}
              className={`
                nodrag flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-sm border-2 transition-colors
                ${
                  item.checked
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-foreground/70 text-transparent hover:border-foreground"
                }
              `}
            >
              <Check className="h-3 w-3" strokeWidth={3} />
            </button>
          )}

          <TextEditingTrait className="min-w-0 flex-1">
            {item.kind === "link" ? (
              <input
                type="text"
                value={item.url ?? ""}
                onChange={(e) => onChange(item.id, { url: e.target.value })}
                placeholder={KIND_PLACEHOLDER.link}
                className="w-full bg-transparent font-sans text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            ) : (
              <textarea
                rows={1}
                value={item.text ?? ""}
                onChange={(e) => onChange(item.id, { text: e.target.value })}
                placeholder={KIND_PLACEHOLDER[item.kind] ?? KIND_PLACEHOLDER.text}
                className={`
                  block w-full resize-none whitespace-pre-wrap bg-transparent font-sans outline-none placeholder:text-muted-foreground
                  ${item.kind === "todo" ? "text-sm" : ""}
                  ${item.checked ? "text-muted-foreground line-through" : "text-foreground"}
                `}
                data-gramm="false"
                data-gramm_editor="false"
                data-enable-grammarly="false"
              />
            )}
          </TextEditingTrait>

          {href && (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="nodrag shrink-0 text-muted-foreground transition-colors hover:text-foreground"
              title="Open link"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => onRemove(item.id)}
        title="Remove card"
        className="nodrag absolute right-1.5 top-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-red-400 group-hover/card:opacity-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

const ColumnNode = ({ id, data, selected, dragging }) => {
  const { setNodes } = useReactFlow();
  const connection = useConnection();
  const [isVisible, setIsVisible] = React.useState(false);
  const isConnecting = connection.inProgress;

  const outline = data.outline || { enabled: false };

  React.useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  const title = data?.title ?? "New Column";
  const items = Array.isArray(data?.items) ? data.items : [];

  const updateData = (updater) => {
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...updater(n.data) } } : n,
      ),
    );
  };

  const updateItems = (mapper) =>
    updateData((d) => ({ items: mapper(d.items || items) }));

  const handleTitleChange = (e) => {
    const value = e.target.value;
    updateData(() => ({ title: value }));
  };

  const handleAddItem = () =>
    updateItems((list) => [...list, makeColumnItem("text")]);

  const handleRemoveItem = (itemId) =>
    updateItems((list) => list.filter((it) => it.id !== itemId));

  const handleItemChange = (itemId, patch) =>
    updateItems((list) =>
      list.map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
    );

  const handleToggle = (itemId) =>
    updateItems((list) =>
      list.map((it) => (it.id === itemId ? { ...it, checked: !it.checked } : it)),
    );

  const handleReactionClick = (emoji) => {
    setNodes((nodes) =>
      nodes.map((n) => {
        if (n.id === id) {
          const currentReactions = n.data.reactions || {};
          const newCount = (currentReactions[emoji] || 0) + 1;
          return {
            ...n,
            data: {
              ...n.data,
              reactions: {
                ...currentReactions,
                [emoji]: newCount,
              },
            },
          };
        }
        return n;
      }),
    );
  };

  return (
    <>
      <div
        className={`
            relative flex flex-col w-full h-full group
            transition-all duration-300 ease-out
            ${selected ? "border-2 border-foreground" : "border-2 border-transparent hover:border-border"}
            ${dragging ? "shadow-2xl shadow-black/50 z-50" : ""}
            ${isVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-2 scale-95"}
        `}
        style={{
          minWidth: COLUMN_DEFAULT_WIDTH,
          backgroundColor: data.backgroundColor || "var(--surface-dialog)",
          ...(outline.enabled
            ? {
                borderColor: outline.color,
              }
            : {}),
        }}
      >
        <NodeResizeControl
          minWidth={COLUMN_DEFAULT_WIDTH}
          minHeight={CARD_MIN_HEIGHT}
          className="!bg-transparent !border-none"
          position="bottom-right"
          style={{
            opacity: 1,
            pointerEvents: "all",
          }}
          onResizeEnd={(_, params) => {
            setNodes((nodes) =>
              nodes.map((n) => {
                if (n.id === id) {
                  return {
                    ...n,
                    width: Math.round(params.width / 15) * 15,
                    height: Math.round(params.height / 15) * 15,
                    position: {
                      x: Math.round(params.x / 15) * 15,
                      y: Math.round(params.y / 15) * 15,
                    },
                  };
                }
                return n;
              }),
            );
          }}
        >
          <div
            className={`transition-opacity duration-200 ${selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
          >
            <ResizeHandle />
          </div>
        </NodeResizeControl>

        {outline.enabled && (
          <div
            className="flex items-center gap-2 h-5 absolute left-4 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-background shadow-sm transform -translate-y-1/2 transition-all duration-300"
            style={{ backgroundColor: outline.color }}
          >
            {outline.name}
          </div>
        )}

        <div className="px-4 pt-5 pb-3 text-center">
          <TextEditingTrait>
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              placeholder="New Column"
              className="w-full bg-transparent text-center font-serif text-lg font-bold text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </TextEditingTrait>
          <p className="mt-1 text-xs text-muted-foreground">
            {items.length} {items.length === 1 ? "card" : "cards"}
          </p>
        </div>

        {/* Cards claim only the height they need; an empty column shows a single
            card-sized slot so it never towers over the rest of the canvas. */}
        <div className="nopan nowheel scrollbar-subtle flex min-h-0 shrink grow basis-auto flex-col gap-3 overflow-y-auto px-4 pb-4">
          {items.length === 0 ? (
            <div
              className="w-full border-2 border-transparent"
              style={{
                minHeight: CARD_MIN_HEIGHT,
                backgroundColor: "var(--node-default)",
              }}
            />
          ) : (
            items.map((item) => (
              <ColumnCard
                key={item.id}
                item={item}
                onChange={handleItemChange}
                onToggle={handleToggle}
                onRemove={handleRemoveItem}
              />
            ))
          )}

          {selected && (
            <button
              type="button"
              onClick={handleAddItem}
              className="nodrag flex items-center justify-center gap-1 border border-dashed border-border py-2 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            >
              <Plus className="h-3 w-3" />
              Add card
            </button>
          )}
        </div>

        <Reactions
          reactions={data.reactions}
          onReactionClick={handleReactionClick}
        />

        <Handle
          type="target"
          position={Position.Center}
          className={`
            !w-full !h-full !border-0 !rounded-none !bg-transparent absolute !inset-0 !transform-none
            ${isConnecting ? "pointer-events-auto z-50" : "pointer-events-none -z-10"}
          `}
          style={{
            top: 0,
            left: 0,
            opacity: 0,
          }}
        />
        <Handle
          type="source"
          position={Position.Right}
          className={`
    !w-2 !h-2 !bg-foreground !border-0
    absolute !top-0 !-right-[1px]
    flex items-center justify-center

    origin-top-right
    transition-transform duration-200 hover:scale-[2.5]

    !translate-x-0 !translate-y-0
    group/handle
    ${selected ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
  `}
        >
          <ArrowRight className="w-[10px] h-[10px] opacity-0 group-hover/handle:opacity-100 transition-opacity duration-200 text-background -rotate-45" />
        </Handle>
      </div>
    </>
  );
};

export default memo(ColumnNode);
