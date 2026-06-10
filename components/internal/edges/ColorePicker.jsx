"use client";

import React from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export const COLORS = [
  "#e2e2e2",
  "#71717a",
  "#22d3ee",
  "#4ade80",
  "#fb923c",
  "#facc15",
  "#f472b6",
  "#c084fc",
  "#60a5fa",
  "#a8a29e",
  "#3b82f6",
  "#ef4444",
  "#f43f5e",
  "#d946ef",
  "#8b5cf6",
];

export default function ColorPicker({
  value,
  onChange,
  children,
  side = "right",
  align = "start",
  className,
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        sideOffset={8}
        className={`w-64 border-border p-3 shadow-2xl rounded-xl ${className || ""}`}
      >
        <div className="grid grid-cols-5 gap-2 mb-3">
          {COLORS.map((color) => (
            <button
              key={color}
              className="w-8 h-8 rounded-lg border border-border/50 hover:scale-110 hover:border-white transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-white/20"
              style={{ backgroundColor: color }}
              onClick={() => onChange(color)}
            />
          ))}
        </div>
        <div className="border-t border-border pt-3">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 block font-semibold">
            Custom Hex
          </Label>
          <div className="flex gap-2 items-center bg-muted/50 p-1 rounded-lg border border-border focus-within:border-border transition-colors">
            <input
              type="color"
              className="w-6 h-6 p-0 border-0 rounded bg-transparent cursor-pointer ml-1"
              value={value || "#ffffff"}
              onChange={(e) => onChange(e.target.value)}
            />
            <Input
              className="h-7 bg-transparent border-0 text-foreground text-xs font-mono focus-visible:ring-0 p-0"
              value={value || ""}
              onChange={(e) => onChange(e.target.value)}
              placeholder="#000000"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
