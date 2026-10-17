"use client";

import React from "react";
import { ChevronsDownUp, ChevronsUpDown, GitFork, ListTree } from "lucide-react";
import { SidebarButton } from "@/components/internal/layout/sidebar/SidebarPrimitives";
import ColorPicker from "@/components/internal/edges/ColorePicker";
import { MINDMAP_ROOT_COLOR, requestMindmapAction } from "./MindmapNode";

export default function MindmapSettings({ node }) {
  const id = node?.id;
  const data = node?.data ?? {};
  const color = data.color || MINDMAP_ROOT_COLOR;
  if (!id) return null;

  return (
    <>
      <ColorPicker value={color} onChange={(next) => requestMindmapAction(id, "color", next)}>
        <div>
          <SidebarButton
            label="Branch color"
            icon={() => <div className="h-5 w-5 rounded-full border border-ring shadow-sm" style={{ backgroundColor: color }} />}
          />
        </div>
      </ColorPicker>
      <SidebarButton
        icon={GitFork}
        label="Add child topic (Tab)"
        title="Add child topic (Tab)"
        onClick={() => requestMindmapAction(id, "child")}
      />
      <SidebarButton
        icon={data.collapsed ? ChevronsUpDown : ChevronsDownUp}
        label={data.collapsed ? "Expand children" : "Collapse children"}
        title={data.collapsed ? "Expand children" : "Collapse children"}
        active={!!data.collapsed}
        onClick={() => requestMindmapAction(id, "collapse", !data.collapsed)}
      />
      <SidebarButton
        icon={ListTree}
        label="Auto-layout subtree"
        title="Auto-layout subtree"
        onClick={() => requestMindmapAction(id, "layout")}
      />
    </>
  );
}
