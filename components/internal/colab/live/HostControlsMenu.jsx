"use client";

import React, { useState } from "react";
import { Crown, DoorClosed, Hand, Megaphone, Pause, Play, Send, Sparkles, Users } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Switch,
  cn,
} from "@geiger/ui";

// The host's consolidated panel (Zoom's "Host tools" pattern): attention, participant permissions, hands, lifecycle.

function Section({ title, children, aside }) {
  return (
    <div className="space-y-2 border-t border-border px-3 py-3 first:border-t-0">
      <div className="flex items-center justify-between">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</h4>
        {aside}
      </div>
      {children}
    </div>
  );
}

function ToggleRow({ label, hint, checked, onChange, disabled }) {
  return (
    <label className={cn("flex items-center justify-between gap-3", disabled && "opacity-50")}>
      <span className="min-w-0">
        <span className="block text-sm text-foreground">{label}</span>
        {hint ? <span className="block text-[11px] text-muted-foreground">{hint}</span> : null}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </label>
  );
}

const PAUSED_KEYS = { editLock: true, locked: true, hideCursors: true, laser: "hosts", facilitation: "hosts" };

export default function HostControlsMenu({ controls, role, preference, updatePreference, selectedNodeId, endedSession }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [ending, setEnding] = useState(false);
  const { me, raisedHands, peerById, bringEveryone, setViewLock, spotlightNode, announce, lowerHand, suspendActivities, resumeActivities, endForEveryone } =
    controls;

  const presentingMe = preference.focus?.by === me?.id;
  const paused = Object.entries(PAUSED_KEYS).every(([key, value]) => preference[key] === value);
  const isHost = role === "host";

  const sendAnnouncement = () => {
    if (announce(message)) setMessage("");
  };

  const end = async () => {
    setEnding(true);
    const ok = await endForEveryone();
    setEnding(false);
    if (ok) {
      setConfirmEnd(false);
      setOpen(false);
    }
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "relative flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground",
              open && "bg-surface-hover text-foreground",
            )}
            title="Host controls"
          >
            <Crown className="h-3.5 w-3.5 text-amber-500" />
            <span className="hidden lg:inline">Host</span>
            {raisedHands.length ? (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-black">
                {raisedHands.length}
              </span>
            ) : paused ? (
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            ) : null}
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" sideOffset={8} className="w-80 max-w-[calc(100vw-2rem)] p-0">
          <div className="flex items-center justify-between px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium text-foreground">Host controls</span>
            </div>
            <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {isHost ? "Host" : "Co-host"}
            </span>
          </div>

          <div className="max-h-[min(70vh,560px)] overflow-y-auto">
            <Section title="Attention">
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="h-8 justify-start text-xs" onClick={bringEveryone} disabled={endedSession}>
                  <Users className="mr-1.5 h-3.5 w-3.5" /> Bring everyone
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 justify-start text-xs"
                  onClick={() => spotlightNode(selectedNodeId)}
                  disabled={!selectedNodeId || endedSession}
                  title={selectedNodeId ? "Fly everyone to the selected node" : "Select a node to spotlight it"}
                >
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Spotlight node
                </Button>
              </div>
              <ToggleRow
                label="Lock everyone's view to mine"
                hint="Participants follow you and can't pan away until you release."
                checked={presentingMe}
                onChange={(on) => setViewLock(on)}
                disabled={endedSession}
              />
              <div className="flex items-center gap-1.5">
                <div className="relative min-w-0 flex-1">
                  <Megaphone className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendAnnouncement()}
                    placeholder="Announce to everyone…"
                    maxLength={280}
                    className="h-8 w-full rounded-md border border-border bg-surface-card pl-7 pr-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-border-strong focus:outline-none"
                  />
                </div>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={sendAnnouncement} disabled={!message.trim()} aria-label="Send announcement">
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Section>

            <Section title="Participants can">
              <ToggleRow label="Edit the board" checked={!preference.editLock} onChange={(on) => updatePreference({ editLock: !on })} />
              <ToggleRow label="Ask to join" hint="Off locks the session to new people." checked={!preference.locked} onChange={(on) => updatePreference({ locked: !on })} />
              <ToggleRow label="Use the laser pointer" checked={preference.laser !== "hosts"} onChange={(on) => updatePreference({ laser: on ? "everyone" : "hosts" })} />
              <ToggleRow
                label="Run polls and timers"
                hint="Off keeps close, reset, reveal and timer controls with hosts."
                checked={preference.facilitation !== "hosts"}
                onChange={(on) => updatePreference({ facilitation: on ? "anyone" : "hosts" })}
              />
              <ToggleRow label="See each other's cursors" checked={!preference.hideCursors} onChange={(on) => updatePreference({ hideCursors: !on })} />
            </Section>

            <Section
              title={`Raised hands${raisedHands.length ? ` (${raisedHands.length})` : ""}`}
              aside={
                raisedHands.length > 1 ? (
                  <button type="button" onClick={() => lowerHand("*")} className="text-[11px] text-muted-foreground hover:text-foreground">
                    Lower all
                  </button>
                ) : null
              }
            >
              {raisedHands.length ? (
                <ol className="space-y-1">
                  {raisedHands.map((peer, index) => (
                    <li key={peer.id} className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1 hover:bg-surface-hover/50">
                      <span className="flex min-w-0 items-center gap-2 text-sm">
                        <span className="w-4 text-right text-[11px] tabular-nums text-muted-foreground">{index + 1}</span>
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: peerById.get(peer.id)?.color }} />
                        <span className="truncate text-foreground">{peer.name || "Guest"}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => lowerHand(peer.id)}
                        className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                      >
                        <Hand className="h-3 w-3" /> Lower
                      </button>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-xs text-muted-foreground">No hands up.</p>
              )}
            </Section>

            <Section title="Session">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className={cn("h-8 justify-start text-xs", paused && "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300")}
                  onClick={paused ? resumeActivities : suspendActivities}
                  disabled={endedSession}
                  title={paused ? "Restore participant permissions" : "Stop editing, joining, cursors and the laser at once"}
                >
                  {paused ? <Play className="mr-1.5 h-3.5 w-3.5" /> : <Pause className="mr-1.5 h-3.5 w-3.5" />}
                  {paused ? "Resume all" : "Pause all"}
                </Button>
                {isHost ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 justify-start text-xs text-red-600 hover:bg-red-500/10 hover:text-red-600 dark:text-red-400"
                    onClick={() => setConfirmEnd(true)}
                    disabled={endedSession}
                  >
                    <DoorClosed className="mr-1.5 h-3.5 w-3.5" /> End for all
                  </Button>
                ) : null}
              </div>
            </Section>
          </div>
        </PopoverContent>
      </Popover>

      <Dialog open={confirmEnd} onOpenChange={setConfirmEnd}>
        <DialogContent className="max-w-sm border-border bg-surface-dialog text-foreground">
          <DialogHeader>
            <DialogTitle>End the session for everyone?</DialogTitle>
            <DialogDescription>
              Everyone is sent out, the code stops working and the board freezes. You can reopen it later, and merge it back from your board.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmEnd(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={end} disabled={ending}>
              {ending ? "Ending…" : "End session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
