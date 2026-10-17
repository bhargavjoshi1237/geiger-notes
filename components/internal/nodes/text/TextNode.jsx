"use client";

import React, { memo } from "react";
import { NodeResizeControl, useReactFlow } from "@xyflow/react";
import { Type } from "lucide-react";
import NodeShell, { useNodeDataUpdater } from "@/components/internal/nodes/shared/NodeShell";
import TextEditingTrait from "@/components/internal/nodes/traits/TextEditingTrait";

export const TEXT_VARIANTS = {
  h1: { label: "Heading 1", fontSize: 40, lineHeight: 1.15, fontWeight: 700, letterSpacing: "-0.02em" },
  h2: { label: "Heading 2", fontSize: 30, lineHeight: 1.2, fontWeight: 700, letterSpacing: "-0.015em" },
  h3: { label: "Heading 3", fontSize: 22, lineHeight: 1.3, fontWeight: 600, letterSpacing: "-0.01em" },
  body: { label: "Body", fontSize: 16, lineHeight: 1.55, fontWeight: 400 },
  caption: { label: "Caption", fontSize: 13, lineHeight: 1.5, fontWeight: 400, muted: true },
};

export const nodeMeta = {
  type: "text",
  label: "Text",
  icon: Type,
  cardColor: false,
  create: () => ({
    data: { text: "", variant: "h2", align: "left", color: "", highlight: "" },
    style: { width: 360 },
  }),
};

const MIN_WIDTH = 80;
const SNAP = 15;

function TextNode({ id, data, selected, dragging }) {
  const update = useNodeDataUpdater(id);
  const { setNodes } = useReactFlow();
  const variant = TEXT_VARIANTS[data.variant] || TEXT_VARIANTS.body;
  const text = data.text ?? "";

  // Shared metrics so the read layer and the textarea wrap identically.
  const typography = {
    fontSize: variant.fontSize,
    lineHeight: variant.lineHeight,
    fontWeight: variant.fontWeight,
    letterSpacing: variant.letterSpacing,
    textAlign: data.align || "left",
    whiteSpace: "pre-wrap",
    overflowWrap: "break-word",
  };
  const colorClass = data.color ? "" : variant.muted ? "text-muted-foreground" : "text-foreground";
  const highlight = data.highlight
    ? {
        backgroundColor: `color-mix(in srgb, ${data.highlight} 38%, transparent)`,
        boxShadow: `0 0 0 2px color-mix(in srgb, ${data.highlight} 38%, transparent)`,
        borderRadius: 3,
        boxDecorationBreak: "clone",
        WebkitBoxDecorationBreak: "clone",
      }
    : null;

  return (
    <NodeShell
      id={id}
      data={data}
      selected={selected}
      dragging={dragging}
      chrome={false}
      reactions={false}
      resizable={false}
      minWidth={MIN_WIDTH}
      minHeight={0}
      className="rounded-md"
    >
      <NodeResizeControl
        position="right"
        resizeDirection="horizontal"
        minWidth={MIN_WIDTH}
        autoScale={false}
        className="!h-full !w-3 !rounded-none !border-none !bg-transparent"
        style={{ top: 0, translate: "-50% 0", zIndex: 30 }}
        onResizeEnd={(_, params) => {
          const width = Math.max(MIN_WIDTH, Math.round(params.width / SNAP) * SNAP);
          setNodes((nodes) =>
            nodes.map((n) => {
              if (n.id !== id) return n;
              const style = { ...n.style, width };
              delete style.height;
              const next = { ...n, width, style, position: { ...n.position, x: params.x } };
              delete next.height;
              return next;
            }),
          );
        }}
      >
        <span
          className={`absolute left-1/2 top-1/2 h-6 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground transition-opacity ${
            selected ? "opacity-100" : "opacity-0"
          }`}
        />
      </NodeResizeControl>

      <div className={`grid px-2 py-1 ${colorClass}`} style={data.color ? { color: data.color } : undefined}>
        <div className="col-start-1 row-start-1" style={typography} aria-hidden={selected || undefined}>
          {text ? (
            <span style={{ ...highlight, color: selected ? "transparent" : undefined }}>{text}</span>
          ) : (
            <span className={selected ? "invisible" : "text-muted-foreground/60"}>Text</span>
          )}
          {/* Keeps a trailing newline's empty line measurable */}
          {"​"}
        </div>
        {selected && (
          <TextEditingTrait className="col-start-1 row-start-1 flex flex-col">
            <textarea
              autoFocus={!text}
              value={text}
              onChange={(e) => update({ text: e.target.value })}
              placeholder="Text"
              rows={1}
              spellCheck={false}
              data-gramm="false"
              aria-label="Text"
              className="w-full flex-1 resize-none overflow-hidden border-0 bg-transparent p-0 text-inherit caret-current outline-none placeholder:text-muted-foreground/60"
              style={{ ...typography, color: "inherit", fontFamily: "inherit" }}
            />
          </TextEditingTrait>
        )}
      </div>
    </NodeShell>
  );
}

export default memo(TextNode);
