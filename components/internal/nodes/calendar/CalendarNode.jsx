"use client";

import React, { memo, useState, useEffect } from "react";
import {
  Handle,
  Position,
  NodeResizeControl,
  useReactFlow,
  useConnection,
  useStore,
} from "@xyflow/react";
import { ArrowRight } from "lucide-react";
import Reactions from "../../ui/Reactions";
import { ResizeHandle } from "@geiger/ui";
import CalendarFace from "./CalendarFace";
import { calendarRadius, calendarScale, calendarSnapSizes, snapCalendarSize } from "./sizing";

// ResizeHandle draws its glyph 8px (bottom-1 + p-1) inside its anchor; the anchor here is the node corner.
const GRIP_ANCHOR = 8;

// Mirrors NodeResizeControl's autoScale, which counter-scales the grip when zoomed out.
const gripScaleSelector = (s) => Math.max(1 / s.transform[2], 1);

// Current date that rolls over at local midnight, so "today" never goes stale on an open board.
const useToday = () => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const timer = setTimeout(() => setNow(new Date()), midnight - now);
    return () => clearTimeout(timer);
  }, [now]);

  return now;
};

const CalendarNode = ({ id, data, selected, dragging, width, height }) => {
  const { setNodes } = useReactFlow();
  const isConnecting = useConnection().inProgress;
  const [isVisible, setIsVisible] = useState(false);
  const [snapPreview, setSnapPreview] = useState(null);
  const now = useToday();
  const theme = data.calendarTheme || "light";
  const calendarStyle = data.calendarStyle || "default";
  const outline = data.outline || { enabled: false };
  const snapSizes = calendarSnapSizes(calendarStyle);
  const smallest = snapSizes[0];
  const largest = snapSizes[snapSizes.length - 1];
  // Where the rounded corner's arc crosses its 45° diagonal; the dot and grip sit exactly there.
  const cornerInset = calendarRadius(calendarScale(calendarStyle, width, height)) * (1 - Math.SQRT1_2);
  const gripShift = GRIP_ANCHOR - cornerInset / useStore(gripScaleSelector);

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  // Settle legacy or freshly restyled nodes onto a snap point of the active style.
  useEffect(() => {
    setNodes((nodes) =>
      nodes.map((n) => {
        if (n.id !== id) return n;
        const currentHeight = n.height ?? n.measured?.height ?? n.style?.height;
        const currentWidth = n.width ?? n.measured?.width ?? n.style?.width;
        const snap = snapCalendarSize(calendarStyle, currentHeight);
        if (currentWidth === snap.width && currentHeight === snap.height) return n;
        return { ...n, width: snap.width, height: snap.height };
      }),
    );
  }, [calendarStyle, id, setNodes]);

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
          relative w-full h-full group
          transition-[opacity,transform] duration-300 ease-out
          ${isVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-2 scale-95"}
        `}
      >
        <CalendarFace
          calendarStyle={calendarStyle}
          theme={theme}
          backgroundColor={data.backgroundColor}
          width={width}
          height={height}
          now={now}
          className={`
            absolute inset-0 ring-2 transition-[box-shadow] duration-200
            ${selected ? "ring-foreground" : "ring-transparent group-hover:ring-border"}
            ${dragging ? "shadow-2xl shadow-black/50" : ""}
          `}
          style={outline.enabled ? { "--tw-ring-color": outline.color } : undefined}
        />

        {snapPreview && (
          <div
            className="pointer-events-none absolute left-0 top-0 z-30 border border-dashed border-foreground/60"
            style={{
              width: snapPreview.width,
              height: snapPreview.height,
              borderRadius: calendarRadius(snapPreview.scale),
            }}
          />
        )}

        <NodeResizeControl
          minWidth={smallest.width}
          minHeight={smallest.height}
          maxWidth={largest.width}
          maxHeight={largest.height}
          keepAspectRatio
          className="!bg-transparent !border-none"
          position="bottom-right"
          style={{
            opacity: 1,
            pointerEvents: "all",
          }}
          onResize={(_, params) => {
            const next = snapCalendarSize(calendarStyle, params.height);
            setSnapPreview((prev) => (prev?.scale === next.scale ? prev : next));
          }}
          onResizeEnd={(_, params) => {
            const snap = snapCalendarSize(calendarStyle, params.height);
            setSnapPreview(null);
            setNodes((nodes) =>
              nodes.map((n) => (n.id === id ? { ...n, width: snap.width, height: snap.height } : n)),
            );
          }}
        >
          <div
            className={`absolute left-1/2 top-1/2 transition-opacity duration-200 ${selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
            style={{ transform: `translate(${gripShift}px, ${gripShift}px)` }}
          >
            <ResizeHandle />
          </div>
        </NodeResizeControl>

        <Reactions
          reactions={data.reactions || {}}
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
            absolute
            flex items-center justify-center

            origin-top-right
            transition-transform duration-200 hover:scale-[2.5]

            !translate-x-0 !translate-y-0
            group/handle
            ${selected ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
        `}
          style={{ top: cornerInset, right: cornerInset }}
        >
          <ArrowRight className="w-[10px] h-[10px] opacity-0 group-hover/handle:opacity-100 transition-opacity duration-200 text-background -rotate-45" />
        </Handle>
      </div>
    </>
  );
};

export default memo(CalendarNode);
