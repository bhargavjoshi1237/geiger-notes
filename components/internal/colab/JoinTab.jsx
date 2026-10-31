import React from "react";
import { Button, Input, cn } from "@geiger/ui";
import { LogIn, Loader2 } from "lucide-react";

export default function JoinTab({
  isSessionActive,
  sessionCodeInput,
  setSessionCodeInput,
  joinError,
  joinByCode,
  isJoining,
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-full px-2">
      {isSessionActive ? (
        <div className="text-center space-y-5 animate-in fade-in">
          <LogIn className="w-8 h-8 opacity-20 ml-auto mr-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-foreground">
              Session Active
            </h3>
            <p className="text-xs text-muted-foreground max-w-[260px] mx-auto">
              You are currently in a session. Leave the current session to join
              another.
            </p>
          </div>
        </div>
      ) : (
        <div className="w-full text-center space-y-6 animate-in fade-in">
          <div className="space-y-5">
            <LogIn className="w-8 h-8 opacity-20 ml-auto mr-auto" />
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-foreground">
                Join a Session
              </h3>
              <p className="text-xs text-muted-foreground">
                Enter a session code to join a live collaborative workspace.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Input
              autoFocus
              placeholder="GEIGER-XXXX-XXXX"
              aria-label="Session code"
              aria-invalid={!!joinError}
              value={sessionCodeInput}
              onChange={(e) => setSessionCodeInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !isJoining && joinByCode()}
              className={cn(
                "text-center font-mono uppercase",
                joinError && "border-red-500/50 focus-visible:border-red-500",
              )}
            />
            {joinError && <p className="text-xs text-red-600 dark:text-red-400">{joinError}</p>}

            <Button
              onClick={joinByCode}
              disabled={isJoining || !sessionCodeInput.trim()}
              className="w-full bg-primary text-sm text-primary-foreground hover:bg-primary/80 transition-all active:scale-95"
            >
              {isJoining ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              {isJoining ? "Joining…" : "Join Session"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
