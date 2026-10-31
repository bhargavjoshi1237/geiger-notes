import React, { useEffect, useState } from "react";
import { Button } from "@geiger/ui";
import { Play, LucideDoorClosed, Copy, Check, Loader2 } from "lucide-react";

export default function HostTab({
  isSessionActive,
  startSession,
  isStarting,
  sessionCode,
  copyToClipboard,
  copied,
  isHost,
  handleEndSession,
  handleLeave,
}) {
  // Ending affects everyone, so the button asks once more before it fires.
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    if (!confirming) return undefined;
    const timer = setTimeout(() => setConfirming(false), 4000);
    return () => clearTimeout(timer);
  }, [confirming]);

  const endClicked = () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    handleEndSession();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-2">
      {!isSessionActive ? (
        <div className="text-center space-y-5 animate-in fade-in">
          <Play className="w-8 h-8 opacity-20 ml-auto mr-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-foreground">
              Start a Session
            </h3>
            <p className="text-xs text-muted-foreground max-w-[260px] mx-auto">
              Create a live collaborative workspace and invite others instantly.
            </p>
          </div>

          <Button
            onClick={startSession}
            disabled={isStarting}
            className="bg-primary text-sm text-primary-foreground hover:bg-primary/80 min-w-[150px] transition-all active:scale-95"
          >
            {isStarting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {isStarting ? "Starting…" : "Start Session"}
          </Button>
        </div>
      ) : (
        <div className="w-full max-w-sm space-y-6 animate-in fade-in zoom-in-95">
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Session Active
              </span>
            </div>

            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-500" />
              <button
                type="button"
                onClick={copyToClipboard}
                aria-label="Copy session code"
                className="relative w-full flex items-center justify-center gap-3 bg-muted border border-border hover:border-border/50 rounded-xl p-4 transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-emerald-900/10"
              >
                <span className="min-w-0 truncate font-mono text-lg font-bold text-foreground tracking-[0.1em] select-all">
                  {sessionCode}
                </span>
                <span className="shrink-0 text-muted-foreground group-hover:text-emerald-500/80 transition-colors">
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </span>
              </button>
            </div>

            <p className="text-[11px] text-muted-foreground text-center px-4">
              Share this code with team members to let them join your workspace
              instantly.
            </p>
          </div>

          <div className="text-center space-y-1">
            {isHost && (
              <Button
                variant="destructive"
                size="sm"
                onClick={endClicked}
                className="h-8 text-xs"
              >
                <LucideDoorClosed className="w-4 h-4" />
                {confirming ? "Click again to end for everyone" : "End Session"}
              </Button>
            )}
            {!isHost && isSessionActive && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleLeave}
                className="h-8 text-xs"
              >
                <LucideDoorClosed className="w-4 h-4" />
                Leave Session
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
