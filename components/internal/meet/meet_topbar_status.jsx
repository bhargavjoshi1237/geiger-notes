"use client";

import React, { useEffect, useState } from "react";
import { Copy, Users } from "lucide-react";
import { toast } from "sonner";

function formatElapsed(ms) {
  const secs = Math.max(0, Math.floor(ms / 1000));
  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

// Live-call status shown in the Topbar while a meeting is docked: LIVE pill, timer, code, participant count.
export function MeetTopbarStatus({ startedAt, code, total = 1, connected = true }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const copyCode = () => {
    navigator.clipboard.writeText(code || "");
    toast.success("Meeting code copied");
  };

  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <span className="flex items-center gap-1.5 rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-semibold text-red-400">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" /> LIVE
      </span>
      <span className="font-mono text-xs tabular-nums text-foreground">
        {formatElapsed(now - startedAt)}
      </span>
      {!connected ? (
        <span className="hidden text-[11px] md:inline">connecting…</span>
      ) : null}
      {code ? (
        <button
          type="button"
          onClick={copyCode}
          title="Copy meeting code"
          className="hidden items-center gap-1.5 rounded-md border border-border px-2 py-1 font-mono text-[11px] transition-colors hover:text-foreground lg:flex"
        >
          {code}
          <Copy className="h-3 w-3" />
        </button>
      ) : null}
      <span
        title="Participants"
        className="hidden h-8 items-center gap-1 rounded px-1.5 sm:flex"
      >
        <Users className="h-[18px] w-[18px]" strokeWidth={2} />
        <span className="text-xs">{total}</span>
      </span>
    </div>
  );
}

export default MeetTopbarStatus;
