"use client";

import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { Spline, MousePointer2 } from "lucide-react";
import ColorPicker from "../edges/ColorePicker";
import ToolbarOptions from "./ToolbarOptions";
import { SegmentedTabs } from "./SegmentedTabs";
import { TOOL_IDS } from "@/lib/settings/defaults";

const STROKE_WIDTHS = [
  { label: "Thin", value: 1 },
  { label: "Medium", value: 2 },
  { label: "Thick", value: 4 },
];

export default function DefaultsSettings({ settings = {}, onSettingsChange }) {
  const edge = settings.defaultEdge || {};
  const tools = settings.toolbarTools || [];

  const updateEdge = (key, value) =>
    onSettingsChange?.("defaultEdge", { ...edge, [key]: value });

  const toggleTool = (toolId) => {
    const next = tools.includes(toolId)
      ? tools.filter((id) => id !== toolId)
      : [...tools, toolId];
    onSettingsChange?.("toolbarTools", next);
  };

  const resetTools = () => onSettingsChange?.("toolbarTools", [...TOOL_IDS]);

  return (
    <div className="space-y-6">
      <div className="pb-1">
        <h3 className="text-sm font-medium text-zinc-200">Defaults</h3>
        <p className="text-xs text-zinc-500 mt-1">
          Set the default style for new items and choose which tools appear on
          the canvas.
        </p>
      </div>

      <Accordion
        type="single"
        collapsible
        className="w-full space-y-2"
        defaultValue="edges"
      >
        {/* Connection / edge defaults */}
        <AccordionItem
          value="edges"
          className="border border-zinc-800 rounded-md bg-zinc-900/30"
        >
          <AccordionTrigger className="px-4 py-3 hover:no-underline text-zinc-300 hover:text-zinc-100">
            <div className="flex items-center gap-2">
              <Spline className="w-4 h-4 text-zinc-500" />
              <span>Connections</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 py-4 space-y-5 border-t border-zinc-800/50">
            {/* Live preview */}
            <div className="flex items-center justify-center h-12 rounded-md bg-zinc-950/40 border border-zinc-800/60">
              <svg width="160" height="20" className="overflow-visible">
                <line
                  x1="4"
                  y1="10"
                  x2="140"
                  y2="10"
                  stroke={edge.stroke || "#71717a"}
                  strokeWidth={edge.strokeWidth || 2}
                  strokeDasharray={edge.dashed ? "6 6" : undefined}
                  strokeLinecap="round"
                >
                  {edge.animated ? (
                    <animate
                      attributeName="stroke-dashoffset"
                      values="24;0"
                      dur="0.6s"
                      repeatCount="indefinite"
                    />
                  ) : null}
                </line>
                <polygon
                  points="140,4 152,10 140,16"
                  fill={edge.stroke || "#71717a"}
                />
              </svg>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="mb-2 block text-zinc-400 text-xs font-medium">
                  Color
                </span>
                <ColorPicker
                  value={edge.stroke}
                  onChange={(color) => updateEdge("stroke", color)}
                >
                  <button
                    type="button"
                    className="flex items-center w-full h-9 px-3 gap-2 border border-zinc-700 rounded hover:border-zinc-500 transition-colors bg-transparent"
                  >
                    <span
                      className="w-4 h-4 rounded-full border border-zinc-600"
                      style={{ backgroundColor: edge.stroke || "#71717a" }}
                    />
                    <span className="text-sm text-zinc-300 font-mono">
                      {edge.stroke || "#71717a"}
                    </span>
                  </button>
                </ColorPicker>
              </div>

              <div className="w-full">
                <span className="mb-2 block text-zinc-400 text-xs font-medium">
                  Thickness
                </span>
                <SegmentedTabs
                  tabs={STROKE_WIDTHS}
                  value={edge.strokeWidth || 2}
                  onChange={(v) => updateEdge("strokeWidth", v)}
                  fullWidth
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-sm text-zinc-300">Line style</span>
              <SegmentedTabs
                tabs={[
                  { label: "Solid", value: false },
                  { label: "Dashed", value: true },
                ]}
                value={!!edge.dashed}
                onChange={(v) => updateEdge("dashed", v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-300">Animated</span>
              <Switch
                checked={!!edge.animated}
                onCheckedChange={(c) => updateEdge("animated", c)}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Toolbar visibility */}
        <AccordionItem
          value="toolbar"
          className="border border-zinc-800 rounded-md bg-zinc-900/30"
        >
          <AccordionTrigger className="px-4 py-3 hover:no-underline text-zinc-300 hover:text-zinc-100">
            <div className="flex items-center gap-2">
              <MousePointer2 className="w-4 h-4 text-zinc-500" />
              <span>Toolbar</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 py-4 border-t border-b border-zinc-800/50">
            <ToolbarOptions
              selectedTools={tools}
              onToggleTool={toggleTool}
              onReset={resetTools}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
