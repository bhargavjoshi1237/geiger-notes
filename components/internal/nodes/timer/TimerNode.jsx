"use client";

import React, { memo, useEffect, useRef, useState } from "react";
import { Timer as TimerIcon, Play, Pause, RotateCcw, SkipForward } from "lucide-react";
import { toast } from "sonner";
import NodeShell, { useNodeDataUpdater } from "@/components/internal/nodes/shared/NodeShell";

export const DEFAULT_POMODORO = { workMin: 25, shortMin: 5, longMin: 15, longEvery: 4, phase: "work", cycle: 1 };
export const PHASE_LABEL = { work: "Focus", short: "Short break", long: "Long break" };
export const MODE_LABEL = { timer: "Timer", pomodoro: "Pomodoro", stopwatch: "Stopwatch", countdown: "Countdown" };

// Idle state shared by mode switches and resets; timers are stored as timestamps so they survive reloads and sync.
export const IDLE_STATE = { running: false, startedAt: null, pausedElapsedMs: 0 };

export const nodeMeta = {
  type: "timer",
  label: "Timer",
  icon: TimerIcon,
  cardColor: true,
  create: () => ({
    data: {
      mode: "timer",
      durationMs: 5 * 60 * 1000,
      ...IDLE_STATE,
      targetDate: "",
      pomodoro: { ...DEFAULT_POMODORO },
      label: "",
      accent: "",
      muted: false,
    },
    style: { width: 300, height: 315 },
  }),
};

export const phaseMs = (p) =>
  Math.max(1, Number(p.phase === "short" ? p.shortMin : p.phase === "long" ? p.longMin : p.workMin) || 1) * 60000;

export const nextPhase = (p) =>
  p.phase === "work"
    ? { ...p, phase: p.cycle % (p.longEvery || 4) === 0 ? "long" : "short" }
    : { ...p, phase: "work", cycle: p.cycle + 1 };

const elapsedOf = (d, now) =>
  (d.pausedElapsedMs || 0) + (d.running && d.startedAt ? Math.max(0, now - d.startedAt) : 0);

const totalOf = (d) => (d.mode === "pomodoro" ? phaseMs(d.pomodoro || DEFAULT_POMODORO) : d.durationMs || 0);

const targetOf = (d) => {
  const t = d.targetDate ? new Date(d.targetDate).getTime() : NaN;
  return Number.isFinite(t) ? t : null;
};

// Remaining ms for count-down modes (null for the stopwatch).
const remainingOf = (d, now) => {
  if (d.mode === "stopwatch") return null;
  if (d.mode === "countdown") {
    const t = targetOf(d);
    return t == null ? 0 : Math.max(0, t - now);
  }
  return Math.max(0, totalOf(d) - elapsedOf(d, now));
};

const pad = (n) => String(n).padStart(2, "0");

const formatClock = (ms, { ceil = true, tenths = false } = {}) => {
  const secs = ceil ? Math.ceil(ms / 1000) : Math.floor(ms / 1000);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const base = h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  return tenths ? `${base}.${Math.floor((ms % 1000) / 100)}` : base;
};

// Gentle two-note chime via WebAudio; silently no-ops where audio is unavailable.
function playChime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [880, 1318.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + i * 0.22;
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.2);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 1.25);
    });
    setTimeout(() => ctx.close().catch(() => {}), 1800);
  } catch {
    // Audio blocked (autoplay policy) — the toast still announces completion.
  }
}

function ControlButton({ onClick, label, primary, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`nodrag flex h-9 items-center justify-center gap-1.5 rounded-full px-4 text-xs font-medium transition-colors ${
        primary
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "w-9 px-0 text-muted-foreground hover:bg-surface-hover hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function TimerNode({ id, data, selected, dragging }) {
  const update = useNodeDataUpdater(id);
  const mode = data.mode || "timer";
  const pomo = data.pomodoro || DEFAULT_POMODORO;
  const accent = data.accent || "var(--primary)";
  const [now, setNow] = useState(() => Date.now());
  const dataRef = useRef(data);
  const armedRef = useRef(false);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const target = targetOf(data);
  const active = mode === "countdown" ? target != null && target > now : !!data.running;

  // Tick only while something is actually counting; completion is detected inside the tick.
  useEffect(() => {
    if (!active) return undefined;
    const step = mode === "stopwatch" ? 100 : 250;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      const d = dataRef.current;
      const remaining = remainingOf(d, t);
      if (remaining == null) return;
      if (remaining > 0) {
        armedRef.current = true;
        return;
      }
      const live = armedRef.current;
      armedRef.current = false;
      const title = d.label || MODE_LABEL[d.mode || "timer"];
      if (d.mode === "pomodoro") {
        const next = nextPhase(d.pomodoro || DEFAULT_POMODORO);
        update({ ...IDLE_STATE, pomodoro: next });
        if (live) toast.success(next.phase === "work" ? "Break's over — back to focus" : "Focus session done — take a break");
      } else if (d.mode === "timer") {
        update({ ...IDLE_STATE, pausedElapsedMs: d.durationMs || 0 });
        if (live) toast.success(`${title} finished`);
      } else if (live) {
        toast.success(`${title}: it's time`);
      }
      if (live && !d.muted) playChime();
    };
    const handle = setInterval(tick, step);
    return () => clearInterval(handle);
  }, [active, mode, update]);

  const elapsed = elapsedOf(data, now);
  const remaining = remainingOf(data, now);
  const total = totalOf(data);
  const finished = mode === "timer" && !data.running && total > 0 && elapsed >= total;

  const start = () => {
    armedRef.current = false;
    const restart = finished ? { pausedElapsedMs: 0 } : {};
    update({ running: true, startedAt: Date.now(), ...restart });
  };
  const pause = () => update({ running: false, startedAt: null, pausedElapsedMs: elapsedOf(data, Date.now()) });
  const reset = () => update({ ...IDLE_STATE });
  const skip = () => update({ ...IDLE_STATE, pomodoro: nextPhase(pomo) });

  // Ring progress: share of the run consumed, or the position within the current minute for the stopwatch.
  const progress =
    mode === "stopwatch" ? (elapsed % 60000) / 60000 : total > 0 ? Math.min(1, elapsed / total) : 0;

  const subtitle =
    mode === "pomodoro"
      ? `${PHASE_LABEL[pomo.phase] || "Focus"} · Cycle ${pomo.cycle}`
      : mode === "countdown"
        ? target != null
          ? new Date(target).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
          : "Pick a date in settings"
        : MODE_LABEL[mode];

  const circumference = 2 * Math.PI * 45;

  return (
    <NodeShell id={id} data={data} selected={selected} dragging={dragging} minWidth={210} minHeight={210}>
      <div className="flex h-full w-full flex-col gap-2 p-4 text-foreground">
        <div className="flex min-w-0 flex-col items-center text-center">
          {data.label ? <p className="max-w-full truncate text-sm font-semibold">{data.label}</p> : null}
          <p className="max-w-full truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {subtitle}
          </p>
        </div>

        <div className="relative flex min-h-0 flex-1 items-center justify-center" style={{ containerType: "size" }}>
          {mode === "countdown" ? (
            <CountdownBlocks ms={remaining ?? 0} />
          ) : (
            <div className="relative" style={{ width: "min(100cqw, 100cqh)", height: "min(100cqw, 100cqh)" }}>
              <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90">
                <circle cx="50" cy="50" r="45" fill="none" stroke="var(--border)" strokeWidth="3" />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke={accent}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - progress)}
                  style={{ transition: data.running ? "stroke-dashoffset 250ms linear" : "none" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span
                  className="font-semibold leading-none tracking-tight tabular-nums"
                  style={{ fontSize: "calc(min(100cqw, 100cqh) * 0.2)" }}
                >
                  {mode === "stopwatch"
                    ? formatClock(elapsed, { ceil: false, tenths: elapsed < 3600000 })
                    : formatClock(remaining ?? 0)}
                </span>
                {mode === "pomodoro" && (
                  <div className="mt-2 flex gap-1">
                    {Array.from({ length: pomo.longEvery || 4 }).map((_, i) => (
                      <span
                        key={i}
                        className="h-1.5 w-1.5 rounded-full"
                        style={{
                          backgroundColor:
                            i < ((pomo.cycle - 1) % (pomo.longEvery || 4)) + (pomo.phase === "work" ? 0 : 1)
                              ? accent
                              : "var(--border)",
                        }}
                      />
                    ))}
                  </div>
                )}
                {finished && <span className="mt-1 text-[11px] font-medium text-muted-foreground">Done</span>}
              </div>
            </div>
          )}
        </div>

        {mode !== "countdown" && (
          <div className="flex items-center justify-center gap-2">
            <ControlButton onClick={reset} label="Reset">
              <RotateCcw className="h-4 w-4" />
            </ControlButton>
            {data.running ? (
              <ControlButton onClick={pause} label="Pause" primary>
                <Pause className="h-4 w-4" /> Pause
              </ControlButton>
            ) : (
              <ControlButton onClick={start} label="Start" primary>
                <Play className="h-4 w-4" /> {finished ? "Restart" : elapsed > 0 ? "Resume" : "Start"}
              </ControlButton>
            )}
            {mode === "pomodoro" ? (
              <ControlButton onClick={skip} label="Skip phase">
                <SkipForward className="h-4 w-4" />
              </ControlButton>
            ) : (
              <span className="w-9" />
            )}
          </div>
        )}
      </div>
    </NodeShell>
  );
}

function CountdownBlocks({ ms }) {
  const secs = Math.ceil(ms / 1000);
  const parts = [
    { value: Math.floor(secs / 86400), unit: "days" },
    { value: Math.floor((secs % 86400) / 3600), unit: "hrs" },
    { value: Math.floor((secs % 3600) / 60), unit: "min" },
    { value: secs % 60, unit: "sec" },
  ];
  return (
    <div className="grid w-full grid-cols-4 gap-1.5">
      {parts.map((p) => (
        <div key={p.unit} className="flex flex-col items-center rounded-lg bg-surface-hover/60 py-2">
          <span className="font-semibold leading-none tabular-nums" style={{ fontSize: "clamp(16px, 9cqw, 56px)" }}>
            {p.unit === "days" ? p.value : pad(p.value)}
          </span>
          <span className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">{p.unit}</span>
        </div>
      ))}
    </div>
  );
}

export default memo(TimerNode);
