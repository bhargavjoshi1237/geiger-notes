"use client";

import React from "react";
import { CircleDot, ListChecks, Lock, LockOpen, RotateCcw, Shuffle, EyeOff, Eye, Vote } from "lucide-react";
import { Input, Label, Popover, PopoverContent, PopoverTrigger } from "@geiger/ui";
import { toast } from "sonner";
import { SidebarButton } from "@/components/internal/layout/sidebar/SidebarPrimitives";
import { MODE_LABEL } from "./PollNode";

const MODES = [
  { value: "single", icon: CircleDot, hint: "One vote per person" },
  { value: "multi", icon: ListChecks, hint: "Pick any number" },
  { value: "dots", icon: Shuffle, hint: "Spend dots, stack them freely" },
];

const SECTION_LABEL = "text-[10px] uppercase tracking-wider text-muted-foreground font-semibold";

export default function PollSettings({ node, updateData }) {
  const data = node.data || {};
  const mode = data.mode || "single";
  const hasVotes = Object.values(data.votes || {}).some((ids) => ids?.length);

  // Switching mode invalidates existing ballots (e.g. stacked dots in single choice).
  const setMode = (value) => {
    if (value === mode) return;
    updateData({ mode: value, votes: {}, voterNames: {} });
    if (hasVotes) toast.success("Mode changed — votes were reset");
  };

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <SidebarButton icon={Vote} label="Voting mode" aria-label="Voting mode" title="Voting mode" />
        </PopoverTrigger>
        <PopoverContent
          side="right"
          align="start"
          sideOffset={8}
          className="w-64 bg-surface-dialog border-border p-3 shadow-xl rounded-xl"
        >
          <div className="flex flex-col gap-0.5">
            <Label className={`px-2 py-1.5 ${SECTION_LABEL}`}>Voting mode</Label>
            {MODES.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setMode(opt.value)}
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
            {mode === "dots" && (
              <div className="mt-2 flex items-center justify-between gap-3 border-t border-border px-2 pt-3">
                <Label className="text-xs text-muted-foreground">Dots per voter</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={data.dotsPerVoter || 3}
                  onChange={(e) => updateData({ dotsPerVoter: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })}
                  className="h-8 w-16 bg-surface-card text-sm tabular-nums"
                />
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <SidebarButton
        icon={data.anonymous ? EyeOff : Eye}
        label={data.anonymous ? "Anonymous voting" : "Show voters"}
        aria-label={data.anonymous ? "Anonymous voting (on)" : "Anonymous voting (off)"}
        title={data.anonymous ? "Anonymous: on" : "Anonymous: off"}
        active={!!data.anonymous}
        onClick={() => updateData(data.anonymous ? { anonymous: false } : { anonymous: true, voterNames: {} })}
      />

      <SidebarButton
        icon={data.closed ? LockOpen : Lock}
        label={data.closed ? "Reopen poll" : "Close poll"}
        aria-label={data.closed ? "Reopen poll" : "Close poll"}
        title={data.closed ? "Reopen poll" : "Close poll"}
        active={!!data.closed}
        onClick={() => updateData({ closed: !data.closed })}
      />

      <SidebarButton
        icon={RotateCcw}
        label="Reset votes"
        aria-label="Reset votes"
        title="Reset votes"
        onClick={() => {
          updateData({ votes: {}, voterNames: {} });
          toast.success("Votes reset");
        }}
      />
    </>
  );
}
