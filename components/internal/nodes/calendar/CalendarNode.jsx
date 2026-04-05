"use client";

import React, { memo, useState, useEffect } from "react";
import {
  Handle,
  Position,
  NodeResizeControl,
  useReactFlow,
} from "@xyflow/react";
import { ArrowRight } from "lucide-react";
import Reactions from "../../ui/Reactions";
import ResizeHandle from "@/components/ui/ResizeHandle";
import DayStyle from "./styles/DayStyle";
import MonthStyle from "./styles/MonthStyle";
import EventsStyle from "./styles/EventsStyle";

const CalendarNode = ({ id, data, selected, dragging, width, height }) => {
  const { setNodes } = useReactFlow();
  const [isVisible, setIsVisible] = useState(false);
  const nodeWidth = Math.max(width || 200, 50);
  const nodeHeight = Math.max(height || 200, 50);
  const theme = data.calendarTheme || "light";
  const calendarStyle = data.calendarStyle || "default";
  const outline = data.outline || { enabled: false };

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
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
        className={`
          relative flex flex-col w-full h-full min-h-[100px] min-w-[100px] group rounded-xl
          transition-all duration-300 ease-out
          ${selected ? "border-2 border-white" : "border-2 border-transparent hover:border-zinc-600"}
          ${dragging ? "shadow-2xl shadow-black/50 z-50" : ""}
          ${isVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-2 scale-95"}
        `}
        style={{
          backgroundColor: data.backgroundColor || "#2a2a2a",
          ...(outline.enabled
            ? {
                borderColor: outline.color,
              }
            : {}), 
        }}
      >
        <NodeResizeControl
          minWidth={50}
          minHeight={50}
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
                    width: Math.round(params.width / 50) * 50,
                    height: Math.round(params.height / 50) * 50,
                    position: {
                      x: Math.round(params.x / 50) * 50,
                      y: Math.round(params.y / 50) * 50,
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

        <Reactions
          reactions={data.reactions || {}}
          onReactionClick={handleReactionClick}
        />
        <div
          className="h-full rounded-xl select-none overflow-hidden"
          style={{
            backgroundColor: theme === "light" ? "#ffffff" : "#141414",
            ...(theme === "dark"
              ? { border: "1px solid #474747" }
              : {}),
          }}
        >
          {calendarStyle === "default" && (
            <DayStyle width={nodeWidth} height={nodeHeight} theme={theme} />
          )}
          {calendarStyle === "simple" && (
            <MonthStyle width={nodeWidth} height={nodeHeight} theme={theme} />
          )}
          {calendarStyle === "blank" && (
            <EventsStyle width={nodeWidth} height={nodeHeight} theme={theme} />
          )}
        </div>
        <Handle
          type="source"
          position={Position.Right}
          className={`
            !w-2 !h-2 !bg-zinc-100 !border-0
            absolute !top-0 !-right-[1px]
            flex items-center justify-center

            origin-top-right
            transition-transform duration-200 hover:scale-[2.5]

            !translate-x-0 !translate-y-0
            group/handle
            ${selected ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
        `}
        >
          <ArrowRight className="w-[10px] h-[10px] opacity-0 group-hover/handle:opacity-100 transition-opacity duration-200 text-black -rotate-45" />
        </Handle>
      </div>
    </>
  );
};

export default memo(CalendarNode);
