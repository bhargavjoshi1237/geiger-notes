"use client";

import React, { memo } from "react";
import { Sticker } from "lucide-react";
import { LucideIcon } from "@geiger/ui";
import NodeShell from "@/components/internal/nodes/shared/NodeShell";

export const nodeMeta = {
  type: "sticker",
  label: "Sticker",
  icon: Sticker,
  cardColor: false,
  create: () => ({
    data: { kind: "emoji", emoji: "⭐", icon: "Star", color: "" },
    style: { width: 120, height: 120 },
  }),
};

function StickerNode({ id, data, selected, dragging }) {
  const isIcon = data.kind === "icon";

  return (
    <NodeShell
      id={id}
      data={data}
      selected={selected}
      dragging={dragging}
      chrome={false}
      reactions={false}
      keepAspectRatio
      minWidth={45}
      minHeight={45}
      className="rounded-xl"
    >
      {/* Size container so the glyph scales with the node via cqmin units */}
      <div
        className="pointer-events-none flex flex-1 select-none items-center justify-center"
        style={{ containerType: "size" }}
      >
        {isIcon ? (
          <LucideIcon
            name={data.icon || "Star"}
            strokeWidth={1.75}
            className={data.color ? "" : "text-foreground"}
            style={{ width: "78cqmin", height: "78cqmin", ...(data.color ? { color: data.color } : {}) }}
          />
        ) : (
          <span
            className="leading-none drop-shadow-sm"
            style={{ fontSize: "72cqmin", fontFamily: "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif" }}
          >
            {data.emoji || "⭐"}
          </span>
        )}
      </div>
    </NodeShell>
  );
}

export default memo(StickerNode);
