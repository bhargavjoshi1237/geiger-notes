"use client";

import React from "react";
import { AlignCenter, AlignLeft, AlignRight, Heading, Highlighter } from "lucide-react";
import { OptionList, PlugSectionLabel, PopoverPlug, SwatchPlug } from "@/components/internal/nodes/shared/BasicNodePlugs";
import { TEXT_VARIANTS } from "./TextNode";

const VARIANT_OPTIONS = Object.entries(TEXT_VARIANTS).map(([value, v]) => ({
  value,
  label: v.label,
  preview: (
    <span
      className="w-8 shrink-0 text-center leading-none"
      style={{ fontSize: Math.min(22, Math.max(11, v.fontSize * 0.55)), fontWeight: v.fontWeight }}
    >
      Aa
    </span>
  ),
}));

const ALIGNMENTS = [
  { value: "left", label: "Left", icon: AlignLeft },
  { value: "center", label: "Center", icon: AlignCenter },
  { value: "right", label: "Right", icon: AlignRight },
];

export default function TextSettings({ node, updateData }) {
  const data = node?.data || {};
  const align = data.align || "left";
  const AlignIcon = ALIGNMENTS.find((a) => a.value === align)?.icon || AlignLeft;

  return (
    <>
      <PopoverPlug icon={Heading} label="Text Style" width="w-48">
        <OptionList
          title="Style"
          options={VARIANT_OPTIONS}
          value={TEXT_VARIANTS[data.variant] ? data.variant : "body"}
          onChange={(variant) => updateData({ variant })}
        />
      </PopoverPlug>

      <PopoverPlug icon={AlignIcon} label="Alignment" width="w-auto">
        <PlugSectionLabel>Alignment</PlugSectionLabel>
        <div className="flex gap-1">
          {ALIGNMENTS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              title={label}
              aria-label={`Align ${label.toLowerCase()}`}
              aria-pressed={align === value}
              onClick={() => updateData({ align: value })}
              className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                align === value
                  ? "bg-surface-hover text-foreground"
                  : "text-muted-foreground hover:bg-surface-hover/50 hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </PopoverPlug>

      <SwatchPlug
        label="Text Color"
        value={data.color}
        fallback="var(--foreground)"
        onChange={(color) => updateData({ color })}
        onClear={() => updateData({ color: "" })}
      />

      <SwatchPlug
        label="Highlight"
        icon={Highlighter}
        value={data.highlight}
        fallback="transparent"
        onChange={(highlight) => updateData({ highlight })}
        onClear={() => updateData({ highlight: "" })}
      />
    </>
  );
}
