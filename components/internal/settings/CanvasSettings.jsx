"use client";

import React from "react";
import { RotateCcw } from "lucide-react";
import { SegmentedTabs, SettingRow, SettingsList } from "@geiger/ui";
import BoardAppearanceSettings from "@/components/internal/canvas/appearance/BoardAppearanceSettings";
import { DEFAULT_APPEARANCE } from "@/lib/canvas/appearance";
import { GroupLabel } from "./SettingsPrimitives";

const PATTERNS = [
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

const MINIMAP_POSITIONS = [
  { label: "↘", value: "bottom-right" },
  { label: "↗", value: "top-right" },
  { label: "↖", value: "top-left" },
];

const MAX_ZOOMS = [
  { label: "2×", value: 2 },
  { label: "4×", value: 4 },
  { label: "8×", value: 8 },
];

// Canvas tab: this board's look (saved instantly to the board) and canvas defaults for every board (saved with the dialog).
export default function CanvasSettings({ settings = {}, onSettingsChange, boardAppearance }) {
  const set = (key, value) => onSettingsChange?.(key, value);

  return (
    <div className="space-y-8">
      <div className="pb-4 border-b border-border/50">
        <h3 className="text-sm font-medium text-foreground">Canvas</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Style this board&apos;s background and pattern, and set how every canvas looks by default.
        </p>
      </div>

      {boardAppearance && (
        <div className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <GroupLabel>This board</GroupLabel>
              <p className="text-xs text-muted-foreground mt-1">
                {boardAppearance.disabled
                  ? "Only editors can change this board's look."
                  : "Applies instantly and is saved with this board for everyone."}
              </p>
            </div>
            <button
              type="button"
              disabled={boardAppearance.disabled}
              onClick={() => boardAppearance.onChange(() => DEFAULT_APPEARANCE)}
              className="flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-surface-hover hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            >
              <RotateCcw className="h-3 w-3" />
              Reset board
            </button>
          </div>
          <fieldset disabled={boardAppearance.disabled} className="min-w-0 disabled:opacity-50">
            <BoardAppearanceSettings
              appearance={boardAppearance.value}
              onChange={boardAppearance.onChange}
              boardKey={boardAppearance.boardKey}
              settings={settings}
            />
          </fieldset>
        </div>
      )}

      <div className={`space-y-3 ${boardAppearance ? "pt-6 border-t border-border/50" : ""}`}>
        <GroupLabel>All boards</GroupLabel>
        <SettingsList>
          <SettingRow
            title="Default pattern"
            description="Used by boards that don't pick their own."
            control={
              <SegmentedTabs
                tabs={PATTERNS}
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
          <SettingRow
            title="Minimap position"
            className={settings.showMinimap ? undefined : "opacity-50"}
            control={
              <SegmentedTabs
                tabs={MINIMAP_POSITIONS}
                value={settings.minimapPosition || "bottom-right"}
                onChange={(v) => set("minimapPosition", v)}
              />
            }
          />
          <SettingRow
            title="Max zoom"
            description="How far you can zoom in."
            control={
              <SegmentedTabs
                tabs={MAX_ZOOMS}
                value={Number(settings.maxZoom) || 2}
                onChange={(v) => set("maxZoom", v)}
              />
            }
          />
          <SettingRow
            title="Fit to content on open"
            description="Show every node when a board opens instead of restoring the last view."
            checked={!!settings.fitViewOnOpen}
            onCheckedChange={(c) => set("fitViewOnOpen", c)}
          />
        </SettingsList>
      </div>
    </div>
  );
}
