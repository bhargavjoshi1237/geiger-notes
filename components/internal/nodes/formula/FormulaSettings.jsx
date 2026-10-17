"use client";

import React from "react";
import { Hash, SquareFunction, Table2 } from "lucide-react";
import { Input, Label, Popover, PopoverContent, PopoverTrigger, SegmentedTabs } from "@geiger/ui";
import { SidebarButton } from "@/components/internal/layout/sidebar/SidebarPrimitives";
import { FORMULA_FUNCTIONS, FORMULA_OPS } from "./formula-engine";

const POPOVER_CLASS = "w-64 bg-surface-dialog border-border p-3 shadow-xl rounded-xl";
const FORMATS = [
  { value: "number", label: "Number" },
  { value: "currency", label: "Currency" },
  { value: "percent", label: "Percent" },
];

const SectionLabel = ({ children }) => (
  <Label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
    {children}
  </Label>
);

export default function FormulaSettings({ node, updateData }) {
  const data = node?.data ?? {};
  const op = data.op || "sum";

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <SidebarButton icon={SquareFunction} label="Operation" />
        </PopoverTrigger>
        <PopoverContent side="right" align="start" sideOffset={8} className={POPOVER_CLASS}>
          <SectionLabel>Operation</SectionLabel>
          <div className="flex flex-col gap-0.5">
            {FORMULA_OPS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => updateData({ op: o.value })}
                className={`rounded-lg px-2 py-1.5 text-left text-xs transition-colors ${
                  op === o.value
                    ? "bg-surface-hover text-foreground"
                    : "text-muted-foreground hover:bg-surface-hover/50 hover:text-foreground"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          {op === "custom" && (
            <div className="mt-3 border-t border-border pt-3">
              <SectionLabel>Expression</SectionLabel>
              <Input
                value={data.expression ?? ""}
                onChange={(e) => updateData({ expression: e.target.value })}
                placeholder="(A + B) / C"
                spellCheck={false}
                className="h-8 font-mono text-xs"
              />
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                Use A, B, C… for connected nodes, + - * / % ^ and {FORMULA_FUNCTIONS.join(", ")}.
              </p>
            </div>
          )}
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <SidebarButton icon={Hash} label="Number format" />
        </PopoverTrigger>
        <PopoverContent side="right" align="start" sideOffset={8} className={POPOVER_CLASS}>
          <SectionLabel>Format</SectionLabel>
          <SegmentedTabs
            fullWidth
            tabs={FORMATS}
            value={data.format || "number"}
            onChange={(format) => updateData({ format })}
            buttonClassName="h-7 px-2 text-xs"
          />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div>
              <SectionLabel>Decimals</SectionLabel>
              <Input
                type="number"
                min={0}
                max={6}
                value={data.decimals ?? 0}
                onChange={(e) => updateData({ decimals: Math.max(0, Math.min(6, Number(e.target.value) || 0)) })}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <SectionLabel>Unit</SectionLabel>
              <Input
                value={data.unit ?? ""}
                onChange={(e) => updateData({ unit: e.target.value.slice(0, 12) })}
                placeholder="hrs"
                className="h-8 text-xs"
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <SidebarButton icon={Table2} label="Table column" />
        </PopoverTrigger>
        <PopoverContent side="right" align="start" sideOffset={8} className={POPOVER_CLASS}>
          <SectionLabel>Table column</SectionLabel>
          <Input
            value={data.column ?? ""}
            onChange={(e) => updateData({ column: e.target.value })}
            placeholder="All numeric cells"
            className="h-8 text-xs"
          />
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            Header name to read from connected tables. Leave empty to use every numeric cell.
          </p>
        </PopoverContent>
      </Popover>
    </>
  );
}
