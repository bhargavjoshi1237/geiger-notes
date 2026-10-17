"use client";

import React, { memo, useEffect, useState } from "react";
import { BarChart3, Check, Lock, LockOpen, Minus, Plus, RotateCcw, X } from "lucide-react";
import NodeShell, { useNodeDataUpdater } from "@/components/internal/nodes/shared/NodeShell";
import TextEditingTrait from "@/components/internal/nodes/traits/TextEditingTrait";
import { getUser } from "@/lib/supabase/user";

const VOTER_KEY = "geiger-notes:voter-id";

export const makeOptionId = () => `opt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export const MODE_LABEL = { single: "Single choice", multi: "Multiple choice", dots: "Dot voting" };

export const nodeMeta = {
  type: "poll",
  label: "Poll",
  icon: BarChart3,
  cardColor: true,
  create: () => ({
    data: {
      question: "",
      options: [
        { id: makeOptionId(), text: "Option A" },
        { id: makeOptionId(), text: "Option B" },
      ],
      votes: {},
      voterNames: {},
      mode: "single",
      dotsPerVoter: 3,
      anonymous: false,
      closed: false,
    },
    style: { width: 330, height: 285 },
  }),
};

// Per-browser fallback identity for signed-out viewers.
function localVoter() {
  let voterId = null;
  try {
    voterId = window.localStorage.getItem(VOTER_KEY);
    if (!voterId) {
      voterId = `guest-${Math.random().toString(36).slice(2, 10)}`;
      window.localStorage.setItem(VOTER_KEY, voterId);
    }
  } catch {
    voterId = `guest-${Math.random().toString(36).slice(2, 10)}`;
  }
  return { id: voterId, name: "Guest" };
}

function useVoter() {
  const [voter, setVoter] = useState(null);
  useEffect(() => {
    let alive = true;
    getUser()
      .then((user) => alive && setVoter(user ? { id: user.id, name: user.name } : localVoter()))
      .catch(() => alive && setVoter(localVoter()));
    return () => {
      alive = false;
    };
  }, []);
  return voter;
}

const initials = (name = "") =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("") || "?";

function PollNode({ id, data, selected, dragging }) {
  const update = useNodeDataUpdater(id);
  const voter = useVoter();
  const options = Array.isArray(data.options) ? data.options : [];
  const votes = data.votes || {};
  const mode = data.mode || "single";
  const dotsPerVoter = Math.max(1, data.dotsPerVoter || 3);
  const closed = !!data.closed;
  const editing = selected && !closed;

  const countOf = (optId) => (votes[optId] || []).length;
  const mineOn = (optId) => (voter ? (votes[optId] || []).filter((v) => v === voter.id).length : 0);
  const totalVotes = options.reduce((sum, o) => sum + countOf(o.id), 0);
  const uniqueVoters = new Set(options.flatMap((o) => votes[o.id] || [])).size;
  const myDotsUsed = options.reduce((sum, o) => sum + mineOn(o.id), 0);
  const maxCount = Math.max(0, ...options.map((o) => countOf(o.id)));
  // Multi-choice percentages are per voter; single and dots are per vote cast.
  const denominator = mode === "multi" ? uniqueVoters : totalVotes;

  // Mutate votes from the freshest node data so concurrent clicks don't clobber each other.
  const mutateVotes = (fn) => {
    if (!voter || closed) return;
    update((node) => {
      const current = node.data.votes || {};
      const next = fn(current);
      const names = data.anonymous ? node.data.voterNames || {} : { ...(node.data.voterNames || {}), [voter.id]: voter.name };
      return { votes: next, voterNames: names };
    });
  };

  const vote = (optId) =>
    mutateVotes((current) => {
      const list = current[optId] || [];
      const has = list.includes(voter.id);
      if (mode === "single") {
        const cleared = Object.fromEntries(
          Object.entries(current).map(([k, ids]) => [k, ids.filter((v) => v !== voter.id)]),
        );
        return has ? cleared : { ...cleared, [optId]: [...(cleared[optId] || []), voter.id] };
      }
      if (mode === "multi") {
        return { ...current, [optId]: has ? list.filter((v) => v !== voter.id) : [...list, voter.id] };
      }
      const used = Object.values(current).reduce((n, ids) => n + ids.filter((v) => v === voter.id).length, 0);
      if (used >= dotsPerVoter) return current;
      return { ...current, [optId]: [...list, voter.id] };
    });

  const removeDot = (optId) =>
    mutateVotes((current) => {
      const list = [...(current[optId] || [])];
      const idx = list.lastIndexOf(voter.id);
      if (idx >= 0) list.splice(idx, 1);
      return { ...current, [optId]: list };
    });

  const setOptions = (next) => update({ options: next });
  const editOption = (optId, text) => setOptions(options.map((o) => (o.id === optId ? { ...o, text } : o)));
  const removeOption = (optId) => {
    const rest = { ...votes };
    delete rest[optId];
    update({ options: options.filter((o) => o.id !== optId), votes: rest });
  };
  const addOption = () => setOptions([...options, { id: makeOptionId(), text: "" }]);

  return (
    <NodeShell id={id} data={data} selected={selected} dragging={dragging} minWidth={240} minHeight={150}>
      <div className="flex h-full w-full flex-col gap-3 overflow-hidden p-4 text-foreground">
        <div className="flex items-start gap-2">
          {editing ? (
            <TextEditingTrait className="min-w-0 flex-1">
              <input
                value={data.question || ""}
                onChange={(e) => update({ question: e.target.value })}
                placeholder="Ask a question..."
                className="w-full bg-transparent text-base font-semibold focus:outline-none placeholder:text-muted-foreground"
              />
            </TextEditingTrait>
          ) : (
            <p className={`min-w-0 flex-1 text-base font-semibold ${data.question ? "" : "text-muted-foreground"}`}>
              {data.question || "Untitled poll"}
            </p>
          )}
          {closed && (
            <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <Lock className="h-3 w-3" /> Closed
            </span>
          )}
        </div>

        <div className="nowheel flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
          {options.map((opt) => {
            const count = countOf(opt.id);
            const pct = denominator > 0 ? Math.round((count / denominator) * 100) : 0;
            const mine = mineOn(opt.id);
            const leading = count > 0 && count === maxCount;
            const voterIds = [...new Set(votes[opt.id] || [])];
            return (
              <div
                key={opt.id}
                className={`group/opt relative flex min-h-9 items-center gap-2 overflow-hidden rounded-lg border px-2.5 py-1.5 transition-colors ${
                  mine ? "border-foreground/40" : "border-border"
                }`}
              >
                <div
                  className="pointer-events-none absolute inset-y-0 left-0 transition-[width] duration-500 ease-out"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: `color-mix(in oklab, var(--foreground) ${leading ? 14 : 8}%, transparent)`,
                  }}
                />
                <button
                  type="button"
                  onClick={() => vote(opt.id)}
                  disabled={closed || !voter}
                  aria-label={`Vote for ${opt.text || "option"}`}
                  className={`nodrag relative flex h-4 w-4 shrink-0 items-center justify-center border-2 transition-colors disabled:cursor-default ${
                    mode === "single" ? "rounded-full" : "rounded-[4px]"
                  } ${mine ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/60 hover:border-foreground"}`}
                >
                  {mine > 0 && mode !== "dots" && <Check className="h-2.5 w-2.5" strokeWidth={4} />}
                  {mode === "dots" && <Plus className={`h-2.5 w-2.5 ${mine ? "" : "text-muted-foreground"}`} strokeWidth={3} />}
                </button>

                {editing ? (
                  <TextEditingTrait className="relative min-w-0 flex-1" onKeyDown={(e) => e.key === "Enter" && addOption()}>
                    <input
                      value={opt.text}
                      onChange={(e) => editOption(opt.id, e.target.value)}
                      placeholder="Option"
                      className="w-full bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground"
                    />
                  </TextEditingTrait>
                ) : (
                  <button
                    type="button"
                    onClick={() => vote(opt.id)}
                    disabled={closed || !voter}
                    className="nodrag relative min-w-0 flex-1 truncate text-left text-sm disabled:cursor-default"
                  >
                    {opt.text || <span className="text-muted-foreground">Option</span>}
                  </button>
                )}

                {mode === "dots" && mine > 0 && (
                  <span className="relative flex items-center gap-0.5">
                    {Array.from({ length: Math.min(mine, 5) }).map((_, i) => (
                      <span key={i} className="h-1.5 w-1.5 rounded-full bg-primary" />
                    ))}
                    {!closed && (
                      <button
                        type="button"
                        onClick={() => removeDot(opt.id)}
                        aria-label="Remove one dot"
                        className="nodrag ml-0.5 text-muted-foreground hover:text-foreground"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                )}

                {!data.anonymous && voterIds.length > 0 && (
                  <span className="relative flex -space-x-1.5">
                    {voterIds.slice(0, 3).map((vid) => (
                      <span
                        key={vid}
                        title={data.voterNames?.[vid] || "Guest"}
                        className="flex h-5 w-5 items-center justify-center rounded-full border border-border bg-surface-active text-[8px] font-semibold text-foreground"
                      >
                        {initials(data.voterNames?.[vid] || "Guest")}
                      </span>
                    ))}
                  </span>
                )}

                <span className="relative shrink-0 text-xs tabular-nums text-muted-foreground">
                  <span className="font-semibold text-foreground">{count}</span> · {pct}%
                </span>

                {editing && (
                  <button
                    type="button"
                    onClick={() => removeOption(opt.id)}
                    aria-label="Remove option"
                    className="nodrag relative shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-red-600 group-hover/opt:opacity-100 dark:hover:text-red-400"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
          {editing && (
            <button
              type="button"
              onClick={addOption}
              className="nodrag flex items-center justify-center gap-1 rounded-lg border border-dashed border-border py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" /> Add option
            </button>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span className="truncate">
            {MODE_LABEL[mode]} · {mode === "dots" ? `${totalVotes} dots` : `${uniqueVoters} ${uniqueVoters === 1 ? "voter" : "voters"}`}
            {mode === "dots" && voter && !closed ? ` · ${Math.max(0, dotsPerVoter - myDotsUsed)} left` : ""}
          </span>
          {selected && (
            <span className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => update({ votes: {}, voterNames: {} })}
                className="nodrag flex items-center gap-1 rounded-md px-1.5 py-1 hover:bg-surface-hover hover:text-foreground"
              >
                <RotateCcw className="h-3 w-3" /> Reset
              </button>
              <button
                type="button"
                onClick={() => update({ closed: !closed })}
                className="nodrag flex items-center gap-1 rounded-md px-1.5 py-1 hover:bg-surface-hover hover:text-foreground"
              >
                {closed ? <LockOpen className="h-3 w-3" /> : <Lock className="h-3 w-3" />} {closed ? "Reopen" : "Close"}
              </button>
            </span>
          )}
        </div>
      </div>
    </NodeShell>
  );
}

export default memo(PollNode);
