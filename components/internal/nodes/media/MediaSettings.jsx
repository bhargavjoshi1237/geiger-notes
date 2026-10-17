"use client";

import React from "react";
import { Download, Film, Music, Repeat, Replace } from "lucide-react";
import { SidebarButton } from "@/components/internal/layout/sidebar/SidebarPrimitives";
import { EMPTY_MEDIA, MEDIA_SIZES } from "./MediaNode";

// Media node rail: swap the source, toggle audio/video for URL sources, loop, download.
export default function MediaSettings({ node, updateData, updateNode }) {
  const data = node?.data || {};
  const hasSrc = Boolean(data.src);
  const isUrl = /^https?:/i.test(data.src || "");
  const kind = data.kind === "video" ? "video" : "audio";

  const setSize = (size) => updateNode({ width: size.width, height: size.height, style: { ...(node.style || {}), ...size } });

  const download = () => {
    if (isUrl) {
      window.open(data.src, "_blank", "noopener,noreferrer");
      return;
    }
    const a = document.createElement("a");
    a.href = data.src;
    a.download = data.name || `media-${kind}`;
    a.click();
  };

  if (!hasSrc) return null;

  return (
    <>
      <SidebarButton
        icon={Replace}
        label="Replace source"
        title="Replace source"
        onClick={() => {
          updateData({ ...EMPTY_MEDIA, loop: false });
          setSize(MEDIA_SIZES.empty);
        }}
      />
      {isUrl && (
        <SidebarButton
          icon={kind === "audio" ? Film : Music}
          label={kind === "audio" ? "Play as video" : "Play as audio"}
          title={kind === "audio" ? "Play as video" : "Play as audio"}
          onClick={() => {
            const next = kind === "audio" ? "video" : "audio";
            updateData({ kind: next });
            setSize(MEDIA_SIZES[next]);
          }}
        />
      )}
      <SidebarButton
        icon={Repeat}
        label="Loop"
        title={data.loop ? "Looping on" : "Loop playback"}
        active={!!data.loop}
        onClick={() => updateData({ loop: !data.loop })}
      />
      <SidebarButton icon={Download} label="Download" title={isUrl ? "Open source" : "Download"} onClick={download} />
    </>
  );
}
