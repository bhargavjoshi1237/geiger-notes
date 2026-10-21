"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { useMediaTracks } from "./useMediaTracks";
import { usePeerMesh } from "./usePeerMesh";

// Composes the two halves of a meeting — the local devices and the peer mesh —
// into the single object the meeting UI consumes, and owns the room record's
// lifecycle (ending it) plus the host's controls over everyone else.
//
// Who is in the room comes from Realtime presence. The row resolves a code to a
// room, records its host, and holds the host's durable settings in metadata
// ({ locked, allowUnmute, allowVideo, allowShare, spotlightId, removed }).
// Host commands ride the mesh channel and are only acted on when they claim the
// room's host as sender; ending, removal and settings are confirmed against the
// row, while mute/stop commands are honour-system (broadcast senders aren't
// authenticated). Taking something away happens at once; anything that turns a
// mic or camera on is a request the participant accepts.

export const MEET_REACTIONS = ["👍", "👏", "🎉", "❤️", "😂", "😮"];
const REACTION_MS = 2600;

export function useMeetRoom({ roomId, me, hostId: initialHostId, onExit }) {
  const supabase = useMemo(() => createClient(), []);
  const media = useMediaTracks();
  const [hostId, setHostId] = useState(initialHostId || null);
  const [roomMeta, setRoomMeta] = useState({});
  const [handRaisedAt, setHandRaisedAt] = useState(null);
  const [reactions, setReactions] = useState({}); // userId -> { emoji, key }

  const isHost = Boolean(me?.id && hostId === me.id);

  // Control frames arrive outside render, so they read live values through refs.
  const liveRef = useRef({});
  const onExitRef = useRef(onExit);
  useEffect(() => {
    liveRef.current = { media, hostId, roomMeta, handRaisedAt, me };
    onExitRef.current = onExit;
  });

  // The stored host and settings win over whatever the joiner assumed.
  useEffect(() => {
    if (!roomId) return undefined;
    let alive = true;
    supabase
      .from("meet_rooms")
      .select("host, metadata")
      .eq("id", roomId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!alive || error || !data) return;
        if (data.host) setHostId(data.host);
        setRoomMeta(data.metadata || {});
      });
    return () => {
      alive = false;
    };
  }, [supabase, roomId]);

  // Presence payload. Remote tiles render from these flags rather than probing
  // the media itself — a muted remote track and a camera that was never on look
  // identical on the wire.
  const status = useMemo(
    () => ({ micOn: media.micOn, camOn: media.camOn, sharing: media.sharing, handRaisedAt }),
    [media.micOn, media.camOn, media.sharing, handRaisedAt],
  );

  const blockedIds = useMemo(() => new Set(Object.keys(roomMeta.removed || {})), [roomMeta.removed]);

  const addReaction = useCallback((userId, emoji) => {
    if (!userId || typeof emoji !== "string" || emoji.length > 8) return;
    const key = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setReactions((prev) => ({ ...prev, [userId]: { emoji, key } }));
    setTimeout(() => {
      setReactions((prev) => {
        if (prev[userId]?.key !== key) return prev;
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    }, REACTION_MS);
  }, []);

  const exitedRef = useRef(false);
  const exit = useCallback((reason) => {
    if (exitedRef.current) return;
    exitedRef.current = true;
    liveRef.current.media?.stopAll();
    if (reason === "removed") toast.error("The host removed you from the meeting");
    else if (reason === "ended") toast.info("The host ended the meeting");
    onExitRef.current?.(reason);
  }, []);

  // Broadcast senders aren't authenticated, so anything that ends, removes or reconfigures re-reads the row
  // (host-only writes under the guard trigger) instead of trusting the frame.
  const refreshRoom = useCallback(async () => {
    if (!roomId) return;
    const { data, error } = await supabase
      .from("meet_rooms")
      .select("host, metadata, ended_at")
      .eq("id", roomId)
      .maybeSingle();
    if (error || !data) return;
    if (data.host) setHostId(data.host);
    setRoomMeta(data.metadata || {});
    const selfId = liveRef.current.me?.id;
    if (data.ended_at) exit("ended");
    else if (selfId && data.metadata?.removed?.[selfId]) exit("removed");
  }, [supabase, roomId, exit]);

  const handleControl = useCallback(
    (payload) => {
      const { action, from, to } = payload;
      const { media: m, hostId: host, me: self, handRaisedAt: hand } = liveRef.current;
      if (action === "reaction") {
        addReaction(from, payload.emoji);
        return;
      }
      if (!host || from !== host) return;
      if (to && to !== self?.id) return;

      switch (action) {
        case "room-state":
        case "remove":
        case "end":
          refreshRoom();
          return;
        case "mute":
        case "mute-all":
          if (m.micOn) {
            m.muteMic();
            toast.info(action === "mute" ? "The host muted you" : "The host muted everyone");
          }
          return;
        case "ask-unmute":
          if (!m.micOn) {
            toast("The host is asking you to unmute", {
              duration: 10_000,
              action: { label: "Unmute", onClick: () => !liveRef.current.media.micOn && liveRef.current.media.toggleMic() },
            });
          }
          return;
        case "stop-video":
          if (m.camOn) {
            m.toggleCam();
            toast.info("The host turned off your camera");
          }
          return;
        case "ask-video":
          if (!m.camOn) {
            toast("The host is asking you to start your video", {
              duration: 10_000,
              action: { label: "Start video", onClick: () => !liveRef.current.media.camOn && liveRef.current.media.toggleCam() },
            });
          }
          return;
        case "stop-share":
          if (m.sharing) {
            m.stopSharing();
            toast.info("The host stopped your screen share");
          }
          return;
        case "lower-hand":
        case "lower-all":
          if (hand) {
            setHandRaisedAt(null);
            toast.info("The host lowered your hand");
          }
          return;
        default:
      }
    },
    [addReaction, refreshRoom],
  );

  const mesh = usePeerMesh({
    supabase,
    roomId,
    me,
    audioTrack: media.audioTrack,
    videoTrack: media.outgoingVideo,
    status,
    blockedIds,
    onControl: handleControl,
  });
  const { sendControl } = mesh;

  // Leaving is just releasing the devices — unmounting the stage tears the mesh
  // and the presence entry down on its own.
  const leave = useCallback(() => {
    media.stopAll();
  }, [media]);

  // Ending closes the room for everyone: the code stops resolving, and everyone
  // still connected is told to hang up.
  const endRoom = useCallback(async () => {
    if (!roomId) return true;
    const { error } = await supabase
      .from("meet_rooms")
      .update({ ended_at: new Date().toISOString() })
      .eq("id", roomId);
    if (error) {
      console.error("[meet.end]", error.message);
      return false;
    }
    sendControl({ action: "end" });
    media.stopAll();
    return true;
  }, [supabase, roomId, media, sendControl]);

  // --- Participant side: the host's settings gate turning things on ----------

  const blockedBy = useCallback(
    (key, message) => {
      if (isHost || roomMeta[key] !== false) return false;
      toast.error(message);
      return true;
    },
    [isHost, roomMeta],
  );

  const toggleMic = useCallback(() => {
    if (!media.micOn && blockedBy("allowUnmute", "The host has turned off unmuting")) return;
    media.toggleMic();
  }, [media, blockedBy]);

  const toggleCam = useCallback(() => {
    if (!media.camOn && blockedBy("allowVideo", "The host has turned off video for participants")) return;
    media.toggleCam();
  }, [media, blockedBy]);

  const toggleShare = useCallback(() => {
    if (!media.sharing && blockedBy("allowShare", "Only the host can share their screen right now")) return;
    media.toggleShare();
  }, [media, blockedBy]);

  const toggleHand = useCallback(() => {
    setHandRaisedAt((current) => (current ? null : new Date().toISOString()));
  }, []);

  const sendReaction = useCallback(
    (emoji) => {
      addReaction(me?.id, emoji);
      sendControl({ action: "reaction", emoji });
    },
    [addReaction, me?.id, sendControl],
  );

  // --- Host side -------------------------------------------------------------

  const saveMeta = useCallback(
    async (patch, extra = {}) => {
      if (!isHost || !roomId) return false;
      const previous = liveRef.current.roomMeta || {};
      const next = { ...previous, ...patch };
      setRoomMeta(next);
      const { error } = await supabase.from("meet_rooms").update({ metadata: next, ...extra }).eq("id", roomId);
      if (error) {
        console.error("[meet.host]", error.message);
        setRoomMeta(previous);
        toast.error("Couldn't update the meeting");
        return false;
      }
      // Just a nudge: everyone re-reads the row.
      sendControl({ action: "room-state" });
      return true;
    },
    [isHost, roomId, supabase, sendControl],
  );

  const command = useCallback(
    (action, to) => {
      if (isHost) sendControl({ action, to });
    },
    [isHost, sendControl],
  );

  const hostControls = useMemo(
    () => ({
      mute: (id) => command("mute", id),
      askUnmute: (id) => command("ask-unmute", id),
      stopVideo: (id) => command("stop-video", id),
      askVideo: (id) => command("ask-video", id),
      stopShare: (id) => command("stop-share", id),
      lowerHand: (id) => command("lower-hand", id),
      muteAll: () => {
        command("mute-all");
        toast.success("Muted everyone");
      },
      lowerAllHands: () => command("lower-all"),
      spotlight: (id) => saveMeta({ spotlightId: id || null }),
      setPolicy: (patch) => saveMeta(patch),
      remove: async (id, name) => {
        const removed = { ...(liveRef.current.roomMeta?.removed || {}), [id]: new Date().toISOString() };
        const spotlightId = liveRef.current.roomMeta?.spotlightId === id ? null : liveRef.current.roomMeta?.spotlightId;
        if (await saveMeta({ removed, spotlightId: spotlightId ?? null })) {
          command("remove", id);
          toast.success(`Removed ${name || "them"} from the meeting`);
        }
      },
      makeHost: async (id, name) => {
        if (await saveMeta({}, { host: id })) {
          setHostId(id);
          toast.success(`${name || "Your pick"} is now the host`);
        }
      },
    }),
    [command, saveMeta],
  );

  const remoteParticipants = useMemo(
    () => mesh.participants.filter((p) => p.id !== me?.id),
    [mesh.participants, me?.id],
  );

  const raisedHands = useMemo(
    () =>
      [...remoteParticipants.filter((p) => p.handRaisedAt), ...(handRaisedAt ? [{ ...me, handRaisedAt, isSelf: true }] : [])].sort(
        (a, b) => String(a.handRaisedAt).localeCompare(String(b.handRaisedAt)),
      ),
    [remoteParticipants, handRaisedAt, me],
  );

  return {
    ...media,
    ...mesh,
    toggleMic,
    toggleCam,
    toggleShare,
    remoteParticipants,
    leave,
    endRoom,
    isHost,
    hostId,
    roomMeta,
    handRaisedAt,
    toggleHand,
    reactions,
    sendReaction,
    raisedHands,
    hostControls,
  };
}
