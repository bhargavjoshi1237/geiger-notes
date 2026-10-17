"use client";

import React from "react";
import { ExternalLink, Maximize2, Minimize2, RefreshCw } from "lucide-react";
import { SidebarButton } from "@/components/internal/layout/sidebar/SidebarPrimitives";
import { normalizeLinkUrl } from "../LinkNode";

const COMPACT_HEIGHT = 68;
const EXPANDED_HEIGHT = 300;

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
      <SidebarButton
        icon={compact ? Maximize2 : Minimize2}
        label={compact ? "Expanded card" : "Compact row"}
        title={compact ? "Show expanded card" : "Show compact row"}
        onClick={toggleDisplay}
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
