"use client";

import React from "react";
import { Eye, Lock, PencilOff, Radio, Wand2, X } from "lucide-react";
import { cn } from "@geiger/ui";

// Floating status pills over the canvas: who you follow, a host's view lock, paused editing, and your laser.

function Pill({ color, icon: Icon, children, action, onAction, className }) {
  return (
    <div
      className={cn(
        "pointer-events-auto flex items-center gap-2 rounded-full border border-border bg-surface-dialog/95 py-1 pl-2.5 pr-1.5 text-xs text-foreground shadow-xl shadow-black/20 backdrop-blur animate-in fade-in slide-in-from-top-1",
        !action && "pr-3",
        className,
      )}
    >
      {color ? (
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      ) : Icon ? (
        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      ) : null}
      <span className="min-w-0 truncate">{children}</span>
      {action ? (
        <button
          type="button"
          onClick={onAction}
          className="flex items-center gap-1 rounded-full px-2 py-0.5 font-medium text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          {action}
        </button>
      ) : null}
    </div>
  );
}

export default function SessionStatusBar({ controls, canEdit, role, preference }) {
  const { leader, viewLocked, focus, live, moderator, laserActive, setLaserOn, followUser, stopFollowing, releaseEveryone, setViewLock } =
    controls;
  const followers = live.followers;
  const presentingMe = focus?.by && focus.by === live.myId;
  const memberPaused = preference?.editLock && !canEdit && (role === "editor" || role === "pending");

  const pills = [];
  if (viewLocked && leader) {
    pills.push(
      <Pill key="locked" color={leader.color} className="border-primary/40">
        <Lock className="mr-1 inline h-3 w-3 -translate-y-px" />
        <span className="font-medium">{leader.name}</span> is presenting — your view follows theirs
      </Pill>,
    );
  } else if (leader) {
    pills.push(
      <Pill key="following" color={leader.color} action={<><X className="h-3 w-3" /> Stop</>} onAction={stopFollowing}>
        Following <span className="font-medium">{leader.name}</span>
      </Pill>,
    );
  } else if (focus && !presentingMe && moderator) {
    pills.push(
      <Pill key="presenting" icon={Radio} action="Follow" onAction={() => followUser(focus.by)}>
        <span className="font-medium">{focus.name || "A host"}</span> is presenting
      </Pill>,
    );
  }

  if (presentingMe) {
    pills.push(
      <Pill key="leading-locked" icon={Lock} action="Release" onAction={() => setViewLock(false)}>
        Everyone&apos;s view follows yours
      </Pill>,
    );
  } else if (followers.length > 0) {
    pills.push(
      <Pill key="leading" icon={Eye} action={moderator ? "Stop leading" : null} onAction={releaseEveryone}>
        {followers.length === 1 ? `${followers[0].name || "Someone"} is following you` : `${followers.length} people are following you`}
      </Pill>,
    );
  }

  if (memberPaused) {
    pills.push(
      <Pill key="paused" icon={PencilOff}>
        The host paused editing — you can still look around
      </Pill>,
    );
  }

  if (laserActive) {
    pills.push(
      <Pill key="laser" icon={Wand2} action="Esc" onAction={() => setLaserOn(false)}>
        Laser on — move to point
      </Pill>,
    );
  }

  if (!pills.length) return null;
  return (
    <div className="pointer-events-none absolute left-1/2 top-3 z-[70] flex max-w-[calc(100%-2rem)] -translate-x-1/2 flex-col items-center gap-2">
      {pills}
    </div>
  );
}
