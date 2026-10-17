"use client";

import React from "react";
import { Spline, MoveRight, Minus, Activity, Type, ArrowLeftRight } from "lucide-react";
import { Input, Switch } from "@geiger/ui";
import { SidebarShell } from "./SidebarPrimitives";
import { ColorPlug } from "./plugs/ColorPlug";
import { PlugPopover, PlugSection, ChoiceGrid, SliderRow, ColorRow } from "./plugs/PlugControls";
import {
  ARROW_SHAPES,
  ARROW_SIZES,
  DASH_PATTERNS,
  EDGE_PATHS,
  FLOW_ANIMATIONS,
  STROKE_WIDTHS,
  dasharrayFor,
  upgradeEdge,
} from "@/lib/canvas/edge-style";

const PATH_GLYPHS = {
  curve: "M2 18 Q12 -2 22 18",
  straight: "M2 18 L22 4",
  step: "M2 18 L12 18 L12 4 L22 4",
  smoothstep: "M2 18 L9 18 Q12 18 12 15 L12 7 Q12 4 15 4 L22 4",
  bezier: "M2 18 C12 18 12 4 22 4",
};

const ARROW_GLYPHS = {
  none: null,
  arrow: <path d="M14 6 L22 11 L14 16 z" fill="currentColor" />,
  open: <path d="M15 6 L22 11 L15 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />,
  circle: <circle cx="18.5" cy="11" r="3.5" fill="currentColor" />,
  diamond: <path d="M14 11 L18 7 L22 11 L18 15 z" fill="currentColor" />,
  bar: <rect x="19" y="5" width="2" height="12" fill="currentColor" />,
};

const Glyph = ({ children }) => (
  <svg width="24" height="22" viewBox="0 0 24 22" className="overflow-visible">
    {children}
  </svg>
);

export default function EdgeSettingsSidebar({ selectedEdge, onUpdateEdge, onBack }) {
  if (!selectedEdge) return null;

  const label = selectedEdge.data?.label || selectedEdge.label || "";

  const edge = upgradeEdge(selectedEdge);
  const data = edge.data || {};
  const style = edge.style || {};
  const strokeWidth = Number(style.strokeWidth) || 2;

  // Every change also persists the upgraded arrow model so legacy edges stop using stale marker colours.
  const update = ({ style: s, data: d, ...rest } = {}) =>
    onUpdateEdge(edge.id, {
      markerStart: edge.markerStart,
      markerEnd: edge.markerEnd,
      ...rest,
      style: { ...style, ...s },
      data: { ...data, ...d },
    });

  const setWidth = (w) => update({ style: { strokeWidth: w, strokeDasharray: dasharrayFor(data.dash, w) } });
  const setDash = (dash) => update({ style: { strokeDasharray: dasharrayFor(dash, strokeWidth) }, data: { dash } });
  const setFlow = (flow) => update({ animated: flow === "dash", data: { flow } });

  return (
    <SidebarShell onBack={onBack} title="Edge Settings">
      <ColorPlug value={style.stroke} onChange={(color) => update({ style: { stroke: color } })} />

      <PlugPopover icon={Spline} label="Path">
        <PlugSection label="Path">
          <ChoiceGrid
            options={EDGE_PATHS}
            value={data.path || "curve"}
            onChange={(path) => update({ data: { path, offset: undefined } })}
            render={(opt) => (
              <>
                <Glyph>
                  <path d={PATH_GLYPHS[opt.value]} fill="none" stroke="currentColor" strokeWidth="1.6" />
                </Glyph>
                {opt.label}
              </>
            )}
          />
        </PlugSection>
        <label className="flex items-center justify-between text-xs text-foreground">
          Hand-drawn
          <Switch checked={!!data.sketchy} onCheckedChange={(c) => update({ data: { sketchy: c } })} />
        </label>
        {data.offset ? (
          <button
            type="button"
            onClick={() => update({ data: { offset: undefined } })}
            className="text-left text-xs text-muted-foreground hover:text-foreground"
          >
            Reset bend
          </button>
        ) : null}
      </PlugPopover>

      <PlugPopover icon={MoveRight} label="Arrowheads">
        {["arrowStart", "arrowEnd"].map((key) => (
          <PlugSection
            key={key}
            label={key === "arrowStart" ? "Start" : "End"}
            aside={
              key === "arrowStart" ? (
                <button
                  type="button"
                  title="Swap ends"
                  onClick={() => update({ data: { arrowStart: data.arrowEnd, arrowEnd: data.arrowStart } })}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                </button>
              ) : null
            }
          >
            <ChoiceGrid
              options={ARROW_SHAPES}
              value={data[key] || "none"}
              onChange={(v) => update({ data: { [key]: v } })}
              render={(opt) => (
                <Glyph>
                  <g transform={key === "arrowStart" ? "translate(24 0) scale(-1 1)" : undefined}>
                    <line x1="2" y1="11" x2={opt.value === "none" ? 22 : 16} y2="11" stroke="currentColor" strokeWidth="1.6" />
                    {ARROW_GLYPHS[opt.value]}
                  </g>
                </Glyph>
              )}
            />
          </PlugSection>
        ))}
        <PlugSection label="Size">
          <ChoiceGrid
            options={ARROW_SIZES}
            value={data.arrowSize || "md"}
            onChange={(arrowSize) => update({ data: { arrowSize } })}
          />
        </PlugSection>
      </PlugPopover>

      <PlugPopover icon={Minus} label="Line" active={data.dash && data.dash !== "solid"}>
        <PlugSection label="Pattern">
          <ChoiceGrid
            options={DASH_PATTERNS}
            value={data.dash || "solid"}
            onChange={setDash}
            columns={2}
            render={(opt) => (
              <>
                <svg width="48" height="6">
                  <line
                    x1="2"
                    y1="3"
                    x2="46"
                    y2="3"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray={opt.dasharray}
                  />
                </svg>
                {opt.label}
              </>
            )}
          />
        </PlugSection>
        <PlugSection label="Thickness">
          <ChoiceGrid
            options={STROKE_WIDTHS.map((w) => ({ value: w, label: `${w}px` }))}
            value={strokeWidth}
            onChange={setWidth}
            columns={5}
          />
        </PlugSection>
        <PlugSection label="Opacity">
          <SliderRow
            value={Math.round((style.opacity ?? 1) * 100)}
            min={10}
            max={100}
            step={5}
            format={(v) => `${v}%`}
            onChange={(v) => update({ style: { opacity: v / 100 } })}
          />
        </PlugSection>
      </PlugPopover>

      <PlugPopover icon={Activity} label="Animation" active={(data.flow || "none") !== "none"}>
        <PlugSection label="Flow">
          <ChoiceGrid options={FLOW_ANIMATIONS} value={data.flow || "none"} onChange={setFlow} columns={1} />
        </PlugSection>
      </PlugPopover>

      <PlugPopover icon={Type} label="Label" active={!!label}>
        <PlugSection label="Text">
          <Input
            value={label}
            placeholder="Add a label"
            className="h-8 bg-surface-card text-xs"
            onChange={(e) => update({ label: e.target.value, data: { label: e.target.value } })}
          />
        </PlugSection>
        <PlugSection label="Size">
          <ChoiceGrid
            options={[
              { value: "sm", label: "Small" },
              { value: "md", label: "Medium" },
              { value: "lg", label: "Large" },
            ]}
            value={data.labelSize || "md"}
            onChange={(labelSize) => update({ data: { labelSize } })}
          />
        </PlugSection>
        <PlugSection label="Position along edge">
          <SliderRow
            value={Math.round((data.labelPos ?? 0.5) * 100)}
            min={5}
            max={95}
            step={5}
            format={(v) => `${v}%`}
            onChange={(v) => update({ data: { labelPos: v / 100 } })}
          />
        </PlugSection>
        <PlugSection label="Text colour">
          <ColorRow value={data.labelColor} onChange={(labelColor) => update({ data: { labelColor } })} />
        </PlugSection>
        <PlugSection
          label="Background"
          aside={
            <button
              type="button"
              onClick={() => update({ data: { labelBg: data.labelBg === "none" ? undefined : "none" } })}
              className="text-[11px] text-muted-foreground hover:text-foreground"
            >
              {data.labelBg === "none" ? "Show" : "Hide"}
            </button>
          }
        >
          {data.labelBg !== "none" && (
            <ColorRow value={data.labelBg} onChange={(labelBg) => update({ data: { labelBg: labelBg || undefined } })} />
          )}
        </PlugSection>
      </PlugPopover>
    </SidebarShell>
  );
}
