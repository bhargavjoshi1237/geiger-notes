"use client";

import React from "react";
import { Ban } from "lucide-react";
import { Input, Label, Popover, PopoverContent, PopoverTrigger } from "@geiger/ui";
import { SidebarButton } from "@/components/internal/layout/sidebar/SidebarPrimitives";
import { COLORS } from "@/components/internal/edges/ColorePicker";

// Sidebar-rail building blocks shared by the text/shape/sticker settings panels.

export const PLUG_POPOVER_CLASS = "bg-surface-dialog border-border p-3 shadow-xl rounded-xl";

export function PlugSectionLabel({ children }) {
  return (
    <Label className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </Label>
  );
}

// Rail button that opens a right-hand popover.
export function PopoverPlug({ icon, label, width = "w-64", trigger, children }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        {trigger ?? <SidebarButton icon={icon} label={label} title={label} aria-label={label} />}
      </PopoverTrigger>
      <PopoverContent side="right" align="start" sideOffset={8} className={`${width} ${PLUG_POPOVER_CLASS}`}>
        {children}
      </PopoverContent>
    </Popover>
  );
}

// Vertical list of choices styled like the stroke-weight plug.
export function OptionList({ title, options, value, onChange }) {
  return (
    <div className="flex flex-col gap-0.5">
      {title && <PlugSectionLabel>{title}</PlugSectionLabel>}
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition-colors ${
            value === opt.value
              ? "bg-surface-hover text-foreground"
              : "text-muted-foreground hover:bg-surface-hover/50 hover:text-foreground"
          }`}
        >
          {opt.preview}
          <span className="text-xs">{opt.label}</span>
        </button>
      ))}
    </div>
  );
}

const CHECKER_STYLE = {
  backgroundImage:
    "conic-gradient(var(--muted-foreground) 25%, transparent 0 50%, var(--muted-foreground) 0 75%, transparent 0)",
  backgroundSize: "10px 10px",
  opacity: 0.6,
};

const swatchClass =
  "h-8 w-8 rounded-lg border border-border/50 shadow-sm transition-all hover:scale-110 hover:border-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20";

// Color plug with an optional "default" reset tile and transparent tile; the rail shows a swatch or a tinted icon.
export function SwatchPlug({ label, value, fallback = "var(--foreground)", icon: Icon, onChange, onClear, allowTransparent = false }) {
  const shown = value || fallback;
  const trigger = (
    <SidebarButton label={label} title={label} aria-label={label}>
      {Icon ? (
        <span className="flex flex-col items-center gap-0.5">
          <Icon className="h-4 w-4" strokeWidth={1.75} />
          <span className="h-1 w-5 rounded-full border border-border/60" style={{ backgroundColor: shown }} />
        </span>
      ) : (
        <span className="h-5 w-5 rounded border border-ring shadow-sm" style={{ backgroundColor: shown }} />
      )}
    </SidebarButton>
  );

  return (
    <PopoverPlug label={label} trigger={trigger}>
      <PlugSectionLabel>{label}</PlugSectionLabel>
      <div className="mb-3 grid grid-cols-5 gap-2">
        {onClear && (
          <button
            type="button"
            title="Default"
            aria-label="Default color"
            onClick={onClear}
            className={`${swatchClass} flex items-center justify-center bg-surface-card text-muted-foreground ${!value ? "ring-2 ring-foreground/40" : ""}`}
          >
            <Ban className="h-4 w-4" />
          </button>
        )}
        {allowTransparent && (
          <button
            type="button"
            title="Transparent"
            aria-label="Transparent"
            onClick={() => onChange("transparent")}
            className={`${swatchClass} ${value === "transparent" ? "ring-2 ring-foreground/40" : ""}`}
            style={CHECKER_STYLE}
          />
        )}
        {COLORS.map((color) => (
          <button
            key={color}
            type="button"
            title={color}
            aria-label={color}
            onClick={() => onChange(color)}
            className={`${swatchClass} ${value === color ? "ring-2 ring-foreground/40" : ""}`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
      <div className="border-t border-border pt-3">
        <PlugSectionLabel>Custom Hex</PlugSectionLabel>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-1">
          <input
            type="color"
            className="ml-1 h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
            value={/^#[0-9a-f]{6}$/i.test(value || "") ? value : "#ffffff"}
            onChange={(e) => onChange(e.target.value)}
          />
          <Input
            className="h-7 border-0 bg-transparent p-0 font-mono text-xs text-foreground focus-visible:ring-0"
            value={value && value !== "transparent" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="#000000"
          />
        </div>
      </div>
    </PopoverPlug>
  );
}
