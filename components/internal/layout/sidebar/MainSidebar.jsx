"use client";

import React from "react";
import { MoreHorizontal, Trash2, RotateCcw } from "lucide-react";
import { SidebarButton } from "./SidebarPrimitives";
import { PlugPopover } from "./plugs/PlugControls";
import { TOOLS } from "@/lib/settings/tools";

const onDragStart = (event, nodeType) => {
  event.dataTransfer.setData("application/reactflow", nodeType);
  event.dataTransfer.effectAllowed = "move";
};

const timeAgo = (ts) => {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  return `${Math.round(s / 3600)}h ago`;
};

export const MainSidebar = ({ enabledTools, trash = [], onRestore }) => {
  const visibleTools = Array.isArray(enabledTools)
    ? TOOLS.filter((tool) => enabledTools.includes(tool.id))
    : TOOLS;
  const hiddenTools = TOOLS.filter((tool) => !visibleTools.includes(tool));

  return (
    <nav className="flex-1 flex flex-col gap-3 w-full px-2 items-center pt-2 overflow-y-auto scrollbar-none">
      {visibleTools.map((tool) => (
        <SidebarButton
          key={tool.id}
          icon={tool.icon}
          label={tool.label}
          title={tool.label}
          draggable={!!tool.dragType}
          onDragStart={tool.dragType ? (event) => onDragStart(event, tool.dragType) : undefined}
        />
      ))}

      <div className="w-full px-2 py-2">
        <div className="w-full h-[1px] bg-divider/60"></div>
      </div>

      <PlugPopover icon={MoreHorizontal} label="More tools" width="w-72">
        <p className="text-[11px] text-muted-foreground">
          {hiddenTools.length ? "Drag any tool onto the canvas." : "Every tool is already in your toolbar."}
        </p>
        {hiddenTools.length > 0 && (
          <div className="grid grid-cols-3 gap-1.5">
            {hiddenTools.map((tool) => (
              <div
                key={tool.id}
                draggable
                onDragStart={(event) => onDragStart(event, tool.dragType)}
                className="flex cursor-grab flex-col items-center gap-1 rounded-lg border border-border/60 px-1 py-2 text-[11px] text-muted-foreground hover:bg-surface-hover hover:text-foreground active:cursor-grabbing"
              >
                <tool.icon className="h-4 w-4" strokeWidth={1.75} />
                <span className="truncate max-w-full">{tool.label}</span>
              </div>
            ))}
          </div>
        )}
      </PlugPopover>

      <div className="mt-auto flex flex-col gap-4 items-center w-full pb-2">
        <PlugPopover
          width="w-72"
          trigger={
            <SidebarButton icon={Trash2} label="Recently deleted" title="Recently deleted">
              <span className="relative">
                <Trash2 className="w-5 h-5" strokeWidth={1.75} />
                {trash.length > 0 && (
                  <span className="absolute -right-2 -top-2 min-w-4 rounded-full bg-primary px-1 text-[9px] leading-4 text-primary-foreground tabular-nums">
                    {trash.length}
                  </span>
                )}
              </span>
            </SidebarButton>
          }
        >
          <p className="text-sm font-medium text-foreground">Recently deleted</p>
          {trash.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nodes you delete in this session show up here so you can bring them back.</p>
          ) : (
            <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
              {trash.map((entry) => (
                <div key={entry.id} className="flex items-center gap-2 rounded-lg border border-border/60 px-2 py-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-foreground">{entry.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {entry.nodes.length > 1 ? `${entry.nodes.length} nodes · ` : ""}
                      {timeAgo(entry.deletedAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRestore?.(entry.id)}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </PlugPopover>
      </div>
    </nav>
  );
};
