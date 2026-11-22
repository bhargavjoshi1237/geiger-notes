"use client";

import React from "react";
import { ExternalLink, Maximize2, Minimize2, RefreshCw } from "lucide-react";
import { SidebarButton } from "@/components/internal/layout/sidebar/SidebarPrimitives";
import { CycleButton } from "@/components/internal/ui/CycleButton";
import { normalizeLinkUrl } from "../LinkNode";

const COMPACT_HEIGHT = 68;
const EXPANDED_HEIGHT = 300;
const DISPLAYS = [
  { value: "expanded", label: "Expanded card", icon: Maximize2 },
  { value: "compact", label: "Compact row", icon: Minimize2 },
];

// Link node rail: refetch the cached preview, switch compact/expanded, open the URL.
export default function LinkSettings({ node, updateData, updateNode }) {
  const data = node?.data || {};
  const href = normalizeLinkUrl(data.url);
  const compact = data.display === "compact";

  const resize = (height) => {
    const width = Math.max(node.width ?? node.style?.width ?? 338, 338);
    updateNode({ width, height, style: { ...(node.style || {}), width, height } });
  };

  const toggleDisplay = () => {
    if (compact) {
      updateData({ display: "expanded" });
      const current = node.height ?? node.measured?.height ?? COMPACT_HEIGHT;
      if (current < EXPANDED_HEIGHT) resize(EXPANDED_HEIGHT);
    } else {
      updateData({ display: "compact" });
      resize(COMPACT_HEIGHT);
    }
  };

  return (
    <>
      <SidebarButton
        icon={RefreshCw}
        label="Refresh preview"
        title="Refresh preview"
        onClick={() => href && updateData({ preview: null })}
        className={href ? "" : "opacity-40 pointer-events-none"}
      />
      <CycleButton
        label="Display"
        options={DISPLAYS}
        value={compact ? "compact" : "expanded"}
        onChange={(next) => next !== (compact ? "compact" : "expanded") && toggleDisplay()}
      />
      {href && (
        <SidebarButton
          icon={ExternalLink}
          label="Open link"
          title="Open link"
          onClick={() => window.open(href, "_blank", "noopener,noreferrer")}
        />
      )}
    </>
  );
}
