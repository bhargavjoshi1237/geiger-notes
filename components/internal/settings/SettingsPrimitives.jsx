"use client";

import React from "react";
import { Switch } from "@/components/ui/switch";

// Small uppercase group heading used to break a section into logical groups.
export function GroupLabel({ children, className = "" }) {
  return (
    <h4
      className={`text-[11px] font-semibold text-zinc-500 uppercase tracking-wider ${className}`}
    >
      {children}
    </h4>
  );
}

// A labelled row with an arbitrary control on the right. Used for switches,
// segmented controls, buttons, etc.
export function SettingRow({ title, description, control, disabled }) {
  return (
    <div
      className={`flex items-center justify-between gap-4 py-2.5 ${
        disabled ? "opacity-50" : ""
      }`}
    >
      <div className="space-y-0.5 min-w-0">
        <div className="text-sm font-medium text-zinc-200">{title}</div>
        {description ? (
          <p className="text-xs text-zinc-500 leading-snug">{description}</p>
        ) : null}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

// Convenience wrapper: a SettingRow whose control is a Switch.
export function ToggleRow({ title, description, checked, onChange, disabled }) {
  return (
    <SettingRow
      title={title}
      description={description}
      disabled={disabled}
      control={
        <Switch
          checked={!!checked}
          onCheckedChange={onChange}
          disabled={disabled}
        />
      }
    />
  );
}

// A compact segmented control (radio-style group of buttons).
export function Segmented({ options, value, onChange }) {
  return (
    <div className="inline-flex items-center rounded-md border border-zinc-700 bg-zinc-900/50 p-0.5">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              active
                ? "bg-zinc-100 text-zinc-900"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
