"use client";

import React, { memo } from "react";
import {
  Handle,
  Position,
  NodeResizeControl,
  useReactFlow,
  useConnection,
} from "@xyflow/react";
import { ArrowRight } from "lucide-react";
import Reactions from "../ui/Reactions";
import { ResizeHandle } from "@geiger/ui";
import { SketchPreviewSurface, useSketchPreview } from "../sketch/preview-context";

const SketchNode = ({ id, data, selected, dragging }) => {
  const { setNodes } = useReactFlow();
  const connection = useConnection();
  const { onOpenSketch } = useSketchPreview(data.sketchId);
  const isConnecting = connection.inProgress;

  const outline = data.outline || { enabled: false };
  const sketchId = data.sketchId;

  const handleDoubleClick = React.useCallback(
    (e) => {
      e.stopPropagation();
      if (!sketchId) return;
      if (typeof onOpenSketch === "function") onOpenSketch(sketchId);
    },
    [sketchId, onOpenSketch]
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
      })
    );
  };

  return (
    <div
      onDoubleClick={handleDoubleClick}
      className={`
          node-chrome relative flex flex-col w-full h-full min-h-[240px] min-w-[320px] group
          transition-all duration-300 ease-out
          bg-surface-dialog shadow-lg
          ${selected ? "border-2 border-foreground" : "border-2 border-transparent hover:border-border"}
          ${dragging ? "shadow-2xl shadow-black/50 z-50" : ""}
      `}
      style={{
        ...(outline.enabled
          ? {
              borderColor: outline.color,
            }
          : {}),
      }}
    >
      <NodeResizeControl
        minWidth={320}
        minHeight={240}
        className="!bg-transparent !border-none"
        position="bottom-right"
        style={{ opacity: 1, pointerEvents: "all" }}
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

      <div className="flex-1 w-full min-h-0 cursor-pointer bg-white">
        <SketchPreviewSurface sketchId={sketchId} />
      </div>

      <div className="flex w-full flex-col px-4 py-2 border-t border-border/50">
        <span className="text-sm font-medium text-foreground truncate font-sans">
          {data.label || "Untitled Sketch"}
        </span>
        {data.caption ? (
          <span className="text-xs text-muted-foreground truncate">
            {data.caption}
          </span>
        ) : null}
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
          z-50
        `}
      >
        <ArrowRight className="w-[10px] h-[10px] opacity-0 group-hover/handle:opacity-100 transition-opacity duration-200 text-background -rotate-45" />
      </Handle>
    </div>
  );
};

export default memo(SketchNode);
