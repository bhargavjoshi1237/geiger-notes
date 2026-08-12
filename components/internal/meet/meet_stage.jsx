"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Copy,
  Hand,
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  MonitorUp,
  PhoneOff,
  Users,
  Video as VideoIcon,
  VideoOff,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { hasTurn } from "@/lib/meet/ice";
import { useMeetRoom } from "@/lib/meet/useMeetRoom";
import { trackToStream } from "@/lib/meet/useMediaTracks";
import { VideoTile } from "./video_tile";

// The active meeting surface. Layout follows the geiger-chat call stage — the
// tile grid, the round control bar, the elapsed timer — but every tile here is a
// real MediaStream off the peer mesh rather than a placeholder.
//
// When anyone shares their screen the grid gives way to a presenter layout: the
// share fills the stage and everyone else drops to a filmstrip, because a shared
// screen is unreadable at grid size.

function useElapsed(active) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function ControlButton({ icon: Icon, label, active, danger, onClick, disabled }) {
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
            : "border-transparent bg-red-500/10 text-red-300 hover:bg-red-500/20",
      )}
    >
      <Icon className="h-[18px] w-[18px]" />
    </button>
  );
}

export function MeetStage({ roomId, code, me, isHost, embedded = false, onClose }) {
  const room = useMeetRoom({ roomId, me });
  const [handRaised, setHandRaised] = useState(false);
  const [expanded, setExpanded] = useState(!embedded);
  const elapsed = useElapsed(true);

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
  const presenter = room.sharing
    ? { id: me?.id, name: "You", stream: selfShareStream, isSelf: true }
    : (() => {
        const sharer = remotes.find((p) => p.sharing);
        if (!sharer) return null;
        return {
          id: sharer.id,
          name: sharer.name,
          stream: room.remoteStreams.get(sharer.id),
          isSelf: false,
        };
      })();

  const total = remotes.length + 1;
  const gridCols =
    total <= 2 ? "grid-cols-1 sm:grid-cols-2" : total <= 4 ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-3";

  const copyCode = () => {
    navigator.clipboard.writeText(code || "");
    toast.success("Meeting code copied");
  };

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
      name="You"
      id={me?.id}
      micOn={room.micOn}
      cameraOn={room.camOn}
      isSelf
      big={total <= 2 && !presenter}
    />
  );

  return (
    <div
      className={cn(
        "flex flex-col bg-background",
        embedded && !expanded
          ? "h-full overflow-hidden rounded-xl border border-border"
          : "fixed inset-0 z-50",
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex items-center gap-1.5 rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-semibold text-red-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" /> LIVE
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-foreground">Meeting</h2>
            <p className="text-[11px] text-muted-foreground">
              {elapsed} · {total} in call
              {room.connected ? "" : " · connecting…"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {code ? (
            <button
              type="button"
              onClick={copyCode}
              title="Copy meeting code"
              className="hidden items-center gap-1.5 rounded-md border border-border px-2 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground sm:flex"
            >
              {code}
              <Copy className="h-3 w-3" />
            </button>
          ) : null}
          <button
            type="button"
            title="Participants"
            aria-label="Participants"
            className="hidden h-8 items-center gap-1 rounded-full px-2 text-muted-foreground hover:bg-surface-hover hover:text-foreground sm:flex"
          >
            <Users className="h-[18px] w-[18px]" />
            <span className="text-xs">{total}</span>
          </button>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? "Exit fullscreen" : "Fullscreen"}
            aria-label={expanded ? "Exit fullscreen" : "Fullscreen"}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-hover hover:text-foreground"
          >
            {expanded ? (
              <Minimize2 className="h-[18px] w-[18px]" />
            ) : (
              <Maximize2 className="h-[18px] w-[18px]" />
            )}
          </button>
        </div>
      </div>

      {room.error ? (
        <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs text-amber-300">
          {room.error} You can still hear and see everyone else.
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
        {presenter ? (
          <div className="flex h-full flex-col gap-3">
            <VideoTile
              stream={presenter.stream}
              name={presenter.name}
              id={presenter.id}
              sharing
              cameraOn
              isSelf={presenter.isSelf}
              big
              className="min-h-0 flex-1"
            />
            <div className="flex shrink-0 gap-3 overflow-x-auto pb-1">
              <div className="w-40 shrink-0">{selfTile}</div>
              {remotes.map((p) => (
                <div key={p.id} className="w-40 shrink-0">
                  <VideoTile
                    stream={room.remoteStreams.get(p.id)}
                    name={p.name}
                    id={p.id}
                    micOn={p.micOn}
                    cameraOn={p.camOn}
                    connectionState={room.peerStates.get(p.id)}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className={cn("grid h-full gap-3", gridCols)}>
            {remotes.map((p) => (
              <VideoTile
                key={p.id}
                stream={room.remoteStreams.get(p.id)}
                name={p.name}
                id={p.id}
                micOn={p.micOn}
                cameraOn={p.camOn}
                sharing={p.sharing}
                connectionState={room.peerStates.get(p.id)}
                big={total <= 2}
              />
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
          label={handRaised ? "Lower hand" : "Raise hand"}
          active={handRaised}
          onClick={() => setHandRaised((v) => !v)}
        />
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
    </div>
  );
}

export default MeetStage;
