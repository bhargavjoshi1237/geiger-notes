"use client";

import React, { memo, useState, useCallback } from "react";
import {
  Handle,
  Position,
  NodeResizeControl,
  useReactFlow,
  useConnection,
} from "@xyflow/react";
import { FileText, ArrowRight } from "lucide-react";
import DocumentDialog from "@/components/internal/dialogs/DocumentDialog";
import Reactions from "../ui/Reactions";

const ResizeHandle = () => {
  return (
    <div className="absolute bottom-1 right-1 p-1">
      <svg width="10" height="10" viewBox="0 0 10 10" className="opacity-50">
        <path
          d="M 6 10 L 10 6 L 10 10 Z"
          fill="currentColor"
          className="text-zinc-400"
        />
        <path
          d="M 2 10 L 10 2 L 10 4 L 4 10 Z"
          fill="currentColor"
          className="text-zinc-400"
        />
      </svg>
    </div>
  );
};

const DocumentNode = ({ id, data, selected, dragging }) => {
  const { setNodes } = useReactFlow();
  const connection = useConnection();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const isConnecting = connection.inProgress;

  const outline = data.outline || { enabled: false };
  const documentId = data.documentId;

  const handleDoubleClick = useCallback((e) => {
    e.stopPropagation(); // Prevent ReactFlow pane double click
    setIsDialogOpen(true);
  }, []);

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
        onDoubleClick={handleDoubleClick}
        className={`
            relative flex flex-col w-full h-full min-h-[68px] min-w-[200px] group
            transition-all duration-300 ease-out
            bg-[#1e1e1e] shadow-lg
            ${selected ? "border-2 border-white" : "border-2 border-transparent hover:border-zinc-500"}
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
          minWidth={200}
          minHeight={68}
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
            className="flex items-center gap-2 h-5 absolute left-4 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-black shadow-sm transform -translate-y-1/2 transition-all duration-300"
            style={{ backgroundColor: outline.color }}
          >
            {outline.name}
          </div>
        )}

        <div className="flex-1 w-full h-full flex items-center justify-between px-4 py-2 gap-3 cursor-pointer">
          <div className="flex items-center gap-3 w-full overflow-hidden">
            <div className="p-2 bg-zinc-800 rounded-md shrink-0">
              <FileText className="w-5 h-5 text-zinc-300" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium text-zinc-200 truncate font-sans">
                {data.label || "Untitled Document"}
              </span>
              <span className="text-xs text-zinc-500 truncate font-sans">
                Double-click to edit
              </span>
            </div>
          </div>
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
          position={Position.Left}
          className={`
            !w-2 !h-2 !bg-zinc-400 !border-0 
            absolute !top-[52%] !-translate-y-[50%] !-left-[1px]
            transition-opacity duration-200
            ${selected ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
          `}
        />
      </div>

      <DocumentDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        documentId={documentId}
      />
    </>
  );
};

export default memo(DocumentNode);
