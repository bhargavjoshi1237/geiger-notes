import React, { memo } from "react";
import {
  Handle,
  Position,
  NodeResizeControl,
  useReactFlow,
  useConnection,
} from "@xyflow/react";
import { ArrowRight, Check, Plus, X } from "lucide-react";
import Reactions from "../ui/Reactions";
import ResizeHandle from "@/components/ui/ResizeHandle";
import TextEditingTrait from "./traits/TextEditingTrait";

let itemCounter = 0;
const makeItemId = () => `todo-${Date.now()}-${itemCounter++}`;

const CheckboxNode = ({ id, data, selected, dragging }) => {
  const { setNodes } = useReactFlow();
  const connection = useConnection();
  const [isVisible, setIsVisible] = React.useState(false);
  const isConnecting = connection.inProgress;

  React.useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  const title = data?.title ?? "To-do";
  const items =
    Array.isArray(data?.items) && data.items.length > 0
      ? data.items
      : [{ id: "todo-default", text: "New task", checked: false }];

  const updateData = (updater) => {
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...updater(n.data) } } : n,
      ),
    );
  };

  const handleTitleChange = (e) => {
    const value = e.target.value;
    updateData(() => ({ title: value }));
  };

  const handleToggle = (itemId) => {
    updateData((d) => ({
      items: (d.items || items).map((it) =>
        it.id === itemId ? { ...it, checked: !it.checked } : it,
      ),
    }));
  };

  const handleTextChange = (itemId, value) => {
    updateData((d) => ({
      items: (d.items || items).map((it) =>
        it.id === itemId ? { ...it, text: value } : it,
      ),
    }));
  };

  const handleAddItem = () => {
    updateData((d) => ({
      items: [
        ...(d.items || items),
        { id: makeItemId(), text: "", checked: false },
      ],
    }));
  };

  const handleRemoveItem = (itemId) => {
    updateData((d) => {
      const next = (d.items || items).filter((it) => it.id !== itemId);
      return { items: next };
    });
  };

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

  const completed = items.filter((it) => it.checked).length;

  return (
    <>
      <div
        className={`
            relative flex flex-col w-full h-full min-h-[68px] min-w-[338px] group
            transition-all duration-300 ease-out
            ${selected ? "border-2 border-foreground" : "border-2 border-transparent hover:border-border"}
            ${dragging ? "shadow-2xl shadow-black/50 z-50" : ""}
            ${isVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-2 scale-95"}
        `}
        style={{
          backgroundColor: data.backgroundColor || "var(--node-default)",
        }}
      >
        <NodeResizeControl
          minWidth={338}
          minHeight={68}
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

        <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-2 border-b border-border/50">
          <TextEditingTrait className="flex-1">
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              placeholder="Untitled list"
              className="w-full bg-transparent text-foreground text-sm font-semibold focus:outline-none placeholder:text-muted-foreground"
            />
          </TextEditingTrait>
          <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
            {completed}/{items.length}
          </span>
        </div>

        <div className="flex-1 flex flex-col py-1 overflow-y-auto">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2.5 px-4 py-1.5 group/item"
            >
              <button
                type="button"
                onClick={() => handleToggle(item.id)}
                className={`
                  nodrag shrink-0 w-[18px] h-[18px] rounded-[5px] border flex items-center justify-center transition-colors
                  ${
                    item.checked
                      ? "bg-emerald-500 border-emerald-500 text-black"
                      : "border-muted-foreground/40 text-transparent hover:border-muted-foreground"
                  }
                `}
              >
                <Check className="w-3 h-3" strokeWidth={3} />
              </button>

              <TextEditingTrait className="flex-1">
                <input
                  type="text"
                  value={item.text}
                  onChange={(e) => handleTextChange(item.id, e.target.value)}
                  placeholder="Add a task..."
                  className={`
                    w-full bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground
                    ${item.checked ? "text-muted-foreground line-through" : "text-foreground"}
                  `}
                />
              </TextEditingTrait>

              <button
                type="button"
                onClick={() => handleRemoveItem(item.id)}
                className="nodrag shrink-0 text-muted-foreground hover:text-red-400 opacity-0 group-hover/item:opacity-100 transition-opacity"
                title="Remove"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={handleAddItem}
          className="nodrag flex items-center gap-1.5 px-4 py-2 text-xs text-muted-foreground hover:text-foreground border-t border-border/50 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add item
        </button>

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

export default memo(CheckboxNode);
