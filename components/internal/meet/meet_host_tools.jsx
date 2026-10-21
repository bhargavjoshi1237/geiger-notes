"use client";

import React from "react";
import {
  Crown,
  Hand,
  Lock,
  Mic,
  MicOff,
  MonitorOff,
  MoreHorizontal,
  Pin,
  PinOff,
  ShieldCheck,
  UserMinus,
  Video as VideoIcon,
  VideoOff,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Switch,
  cn,
} from "@geiger/ui";

// Meeting moderation UI: a per-tile menu and the host tools panel in the control bar.

export function ParticipantMenu({ participant, room }) {
  const { hostControls: host, roomMeta } = room;
  const spotlighted = roomMeta.spotlightId === participant.id;
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Manage ${participant.name || "participant"}`}
          className="flex h-7 w-7 items-center justify-center rounded-md bg-black/45 text-foreground backdrop-blur-sm transition-colors hover:bg-black/60"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="w-56">
        <DropdownMenuLabel className="truncate">{participant.name || "Guest"}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {participant.micOn ? (
          <DropdownMenuItem onSelect={() => host.mute(participant.id)}>
            <MicOff /> Mute
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => host.askUnmute(participant.id)}>
            <Mic /> Ask to unmute
          </DropdownMenuItem>
        )}
        {participant.camOn ? (
          <DropdownMenuItem onSelect={() => host.stopVideo(participant.id)}>
            <VideoOff /> Stop video
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => host.askVideo(participant.id)}>
            <VideoIcon /> Ask to start video
          </DropdownMenuItem>
        )}
        {participant.sharing ? (
          <DropdownMenuItem onSelect={() => host.stopShare(participant.id)}>
            <MonitorOff /> Stop their share
          </DropdownMenuItem>
        ) : null}
        {participant.handRaisedAt ? (
          <DropdownMenuItem onSelect={() => host.lowerHand(participant.id)}>
            <Hand /> Lower hand
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => host.spotlight(spotlighted ? null : participant.id)}>
          {spotlighted ? <PinOff /> : <Pin />} {spotlighted ? "Remove spotlight" : "Spotlight for everyone"}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => host.makeHost(participant.id, participant.name)}>
          <Crown /> Make host
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => host.remove(participant.id, participant.name)}>
          <UserMinus /> Remove from meeting
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PolicyRow({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-3 py-0.5">
      <span className="text-sm text-foreground">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

export function HostToolsPopover({ room }) {
  const { hostControls: host, roomMeta, raisedHands, remoteParticipants } = room;
  const unmuted = remoteParticipants.filter((p) => p.micOn).length;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Host tools"
          aria-label="Host tools"
          className="relative flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface-hover text-foreground transition-colors hover:bg-surface-active"
        >
          <ShieldCheck className="h-[18px] w-[18px]" />
          {raisedHands.length ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-black">
              {raisedHands.length}
            </span>
          ) : roomMeta.locked ? (
            <span className="absolute -right-0.5 -top-0.5 rounded-full bg-surface-dialog p-0.5">
              <Lock className="h-3 w-3 text-amber-500" />
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="center" sideOffset={10} className="w-72 p-0">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Host tools</span>
        </div>
        <div className="grid grid-cols-2 gap-2 px-3 py-3">
          <button
            type="button"
            onClick={host.muteAll}
            disabled={!unmuted}
            className="flex h-8 items-center justify-center gap-1.5 rounded-md border border-border text-xs text-foreground transition-colors hover:bg-surface-hover disabled:opacity-40"
          >
            <MicOff className="h-3.5 w-3.5" /> Mute all
          </button>
          <button
            type="button"
            onClick={host.lowerAllHands}
            disabled={!raisedHands.length}
            className="flex h-8 items-center justify-center gap-1.5 rounded-md border border-border text-xs text-foreground transition-colors hover:bg-surface-hover disabled:opacity-40"
          >
            <Hand className="h-3.5 w-3.5" /> Lower all hands
          </button>
        </div>
        <div className="space-y-1.5 border-t border-border px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Participants can</p>
          <PolicyRow label="Unmute themselves" checked={roomMeta.allowUnmute !== false} onChange={(on) => host.setPolicy({ allowUnmute: on })} />
          <PolicyRow label="Start their video" checked={roomMeta.allowVideo !== false} onChange={(on) => host.setPolicy({ allowVideo: on })} />
          <PolicyRow label="Share their screen" checked={roomMeta.allowShare !== false} onChange={(on) => host.setPolicy({ allowShare: on })} />
        </div>
        <div className="border-t border-border px-3 py-3">
          <PolicyRow label="Lock the meeting" checked={Boolean(roomMeta.locked)} onChange={(on) => host.setPolicy({ locked: on })} />
          <p className="mt-1 text-[11px] text-muted-foreground">Nobody new can join with the code while it&apos;s locked.</p>
        </div>
        <div className="border-t border-border px-3 py-3">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Raised hands{raisedHands.length ? ` (${raisedHands.length})` : ""}
          </p>
          {raisedHands.length ? (
            <ol className="space-y-1">
              {raisedHands.map((p, index) => (
                <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="w-4 text-right text-[11px] tabular-nums text-muted-foreground">{index + 1}</span>
                    <span className="truncate text-foreground">{p.isSelf ? "You" : p.name || "Guest"}</span>
                  </span>
                  {!p.isSelf ? (
                    <button
                      type="button"
                      onClick={() => host.lowerHand(p.id)}
                      className={cn("rounded px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-surface-hover hover:text-foreground")}
                    >
                      Lower
                    </button>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-xs text-muted-foreground">No hands up.</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
