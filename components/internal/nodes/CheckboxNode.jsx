import React, { memo } from "react";
import {
  Handle,
  Position,
  NodeResizeControl,
  useReactFlow,
  useConnection,
} from "@xyflow/react";
import { ArrowRight, Check, X } from "lucide-react";
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

  const outline = data.outline || { enabled: false };

  React.useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  const items =
    Array.isArray(data?.items) && data.items.length > 0
      ? data.items
      : [{ id: "todo-default", text: "", checked: false }];

  const updateData = (updater) => {
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...updater(n.data) } } : n,
      ),
    );
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
      // Keep one empty row so the list never renders without an editing target.
      if (next.length === 0) return { items: [{ id: makeItemId(), text: "", checked: false }] };
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
          ...(outline.enabled
            ? {
                borderColor: outline.color,
              }
            : {}),
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

        {outline.enabled && (
          <div
            className="flex items-center gap-2 h-5 absolute left-4 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-background shadow-sm transform -translate-y-1/2 transition-all duration-300"
            style={{ backgroundColor: outline.color }}
          >
            {outline.name}
          </div>
        )}

        <div className="flex flex-col gap-3 p-6">
          {items.map((item) => (
            <div
              key={item.id}
              className="group/item flex items-center gap-2.5"
            >
              <button
                type="button"
                onClick={() => handleToggle(item.id)}
                title={item.checked ? "Mark as not done" : "Mark as done"}
                className={`
                  nodrag flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-sm border-2 transition-colors
                  ${
                    item.checked
                      ? "border-emerald-500 bg-emerald-500 text-black"
                      : "border-foreground/70 text-transparent hover:border-foreground"
                  }
                `}
              >
                <Check className="h-3 w-3" strokeWidth={3} />
              </button>

              <TextEditingTrait
                className="min-w-0 flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddItem();
                }}
              >
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
                className="nodrag shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-red-400 group-hover/item:opacity-100"
                title="Remove"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
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

export default memo(CheckboxNode);
