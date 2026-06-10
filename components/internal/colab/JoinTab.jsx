import React from "react";
import { Button } from "@/components/ui/button";
import { LogIn, LucideLogIn } from "lucide-react";
import { cn } from "@/lib/utils";

export default function JoinTab({
  isSessionActive,
  sessionCodeInput,
  setSessionCodeInput,
  joinError,
  joinByCode,
  isJoining,
}) {
  return (
    <div className="flex flex-col items-center justify-center h-[320px] py-6 px-4">
      {isSessionActive ? (
        <div className="text-center space-y-5 animate-in fade-in -mt-10">
          <LucideLogIn className="w-8 h-8 opacity-20 ml-auto mr-auto" />
          <div className="space-y-1">
            <h3 className="text-md font-semibold text-foreground">
              Session Active
            </h3>
            <p className="text-xs text-muted-foreground max-w-[260px] mx-auto">
              You are currently in a session. Leave the current session to join
              another.
            </p>
          </div>
        </div>
      ) : (
        <div className="w-full w-full text-center space-y-6 animate-in fade-in -mt-4">
          <div className="space-y-5">
            <LucideLogIn className="w-8 h-8 opacity-20 ml-auto mr-auto" />
            <div className="space-y-1">
              <h3 className="text-md font-semibold text-foreground">
                Join a Session
              </h3>
              <p className="text-xs text-muted-foreground w-full  mx-auto">
                Enter a session code to join a live collaborative workspace.
              </p>
            </div>
          </div>

          <div className="space-y-3 ">
            <input
              type="text"
              placeholder="GEIGER-XXXX-XXXX"
              value={sessionCodeInput}
              onChange={(e) => setSessionCodeInput(e.target.value)}
              className={cn(
                "w-full bg-muted border rounded-md px-3 py-2 text-sm text-center text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border transition-colors font-mono uppercase",
                joinError
                  ? "border-red-500/50 focus:border-red-500"
                  : "border-border",
              )}
            />
            {joinError && <p className="text-xs text-red-400">{joinError}</p>}

            <Button
              onClick={joinByCode}
              disabled={isJoining || !sessionCodeInput.trim()}
              className="w-full bg-primary text-sm text-primary-foreground hover:bg-primary/80 transition-all active:scale-95"
            >
              {isJoining ? (
                "Joining..."
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  Join Session
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
