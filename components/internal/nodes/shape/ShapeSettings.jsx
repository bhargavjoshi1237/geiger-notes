"use client";

import React from "react";
import { AlignJustify, Baseline, PaintBucket, Shapes } from "lucide-react";
import { OptionList, PlugSectionLabel, PopoverPlug, SwatchPlug } from "@/components/internal/nodes/shared/BasicNodePlugs";
import { SHAPES, ShapeGeometry } from "./ShapeNode";

const STROKE_WIDTHS = [
  { value: 0, label: "None" },
  { value: 1, label: "Thin" },
  { value: 2, label: "Medium" },
  { value: 4, label: "Thick" },
  { value: 6, label: "Heavy" },
].map((sw) => ({
  ...sw,
  preview: sw.value ? (
    <span className="w-12 rounded-full bg-current" style={{ height: sw.value }} />
  ) : (
    <span className="w-12 border-t border-dashed border-current opacity-50" />
  ),
}));

export default function ShapeSettings({ node, updateData }) {
  const data = node?.data || {};
  const current = data.shape || "rounded";
  const strokeWidth = Number.isFinite(data.strokeWidth) ? data.strokeWidth : 2;

  return (
    <>
      <PopoverPlug icon={Shapes} label="Shape" width="w-64">
        <PlugSectionLabel>Shape</PlugSectionLabel>
        <div className="grid grid-cols-5 gap-1.5">
          {SHAPES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              title={label}
              aria-label={label}
              aria-pressed={current === value}
              onClick={() => updateData({ shape: value })}
              className={`flex h-10 items-center justify-center rounded-lg transition-colors ${
                current === value
                  ? "bg-surface-active text-foreground ring-1 ring-border-strong"
                  : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
              }`}
            >
              <svg width={30} height={22} aria-hidden>
                <ShapeGeometry shape={value} w={30} h={22} strokeWidth={1.5} fill="none" stroke="currentColor" />
              </svg>
            </button>
          ))}
        </div>
      </PopoverPlug>

      <SwatchPlug
        label="Fill"
        icon={PaintBucket}
        value={data.fill}
        fallback="var(--node-default)"
        allowTransparent
        onChange={(fill) => updateData({ fill })}
        onClear={() => updateData({ fill: "" })}
      />

      <SwatchPlug
        label="Stroke"
        value={data.stroke}
        fallback="var(--edge-stroke)"
        onChange={(stroke) => updateData({ stroke })}
        onClear={() => updateData({ stroke: "" })}
      />

      <PopoverPlug icon={AlignJustify} label="Stroke Weight" width="w-44">
        <OptionList
          title="Thickness"
          options={STROKE_WIDTHS}
          value={strokeWidth}
          onChange={(value) => updateData({ strokeWidth: value })}
        />
      </PopoverPlug>

      <SwatchPlug
        label="Text Color"
        icon={Baseline}
        value={data.textColor}
        fallback="var(--foreground)"
        onChange={(textColor) => updateData({ textColor })}
        onClear={() => updateData({ textColor: "" })}
      />
    </>
  );
}
