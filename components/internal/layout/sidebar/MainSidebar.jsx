"use client";

import React from "react";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { SidebarButton } from "./SidebarPrimitives";
import { TOOLS } from "@/lib/settings/tools";

export const MainSidebar = ({ enabledTools }) => {
  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  // When no preference is provided (public playground / collab), show every
  // tool. Otherwise only render the tools the user enabled in Settings.
  const visibleTools = Array.isArray(enabledTools)
    ? TOOLS.filter((tool) => enabledTools.includes(tool.id))
    : TOOLS;

  return (
    <nav className="flex-1 flex flex-col gap-3 w-full px-2 items-center pt-2">
      {visibleTools.map((tool) => (
        <SidebarButton
          key={tool.id}
          icon={tool.icon}
          label={tool.label}
          draggable={!!tool.dragType}
          onDragStart={
            tool.dragType
              ? (event) => onDragStart(event, tool.dragType)
              : undefined
          }
        />
      ))}

      <div className="w-full px-2 py-2">
        <div className="w-full h-[1px] bg-[#333333]/60"></div>
      </div>
      <SidebarButton icon={MoreHorizontal} label="More" />
      <div className="mt-auto flex flex-col gap-4 items-center w-full pb-2">
        <SidebarButton icon={Trash2} label="Trash" />
      </div>
    </nav>
  );
};
