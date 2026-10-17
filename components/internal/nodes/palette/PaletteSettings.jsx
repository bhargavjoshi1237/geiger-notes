"use client";

import React, { useState } from "react";
import { Copy, LayoutGrid, Plus, Rows3, Wand2 } from "lucide-react";
import { Button, Input, Label, Popover, PopoverContent, PopoverTrigger } from "@geiger/ui";
import { toast } from "sonner";
import { SidebarButton } from "@/components/internal/layout/sidebar/SidebarPrimitives";
import { generateShades, hexToHsl, hslToHex, makeSwatchId, normalizeHex } from "./PaletteNode";

const SECTION_LABEL = "text-[10px] uppercase tracking-wider text-muted-foreground font-semibold";
const COUNTS = [5, 7, 9, 11];

function ShadeGenerator({ swatches, updateData }) {
  const [base, setBase] = useState(swatches[0]?.hex || "#3b82f6");
  const [count, setCount] = useState(9);
  const [prefix, setPrefix] = useState("");
  const valid = normalizeHex(base);
  const preview = valid ? generateShades(valid, count) : [];

  const apply = (replace) => {
    if (!valid) return;
    const shades = generateShades(valid, count, prefix.trim());
    updateData({ swatches: replace ? shades : [...swatches, ...shades] });
    toast.success(`${replace ? "Replaced with" : "Added"} ${shades.length} shades`);
  };

  return (
    <div className="flex flex-col gap-3">
      <Label className={SECTION_LABEL}>Generate shades</Label>
      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-card p-1">
        <input
          type="color"
          value={valid || "#000000"}
          onChange={(e) => setBase(e.target.value)}
          className="ml-1 h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
          aria-label="Base color"
        />
        <Input
          value={base}
          onChange={(e) => setBase(e.target.value)}
          className="h-7 border-0 bg-transparent p-0 font-mono text-xs focus-visible:ring-0"
          placeholder="#3b82f6"
        />
      </div>
      <Input
        value={prefix}
        onChange={(e) => setPrefix(e.target.value)}
        placeholder="Name prefix (e.g. Blue)"
        className="h-8 bg-surface-card text-sm"
      />
      <div className="flex gap-1">
        {COUNTS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCount(c)}
            className={`flex-1 rounded-md border border-border py-1 text-xs transition-colors ${
              count === c ? "bg-surface-active text-foreground" : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="flex h-6 overflow-hidden rounded-md">
        {preview.map((s) => (
          <span key={s.id} className="flex-1" style={{ backgroundColor: s.hex }} />
        ))}
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="ghost" className="flex-1" disabled={!valid} onClick={() => apply(false)}>
          Append
        </Button>
        <Button size="sm" className="flex-1 bg-primary" disabled={!valid} onClick={() => apply(true)}>
          Replace
        </Button>
      </div>
    </div>
  );
}

export default function PaletteSettings({ node, updateData }) {
  const data = node.data || {};
  const swatches = Array.isArray(data.swatches) ? data.swatches : [];
  const layout = data.layout || "grid";

  const addSwatch = () => {
    const last = swatches[swatches.length - 1]?.hex || "#3b82f6";
    const { h, s, l } = hexToHsl(last);
    updateData({ swatches: [...swatches, { id: makeSwatchId(), hex: hslToHex({ h: (h + 35) % 360, s: s || 0.6, l: l || 0.5 }), name: "" }] });
  };

  const copyAll = async () => {
    const text = swatches.map((s) => `${s.name ? `${s.name}: ` : ""}${s.hex}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Palette copied");
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  };

  return (
    <>
      <SidebarButton
        icon={layout === "strip" ? Rows3 : LayoutGrid}
        label="Layout"
        aria-label={layout === "strip" ? "Switch to grid layout" : "Switch to strip layout"}
        title={layout === "strip" ? "Switch to grid" : "Switch to strip"}
        onClick={() => updateData({ layout: layout === "strip" ? "grid" : "strip" })}
      />

      <SidebarButton icon={Plus} label="Add color" aria-label="Add color" title="Add color" onClick={addSwatch} />

      <Popover>
        <PopoverTrigger asChild>
          <SidebarButton icon={Wand2} label="Generate shades" aria-label="Generate shades" title="Generate shades" />
        </PopoverTrigger>
        <PopoverContent
          side="right"
          align="start"
          sideOffset={8}
          className="w-64 bg-surface-dialog border-border p-3 shadow-xl rounded-xl"
        >
          <ShadeGenerator swatches={swatches} updateData={updateData} />
        </PopoverContent>
      </Popover>

      <SidebarButton icon={Copy} label="Copy palette" aria-label="Copy all colors" title="Copy all colors" onClick={copyAll} />
    </>
  );
}
