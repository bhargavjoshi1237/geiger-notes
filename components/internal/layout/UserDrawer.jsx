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
            className="group flex items-center gap-2 rounded-lg border border-zinc-800 bg-[#1e1e1e]/95 px-2.5 py-2 text-zinc-400 shadow-xl shadow-black/20 backdrop-blur transition-colors hover:border-zinc-700 hover:bg-zinc-800/90 hover:text-zinc-100"
            title="Session members"
          >
            <div className="flex items-center -space-x-2">
              {members.slice(0, 3).map((member) => (
                <div
                  key={member.id}
                  className="relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#1e1e1e] bg-zinc-800 text-[10px] font-semibold text-zinc-300"
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
                <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#1e1e1e] bg-zinc-800 text-[10px] font-semibold text-zinc-300">
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
          className="max-w-md gap-0 overflow-hidden border-zinc-800 bg-[#1e1e1e] p-0 text-zinc-100 shadow-xl sm:rounded-lg"
        >
          <DialogHeader className="space-y-0 border-b border-zinc-800 p-4">
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-2">
                <Users2 className="h-4 w-4 text-zinc-400" />
                <DialogTitle className="text-base font-medium text-zinc-100">
                  Session Members
                </DialogTitle>
              </div>

              <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-emerald-500">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                {members.length} Active
              </div>
            </div>
          </DialogHeader>

          <div className="bg-[#1e1e1e] p-4">
            <ScrollArea className="h-[min(300px,calc(100dvh-220px))] -mx-2 px-2">
              <div className="space-y-1">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="group flex items-center justify-between rounded p-2 transition-colors hover:bg-zinc-800/50"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="relative shrink-0">
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-xs font-medium text-zinc-300"
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
                          <div className="absolute -bottom-1 -right-1 rounded-full border border-zinc-700 bg-[#1e1e1e] p-0.5">
                            <Crown className="h-3 w-3 fill-amber-500 text-amber-500" />
                          </div>
                        )}
                      </div>

                      <div className="flex min-w-0 flex-col">
                        <span className="flex items-center gap-1.5 truncate text-sm font-medium text-zinc-200">
                          {member.name}
                          {member.isMe && (
                            <span className="text-xs font-normal text-zinc-500">
                              (You)
                            </span>
                          )}
                        </span>
                        <span
                          className={cn(
                            "text-xs",
                            member.role === "Owner"
                              ? "text-amber-500/80"
                              : "text-zinc-500",
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

          <div className="flex items-center justify-end gap-2 border-t border-zinc-800 bg-[#1e1e1e] p-4">
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
              <div className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm font-medium text-zinc-400">
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
              <button className="inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200">
                Close
              </button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
