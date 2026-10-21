import React from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  ScrollArea,
  cn,
} from "@geiger/ui";
import { Crown, Hand, LogIn, LogOut, Loader2, MoreHorizontal, ShieldCheck, Users2 } from "lucide-react";
import { ROLE_LABEL } from "@/lib/collab/session";
import MemberActionsMenu, { memberHasActions } from "@/components/internal/colab/live/MemberActionsMenu";

const initial = (name) => (name || "?").charAt(0).toUpperCase();

// Floating member stack for a live session: real presence, raised hands and per-person host actions.
export default function UserDrawer({
  members = [],
  role,
  followingId,
  canReclaim,
  locked,
  onFollow,
  onStopFollow,
  onSetRole,
  onMakeHost,
  onKickMember,
  onRejectRequest,
  onLowerHand,
  onLeaveSession,
  onRequestAccess,
  onReclaimHost,
}) {
  if (!members.length) return null;
  const online = members.filter((m) => m.online && m.role !== "pending");
  const stack = (online.length ? online : members.filter((m) => m.role !== "pending")).slice(0, 3);
  const extra = Math.max(0, (online.length || members.length) - stack.length);

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
              {stack.map((member) => (
                <div
                  key={member.id}
                  className="relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface-dialog text-[10px] font-semibold text-black"
                  style={{ backgroundColor: member.color }}
                  title={member.name}
                >
                  {initial(member.name)}
                  {member.handRaisedAt ? (
                    <span className="absolute -right-1 -top-1 rounded-full bg-amber-500 p-[2px]">
                      <Hand className="h-2 w-2" />
                    </span>
                  ) : null}
                </div>
              ))}
              {extra > 0 && (
                <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface-dialog bg-surface-hover text-[10px] font-semibold text-foreground">
                  +{extra}
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
                {online.length} Online
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
                          className="flex h-8 w-8 items-center justify-center rounded-full border bg-surface-hover text-xs font-medium"
                          style={{ borderColor: member.color, color: member.color }}
                        >
                          {initial(member.name)}
                        </div>
                        {member.role === "host" ? (
                          <div className="absolute -bottom-1 -right-1 rounded-full border border-border bg-surface-dialog p-0.5">
                            <Crown className="h-3 w-3 fill-amber-500 text-amber-500" />
                          </div>
                        ) : member.role === "cohost" ? (
                          <div className="absolute -bottom-1 -right-1 rounded-full border border-border bg-surface-dialog p-0.5">
                            <ShieldCheck className="h-3 w-3 text-sky-500" />
                          </div>
                        ) : (
                          <span
                            className={cn(
                              "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface-dialog",
                              member.online ? "bg-emerald-500" : "bg-muted-foreground/50",
                            )}
                          />
                        )}
                      </div>

                      <div className="flex min-w-0 flex-col">
                        <span className="flex items-center gap-1.5 truncate text-sm font-medium text-foreground">
                          {member.name}
                          {member.isMe && <span className="text-xs font-normal text-muted-foreground">(You)</span>}
                          {member.handRaisedAt ? <Hand className="h-3.5 w-3.5 text-amber-500" /> : null}
                        </span>
                        <span
                          className={cn(
                            "text-xs",
                            member.role === "host" ? "text-amber-500/80" : "text-muted-foreground",
                          )}
                        >
                          {ROLE_LABEL[member.role] || member.role}
                          {followingId === member.id ? " · you're following" : ""}
                          {!member.online && member.role !== "pending" ? " · offline" : ""}
                        </span>
                      </div>
                    </div>

                    <MemberActionsMenu
                      member={member}
                      myRole={role}
                      online={member.online}
                      following={followingId === member.id}
                      handRaised={Boolean(member.handRaisedAt)}
                      onFollow={onFollow}
                      onStopFollow={onStopFollow}
                      onSetRole={onSetRole}
                      onMakeHost={onMakeHost}
                      onRemove={(id) => (member.role === "pending" ? onRejectRequest(id) : onKickMember(id))}
                      onLowerHand={onLowerHand}
                    >
                      <button
                        type="button"
                        className={cn(
                          "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all hover:bg-surface-hover hover:text-foreground group-hover:opacity-100 data-[state=open]:opacity-100",
                          !memberHasActions(member, role, member.online) && "hidden",
                        )}
                        aria-label={`Actions for ${member.name}`}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </MemberActionsMenu>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border bg-surface-dialog p-4">
            {canReclaim && (
              <button
                onClick={onReclaimHost}
                className="mr-auto inline-flex h-9 items-center justify-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-500/20 dark:text-amber-300"
              >
                <Crown className="h-4 w-4" />
                Reclaim host
              </button>
            )}

            {(role === "editor" || role === "cohost") && (
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

            {role === "viewer" && !locked && (
              <button
                onClick={onRequestAccess}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 text-sm font-medium text-emerald-600 dark:text-emerald-400 transition-colors hover:bg-emerald-500/20"
              >
                <LogIn className="h-4 w-4" />
                {members.some((m) => m.isMe && m.role === "viewer") ? "Ask to edit" : "Request to join"}
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
