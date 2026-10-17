"use client";

import React from "react";
import { ChevronRight } from "lucide-react";
import { Label, Popover, PopoverContent, PopoverTrigger, Slider } from "@geiger/ui";
import { SidebarButton } from "../SidebarPrimitives";
import ColorPicker from "../../../edges/ColorePicker";

// Rail button that opens a settings popover to its right, matching the existing plugs.
export function PlugPopover({ icon, label, active, width = "w-64", children, trigger }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        {trigger || <SidebarButton icon={icon} label={label} active={active} title={label} aria-label={label} />}
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        sideOffset={8}
        className={`${width} bg-surface-dialog border-border p-3 shadow-xl rounded-xl`}
      >
        <div className="flex flex-col gap-3">{children}</div>
      </PopoverContent>
    </Popover>
  );
}

// Labelled row for plugs listed inside an overflow menu instead of on the rail; `chevron` marks a nested popover.
export const MenuRow = React.forwardRef(({ icon: Icon, label, active, chevron, className = "", ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors disabled:pointer-events-none disabled:opacity-40 ${
      active ? "bg-surface-active text-foreground" : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
    } ${className}`}
    {...props}
  >
    <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
    <span className="flex-1 truncate text-left">{label}</span>
    {chevron && <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />}
  </button>
));

MenuRow.displayName = "MenuRow";

export function PlugSection({ label, children, aside }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</Label>
        {aside}
      </div>
      {children}
    </div>
  );
}

// Compact segmented choice; `render` customises each option's content.
export function ChoiceGrid({ options, value, onChange, columns = 3, render }) {
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            title={opt.label}
            onClick={() => onChange(opt.value)}
            className={`flex flex-col items-center justify-center gap-1 rounded-lg border px-1.5 py-1.5 text-[11px] transition-colors ${
              active
                ? "border-foreground/60 bg-surface-active text-foreground"
                : "border-border/60 text-muted-foreground hover:bg-surface-hover hover:text-foreground"
            }`}
          >
            {render ? render(opt, active) : opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function SliderRow({ value, min, max, step = 1, onChange, format = (v) => v }) {
  return (
    <div className="flex items-center gap-3">
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
        className="flex-1"
      />
      <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{format(value)}</span>
    </div>
  );
}

// Inline colour swatch row that opens the shared ColorPicker; `allowClear` adds a reset-to-theme chip.
export function ColorRow({ value, onChange, placeholder = "Theme", allowClear = true }) {
  return (
    <div className="flex items-center gap-2">
      <ColorPicker value={value} onChange={onChange} side="right" align="start">
        <button
          type="button"
          className="flex h-8 flex-1 items-center gap-2 rounded-lg border border-border bg-surface-card px-2 text-xs hover:border-ring"
        >
          <span
            className="h-4 w-4 rounded border border-ring"
            style={{ background: value || "transparent" }}
          />
          <span className="truncate font-mono text-foreground">{value || placeholder}</span>
        </button>
      </ColorPicker>
      {allowClear && value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="h-8 rounded-lg border border-border px-2 text-[11px] text-muted-foreground hover:bg-surface-hover hover:text-foreground"
        >
          Reset
        </button>
      ) : null}
    </div>
  );
}
