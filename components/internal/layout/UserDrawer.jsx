import React, { useMemo } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Crown,
  LogIn,
  LogOut,
  Loader2,
  UserMinus,
  Users2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function UserDrawer({
  sessionData,
  role,
  currentUser,
  onKickMember,
  onLeaveSession,
  onRequestAccess,
}) {
  const members = useMemo(() => {
    if (!sessionData) return [];
    const list = [];
    const joinersMap = sessionData.joiners || {};

    Object.keys(joinersMap).forEach((uid) => {
      const m = joinersMap[uid];
      if (m.status === "joined") {
        list.push({
          id: uid,
          name: m.name || m.email || "Unknown",
          color: m.color,
          role: "Editor",
          isMe: currentUser?.id === uid,
          joinedAt: m.joinedAt,
        });
      }
    });

    const hostId = sessionData.host;
    const existingHost = list.find((m) => m.id === hostId);
    if (!existingHost) {
      list.unshift({
        id: hostId,
        name: currentUser?.id === hostId ? "You (Host)" : "Host",
        role: "Owner",
        color: null,
        isMe: currentUser?.id === hostId,
        joinedAt: sessionData.created_at,
      });
    } else {
      existingHost.role = "Owner";
    }

    return list;
  }, [sessionData, currentUser]);

  if (!sessionData) return null;

  const initial = (name) => (name || "?").charAt(0).toUpperCase();

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Dialog>
        <DialogTrigger asChild>
          <button
            type="button"
            className="group flex items-center gap-2 rounded-lg border border-border bg-surface-dialog/95 px-2.5 py-2 text-muted-foreground shadow-xl shadow-black/20 backdrop-blur transition-colors hover:border-border hover:bg-surface-hover/90 hover:text-foreground"
            title="Session members"
          >
            <div className="flex items-center -space-x-2">
              {members.slice(0, 3).map((member) => (
                <div
                  key={member.id}
                  className="relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface-dialog bg-surface-hover text-[10px] font-semibold text-foreground"
                  style={
                    member.color
                      ? { backgroundColor: member.color, color: "#000" }
                      : {}
                  }
                  title={member.name}
                >
                  {initial(member.name)}
                </div>
              ))}
              {members.length > 3 && (
                <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface-dialog bg-surface-hover text-[10px] font-semibold text-foreground">
                  +{members.length - 3}
                </div>
              )}
            </div>
            <Users2 className="h-4 w-4" />
            <span className="sr-only">Open session members</span>
          </button>
        </DialogTrigger>

        <DialogContent
          showCloseButton={false}
          className="max-w-md gap-0 overflow-hidden border-border bg-surface-dialog p-0 text-foreground shadow-xl sm:rounded-lg"
        >
          <DialogHeader className="space-y-0 border-b border-border p-4">
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-2">
                <Users2 className="h-4 w-4 text-muted-foreground" />
                <DialogTitle className="text-base font-medium text-foreground">
                  Session Members
                </DialogTitle>
              </div>

              <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-emerald-500">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                {members.length} Active
              </div>
            </div>
          </DialogHeader>

          <div className="bg-surface-dialog p-4">
            <ScrollArea className="h-[min(300px,calc(100dvh-220px))] -mx-2 px-2">
              <div className="space-y-1">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="group flex items-center justify-between rounded p-2 transition-colors hover:bg-surface-hover/50"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="relative shrink-0">
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface-hover text-xs font-medium text-foreground"
                          style={
                            member.color
                              ? {
                                  borderColor: member.color,
                                  color: member.color,
                                }
                              : {}
                          }
                        >
                          {initial(member.name)}
                        </div>
                        {member.role === "Owner" && (
                          <div className="absolute -bottom-1 -right-1 rounded-full border border-border bg-surface-dialog p-0.5">
                            <Crown className="h-3 w-3 fill-amber-500 text-amber-500" />
                          </div>
                        )}
                      </div>

                      <div className="flex min-w-0 flex-col">
                        <span className="flex items-center gap-1.5 truncate text-sm font-medium text-foreground">
                          {member.name}
                          {member.isMe && (
                            <span className="text-xs font-normal text-muted-foreground">
                              (You)
                            </span>
                          )}
                        </span>
                        <span
                          className={cn(
                            "text-xs",
                            member.role === "Owner"
                              ? "text-amber-500/80"
                              : "text-muted-foreground",
                          )}
                        >
                          {member.role}
                        </span>
                      </div>
                    </div>

                    {role === "host" && !member.isMe && (
                      <button
                        onClick={() => onKickMember && onKickMember(member.id)}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-red-500 opacity-0 transition-all hover:bg-red-900/20 hover:text-red-400 group-hover:opacity-100"
                        title="Remove member"
                      >
                        <UserMinus className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border bg-surface-dialog p-4">
            {role === "editor" && (
              <button
                onClick={onLeaveSession}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20"
              >
                <LogOut className="h-4 w-4" />
                Leave Session
              </button>
            )}

            {role === "pending" && (
              <div className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-muted px-3 text-sm font-medium text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Waiting for host approval...
              </div>
            )}

            {role === "viewer" && (
              <button
                onClick={onRequestAccess}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20"
              >
                <LogIn className="h-4 w-4" />
                Request to join
              </button>
            )}

            <DialogClose asChild>
              <button className="inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground">
                Close
              </button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
