"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { DoorClosed, Home, Loader2, RotateCcw, UserX } from "lucide-react";
import { Button } from "@geiger/ui";

// Blocks the canvas once the session has ended for everyone, or once the host removed you from it.

export default function SessionEndedOverlay({ ended, removed, isHost, locked, homeHref, onReopen, onRequestAccess }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  if (!ended && !removed) return null;

  const run = async (fn) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  const Icon = ended ? DoorClosed : UserX;
  const title = ended ? (isHost ? "You ended this session" : "The host ended this session") : "You were removed from this session";
  const body = ended
    ? isHost
      ? "Nobody can edit or join it any more. Bring the work home from your board's Collaborate → Merge, or reopen it."
      : "Thanks for joining. The board stays with the host, who can merge your work back in."
    : locked
      ? "The host has also locked the session, so it isn't taking new requests right now."
      : "You can ask the host to let you back in.";

  return (
    <div className="absolute inset-0 z-[80] flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-sm space-y-5 rounded-xl border border-border bg-surface-dialog p-6 text-center shadow-2xl">
        <Icon className="mx-auto h-8 w-8 text-muted-foreground" />
        <div className="space-y-1.5">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="text-xs leading-relaxed text-muted-foreground">{body}</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {ended && isHost && onReopen ? (
            <Button variant="outline" size="sm" disabled={busy} onClick={() => run(onReopen)}>
              {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="mr-1.5 h-3.5 w-3.5" />}
              Reopen
            </Button>
          ) : null}
          {!ended && removed && !locked && onRequestAccess ? (
            <Button variant="outline" size="sm" disabled={busy} onClick={() => run(onRequestAccess)}>
              {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
              Ask to rejoin
            </Button>
          ) : null}
          <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => router.push(homeHref)}>
            <Home className="mr-1.5 h-3.5 w-3.5" /> Go home
          </Button>
        </div>
      </div>
    </div>
  );
}
