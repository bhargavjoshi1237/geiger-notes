"use client";

import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  SegmentedTabs,
  SettingRow,
  SettingsList,
} from "@geiger/ui";
import { Spline, MousePointer2, Shapes } from "lucide-react";
import ColorPicker from "../edges/ColorePicker";
import ToolbarOptions from "./ToolbarOptions";
import { NODE_STYLES, TOOL_IDS } from "@/lib/settings/defaults";
import {
  ARROW_SHAPES as ARROW_SHAPE_OPTIONS,
  DASH_PATTERNS,
  EDGE_PATHS,
  FLOW_ANIMATIONS,
  dasharrayFor,
} from "@/lib/canvas/edge-style";

const STROKE_WIDTHS = [
  { label: "Thin", value: 1 },
  { label: "Medium", value: 2 },
  { label: "Thick", value: 4 },
];

// SegmentedTabs only needs value/label pairs.
const ARROW_SHAPES = ARROW_SHAPE_OPTIONS.map(({ value, label }) => ({ value, label }));

// last:border-b overrides the shared AccordionItem last:border-b-0 so the last card keeps its bottom edge.
const ITEM_CLASS = "border last:border-b border-border rounded-md bg-muted/30";
const TRIGGER_CLASS =
  "px-4 py-3 hover:no-underline text-foreground hover:text-foreground";
const CONTENT_CLASS = "px-4 pt-4 pb-4 border-t border-border/50";

// Swatch button used as the ColorPicker trigger; empty value = theme default.
const ColorSwatch = React.forwardRef(function ColorSwatch(
  { value, fallback, label, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      {...props}
      className="flex items-center w-full h-9 px-3 gap-2 border border-border rounded hover:border-ring transition-colors bg-transparent"
    >
      <span
        className="w-4 h-4 rounded-full border border-ring"
        style={{ backgroundColor: value || fallback }}
      />
      <span className="text-sm text-foreground font-mono truncate">
        {value || label}
      </span>
    </button>
  );
});

// Scales the full-size node preview down to the tile width.
const PREVIEW_ZOOM = 0.5;

// Selectable tile that previews a node style with the same CSS the canvas uses.
function NodeStyleTile({ style, active, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(style.id)}
      aria-pressed={active}
      className={`flex flex-col gap-2 rounded-md border p-2 text-left transition-colors ${
        active
          ? "border-foreground bg-surface-active"
          : "border-border hover:border-ring hover:bg-surface-hover"
      }`}
    >
      {/* Mirrors CustomNode's real markup at its true 338×68 size, zoomed to fit; the active tile shows the selected state. */}
      <div
        data-node-style={style.id}
        className="pointer-events-none flex h-24 items-center justify-center overflow-hidden rounded bg-background"
      >
        <div style={{ zoom: PREVIEW_ZOOM }}>
          <div
            className={`react-flow__node react-flow__node-custom ${active ? "selected" : ""}`}
            style={{ position: "relative", width: 338, height: 68 }}
          >
            <div
              className={`node-chrome relative flex flex-col w-full h-full min-h-[68px] min-w-[338px] ${
                active ? "border-2 border-foreground" : "border-2 border-transparent"
              }`}
              style={{ backgroundColor: "var(--node-default)" }}
            >
              <div className="flex-1 w-full h-full overflow-hidden flex items-center justify-center">
                <p className="font-sans p-4 whitespace-pre-wrap w-full text-foreground">
                  Project kickoff notes
                </p>
              </div>
              {active ? (
                <span className="absolute top-0 -right-[1px] w-2 h-2 bg-foreground" />
              ) : null}
            </div>
          </div>
        </div>
      </div>
      <div className="px-0.5">
        <p className="text-xs font-medium text-foreground">{style.label}</p>
        <p className="text-[11px] text-muted-foreground truncate">{style.description}</p>
      </div>
    </button>
  );
}

export default function DefaultsSettings({ settings = {}, onSettingsChange }) {
  const edge = settings.defaultEdge || {};
  const nodeStyle = settings.nodeStyle || "classic";
  const tools = settings.toolbarTools || [];
  const edgeStroke = edge.stroke || "#71717a";

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
        <h3 className="text-sm font-medium text-foreground">Defaults</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Set the default style for new items and choose which tools appear on
          the canvas.
        </p>
      </div>

      <Accordion
        type="single"
        collapsible
        className="w-full space-y-2"
      >
        {/* Connection / edge defaults */}
        <AccordionItem value="edges" className={ITEM_CLASS}>
          <AccordionTrigger className={TRIGGER_CLASS}>
            <div className="flex items-center gap-2">
              <Spline className="w-4 h-4 text-muted-foreground" />
              <span>Connections</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className={`${CONTENT_CLASS} space-y-5`}>
            {/* Live preview */}
            <div className="flex items-center justify-center h-12 rounded-md bg-muted/40 border border-border/60">
              <svg width="160" height="24" className="overflow-visible">
                <defs>
                  <marker id="pref-edge-end" viewBox="0 0 10 10" refX="9.5" refY="5" markerWidth="14" markerHeight="14" markerUnits="userSpaceOnUse" orient="auto-start-reverse">
                    <path d="M0,1 L10,5 L0,9 z" style={{ fill: edgeStroke }} />
                  </marker>
                </defs>
                <path
                  d={edge.path === "step" || edge.path === "smoothstep" ? "M4 20 L80 20 L80 4 L156 4" : edge.path === "straight" ? "M4 12 L156 12" : "M4 20 Q80 -8 156 20"}
                  fill="none"
                  stroke={edgeStroke}
                  strokeWidth={edge.strokeWidth || 2}
                  strokeDasharray={dasharrayFor(edge.dash, edge.strokeWidth || 2)}
                  strokeLinecap="round"
                  markerEnd={edge.arrowEnd !== "none" ? "url(#pref-edge-end)" : undefined}
                  markerStart={edge.arrowStart && edge.arrowStart !== "none" ? "url(#pref-edge-end)" : undefined}
                >
                  {edge.flow === "dash" ? (
                    <animate attributeName="stroke-dashoffset" values="24;0" dur="0.6s" repeatCount="indefinite" />
                  ) : null}
                </path>
              </svg>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="mb-2 block text-muted-foreground text-xs font-medium">
                  Color
                </span>
                <ColorPicker
                  value={edge.stroke}
                  onChange={(color) => updateEdge("stroke", color)}
                >
                  <ColorSwatch value={edge.stroke} fallback="#71717a" label="#71717a" />
                </ColorPicker>
              </div>

              <div className="w-full">
                <span className="mb-2 block text-muted-foreground text-xs font-medium">
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

            <SettingsList>
              <SettingRow
                title="Path"
                control={
                  <SegmentedTabs
                    tabs={EDGE_PATHS}
                    value={edge.path || "curve"}
                    onChange={(v) => updateEdge("path", v)}
                  />
                }
              />
              <SettingRow
                title="Line style"
                control={
                  <SegmentedTabs
                    tabs={DASH_PATTERNS.map(({ value, label }) => ({ value, label: label.replace(" dash", "") }))}
                    value={edge.dash || "solid"}
                    onChange={(v) => updateEdge("dash", v)}
                  />
                }
              />
              <SettingRow
                title="End arrow"
                control={
                  <SegmentedTabs
                    tabs={ARROW_SHAPES}
                    value={edge.arrowEnd || "arrow"}
                    onChange={(v) => updateEdge("arrowEnd", v)}
                  />
                }
              />
              <SettingRow
                title="Start arrow"
                control={
                  <SegmentedTabs
                    tabs={ARROW_SHAPES}
                    value={edge.arrowStart || "none"}
                    onChange={(v) => updateEdge("arrowStart", v)}
                  />
                }
              />
              <SettingRow
                title="Animation"
                description="Motion along new connections."
                control={
                  <SegmentedTabs
                    tabs={FLOW_ANIMATIONS.map(({ value, label }) => ({ value, label: label.split(" ").pop() }))}
                    value={edge.flow || "none"}
                    onChange={(v) => updateEdge("flow", v)}
                  />
                }
              />
              <SettingRow
                title="Hand-drawn"
                description="Sketchy strokes that match your drawings."
                checked={!!edge.sketchy}
                onCheckedChange={(c) => updateEdge("sketchy", c)}
              />
            </SettingsList>
          </AccordionContent>
        </AccordionItem>

        {/* Node style */}
        <AccordionItem value="node-style" className={ITEM_CLASS}>
          <AccordionTrigger className={TRIGGER_CLASS}>
            <div className="flex items-center gap-2">
              <Shapes className="w-4 h-4 text-muted-foreground" />
              <span>Node style</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className={CONTENT_CLASS}>
            <p className="mb-3 text-xs text-muted-foreground">
              How every node on the canvas looks. Applies to existing nodes too.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {NODE_STYLES.map((style) => (
                <NodeStyleTile
                  key={style.id}
                  style={style}
                  active={nodeStyle === style.id}
                  onSelect={(id) => onSettingsChange?.("nodeStyle", id)}
                />
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Toolbar visibility */}
        <AccordionItem value="toolbar" className={ITEM_CLASS}>
          <AccordionTrigger className={TRIGGER_CLASS}>
            <div className="flex items-center gap-2">
              <MousePointer2 className="w-4 h-4 text-muted-foreground" />
              <span>Toolbar</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className={CONTENT_CLASS}>
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
