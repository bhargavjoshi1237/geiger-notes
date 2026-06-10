import React from "react";
import { Button } from "@/components/ui/button";
import { Play, LucideDoorClosed, Copy, Check } from "lucide-react";

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
  return (
    <div className="flex flex-col items-center justify-center h-[320px] py-6 px-4">
      {!isSessionActive ? (
        <div className="text-center space-y-5 animate-in fade-in -mt-10">
          <Play className="w-8 h-8 opacity-20 ml-auto mr-auto" />
          <div className="space-y-1">
            <h3 className="text-md font-semibold text-foreground">
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
                onClick={copyToClipboard}
                className="relative w-full flex items-center justify-center gap-3 bg-muted border border-border hover:border-border/50 rounded-xl p-4 transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-emerald-900/10"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xl font-bold text-foreground tracking-[0.15em] select-all">
                    {sessionCode}
                  </span>
                </div>

                <div className="flex items-center w-[10%] justify-center gap-1.5 text-xs text-muted-foreground font-medium group-hover:text-emerald-500/80 transition-colors">
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                    </>
                  )}
                </div>
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
                onClick={handleEndSession}
                className="h-8 text-xs"
              >
                <LucideDoorClosed className="w-5 h-5 mr-1 text-white" />
                <p className="-mt-0.5 text-white">End Session</p>
              </Button>
            )}
            {!isHost && isSessionActive && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleLeave}
                className="h-8 text-xs"
              >
                <LucideDoorClosed className="w-5 h-5 mr-1 text-white" />
                <p className="-mt-0.5 text-white">Leave Session</p>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
