"use client";

import React from "react";
import {
  Timer as TimerIcon,
  Hourglass,
  Repeat,
  Watch,
  CalendarClock,
  Clock3,
  Type,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Input, Label, Popover, PopoverContent, PopoverTrigger } from "@geiger/ui";
import { SidebarButton } from "@/components/internal/layout/sidebar/SidebarPrimitives";
import ColorPicker from "@/components/internal/edges/ColorePicker";
import { DEFAULT_POMODORO, IDLE_STATE, MODE_LABEL } from "./TimerNode";

const MODES = [
  { value: "timer", icon: Hourglass, hint: "Count down a duration" },
  { value: "pomodoro", icon: Repeat, hint: "Focus and break cycles" },
  { value: "stopwatch", icon: Watch, hint: "Count up from zero" },
  { value: "countdown", icon: CalendarClock, hint: "Days until a date" },
];

const PRESETS = [1, 5, 10, 15, 25, 45, 60];

const POPOVER_CLASS = "w-64 bg-surface-dialog border-border p-3 shadow-xl rounded-xl";
const SECTION_LABEL = "text-[10px] uppercase tracking-wider text-muted-foreground font-semibold";

function SettingPopover({ icon, label, children }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <SidebarButton icon={icon} label={label} aria-label={label} title={label} />
      </PopoverTrigger>
      <PopoverContent side="right" align="start" sideOffset={8} className={POPOVER_CLASS}>
        {children}
      </PopoverContent>
    </Popover>
  );
}

function NumberField({ label, value, onChange, min = 0, max }) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      <Input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Math.max(min, Math.min(max ?? Infinity, Number(e.target.value) || 0)))}
        className="h-8 bg-surface-card text-sm tabular-nums"
      />
    </div>
  );
}

// datetime-local wants "YYYY-MM-DDTHH:mm" in local time.
const toLocalInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
};

export default function TimerSettings({ node, updateData }) {
  const data = node.data || {};
  const mode = data.mode || "timer";
  const pomo = { ...DEFAULT_POMODORO, ...(data.pomodoro || {}) };
  const duration = data.durationMs || 0;
  const h = Math.floor(duration / 3600000);
  const m = Math.floor((duration % 3600000) / 60000);
  const s = Math.floor((duration % 60000) / 1000);

  const setDuration = (nh, nm, ns) =>
    updateData({ ...IDLE_STATE, durationMs: Math.max(1000, (nh * 3600 + nm * 60 + ns) * 1000) });
  const setPomo = (patch) => updateData({ ...IDLE_STATE, pomodoro: { ...pomo, ...patch } });

  return (
    <>
      <SettingPopover icon={TimerIcon} label="Mode">
        <div className="flex flex-col gap-0.5">
          <Label className={`px-2 py-1.5 ${SECTION_LABEL}`}>Mode</Label>
          {MODES.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => updateData({ ...IDLE_STATE, mode: opt.value })}
              className={`flex items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors ${
                mode === opt.value
                  ? "bg-surface-hover text-foreground"
                  : "text-muted-foreground hover:bg-surface-hover/50 hover:text-foreground"
              }`}
            >
              <opt.icon className="h-4 w-4 shrink-0" />
              <span className="flex flex-col">
                <span className="text-sm">{MODE_LABEL[opt.value]}</span>
                <span className="text-[11px] text-muted-foreground">{opt.hint}</span>
              </span>
            </button>
          ))}
        </div>
      </SettingPopover>

      {mode !== "stopwatch" && (
        <SettingPopover icon={Clock3} label="Duration">
          {mode === "timer" && (
            <div className="flex flex-col gap-3">
              <Label className={SECTION_LABEL}>Duration</Label>
              <div className="grid grid-cols-3 gap-2">
                <NumberField label="Hours" value={h} max={99} onChange={(v) => setDuration(v, m, s)} />
                <NumberField label="Min" value={m} max={59} onChange={(v) => setDuration(h, v, s)} />
                <NumberField label="Sec" value={s} max={59} onChange={(v) => setDuration(h, m, v)} />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => updateData({ ...IDLE_STATE, durationMs: p * 60000 })}
                    className={`rounded-md border border-border px-2 py-1 text-xs transition-colors ${
                      duration === p * 60000
                        ? "bg-surface-active text-foreground"
                        : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                    }`}
                  >
                    {p}m
                  </button>
                ))}
              </div>
            </div>
          )}
          {mode === "pomodoro" && (
            <div className="flex flex-col gap-3">
              <Label className={SECTION_LABEL}>Pomodoro (minutes)</Label>
              <div className="grid grid-cols-2 gap-2">
                <NumberField label="Focus" value={pomo.workMin} min={1} max={180} onChange={(v) => setPomo({ workMin: v })} />
                <NumberField label="Short break" value={pomo.shortMin} min={1} max={60} onChange={(v) => setPomo({ shortMin: v })} />
                <NumberField label="Long break" value={pomo.longMin} min={1} max={120} onChange={(v) => setPomo({ longMin: v })} />
                <NumberField label="Long every" value={pomo.longEvery} min={2} max={12} onChange={(v) => setPomo({ longEvery: v })} />
              </div>
              <button
                type="button"
                onClick={() => setPomo({ phase: "work", cycle: 1 })}
                className="rounded-md border border-border px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
              >
                Reset cycles
              </button>
            </div>
          )}
          {mode === "countdown" && (
            <div className="flex flex-col gap-2">
              <Label className={SECTION_LABEL}>Target date &amp; time</Label>
              <Input
                type="datetime-local"
                value={toLocalInput(data.targetDate)}
                onChange={(e) =>
                  updateData({ targetDate: e.target.value ? new Date(e.target.value).toISOString() : "" })
                }
                className="h-8 bg-surface-card text-sm"
              />
            </div>
          )}
        </SettingPopover>
      )}

      <SettingPopover icon={Type} label="Label">
        <div className="flex flex-col gap-2">
          <Label className={SECTION_LABEL}>Label</Label>
          <Input
            value={data.label || ""}
            onChange={(e) => updateData({ label: e.target.value })}
            placeholder="e.g. Standup"
            className="h-8 bg-surface-card text-sm"
          />
        </div>
      </SettingPopover>

      <ColorPicker value={data.accent} onChange={(accent) => updateData({ accent })}>
        <div>
          <SidebarButton label="Accent" aria-label="Accent color" title="Accent color">
            <div
              className="h-5 w-5 rounded-full border border-ring shadow-sm"
              style={{ backgroundColor: data.accent || "var(--primary)" }}
            />
          </SidebarButton>
        </div>
      </ColorPicker>

      <SidebarButton
        icon={data.muted ? VolumeX : Volume2}
        label={data.muted ? "Unmute chime" : "Mute chime"}
        aria-label={data.muted ? "Unmute chime" : "Mute chime"}
        title={data.muted ? "Unmute chime" : "Mute chime"}
        active={!data.muted}
        onClick={() => updateData({ muted: !data.muted })}
      />
    </>
  );
}
