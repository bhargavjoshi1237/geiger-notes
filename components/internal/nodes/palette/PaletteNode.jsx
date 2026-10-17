"use client";

import React, { memo } from "react";
import { ChevronLeft, ChevronRight, Palette, Pipette, Plus, X } from "lucide-react";
import { toast } from "sonner";
import NodeShell, { useNodeDataUpdater } from "@/components/internal/nodes/shared/NodeShell";
import TextEditingTrait from "@/components/internal/nodes/traits/TextEditingTrait";
import ColorPicker from "@/components/internal/edges/ColorePicker";

export const makeSwatchId = () => `sw-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export const nodeMeta = {
  type: "palette",
  label: "Palette",
  icon: Palette,
  cardColor: true,
  create: () => ({
    data: {
      title: "",
      layout: "grid",
      swatches: [
        { id: makeSwatchId(), hex: "#1e3a5f", name: "Ink" },
        { id: makeSwatchId(), hex: "#3b82f6", name: "Primary" },
        { id: makeSwatchId(), hex: "#93c5fd", name: "Sky" },
        { id: makeSwatchId(), hex: "#f59e0b", name: "Accent" },
        { id: makeSwatchId(), hex: "#f5f5f4", name: "Paper" },
      ],
    },
    style: { width: 420, height: 240 },
  }),
};

export const normalizeHex = (value = "") => {
  let h = String(value).trim().replace(/^#/, "").toLowerCase();
  if (/^[0-9a-f]{3}$/.test(h)) h = h.split("").map((c) => c + c).join("");
  return /^[0-9a-f]{6}$/.test(h) ? `#${h}` : null;
};

export const hexToHsl = (hex) => {
  const n = normalizeHex(hex) || "#000000";
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(n.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h * 60, s, l };
};

export const hslToHex = ({ h, s, l }) => {
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return `#${[f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join("")}`;
};

// Tints → shades of one hue, light to dark, named on a 100–900 style scale.
export const generateShades = (base, count = 9, prefix = "") => {
  const { h, s } = hexToHsl(base);
  const n = Math.max(2, count);
  return Array.from({ length: n }, (_, i) => {
    const l = 0.95 - (i / (n - 1)) * 0.8;
    const step = Math.round(((i + 1) * 900) / n / 50) * 50 || 50;
    return { id: makeSwatchId(), hex: hslToHex({ h, s: Math.min(1, s), l }), name: `${prefix ? `${prefix} ` : ""}${step}` };
  });
};

// Black or white label ink, whichever reads on the swatch fill.
export const inkFor = (hex) => {
  const n = normalizeHex(hex) || "#000000";
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(n.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? "#111111" : "#ffffff";
};

export async function copyHex(hex) {
  try {
    await navigator.clipboard.writeText(hex);
    toast.success(`Copied ${hex}`);
  } catch {
    toast.error("Couldn't copy to clipboard");
  }
}

function SwatchControls({ ink, onLeft, onRight, onRemove, hex, onColor }) {
  const btn = "nodrag flex h-6 w-6 items-center justify-center rounded-md hover:bg-black/15";
  return (
    <div
      className="absolute right-1 top-1 flex items-center gap-0.5 opacity-0 transition-opacity group-hover/sw:opacity-100"
      style={{ color: ink }}
      onClick={(e) => e.stopPropagation()}
    >
      {onLeft && (
        <button type="button" onClick={onLeft} aria-label="Move left" className={btn}>
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
      )}
      {onRight && (
        <button type="button" onClick={onRight} aria-label="Move right" className={btn}>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      )}
      <ColorPicker value={hex} onChange={onColor} side="bottom" align="end">
        <button type="button" aria-label="Edit color" className={btn}>
          <Pipette className="h-3.5 w-3.5" />
        </button>
      </ColorPicker>
      <button type="button" onClick={onRemove} aria-label="Remove swatch" className={btn}>
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function PaletteNode({ id, data, selected, dragging }) {
  const update = useNodeDataUpdater(id);
  const swatches = Array.isArray(data.swatches) ? data.swatches : [];
  const strip = data.layout === "strip";

  const setSwatches = (next) => update({ swatches: next });
  const patchSwatch = (swId, patch) => setSwatches(swatches.map((s) => (s.id === swId ? { ...s, ...patch } : s)));
  const move = (index, delta) => {
    const next = [...swatches];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    setSwatches(next);
  };
  const add = () => {
    const last = swatches[swatches.length - 1]?.hex || "#3b82f6";
    const { h, s, l } = hexToHsl(last);
    setSwatches([...swatches, { id: makeSwatchId(), hex: hslToHex({ h: (h + 35) % 360, s: s || 0.6, l: l || 0.5 }), name: "" }]);
  };

  const controlsFor = (sw, i) =>
    selected && (
      <SwatchControls
        ink={inkFor(sw.hex)}
        hex={sw.hex}
        onLeft={i > 0 ? () => move(i, -1) : null}
        onRight={i < swatches.length - 1 ? () => move(i, 1) : null}
        onRemove={() => setSwatches(swatches.filter((x) => x.id !== sw.id))}
        onColor={(hex) => {
          const valid = normalizeHex(hex);
          if (valid) patchSwatch(sw.id, { hex: valid });
        }}
      />
    );

  const nameField = (sw, className, style) =>
    selected ? (
      <TextEditingTrait className="min-w-0">
        <input
          value={sw.name || ""}
          onChange={(e) => patchSwatch(sw.id, { name: e.target.value })}
          placeholder="Name"
          className={`w-full bg-transparent focus:outline-none placeholder:opacity-60 ${className}`}
          style={style}
        />
      </TextEditingTrait>
    ) : (
      <p className={`truncate ${className}`} style={style}>
        {sw.name || "Untitled"}
      </p>
    );

  return (
    <NodeShell id={id} data={data} selected={selected} dragging={dragging} minWidth={210} minHeight={135}>
      <div className="flex h-full w-full flex-col gap-3 overflow-hidden p-4 text-foreground">
        {(selected || data.title) && (
          <div className="flex items-center gap-2">
            {selected ? (
              <TextEditingTrait className="min-w-0 flex-1">
                <input
                  value={data.title || ""}
                  onChange={(e) => update({ title: e.target.value })}
                  placeholder="Palette name..."
                  className="w-full bg-transparent text-sm font-semibold focus:outline-none placeholder:text-muted-foreground"
                />
              </TextEditingTrait>
            ) : (
              <p className="min-w-0 flex-1 truncate text-sm font-semibold">{data.title}</p>
            )}
            <span className="shrink-0 text-[11px] text-muted-foreground">{swatches.length} colors</span>
          </div>
        )}

        {swatches.length === 0 ? (
          <button
            type="button"
            onClick={add}
            className="nodrag flex flex-1 items-center justify-center gap-1 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> Add a color
          </button>
        ) : strip ? (
          <div className="flex min-h-0 flex-1 overflow-hidden rounded-lg">
            {swatches.map((sw, i) => {
              const ink = inkFor(sw.hex);
              return (
                <div
                  key={sw.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => copyHex(sw.hex)}
                  onKeyDown={(e) => e.key === "Enter" && copyHex(sw.hex)}
                  title={`Copy ${sw.hex}`}
                  className="group/sw nodrag relative flex min-w-0 flex-1 cursor-copy flex-col justify-end p-2"
                  style={{ backgroundColor: sw.hex }}
                >
                  {controlsFor(sw, i)}
                  <div onClick={(e) => selected && e.stopPropagation()}>{nameField(sw, "text-xs font-medium", { color: ink })}</div>
                  <p className="truncate font-mono text-[10px] uppercase opacity-80" style={{ color: ink }}>
                    {sw.hex}
                  </p>
                </div>
              );
            })}
            {selected && (
              <button
                type="button"
                onClick={add}
                aria-label="Add color"
                className="nodrag flex w-8 shrink-0 items-center justify-center bg-surface-hover text-muted-foreground hover:text-foreground"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : (
          <div
            className="nowheel grid min-h-0 flex-1 auto-rows-min gap-2.5 overflow-y-auto"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(76px, 1fr))" }}
          >
            {swatches.map((sw, i) => (
              <div key={sw.id} className="group/sw relative flex min-w-0 flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => copyHex(sw.hex)}
                  title={`Copy ${sw.hex}`}
                  className="nodrag h-14 w-full cursor-copy rounded-lg border border-border/60 transition-transform hover:scale-[1.03]"
                  style={{ backgroundColor: sw.hex }}
                />
                {controlsFor(sw, i)}
                <div className="min-w-0 px-0.5">
                  {nameField(sw, "text-xs font-medium text-foreground")}
                  <p className="truncate font-mono text-[10px] uppercase text-muted-foreground">{sw.hex}</p>
                </div>
              </div>
            ))}
            {selected && (
              <button
                type="button"
                onClick={add}
                aria-label="Add color"
                className="nodrag flex h-14 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground hover:text-foreground"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </NodeShell>
  );
}

export default memo(PaletteNode);
