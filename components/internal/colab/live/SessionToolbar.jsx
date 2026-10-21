"use client";

import React, { useMemo } from "react";
import { Crown, Hand, SmilePlus, Wand2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger, cn } from "@geiger/ui";
import { canModerate, sessionMembers } from "@/lib/collab/session";
import { SESSION_REACTIONS } from "@/lib/collab/hooks/useSessionControls";
import MemberActionsMenu from "./MemberActionsMenu";
import HostControlsMenu from "./HostControlsMenu";

// Topbar cluster for a live session: who's here (click to follow), laser, hand, reactions and — for hosts — host controls.

const MAX_AVATARS = 4;

const initialOf = (name) => (name || "?").trim().charAt(0).toUpperCase() || "?";

function ToolButton({ active, label, onClick, disabled, children, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40",
        active && "bg-surface-active text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}

// Session members (from joiners) enriched with live presence: online, raised hand and the name people chose.
export function useLiveMembers(sessionData, controls, currentUserId) {
  const { peerById, me, live } = controls;
  return useMemo(
    () =>
      sessionMembers(sessionData, currentUserId).map((m) => {
        const peer = peerById.get(m.id);
        return {
          ...m,
          name: m.isMe ? me?.name || m.name : peer?.name || m.name,
          online: m.isMe ? live.connected : Boolean(peer),
          handRaisedAt: m.isMe ? live.handRaisedAt : peer?.handRaisedAt || null,
        };
      }),
    [sessionData, currentUserId, peerById, me?.name, live.connected, live.handRaisedAt],
  );
}

export default function SessionToolbar({
  controls,
  members,
  role,
  preference,
  updatePreference,
  setMemberRole,
  kickMember,
  rejectRequest,
  onMakeHost,
  selectedNodeId,
  ended,
  participating,
}) {
  const moderator = canModerate(role);
  const online = members.filter((m) => m.online && !m.isMe);
  const { live, laserActive, laserAllowed, toggleLaser, toggleHand, sendReaction, followUser, stopFollowing, lowerHand } = controls;

  return (
    <div className="flex items-center gap-1">
      {online.length ? (
        <div className="mr-1 flex items-center -space-x-1.5">
          {online.slice(0, MAX_AVATARS).map((member) => (
            <MemberActionsMenu
              key={member.id}
              member={member}
              myRole={role}
              online={member.online}
              following={live.followingId === member.id}
              handRaised={Boolean(member.handRaisedAt)}
              onFollow={followUser}
              onStopFollow={stopFollowing}
              onSetRole={setMemberRole}
              onMakeHost={onMakeHost}
              onRemove={(id) => (member.role === "pending" ? rejectRequest(id) : kickMember(id))}
              onLowerHand={lowerHand}
            >
              <button
                type="button"
                className={cn(
                  "relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-topbar-bg text-[11px] font-semibold text-black transition-transform hover:z-10 hover:scale-110",
                  live.followingId === member.id && "ring-2 ring-offset-1 ring-offset-topbar-bg",
                )}
                style={{ backgroundColor: member.color, "--tw-ring-color": member.color }}
                title={`${member.name}${member.role === "host" ? " (host)" : ""}`}
              >
                {initialOf(member.name)}
                {member.handRaisedAt ? (
                  <span className="absolute -right-1 -top-1 rounded-full bg-amber-500 p-[2px] text-black">
                    <Hand className="h-2.5 w-2.5" />
                  </span>
                ) : member.role === "host" ? (
                  <span className="absolute -bottom-1 -right-1 rounded-full border border-border bg-surface-dialog p-[1px]">
                    <Crown className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                  </span>
                ) : null}
              </button>
            </MemberActionsMenu>
          ))}
          {online.length > MAX_AVATARS ? (
            <span className="flex h-7 min-w-7 items-center justify-center rounded-full border-2 border-topbar-bg bg-surface-hover px-1 text-[10px] font-semibold text-foreground">
              +{online.length - MAX_AVATARS}
            </span>
          ) : null}
        </div>
      ) : null}

      {participating && !ended ? (
        <>
          <ToolButton
            active={laserActive}
            label={laserAllowed ? (laserActive ? "Stop laser (Esc)" : "Laser pointer") : "Laser limited to hosts"}
            onClick={toggleLaser}
            disabled={!laserAllowed}
            className={laserActive ? "text-rose-500" : undefined}
          >
            <Wand2 className="h-4 w-4" />
          </ToolButton>
          {!moderator ? (
            <ToolButton
              active={Boolean(live.handRaisedAt)}
              label={live.handRaisedAt ? "Lower hand" : "Raise hand"}
              onClick={toggleHand}
              className={live.handRaisedAt ? "text-amber-500" : undefined}
            >
              <Hand className="h-4 w-4" />
            </ToolButton>
          ) : null}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                title="React"
                aria-label="React"
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
              >
                <SmilePlus className="h-4 w-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" sideOffset={8} className="w-auto p-1.5">
              <div className="flex gap-1">
                {SESSION_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => sendReaction(emoji)}
                    className="flex h-9 w-9 items-center justify-center rounded-md text-lg transition-transform hover:scale-110 hover:bg-surface-hover"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </>
      ) : null}

      {moderator ? (
        <HostControlsMenu
          controls={controls}
          role={role}
          preference={preference}
          updatePreference={updatePreference}
          selectedNodeId={selectedNodeId}
          endedSession={ended}
        />
      ) : null}
    </div>
  );
}
