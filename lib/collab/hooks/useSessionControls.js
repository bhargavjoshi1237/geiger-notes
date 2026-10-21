"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { canModerate, followLoops, memberColor } from "../session";
import { useSessionLive } from "./useSessionLive";

// Host controls of a live board session, built on useSessionLive (ephemeral) and the preference bag (durable).
// Follow is soft (any pan/zoom ends it); a host's view lock (preference.focus) is hard while that host is present.

const SUMMON_GRACE_MS = 4000;
const LEADER_GONE_MS = 3000;
const REACTION_MS = 2600;

export const SESSION_REACTIONS = ["👍", "👏", "🎉", "❤️", "😂", "🤔"];

const nameOf = (user) =>
  user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || "Guest";

export function useSessionControls({ sessionId, isLoaded, user, role, sessionData, preference, ended, updatePreference, endSession }) {
  const moderator = canModerate(role);
  const myEntry = user ? sessionData?.joiners?.[user.id] : null;
  const me = useMemo(
    () =>
      user
        ? {
            id: user.id,
            name: myEntry?.name || nameOf(user),
            color: memberColor(user.id, myEntry),
            role,
            avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
          }
        : null,
    [user, myEntry, role],
  );

  const [spotlight, setSpotlight] = useState(null); // { nodeId, at, by }
  const [laserOn, setLaserOn] = useState(false);
  const [endedLive, setEndedLive] = useState(false);
  const [reactions, setReactions] = useState([]); // [{ id, emoji, name, color }]

  const sessionRef = useRef(sessionData);
  const liveRef = useRef(null);
  const summonTimerRef = useRef(null);
  useEffect(() => {
    sessionRef.current = sessionData;
  }, [sessionData]);

  // Host-only commands are honoured only from the host or a co-host of this session.
  const isModeratorId = useCallback((id) => {
    const s = sessionRef.current;
    if (!s || !id) return false;
    if (s.host === id) return true;
    const entry = s.joiners?.[id];
    return entry?.status === "joined" && Boolean(entry.cohost);
  }, []);

  const pushReaction = useCallback((emoji, name, color) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setReactions((list) => [...list.slice(-14), { id, emoji, name, color }]);
    setTimeout(() => setReactions((list) => list.filter((r) => r.id !== id)), REACTION_MS);
  }, []);

  const handleCommand = useCallback(
    (type, payload) => {
      const live = liveRef.current;
      const from = payload.userId;
      if (type === "reaction") {
        if (typeof payload.emoji === "string" && payload.emoji.length <= 8) pushReaction(payload.emoji, payload.name, payload.color);
        return;
      }
      if (!isModeratorId(from)) return;
      const hostName = payload.name || "The host";
      switch (type) {
        case "summon": {
          if (!live || live.followingId === from) return;
          clearTimeout(summonTimerRef.current);
          let cancelled = false;
          toast(`${hostName} is bringing everyone to their view`, {
            description: "You'll follow along in a moment. Pan or zoom any time to look around.",
            duration: SUMMON_GRACE_MS,
            action: {
              label: "Not now",
              onClick: () => {
                cancelled = true;
                clearTimeout(summonTimerRef.current);
              },
            },
          });
          summonTimerRef.current = setTimeout(() => {
            if (!cancelled) liveRef.current?.follow(from);
          }, SUMMON_GRACE_MS);
          return;
        }
        case "release":
          clearTimeout(summonTimerRef.current);
          if (live?.followingId === from) live.follow(null);
          return;
        case "spotlight":
          if (payload.nodeId) setSpotlight({ nodeId: payload.nodeId, at: Date.now(), by: from });
          return;
        case "announce":
          if (payload.text) toast.info(`${hostName}: ${String(payload.text).slice(0, 280)}`, { duration: 9000 });
          return;
        case "hand-lower":
          if (live?.handRaisedAt && (payload.target === "*" || payload.target === live.myId)) {
            live.raiseHand(false);
            toast.info(`${hostName} lowered your hand`);
          }
          return;
        case "end":
          // Broadcast senders aren't authenticated, so the ended screen waits for the row to confirm it.
          createClient()
            .from("collab")
            .select("preference")
            .eq("id", sessionId)
            .single()
            .then(({ data }) => data?.preference?.endedAt && setEndedLive(true));
          return;
        default:
      }
    },
    [isModeratorId, pushReaction, sessionId],
  );

  const removed = myEntry?.status === "kicked" && sessionData?.host !== user?.id;
  const live = useSessionLive({ sessionId, enabled: isLoaded && !removed, me, onCommand: handleCommand });
  useEffect(() => {
    liveRef.current = live;
  });

  // Someone removed from the session no longer counts as present, even if their tab is still open.
  const joiners = sessionData?.joiners;
  const peers = useMemo(() => live.peers.filter((p) => joiners?.[p.id]?.status !== "kicked"), [live.peers, joiners]);
  const peerById = useMemo(() => new Map(peers.map((p) => [p.id, p])), [peers]);

  // A host's view lock binds everyone else who isn't a moderator, but only while that host is here.
  const focus = preference?.focus || null;
  const focusLeaderPresent = Boolean(focus?.by && peerById.has(focus.by));
  const viewLocked = Boolean(focus && !moderator && focus.by !== live.myId && focusLeaderPresent);

  useEffect(() => {
    if (viewLocked) live.follow(focus.by);
  }, [viewLocked, focus?.by]); // eslint-disable-line react-hooks/exhaustive-deps

  const wasLockedRef = useRef(false);
  useEffect(() => {
    if (wasLockedRef.current && !viewLocked && live.followingId && live.followingId === focus?.by) live.follow(null);
    if (wasLockedRef.current && !viewLocked && !focus) {
      live.follow(null);
      toast.info("The host released the view");
    }
    wasLockedRef.current = viewLocked;
  }, [viewLocked]); // eslint-disable-line react-hooks/exhaustive-deps

  // Stop following someone who left, or whose chain of follows now leads back to us.
  useEffect(() => {
    const leaderId = live.followingId;
    if (!leaderId || viewLocked) return undefined;
    const leader = peerById.get(leaderId);
    if (leader && followLoops(live.myId, leader.followingId, (id) => peerById.get(id)?.followingId)) {
      live.follow(null);
      toast.info(`Stopped following ${leader.name || "them"} — they're following you`);
      return undefined;
    }
    if (leader) return undefined;
    const timer = setTimeout(() => {
      liveRef.current?.follow(null);
      toast.info("The person you were following left");
    }, LEADER_GONE_MS);
    return () => clearTimeout(timer);
  }, [live.followingId, peerById, viewLocked]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => clearTimeout(summonTimerRef.current), []);

  // A reopened session clears the "ended" flag an earlier end command left behind.
  const prevEndedRef = useRef(ended);
  useEffect(() => {
    if (prevEndedRef.current && !ended) setEndedLive(false);
    prevEndedRef.current = ended;
  }, [ended]);

  const laserAllowed = moderator || preference?.laser !== "hosts";
  const laserActive = laserOn && laserAllowed;

  const followUser = useCallback(
    (userId) => {
      if (!userId || userId === live.myId || viewLocked) return;
      const target = peerById.get(userId);
      if (!target) {
        toast.error("They're not in the session right now");
        return;
      }
      if (followLoops(live.myId, target.followingId, (id) => peerById.get(id)?.followingId)) {
        toast.error(`${target.name || "That person"} is already following you`);
        return;
      }
      live.follow(userId);
    },
    [live, peerById, viewLocked],
  );

  const stopFollowing = useCallback(() => {
    if (!viewLocked) live.follow(null);
  }, [live, viewLocked]);

  const bringEveryone = useCallback(() => {
    if (!moderator) return;
    live.sendCommand("summon", { name: me?.name });
    toast.success("Bringing everyone to your view", { description: "They can say “Not now” or wander off by panning." });
  }, [moderator, live, me?.name]);

  const releaseEveryone = useCallback(() => {
    if (!moderator) return;
    live.sendCommand("release", { name: me?.name });
  }, [moderator, live, me?.name]);

  const setViewLock = useCallback(
    async (on) => {
      if (!moderator || !me) return;
      const ok = await updatePreference({ focus: on ? { by: me.id, name: me.name, at: new Date().toISOString() } : null });
      if (!ok) return;
      if (!on) live.sendCommand("release", { name: me.name });
      toast.success(on ? "Everyone's view now follows yours" : "View released");
    },
    [moderator, me, updatePreference, live],
  );

  const spotlightNode = useCallback(
    (nodeId) => {
      if (!moderator || !nodeId) return;
      setSpotlight({ nodeId, at: Date.now(), by: live.myId });
      live.sendCommand("spotlight", { nodeId, name: me?.name });
    },
    [moderator, live, me?.name],
  );

  const announce = useCallback(
    (text) => {
      const message = String(text || "").trim();
      if (!moderator || !message) return false;
      live.sendCommand("announce", { text: message, name: me?.name });
      toast.success("Announcement sent");
      return true;
    },
    [moderator, live, me?.name],
  );

  const lowerHand = useCallback(
    (target) => {
      if (!moderator) return;
      live.sendCommand("hand-lower", { target, name: me?.name });
    },
    [moderator, live, me?.name],
  );

  const toggleHand = useCallback(() => {
    const raising = !live.handRaisedAt;
    live.raiseHand(raising);
    if (raising) toast.success("Hand raised", { description: "The host can see it in the people list." });
  }, [live]);

  const toggleLaser = useCallback(() => {
    if (!laserAllowed) {
      toast.error("The host has limited the laser to hosts");
      return;
    }
    setLaserOn((on) => !on);
  }, [laserAllowed]);

  const sendReaction = useCallback(
    (emoji) => {
      pushReaction(emoji, me?.name || "You", me?.color);
      live.sendCommand("reaction", { emoji, name: me?.name, color: me?.color });
    },
    [live, me?.name, me?.color, pushReaction],
  );

  const endForEveryone = useCallback(async () => {
    const ok = await endSession();
    if (ok) {
      live.sendCommand("end", { name: me?.name });
      toast.info("Session ended for everyone");
    }
    return ok;
  }, [endSession, live, me?.name]);

  // Suspend everything at once (Zoom's panic button); restore brings each default back.
  const suspendActivities = useCallback(
    () =>
      updatePreference({
        editLock: true,
        locked: true,
        hideCursors: true,
        laser: "hosts",
        facilitation: "hosts",
      }).then((ok) => ok && toast.warning("Session paused", { description: "Editing, joining, cursors and the laser are limited to hosts." })),
    [updatePreference],
  );

  const resumeActivities = useCallback(
    () =>
      updatePreference({
        editLock: false,
        locked: false,
        hideCursors: false,
        laser: "everyone",
        facilitation: "anyone",
      }).then((ok) => ok && toast.success("Session resumed")),
    [updatePreference],
  );

  const raisedHands = useMemo(
    () => peers.filter((p) => p.handRaisedAt).sort((a, b) => String(a.handRaisedAt).localeCompare(String(b.handRaisedAt))),
    [peers],
  );

  const leader = live.followingId ? peerById.get(live.followingId) || null : null;

  return {
    live,
    me,
    moderator,
    peers,
    peerById,
    leader,
    viewLocked,
    focus: focus && focusLeaderPresent ? focus : null,
    spotlight,
    laserActive,
    laserAllowed,
    reactions,
    raisedHands,
    endedLive,
    ended: ended || endedLive,
    followUser,
    stopFollowing,
    bringEveryone,
    releaseEveryone,
    setViewLock,
    spotlightNode,
    announce,
    lowerHand,
    toggleHand,
    toggleLaser,
    setLaserOn,
    sendReaction,
    endForEveryone,
    suspendActivities,
    resumeActivities,
  };
}
