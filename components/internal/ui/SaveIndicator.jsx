"use client";

import React from "react";
import { Check, CloudOff, Laptop, Loader2 } from "lucide-react";

// Save state for editor headers: a quiet pill with an icon and a sentence-case label.
// `savedAt` (ms) shows the last save time on hover; `live` wins while a collab session drives the content.
const STATES = {
  saving: { icon: Loader2, iconClass: "animate-spin", label: "Saving…" },
  saved: { icon: Check, iconClass: "text-emerald-600 dark:text-emerald-400", label: "Saved" },
  unsaved: { dot: "bg-amber-400 animate-pulse", label: "Unsaved changes" },
  error: { icon: CloudOff, iconClass: "text-red-600 dark:text-red-400", label: "Couldn't save" },
  local: { icon: Laptop, label: "Local copy", hint: "Playground: edits stay in this tab" },
  live: { dot: "bg-emerald-400", label: "Live", hint: "Saving through the live session" },
};

const timeOf = (ms) => new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export default function SaveIndicator({ status, savedAt, live = false, className = "" }) {
  const key = live ? "live" : STATES[status] ? status : "unsaved";
  const state = STATES[key];
  const Icon = state.icon;
  const hint = key === "saved" && savedAt ? `Last saved at ${timeOf(savedAt)}` : state.hint;

  return (
    <span
      role="status"
      aria-live="polite"
      title={hint}
      className={`inline-flex h-7 select-none items-center gap-1.5 rounded-full border border-border bg-surface-card px-2.5 text-xs text-muted-foreground ${className}`}
    >
      <span key={key} className="cycle-in flex h-3.5 w-3.5 items-center justify-center">
        {Icon ? (
          <Icon className={`h-3.5 w-3.5 ${state.iconClass ?? ""}`} strokeWidth={2} />
        ) : (
          <span className={`h-1.5 w-1.5 rounded-full ${state.dot}`} />
        )}
      </span>
      {state.label}
    </span>
  );
}
