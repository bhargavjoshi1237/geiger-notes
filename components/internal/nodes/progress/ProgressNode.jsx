"use client";

import React, { memo, useCallback, useEffect, useMemo } from "react";
import { useNodesData, useStore } from "@xyflow/react";
import { Goal, Link2, Minus, Plus } from "lucide-react";
import NodeShell, { useNodeDataUpdater } from "@/components/internal/nodes/shared/NodeShell";
import TextEditingTrait from "@/components/internal/nodes/traits/TextEditingTrait";

export const MILESTONES = [25, 50, 75];

export const nodeMeta = {
  type: "progress",
  label: "Progress",
  icon: Goal,
  cardColor: true,
  create: () => ({
    data: {
      title: "",
      style: "bar",
      source: "manual",
      value: 0,
      max: 10,
      color: "",
      showMilestones: false,
      pct: 0,
    },
    style: { width: 300, height: 150 },
  }),
};

const clampPct = (n) => Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0));

export const manualPct = (d) => {
  const max = Number(d.max) || 0;
  return max > 0 ? clampPct(((Number(d.value) || 0) / max) * 100) : 0;
};

// Undirected neighbour ids as a stable string so the selector only re-renders on real changes.
const useNeighborIds = (id) => {
  const key = useStore(
    useCallback(
      (s) =>
        s.edges
          .filter((e) => e.source === id || e.target === id)
          .map((e) => (e.source === id ? e.target : e.source))
          .filter((n) => n !== id)
          .sort()
          .join("|"),
      [id],
    ),
  );
  return useMemo(() => (key ? [...new Set(key.split("|"))] : []), [key]);
};

// Roll connected todos, column to-do cards and other progress goals into one figure.
export const summarizeConnected = (neighbors) => {
  let done = 0;
  let total = 0;
  let goals = 0;
  let goalPct = 0;
  for (const n of neighbors) {
    if (!n?.data) continue;
    if (n.type === "todo") {
      const items = (n.data.items || []).filter((it) => it.checked || (it.text || "").trim());
      total += items.length;
      done += items.filter((it) => it.checked).length;
    } else if (n.type === "column") {
      const items = (n.data.items || []).filter((it) => it.kind === "todo");
      total += items.length;
      done += items.filter((it) => it.checked).length;
    } else if (n.type === "progress") {
      goals += 1;
      goalPct += n.data.source === "connected" ? clampPct(n.data.pct) : manualPct(n.data);
    }
  }
  const units = total + goals;
  const pct = units > 0 ? clampPct(((done + goalPct / 100) / units) * 100) : 0;
  return { done, total, goals, pct, empty: units === 0 };
};

function ProgressNode({ id, data, selected, dragging }) {
  const update = useNodeDataUpdater(id);
  const source = data.source || "manual";
  const color = data.color || "var(--primary)";
  const neighborIds = useNeighborIds(id);
  const neighbors = useNodesData(source === "connected" ? neighborIds : []);
  const summary = useMemo(() => summarizeConnected(neighbors || []), [neighbors]);

  const value = Number(data.value) || 0;
  const max = Number(data.max) || 0;
  const pct = source === "connected" ? summary.pct : manualPct(data);
  const rounded = Math.round(pct);

  // Publish the rounded figure so other progress nodes can roll this one up; integer writes bound feedback loops.
  useEffect(() => {
    if (source === "connected" && data.pct !== rounded) update({ pct: rounded });
  }, [source, rounded, data.pct, update]);

  const setValue = (v) => update({ value: Math.max(0, Math.min(max || Infinity, v)) });

  const caption =
    source === "connected"
      ? summary.empty
        ? "Connect to-dos, columns or goals"
        : [summary.total > 0 && `${summary.done} of ${summary.total} done`, summary.goals > 0 && `${summary.goals} ${summary.goals === 1 ? "goal" : "goals"}`]
            .filter(Boolean)
            .join(" · ")
      : `${value} of ${max} done`;

  const reached = MILESTONES.filter((m) => rounded >= m).length;

  return (
    <NodeShell id={id} data={data} selected={selected} dragging={dragging} minWidth={210} minHeight={105}>
      <div className="flex h-full w-full flex-col gap-3 p-4 text-foreground">
        <div className="flex items-center gap-2">
          {selected ? (
            <TextEditingTrait className="min-w-0 flex-1">
              <input
                value={data.title || ""}
                onChange={(e) => update({ title: e.target.value })}
                placeholder="Goal title..."
                className="w-full bg-transparent text-sm font-semibold focus:outline-none placeholder:text-muted-foreground"
              />
            </TextEditingTrait>
          ) : (
            <p className={`min-w-0 flex-1 truncate text-sm font-semibold ${data.title ? "" : "text-muted-foreground"}`}>
              {data.title || "Untitled goal"}
            </p>
          )}
          {source === "connected" && (
            <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label="Computed from connected nodes" />
          )}
          {data.style !== "ring" && <span className="shrink-0 text-sm font-semibold tabular-nums">{rounded}%</span>}
        </div>

        {data.style === "ring" ? (
          <div className="relative flex min-h-0 flex-1 items-center justify-center" style={{ containerType: "size" }}>
            <Ring pct={pct} color={color} milestones={data.showMilestones} />
            <span
              className="absolute font-semibold tabular-nums"
              style={{ fontSize: "calc(min(100cqw, 100cqh) * 0.22)" }}
            >
              {rounded}%
            </span>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col justify-center">
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-surface-hover">
              <div
                className="h-full rounded-full transition-[width] duration-500 ease-out"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
              {data.showMilestones &&
                MILESTONES.map((m) => (
                  <span
                    key={m}
                    className="absolute top-0 h-full w-0.5 bg-background/70"
                    style={{ left: `calc(${m}% - 1px)` }}
                  />
                ))}
            </div>
            {data.showMilestones && (
              <div className="relative mt-1 h-3 text-[10px] tabular-nums text-muted-foreground">
                {MILESTONES.map((m) => (
                  <span
                    key={m}
                    className={`absolute -translate-x-1/2 ${rounded >= m ? "font-semibold text-foreground" : ""}`}
                    style={{ left: `${m}%` }}
                  >
                    {m}%
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="truncate">
            {caption}
            {data.showMilestones && ` · ${reached}/${MILESTONES.length} milestones`}
          </span>
          {selected && source === "manual" && (
            <span className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => setValue(value - 1)}
                aria-label="Decrease"
                className="nodrag flex h-6 w-6 items-center justify-center rounded-md hover:bg-surface-hover hover:text-foreground"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <TextEditingTrait>
                <input
                  type="number"
                  min={0}
                  max={max || undefined}
                  value={value}
                  onChange={(e) => setValue(Number(e.target.value) || 0)}
                  aria-label="Current value"
                  className="h-6 w-12 rounded-md border border-border bg-surface-card px-1 text-center text-xs tabular-nums text-foreground focus:outline-none"
                />
              </TextEditingTrait>
              <button
                type="button"
                onClick={() => setValue(value + 1)}
                aria-label="Increase"
                className="nodrag flex h-6 w-6 items-center justify-center rounded-md hover:bg-surface-hover hover:text-foreground"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </span>
          )}
        </div>
      </div>
    </NodeShell>
  );
}

function Ring({ pct, color, milestones }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <svg
      viewBox="0 0 100 100"
      className="-rotate-90"
      style={{ width: "min(100cqw, 100cqh)", height: "min(100cqw, 100cqh)" }}
    >
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--surface-hover)" strokeWidth="8" />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct / 100)}
        opacity={pct > 0 ? 1 : 0}
        style={{ transition: "stroke-dashoffset 500ms ease-out" }}
      />
      {milestones &&
        MILESTONES.map((m) => {
          const a = (m / 100) * 2 * Math.PI;
          return <circle key={m} cx={50 + r * Math.cos(a)} cy={50 + r * Math.sin(a)} r="1.6" fill="var(--background)" />;
        })}
    </svg>
  );
}

export default memo(ProgressNode);
