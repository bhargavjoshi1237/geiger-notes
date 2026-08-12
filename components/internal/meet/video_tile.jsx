"use client";

import React, { useEffect, useRef } from "react";
import { Mic, MicOff, MonitorUp, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

// Deterministic accent per person, so a tile keeps the same colour across a
// call without anyone having to store one.
const ACCENTS = [
  "from-sky-500/30 to-sky-900/10",
  "from-violet-500/30 to-violet-900/10",
  "from-emerald-500/30 to-emerald-900/10",
  "from-amber-500/30 to-amber-900/10",
  "from-pink-500/30 to-pink-900/10",
  "from-cyan-500/30 to-cyan-900/10",
];

function accentFor(key) {
  let hash = 0;
  for (let i = 0; i < String(key || "").length; i += 1) {
    hash = (hash * 31 + String(key).charCodeAt(i)) | 0;
  }
  return ACCENTS[Math.abs(hash) % ACCENTS.length];
}

export function initialsOf(name) {
  const parts = String(name || "Guest").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function Avatar({ name, id, size = "lg" }) {
  const dimension = size === "xl" ? "h-24 w-24 text-2xl" : "h-14 w-14 text-base";
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-gradient-to-br font-semibold text-foreground",
        accentFor(id || name),
        dimension,
      )}
    >
      {initialsOf(name)}
    </div>
  );
}

// One participant. Renders live video when there's a track to show, and falls
// back to the avatar otherwise — which is the honest picture, because a peer
// whose camera is off sends no video at all.
export function VideoTile({
  stream,
  name,
  id,
  micOn = true,
  cameraOn = true,
  sharing = false,
  isSelf = false,
  big = false,
  connectionState,
  className,
}) {
  const videoRef = useRef(null);
  const showVideo = Boolean(stream) && (cameraOn || sharing);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.srcObject !== stream) el.srcObject = stream || null;
  }, [stream, showVideo]);

  const failed = connectionState === "failed" || connectionState === "disconnected";

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border bg-background",
        big ? "min-h-[260px]" : "min-h-[140px]",
        className,
      )}
    >
      {showVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          // Never play your own microphone back into the room.
          muted={isSelf}
          className={cn(
            "absolute inset-0 h-full w-full",
            // A shared screen must never be cropped; a face is better filling
            // the tile than letterboxed inside it.
            sharing ? "object-contain" : "object-cover",
            isSelf && !sharing && "scale-x-[-1]",
          )}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Avatar name={name} id={id} size={big ? "xl" : "lg"} />
        </div>
      )}

      {failed && !isSelf ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/80 text-center">
          <WifiOff className="h-5 w-5 text-red-400" />
          <p className="px-4 text-xs text-muted-foreground">
            Couldn&apos;t connect to {name || "this person"}
          </p>
        </div>
      ) : null}

      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-md bg-black/45 px-2 py-1 backdrop-blur-sm">
        <span className="max-w-[12rem] truncate text-xs font-medium text-foreground">
          {isSelf ? "You" : name || "Guest"}
        </span>
        {micOn ? (
          <Mic className="h-3 w-3 text-muted-foreground" />
        ) : (
          <MicOff className="h-3 w-3 text-red-400" />
        )}
        {sharing ? <MonitorUp className="h-3 w-3 text-emerald-400" /> : null}
      </div>
    </div>
  );
}

export default VideoTile;
