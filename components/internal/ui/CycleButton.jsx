"use client";

import React from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@geiger/ui";
import { RAIL_POPOVER, SidebarButton } from "@/components/internal/layout/sidebar/SidebarPrimitives";

// Click-to-cycle controls for short option lists (2-6 states). Each option is
// { value, label, icon } where icon takes a className; the first option is the "off" state.
// Click steps forward, Shift-click steps back, and both wrap around.

const FLASH_MS = 1200;

// Attaches a glyph per option value: withIcons(FLOW_ANIMATIONS, FLOW_GLYPHS).
export function withIcons(options, icons) {
  return options.map((opt) => ({ ...opt, icon: icons[opt.value] }));
}

function useCycle(options, value, onChange) {
  const found = options.findIndex((opt) => opt.value === value);
  const index = found === -1 ? 0 : found;
  const step = (event) => {
    const offset = event?.shiftKey ? options.length - 1 : 1;
    onChange(options[(index + offset) % options.length].value);
  };
  return { current: options[index], index, step };
}

// The current state's glyph; keyed by value so every change replays the flip-in.
function StateIcon({ option, className }) {
  const Icon = option.icon;
  return (
    <span key={String(option.value)} className="cycle-in flex items-center justify-center">
      {Icon ? <Icon className={className} strokeWidth={1.75} /> : null}
    </span>
  );
}

// One dot per state, the current one lit, so it's clear the control flips through a set.
function StateDots({ count, index, className = "" }) {
  return (
    <span aria-hidden className={`pointer-events-none flex gap-[3px] ${className}`}>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={`h-[3px] w-[3px] rounded-full transition-colors duration-200 ${
            i === index ? "bg-current" : "bg-current opacity-25"
          }`}
        />
      ))}
    </span>
  );
}

// Rail button: the icon shows the current state; the tooltip names it on hover and briefly after each click.
export function CycleButton({ label, options, value, onChange }) {
  const { current, index, step } = useCycle(options, value, onChange);
  const [hovered, setHovered] = React.useState(false);
  const [flashing, setFlashing] = React.useState(false);
  const timer = React.useRef(null);

  React.useEffect(() => () => clearTimeout(timer.current), []);

  const handleClick = (event) => {
    step(event);
    setFlashing(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setFlashing(false), FLASH_MS);
  };

  return (
    <TooltipProvider>
      <Tooltip open={hovered || flashing}>
        <TooltipTrigger asChild>
          <SidebarButton
            active={index !== 0}
            onClick={handleClick}
            onPointerEnter={() => setHovered(true)}
            onPointerLeave={() => setHovered(false)}
            aria-label={`${label}: ${current.label}. Click to change, Shift-click to go back.`}
          >
            <StateIcon option={current} className="h-5 w-5" />
            <StateDots count={options.length} index={index} className="absolute -bottom-[5px] left-1/2 -translate-x-1/2" />
          </SidebarButton>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={RAIL_POPOVER.sideOffset} className="flex items-center gap-1.5">
          <span key={String(current.value)} className="cycle-in font-medium">
            {current.label}
          </span>
          <span className="opacity-60">· {label}</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Inline chip for popovers and settings rows: glyph + label, flipping to the next state on click.
export function CycleChip({ label, options, value, onChange, className = "w-36" }) {
  const { current, index, step } = useCycle(options, value, onChange);
  return (
    <button
      type="button"
      onClick={step}
      title="Click to change · Shift-click to go back"
      aria-label={`${label}: ${current.label}. Click to change, Shift-click to go back.`}
      className={`group flex h-8 shrink-0 select-none items-center gap-2 rounded-lg border border-border bg-surface-card px-2.5 text-xs text-foreground transition-[background-color,border-color,transform] duration-150 hover:border-ring hover:bg-surface-hover active:scale-[0.97] ${className}`}
    >
      <span className="text-muted-foreground transition-colors group-hover:text-foreground">
        <StateIcon option={current} className="h-4 w-4" />
      </span>
      <span key={String(current.value)} className="cycle-in flex-1 truncate text-left">
        {current.label}
      </span>
      <StateDots count={options.length} index={index} className="text-muted-foreground" />
    </button>
  );
}
