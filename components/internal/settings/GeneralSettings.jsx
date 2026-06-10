"use client";

import React from "react";
import { Sparkles, RotateCcw, Boxes } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GroupLabel, ToggleRow } from "./SettingsPrimitives";

export default function GeneralSettings({
  settings = {},
  onSettingsChange,
  onReset,
  nodeCount = 0,
  edgeCount = 0,
}) {
  const set = (key, value) => onSettingsChange?.(key, value);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pb-4 border-b border-border/50">
        <h3 className="text-sm font-medium text-foreground">General</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Control how the canvas behaves and what the interface shows.
        </p>
      </div>

      {/* Workspace stats — real counts from the live canvas */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Boxes className="w-3.5 h-3.5" />
            <span className="text-[11px] uppercase tracking-wider font-semibold">
              Nodes
            </span>
          </div>
          <div className="text-xl font-semibold text-foreground mt-1.5 tabular-nums">
            {nodeCount}
          </div>
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="text-[11px] uppercase tracking-wider font-semibold">
              Connections
            </span>
          </div>
          <div className="text-xl font-semibold text-foreground mt-1.5 tabular-nums">
            {edgeCount}
          </div>
        </div>
      </div>

      {/* Editing */}
      <div className="space-y-1">
        <GroupLabel className="mb-2">Editing</GroupLabel>
        <ToggleRow
          title="Double-click to insert"
          description="Quickly create a note by double-clicking an empty area."
          checked={settings.doubleClickToInsert}
          onChange={(c) => set("doubleClickToInsert", c)}
        />
        <ToggleRow
          title="Snap to grid"
          description="Align nodes to a 15px grid while dragging."
          checked={settings.snapToGrid}
          onChange={(c) => set("snapToGrid", c)}
        />
        <ToggleRow
          title="Show minimap"
          description="Display an overview map in the corner of the canvas."
          checked={settings.showMinimap}
          onChange={(c) => set("showMinimap", c)}
        />
      </div>

      {/* Interface */}
      <div className="space-y-1 pt-2 border-t border-border/50">
        <GroupLabel className="mb-2 mt-4">Interface</GroupLabel>
        <ToggleRow
          title="Show clock"
          description="Display the current time in the toolbar."
          checked={settings.showClock ?? true}
          onChange={(c) => set("showClock", c)}
        />
        <ToggleRow
          title="Clock animation"
          description="Subtle shimmer effect on the toolbar clock."
          checked={settings.clockAnimation ?? true}
          onChange={(c) => set("clockAnimation", c)}
          disabled={!(settings.showClock ?? true)}
        />
      </div>

      {/* Reset */}
      <div className="pt-4 border-t border-border/50">
        <div className="flex items-center justify-between p-3 rounded-md border border-border/50 bg-muted/20">
          <div className="space-y-0.5">
            <h4 className="text-sm font-medium text-foreground">
              Restore defaults
            </h4>
            <p className="text-xs text-muted-foreground">
              Reset all General and Defaults preferences to their original
              values.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            disabled={!onReset}
            className="h-8 border-border text-muted-foreground hover:text-foreground hover:border-ring"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-2" />
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}
