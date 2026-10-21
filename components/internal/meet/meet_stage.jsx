"use client";

import React, { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Hand,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  SmilePlus,
  Video as VideoIcon,
  VideoOff,
} from "lucide-react";
import { toast } from "sonner";

import { hasTurn } from "@/lib/meet/ice";
import { MEET_REACTIONS, useMeetRoom } from "@/lib/meet/useMeetRoom";
import { trackToStream } from "@/lib/meet/useMediaTracks";
import { Popover, PopoverContent, PopoverTrigger, cn } from "@geiger/ui";
import { RemoteAudio, VideoTile } from "./video_tile";
import { HostToolsPopover, ParticipantMenu } from "./meet_host_tools";

// Active meeting surface: tile grid, or a presenter layout with a filmstrip while anyone shares their screen
// or the host spotlights someone. Docks into the workspace below the Topbar (which shows the call status)
// and right of the 64px sidebar.

function ControlButton({ icon: Icon, label, active, danger, onClick, disabled, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      disabled={disabled}
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-full border transition-colors disabled:opacity-40",
        danger
          ? "border-transparent bg-red-600 text-white hover:bg-red-500"
          : active
            ? "border-border bg-surface-hover text-foreground hover:bg-surface-active"
            : "border-transparent bg-red-500/10 text-red-600 dark:text-red-300 hover:bg-red-500/20",
        className,
      )}
    >
      <Icon className="h-[18px] w-[18px]" />
    </button>
  );
}

export function MeetStage({ roomId, code, me, hostId, onClose, onStatsChange }) {
  const room = useMeetRoom({ roomId, me, hostId, onExit: onClose });
  const { isHost, roomMeta, reactions } = room;

  // Own camera preview: always the camera, never the screen — looking at a
  // recursive picture of your own share helps nobody.
  const selfStream = useMemo(
    () => trackToStream(room.cameraTrack),
    [room.cameraTrack],
  );
  const selfShareStream = useMemo(
    () => trackToStream(room.screenTrack),
    [room.screenTrack],
  );

  const remotes = room.remoteParticipants;
  const remoteTile = (p, extra = {}) => (
    <VideoTile
      stream={room.remoteStreams.get(p.id)}
      name={p.name}
      id={p.id}
      avatarUrl={p.avatarUrl}
      micOn={p.micOn}
      cameraOn={p.camOn}
      sharing={p.sharing}
      connectionState={room.peerStates.get(p.id)}
      handRaised={Boolean(p.handRaisedAt)}
      spotlighted={roomMeta.spotlightId === p.id}
      isHost={room.hostId === p.id}
      reaction={reactions[p.id]}
      menu={isHost ? <ParticipantMenu participant={p} room={room} /> : null}
      {...extra}
    />
  );

  // A screen share takes the stage first; otherwise the host's spotlight does.
  const sharer = room.sharing ? null : remotes.find((p) => p.sharing);
  const spotlit = roomMeta.spotlightId ? remotes.find((p) => p.id === roomMeta.spotlightId) : null;
  const selfSpotlit = roomMeta.spotlightId && roomMeta.spotlightId === me?.id;
  const presenter = room.sharing
    ? { id: me?.id, name: "You", stream: selfShareStream, isSelf: true, sharing: true }
    : sharer
      ? { id: sharer.id, name: sharer.name, stream: room.remoteStreams.get(sharer.id), isSelf: false, sharing: true }
      : spotlit
        ? { participant: spotlit }
        : selfSpotlit
          ? { id: me?.id, name: me?.name || "You", stream: selfStream, isSelf: true, sharing: false }
          : null;

  const total = remotes.length + 1;
  const gridCols =
    total <= 2 ? "grid-cols-1 sm:grid-cols-2" : total <= 4 ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-3";

  useEffect(() => {
    onStatsChange?.({ total, connected: room.connected });
  }, [total, room.connected, onStatsChange]);

  const leave = () => {
    room.leave();
    onClose?.();
  };

  const end = async () => {
    const ok = await room.endRoom();
    if (!ok) toast.error("Couldn't end the meeting for everyone.");
    else toast.info("Meeting ended");
    onClose?.();
  };

  const selfTile = (
    <VideoTile
      key="self"
      stream={selfStream}
      name={me?.name || "You"}
      id={me?.id}
      avatarUrl={me?.avatarUrl}
      micOn={room.micOn}
      cameraOn={room.camOn}
      isSelf
      handRaised={Boolean(room.handRaisedAt)}
      spotlighted={selfSpotlit}
      isHost={isHost}
      reaction={reactions[me?.id]}
      big={total <= 2 && !presenter}
    />
  );

  return createPortal(
    <div className="fixed top-14 bottom-0 left-0 right-0 z-50 flex flex-col bg-background md:left-16">
      {room.error ? (
        <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs text-amber-700 dark:text-amber-300">
          {room.error} You can still hear and see everyone else.
        </div>
      ) : null}

      {remotes.map((p) => (
        <RemoteAudio key={p.id} stream={room.remoteStreams.get(p.id)} />
      ))}

      <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
        {presenter ? (
          <div className="flex h-full flex-col gap-3">
            {presenter.participant ? (
              remoteTile(presenter.participant, { big: true, className: "min-h-0 flex-1" })
            ) : (
              <VideoTile
                stream={presenter.stream}
                name={presenter.name}
                id={presenter.id}
                sharing={presenter.sharing}
                cameraOn
                isSelf={presenter.isSelf}
                spotlighted={!presenter.sharing}
                big
                className="min-h-0 flex-1"
              />
            )}
            <div className="flex shrink-0 gap-3 overflow-x-auto pb-1">
              <div className="w-40 shrink-0">{selfTile}</div>
              {remotes.map((p) => (
                <div key={p.id} className="w-40 shrink-0">
                  {remoteTile(p, { sharing: false, cameraOn: p.camOn })}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className={cn("grid h-full gap-3", gridCols)}>
            {remotes.map((p) => (
              <React.Fragment key={p.id}>{remoteTile(p, { big: total <= 2 })}</React.Fragment>
            ))}
            {selfTile}
          </div>
        )}

        {remotes.length === 0 ? (
          <div className="mt-4 space-y-1 text-center">
            <p className="text-sm text-muted-foreground">
              You&apos;re the only one here.
            </p>
            {code ? (
              <p className="text-xs text-muted-foreground">
                Share the code <span className="font-mono text-foreground">{code}</span>{" "}
                to let someone join.
              </p>
            ) : null}
            {!hasTurn() ? (
              <p className="text-xs text-muted-foreground/70">
                Connections are peer-to-peer over STUN — a restrictive corporate
                firewall may block them.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-center gap-2 border-t border-border px-4 py-3 sm:gap-3">
        <ControlButton
          icon={room.micOn ? Mic : MicOff}
          label={room.micOn ? "Mute" : "Unmute"}
          active={room.micOn}
          onClick={room.toggleMic}
        />
        <ControlButton
          icon={room.camOn ? VideoIcon : VideoOff}
          label={room.camOn ? "Stop video" : "Start video"}
          active={room.camOn}
          onClick={room.toggleCam}
        />
        <ControlButton
          icon={MonitorUp}
          label={room.sharing ? "Stop sharing" : "Share screen"}
          active={room.sharing}
          onClick={room.toggleShare}
        />
        <ControlButton
          icon={Hand}
          label={room.handRaisedAt ? "Lower hand" : "Raise hand"}
          active
          onClick={room.toggleHand}
          className={room.handRaisedAt ? "border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-300" : undefined}
        />
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              title="React"
              aria-label="React"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface-hover text-foreground transition-colors hover:bg-surface-active"
            >
              <SmilePlus className="h-[18px] w-[18px]" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" sideOffset={10} className="w-auto p-1.5">
            <div className="flex gap-1">
              {MEET_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => room.sendReaction(emoji)}
                  className="flex h-9 w-9 items-center justify-center rounded-md text-lg transition-transform hover:scale-110 hover:bg-surface-hover"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        {isHost ? <HostToolsPopover room={room} /> : null}
        <button
          type="button"
          onClick={leave}
          className="ml-1 flex h-11 items-center gap-2 rounded-full bg-red-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-red-500"
        >
          <PhoneOff className="h-[18px] w-[18px]" />
          <span className="hidden sm:inline">Leave</span>
        </button>
        {isHost ? (
          <button
            type="button"
            onClick={end}
            className="hidden h-11 items-center rounded-full border border-border px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground sm:flex"
          >
            End for all
          </button>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

export default MeetStage;
