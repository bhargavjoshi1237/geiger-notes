"use client";

import React from "react";
import { Sparkles, RotateCcw, Boxes } from "lucide-react";
import {
  Button,
  SegmentedTabs,
  SettingRow,
  SettingsList,
  Switch,
} from "@geiger/ui";
import { GroupLabel } from "./SettingsPrimitives";

const BACKGROUNDS = [
  { label: "Dots", value: "dots" },
  { label: "Lines", value: "lines" },
  { label: "Cross", value: "cross" },
  { label: "None", value: "none" },
];

// Multiples of 15 so snapping stays aligned with the 15px node resize step.
const GRID_SIZES = [
  { label: "S", value: 15 },
  { label: "M", value: 30 },
  { label: "L", value: 45 },
];

const SCROLL_MODES = [
  { label: "Pan", value: "pan" },
  { label: "Zoom", value: "zoom" },
];

export default function GeneralSettings({
  settings = {},
  onSettingsChange,
  onReset,
  nodeCount = 0,
  edgeCount = 0,
}) {
  const set = (key, value) => onSettingsChange?.(key, value);
  const showClock = settings.showClock ?? true;

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
      <div className="space-y-3">
        <GroupLabel>Editing</GroupLabel>
        <SettingsList>
          <SettingRow
            title="Double-click to insert"
            description="Quickly create a note by double-clicking an empty area."
            checked={!!settings.doubleClickToInsert}
            onCheckedChange={(c) => set("doubleClickToInsert", c)}
          />
          <SettingRow
            title="Snap to grid"
            description="Align nodes to the canvas grid while dragging."
            checked={!!settings.snapToGrid}
            onCheckedChange={(c) => set("snapToGrid", c)}
          />
          <SettingRow
            title="Scroll wheel"
            description="Pan the canvas or zoom it when scrolling."
            control={
              <SegmentedTabs
                tabs={SCROLL_MODES}
                value={settings.scrollMode || "pan"}
                onChange={(v) => set("scrollMode", v)}
              />
            }
          />
        </SettingsList>
      </div>

      {/* Canvas */}
      <div className="space-y-3 pt-6 border-t border-border/50">
        <GroupLabel>Canvas</GroupLabel>
        <SettingsList>
          <SettingRow
            title="Background"
            description="Pattern drawn behind your board."
            control={
              <SegmentedTabs
                tabs={BACKGROUNDS}
                value={settings.canvasBackground || "dots"}
                onChange={(v) => set("canvasBackground", v)}
              />
            }
          />
          <SettingRow
            title="Grid size"
            description="Spacing of the background pattern and snap grid."
            control={
              <SegmentedTabs
                tabs={GRID_SIZES}
                value={settings.gridSize || 15}
                onChange={(v) => set("gridSize", v)}
              />
            }
          />
          <SettingRow
            title="Show minimap"
            description="Display an overview map in the corner of the canvas."
            checked={!!settings.showMinimap}
            onCheckedChange={(c) => set("showMinimap", c)}
          />
        </SettingsList>
      </div>

      {/* Interface */}
      <div className="space-y-3 pt-6 border-t border-border/50">
        <GroupLabel>Interface</GroupLabel>
        <SettingsList>
          <SettingRow
            title="Show clock"
            description="Display the current time in the toolbar."
            checked={showClock}
            onCheckedChange={(c) => set("showClock", c)}
          />
          <SettingRow
            title="Clock animation"
            description="Subtle shimmer effect on the toolbar clock."
            className={showClock ? undefined : "opacity-50"}
            control={
              <Switch
                checked={settings.clockAnimation ?? true}
                onCheckedChange={(c) => set("clockAnimation", c)}
                disabled={!showClock}
              />
            }
          />
        </SettingsList>
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
