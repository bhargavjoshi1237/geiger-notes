"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Video, LogIn, Link2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// The Meeting tab. A meeting is its own feature, not a mode of collaboration:
// starting one mints its own code and its own room, and you can join a meeting
// by code with no collab session anywhere in sight.
//
// The one place the two features touch is the checkbox below. When a collab
// session happens to be running, the meeting can be attached to it, and everyone
// on that board joins the same call without exchanging a code. It's a shortcut,
// never a requirement — untick it and you get a standalone room.

export default function MeetTab({ isSessionActive, sessionData, onJoined }) {
  const [starting, setStarting] = useState(false);
  const [joining, setJoining] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [joinError, setJoinError] = useState("");
  const [attachToSession, setAttachToSession] = useState(true);

  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";

  const startMeeting = async () => {
    setStarting(true);
    try {
      const response = await fetch(`${base}/api/meet/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collabSessionId:
            isSessionActive && attachToSession ? sessionData?.id || null : null,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.roomId) {
        toast.error(data.error || "Couldn't start the meeting");
        return;
      }
      toast.success(data.reused ? "Joined the session's meeting" : "Meeting started");
      onJoined({ roomId: data.roomId, code: data.code, isHost: !data.reused });
    } catch (e) {
      console.error(e);
      toast.error("Couldn't start the meeting");
    } finally {
      setStarting(false);
    }
  };

  const joinByCode = async () => {
    const code = codeInput.trim().toUpperCase();
    if (!code) return;
    setJoining(true);
    setJoinError("");
    try {
      const response = await fetch(`${base}/api/meet/lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await response.json();
      if (!response.ok || !data.roomId) {
        const err = data.error || "Invalid meeting code";
        setJoinError(err);
        toast.error(err);
        return;
      }
      onJoined({ roomId: data.roomId, code: data.code, isHost: false });
    } catch (e) {
      console.error(e);
      setJoinError("Couldn't join the meeting");
      toast.error("Couldn't join the meeting");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-4 px-2 space-y-6">
      <div className="text-center space-y-4 animate-in fade-in">
        <Video className="w-8 h-8 opacity-20 ml-auto mr-auto" />
        <div className="space-y-1">
          <h3 className="text-md font-semibold text-foreground">Start a Meeting</h3>
          <p className="text-xs text-muted-foreground max-w-[280px] mx-auto">
            Video, audio, and screen sharing — peer to peer, with its own code.
          </p>
        </div>

        {isSessionActive ? (
          <button
            type="button"
            onClick={() => setAttachToSession((v) => !v)}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors",
              attachToSession
                ? "border-primary/40 bg-primary/5"
                : "border-border hover:border-border/70",
            )}
          >
            <Link2
              className={cn(
                "w-4 h-4 shrink-0",
                attachToSession ? "text-primary" : "text-muted-foreground",
              )}
            />
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-medium text-foreground">
                Use the collab session
              </span>
              <span className="block text-[11px] text-muted-foreground">
                Everyone on this board joins without a code.
              </span>
            </span>
            <span
              className={cn(
                "h-4 w-4 shrink-0 rounded-full border transition-colors",
                attachToSession ? "border-primary bg-primary" : "border-border",
              )}
            />
          </button>
        ) : null}

        <Button
          onClick={startMeeting}
          disabled={starting}
          className="bg-primary text-sm text-primary-foreground hover:bg-primary/80 min-w-[150px] transition-all active:scale-95"
        >
          {starting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Starting…
            </>
          ) : (
            <>
              <Video className="w-4 h-4 mr-2" /> Start Meeting
            </>
          )}
        </Button>
      </div>

      <div className="flex w-full items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          or join one
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="w-full space-y-3">
        <input
          type="text"
          placeholder="MEET-XXXX-XXXX"
          value={codeInput}
          onChange={(e) => setCodeInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && joinByCode()}
          className={cn(
            "w-full bg-muted border rounded-md px-3 py-2 text-sm text-center text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border transition-colors font-mono uppercase",
            joinError ? "border-red-500/50 focus:border-red-500" : "border-border",
          )}
        />
        {joinError ? <p className="text-xs text-red-400">{joinError}</p> : null}
        <Button
          onClick={joinByCode}
          disabled={joining || !codeInput.trim()}
          variant="outline"
          className="w-full text-sm transition-all active:scale-95"
        >
          {joining ? (
            "Joining…"
          ) : (
            <>
              <LogIn className="w-4 h-4 mr-2" />
              Join Meeting
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
