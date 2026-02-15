"use client";

import React, { memo } from "react";
import {
  Handle,
  Position,
  NodeResizeControl,
  useConnection,
} from "@xyflow/react";
import { FileText, Download, File as FileIcon, ArrowRight } from "lucide-react";

const formatBytes = (bytes, decimals = 2) => {
  if (!bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

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

const FileNode = ({ id, data, selected, dragging }) => {
  const connection = useConnection();
  const isConnecting = connection.inProgress;

  const fileName = data.fileName || "No file selected";
  const fileSize = data.fileSize ? formatBytes(data.fileSize) : "";
  const fileUrl = data.src || null;
  const caption = data.caption || "";
  const color = data.color || "#1e1e1e";

  const handleDownload = (e) => {
    e.stopPropagation();
    if (fileUrl) {
      window.open(fileUrl, "_blank");
    }
  };

  return (
    <>
      <div
        className={`
          relative flex flex-col w-full h-full min-h-[68px] min-w-[338px] group
          transition-all duration-300 ease-out
          ${selected ? "border-2 border-white" : "border-2 border-transparent hover:border-zinc-600"}
          ${dragging ? "shadow-2xl shadow-black/50 z-50" : ""}
        `}
        style={{ backgroundColor: color }}
      >
        <NodeResizeControl
          minWidth={338}
          minHeight={68}
          className="!bg-transparent !border-none"
          position="bottom-right"
          style={{ opacity: 1, pointerEvents: "all", zIndex: 20 }}
        >
          <div
            className={`transition-opacity duration-200 ${selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
          >
            <ResizeHandle />
          </div>
        </NodeResizeControl>

        <div className="flex flex-col h-full w-full">
          <div className="flex items-center p-4 gap-3">
            <div className="w-10 h-10 rounded-none bg-zinc-800/50 flex items-center justify-center shrink-0">
              <FileIcon className="text-zinc-300" size={20} />
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <div
                className="text-sm font-medium text-zinc-200 truncate"
                title={fileName}
              >
                {fileName}
              </div>
              {fileSize && (
                <div className="text-xs text-zinc-400 truncate">{fileSize}</div>
              )}
            </div>
            {fileUrl && (
              <button
                onClick={handleDownload}
                className="p-2 hover:bg-zinc-800/50 rounded-none transition-colors text-zinc-400 hover:text-white z-10"
                title="Download"
              >
                <Download size={16} />
              </button>
            )}
          </div>

          {caption && (
            <div className="px-4 pb-4 text-sm text-zinc-300 whitespace-pre-wrap">
              {caption}
            </div>
          )}
        </div>

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
            !w-2 !h-2 !bg-zinc-100 !border-0
            absolute !top-0 !right-[0px]
            flex items-center justify-center
            origin-top-right
            transition-transform duration-200 hover:scale-[2.5]
            !translate-x-0 !translate-y-0
            group/handle
            ${selected ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
            z-50
          `}
        >
          <ArrowRight className="w-[10px] h-[10px] opacity-0 group-hover/handle:opacity-100 transition-opacity duration-200 text-black -rotate-45" />
        </Handle>
      </div>
    </>
  );
};

export default memo(FileNode);
