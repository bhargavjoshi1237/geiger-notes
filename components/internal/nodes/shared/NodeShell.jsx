"use client";

import React from "react";
import {
  Handle,
  Position,
  NodeResizeControl,
  useReactFlow,
  useConnection,
} from "@xyflow/react";
import { ArrowRight } from "lucide-react";
import { ResizeHandle } from "@geiger/ui";
import Reactions from "../../ui/Reactions";

// Shared chrome for canvas nodes: selection border, fade-in, snapping resize, full-node target + corner source handle, remote outline, reactions.
export default function NodeShell({
  id,
  data = {},
  selected,
  dragging,
  minWidth = 120,
  minHeight = 40,
  snap = 15,
  keepAspectRatio = false,
  resizable = true,
  chrome = true,
  background,
  reactions = true,
  className = "",
  style,
  children,
}) {
  const { setNodes } = useReactFlow();
  const connection = useConnection();
  const [isVisible, setIsVisible] = React.useState(false);
  const isConnecting = connection.inProgress;
  const outline = data.outline || { enabled: false };

  React.useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  const round = (v) => (snap ? Math.round(v / snap) * snap : v);

  const handleReactionClick = (emoji) => {
    setNodes((nodes) =>
      nodes.map((n) => {
        if (n.id !== id) return n;
        const current = n.data.reactions || {};
        return { ...n, data: { ...n.data, reactions: { ...current, [emoji]: (current[emoji] || 0) + 1 } } };
      }),
    );
  };

  const borderClass = selected
    ? "border-2 border-foreground"
    : "border-2 border-transparent hover:border-border";

  return (
    <div
      className={`
        ${chrome ? "node-chrome" : "node-bare"} relative flex flex-col w-full h-full group
        transition-[opacity,transform,box-shadow,border-color] duration-300 ease-out
        ${borderClass}
        ${dragging ? "shadow-2xl shadow-black/50 z-50" : ""}
        ${isVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-2 scale-95"}
        ${className}
      `}
      style={{
        minWidth,
        minHeight,
        ...(chrome ? { backgroundColor: background ?? (data.backgroundColor || "var(--node-default)") } : {}),
        ...(outline.enabled ? { borderColor: outline.color } : {}),
        ...style,
      }}
    >
      {resizable && (
        <NodeResizeControl
          minWidth={minWidth}
          minHeight={minHeight}
          keepAspectRatio={keepAspectRatio}
          className="!bg-transparent !border-none"
          position="bottom-right"
          style={{ opacity: 1, pointerEvents: "all", zIndex: 30 }}
          onResizeEnd={(_, params) => {
            setNodes((nodes) =>
              nodes.map((n) =>
                n.id === id
                  ? {
                      ...n,
                      width: Math.max(minWidth, round(params.width)),
                      height: Math.max(minHeight, round(params.height)),
                      position: { x: round(params.x), y: round(params.y) },
                    }
                  : n,
              ),
            );
          }}
        >
          <div className={`transition-opacity duration-200 ${selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
            <ResizeHandle />
          </div>
        </NodeResizeControl>
      )}

      {outline.enabled && (
        <div
          className="flex items-center gap-2 h-5 absolute left-4 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-background shadow-sm -translate-y-1/2 z-20"
          style={{ backgroundColor: outline.color }}
        >
          {outline.name}
        </div>
      )}

      {children}

      {reactions && <Reactions reactions={data.reactions} onReactionClick={handleReactionClick} />}

      <Handle
        type="target"
        position={Position.Center}
        className={`!w-full !h-full !border-0 !rounded-none !bg-transparent absolute !inset-0 !transform-none ${
          isConnecting ? "pointer-events-auto z-50" : "pointer-events-none -z-10"
        }`}
        style={{ top: 0, left: 0, opacity: 0 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className={`!w-2 !h-2 !bg-foreground !border-0 absolute !top-0 !-right-[1px] flex items-center justify-center origin-top-right transition-transform duration-200 hover:scale-[2.5] !translate-x-0 !translate-y-0 group/handle ${
          selected ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <ArrowRight className="w-[10px] h-[10px] opacity-0 group-hover/handle:opacity-100 transition-opacity duration-200 text-background -rotate-45" />
      </Handle>
    </div>
  );
}

// Patch a node's data by id; the returned function is stable per node id.
export function useNodeDataUpdater(id) {
  const { updateNodeData } = useReactFlow();
  return React.useCallback((patch) => updateNodeData(id, patch), [id, updateNodeData]);
}
