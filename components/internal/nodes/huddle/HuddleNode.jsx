"use client";

import React, { memo, useEffect, useState } from "react";
import { Headset, Loader2, LogIn, Video } from "lucide-react";
import { cn } from "@geiger/ui";
import NodeShell, { useNodeDataUpdater } from "@/components/internal/nodes/shared/NodeShell";
import TextEditingTrait from "@/components/internal/nodes/traits/TextEditingTrait";
import { createClient } from "@/utils/supabase/client";
import { isPlaygroundActive } from "@/lib/playground/mode";

const PENDING_TIMEOUT_MS = 15_000;

// Signed-in check for the huddle button; null while resolving.
function useSignedIn(disabled) {
  const [signedIn, setSignedIn] = useState(null);
  useEffect(() => {
    if (disabled) return undefined;
    let alive = true;
    createClient()
      .auth.getUser()
      .then(({ data }) => alive && setSignedIn(Boolean(data?.user)))
      .catch(() => alive && setSignedIn(false));
    return () => {
      alive = false;
    };
  }, [disabled]);
  return signedIn;
}

function HuddleNode({ id, data, selected, dragging }) {
  const update = useNodeDataUpdater(id);
  const playground = isPlaygroundActive();
  const signedIn = useSignedIn(playground);
  const [meeting, setMeeting] = useState({ active: false, code: null });
  const [pending, setPending] = useState(false);

  const code = data.code || null;
  const live = Boolean(code && meeting.active && meeting.code === code);

  // Topbar owns the meeting; it reports state and hands back a room code for this node.
  useEffect(() => {
    const onState = (e) => {
      setMeeting({ active: Boolean(e.detail?.active), code: e.detail?.code ?? null });
      setPending(false);
    };
    const onCode = (e) => {
      if (e.detail?.nodeId !== id || !e.detail.code) return;
      update({ code: e.detail.code });
    };
    window.addEventListener("geiger:meeting-state", onState);
    window.addEventListener("geiger:huddle-code", onCode);
    window.dispatchEvent(new CustomEvent("geiger:meeting-state-request"));
    return () => {
      window.removeEventListener("geiger:meeting-state", onState);
      window.removeEventListener("geiger:huddle-code", onCode);
    };
  }, [id, update]);

  useEffect(() => {
    if (!pending) return undefined;
    const t = setTimeout(() => setPending(false), PENDING_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [pending]);

  const start = () => {
    setPending(true);
    window.dispatchEvent(new CustomEvent("geiger:huddle", { detail: { nodeId: id, code } }));
  };

  const unavailable = playground
    ? "Huddles aren't available in the playground."
    : signedIn === false
      ? "Sign in to start or join a huddle."
      : null;

  return (
    <NodeShell id={id} data={data} selected={selected} dragging={dragging} minWidth={220} minHeight={160}>
      <div className="flex flex-col w-full h-full min-h-0 p-3 gap-2 text-foreground">
        <div className="flex items-center gap-2 shrink-0">
          <span className="w-7 h-7 rounded-lg bg-surface-hover flex items-center justify-center shrink-0">
            <Headset className="w-4 h-4 text-muted-foreground" />
          </span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Huddle spot</span>
          {live && (
            <span className="ml-auto inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          )}
        </div>

        <div className="flex-1 min-h-0 flex flex-col gap-1">
          {selected ? (
            <TextEditingTrait className="flex flex-col gap-1 min-h-0 flex-1">
              <input
                value={data.title ?? ""}
                onChange={(e) => update({ title: e.target.value })}
                placeholder="Huddle title"
                className="w-full bg-transparent text-sm font-semibold placeholder:text-muted-foreground focus:outline-none"
              />
              <textarea
                value={data.topic ?? ""}
                onChange={(e) => update({ topic: e.target.value })}
                placeholder="What's this huddle about?"
                className="nowheel w-full flex-1 min-h-0 resize-none bg-transparent text-xs text-muted-foreground placeholder:text-muted-foreground/70 focus:outline-none"
              />
            </TextEditingTrait>
          ) : (
            <>
              <p className="text-sm font-semibold truncate">{data.title || "Huddle"}</p>
              <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words line-clamp-3">
                {data.topic || "Drop in to talk it through."}
              </p>
            </>
          )}
        </div>

        <div className="flex flex-col gap-1.5 shrink-0">
          {unavailable ? (
            <p className="text-[11px] text-muted-foreground">{unavailable}</p>
          ) : (
            code && (
              <p className="text-[10px] text-muted-foreground truncate">
                Room <span className="font-mono text-foreground">{code}</span>
              </p>
            )
          )}
          <button
            type="button"
            onClick={start}
            disabled={Boolean(unavailable) || signedIn === null || pending || live}
            className={cn(
              "nodrag inline-flex items-center justify-center gap-1.5 h-8 w-full rounded-md text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
              live ? "bg-surface-hover text-foreground" : "bg-primary text-primary-foreground hover:bg-primary/85",
            )}
          >
            {pending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : code ? (
              <LogIn className="w-3.5 h-3.5" />
            ) : (
              <Video className="w-3.5 h-3.5" />
            )}
            {live ? "You're in this huddle" : code ? "Join huddle" : "Start huddle"}
          </button>
        </div>
      </div>
    </NodeShell>
  );
}

export const nodeMeta = {
  type: "huddle",
  label: "Huddle",
  icon: Headset,
  cardColor: true,
  create: () => ({
    data: { title: "Huddle", topic: "", code: null },
    style: { width: 260, height: 190 },
  }),
};

export default memo(HuddleNode);
