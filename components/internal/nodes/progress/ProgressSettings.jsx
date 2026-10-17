"use client";

import React from "react";
import { Circle, Flag, GitFork, Hash, PencilLine, RectangleHorizontal, SlidersHorizontal } from "lucide-react";
import { Input, Label, Popover, PopoverContent, PopoverTrigger } from "@geiger/ui";
import { SidebarButton } from "@/components/internal/layout/sidebar/SidebarPrimitives";
import ColorPicker from "@/components/internal/edges/ColorePicker";

const SECTION_LABEL = "text-[10px] uppercase tracking-wider text-muted-foreground font-semibold";

function OptionRow({ active, icon: Icon, title, hint, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors ${
        active ? "bg-surface-hover text-foreground" : "text-muted-foreground hover:bg-surface-hover/50 hover:text-foreground"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex flex-col">
        <span className="text-sm">{title}</span>
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </span>
    </button>
  );
}

function SettingPopover({ icon, label, children }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <SidebarButton icon={icon} label={label} aria-label={label} title={label} />
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        sideOffset={8}
        className="w-64 bg-surface-dialog border-border p-3 shadow-xl rounded-xl"
      >
        <div className="flex flex-col gap-0.5">
          <Label className={`px-2 py-1.5 ${SECTION_LABEL}`}>{label}</Label>
          {children}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function ProgressSettings({ node, updateData }) {
  const data = node.data || {};
  const source = data.source || "manual";
  const style = data.style || "bar";

  return (
    <>
      <SettingPopover icon={SlidersHorizontal} label="Style">
        <OptionRow active={style === "bar"} icon={RectangleHorizontal} title="Bar" onClick={() => updateData({ style: "bar" })} />
        <OptionRow active={style === "ring"} icon={Circle} title="Ring" onClick={() => updateData({ style: "ring" })} />
      </SettingPopover>

      <SettingPopover icon={GitFork} label="Source">
        <OptionRow
          active={source === "manual"}
          icon={PencilLine}
          title="Manual"
          hint="Track a value against a target"
          onClick={() => updateData({ source: "manual" })}
        />
        <OptionRow
          active={source === "connected"}
          icon={GitFork}
          title="Connected"
          hint="Roll up linked to-dos, columns and goals"
          onClick={() => updateData({ source: "connected" })}
        />
      </SettingPopover>

      {source === "manual" && (
        <SettingPopover icon={Hash} label="Target">
          <div className="grid grid-cols-2 gap-2 px-2 pb-1">
            <div className="flex flex-col gap-1">
              <Label className="text-[11px] text-muted-foreground">Current</Label>
              <Input
                type="number"
                min={0}
                value={data.value ?? 0}
                onChange={(e) => updateData({ value: Math.max(0, Number(e.target.value) || 0) })}
                className="h-8 bg-surface-card text-sm tabular-nums"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-[11px] text-muted-foreground">Target</Label>
              <Input
                type="number"
                min={1}
                value={data.max ?? 10}
                onChange={(e) => updateData({ max: Math.max(1, Number(e.target.value) || 1) })}
                className="h-8 bg-surface-card text-sm tabular-nums"
              />
            </div>
          </div>
        </SettingPopover>
      )}

      <ColorPicker value={data.color} onChange={(color) => updateData({ color })}>
        <div>
          <SidebarButton label="Bar color" aria-label="Bar color" title="Bar color">
            <div
              className="h-5 w-5 rounded-full border border-ring shadow-sm"
              style={{ backgroundColor: data.color || "var(--primary)" }}
            />
          </SidebarButton>
        </div>
      </ColorPicker>

      <SidebarButton
        icon={Flag}
        label="Milestones"
        aria-label="Toggle milestones"
        title={data.showMilestones ? "Hide milestones" : "Show milestones"}
        active={!!data.showMilestones}
        onClick={() => updateData({ showMilestones: !data.showMilestones })}
      />
    </>
  );
}
