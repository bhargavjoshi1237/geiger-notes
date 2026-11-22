"use client";

import React from "react";
import { ChevronRight } from "lucide-react";
import { Label, Popover, PopoverContent, PopoverTrigger, Slider } from "@geiger/ui";
import { RAIL_POPOVER, SidebarButton } from "../SidebarPrimitives";
import ColorPicker from "../../../edges/ColorePicker";
import { NESTED_POPOVER, useNestedAnchor } from "@/components/internal/ui/nested-popover";

// Rail button that opens a settings popover to its right, matching the existing plugs.
export function PlugPopover({ icon, label, active, width = "w-64", children, trigger }) {
  // A row inside an overflow menu opens beside that menu, centred on it, rather than off the rail.
  const nested = trigger?.type === MenuRow;
  const { triggerRef, anchor } = useNestedAnchor();
  return (
    <Popover>
      <PopoverTrigger asChild ref={nested ? triggerRef : undefined}>
        {trigger || <SidebarButton icon={icon} label={label} active={active} title={label} aria-label={label} />}
      </PopoverTrigger>
      {nested && anchor}
      <PopoverContent
        {...(nested ? NESTED_POPOVER : RAIL_POPOVER)}
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

// Snapping slider over a short ordered scale; ticks mark each stop and the labels underneath jump straight to it.
export function StepSlider({ options, value, onChange, label }) {
  const index = options.findIndex((opt) => opt.value === value);
  const last = options.length - 1;
  // Radix keeps the 16px thumb inside the track, so stop i sits at 8px + i/last of the remaining width.
  const at = (i) => `calc(8px + (100% - 16px) * ${i / last})`;
  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        <Slider
          value={[Math.max(index, 0)]}
          min={0}
          max={last}
          step={1}
          onValueChange={([i]) => onChange(options[i].value)}
          aria-label={label}
          aria-valuetext={options[index]?.label}
          className={`step-slider ${index < 0 ? "[&_[data-slot=slider-thumb]]:opacity-40" : ""}`}
        />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          {options.map((opt, i) =>
            i === index ? null : (
              <span
                key={String(opt.value)}
                className={`absolute top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors ${
                  i < index ? "bg-primary-foreground/70" : "bg-foreground/30"
                }`}
                style={{ left: at(i) }}
              />
            ),
          )}
        </div>
      </div>
      <div className="relative h-4">
        {options.map((opt, i) => (
          <button
            key={String(opt.value)}
            type="button"
            tabIndex={-1}
            onClick={() => onChange(opt.value)}
            className={`absolute top-0 text-[10px] leading-4 transition-colors ${
              i === index ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
            style={i === 0 ? { left: 0 } : i === last ? { right: 0 } : { left: at(i), transform: "translateX(-50%)" }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// Inline colour swatch row that opens the shared ColorPicker; `allowClear` adds a reset-to-theme chip.
export function ColorRow({ value, onChange, placeholder = "Theme", allowClear = true }) {
  return (
    <div className="flex items-center gap-2">
      <ColorPicker value={value} onChange={onChange} nested>
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
