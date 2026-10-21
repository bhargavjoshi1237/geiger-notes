"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { throttle } from "@/lib/realtime/throttle";
import { createLiveStore } from "@/lib/realtime/live-store";

// Ephemeral layer of a live board session on `collab-live:<id>`, shaped like useSketchPresence:
//   * presence  — who is here, their role, raised hand and who they follow
//   * broadcast — cursors, laser points and (only while followed) viewports, plus host commands
// Durable host settings ride notes.collab.preference instead (useSessionSettings).

const CURSOR_MS = 40;
const LASER_MS = 40;
const VIEWPORT_MS = 60;

const round = (v) => Math.round(v * 10) / 10;

export function useSessionLive({ sessionId, enabled, me, onCommand }) {
  const [peers, setPeers] = useState([]);
  const [connected, setConnected] = useState(false);
  const [handRaisedAt, setHandRaisedAt] = useState(null);
  const [followingId, setFollowingId] = useState(null);
  const store = useMemo(() => createLiveStore(), []);

  const channelRef = useRef(null);
  const sendersRef = useRef(null);
  const onCommandRef = useRef(onCommand);
  const meRef = useRef(me);
  const selfRef = useRef({ handRaisedAt: null, followingId: null });
  const joinedAtRef = useRef(new Date().toISOString());

  useEffect(() => {
    onCommandRef.current = onCommand;
    meRef.current = me;
  }, [onCommand, me]);

  const myId = me?.id || null;
  const active = Boolean(enabled && sessionId);

  const presencePayload = useCallback(
    () => ({
      name: meRef.current?.name || "Guest",
      color: meRef.current?.color || null,
      role: meRef.current?.role || "viewer",
      avatarUrl: meRef.current?.avatarUrl || null,
      joinedAt: joinedAtRef.current,
      handRaisedAt: selfRef.current.handRaisedAt,
      followingId: selfRef.current.followingId,
    }),
    [],
  );

  useEffect(() => {
    if (!active) return undefined;

    const supabase = createClient();
    const channel = supabase.channel(`collab-live:${sessionId}`, {
      config: {
        ...(myId ? { presence: { key: myId } } : {}),
        broadcast: { self: false },
      },
    });
    const emit = (event, payload) =>
      channel.send({ type: "broadcast", event, payload: { userId: myId, ...payload } });

    let laserBuffer = [];
    const flushLaser = throttle(() => {
      if (!laserBuffer.length) return;
      emit("laser", { pts: laserBuffer });
      laserBuffer = [];
    }, LASER_MS);

    sendersRef.current = {
      emit,
      cursor: throttle((x, y) => emit("cursor", { x: round(x), y: round(y) }), CURSOR_MS),
      laser: (x, y) => {
        laserBuffer.push([round(x), round(y)]);
        flushLaser();
      },
      flushLaser,
      viewport: throttle((viewport) => emit("viewport", viewport), VIEWPORT_MS),
    };

    const sync = () => {
      const state = channel.presenceState();
      const list = Object.entries(state)
        .map(([id, entries]) => ({ id, ...(entries[0] || {}) }))
        .filter((p) => p.id !== myId);
      const present = new Set(list.map((p) => p.id));
      for (const id of [...store.cursors.keys(), ...store.viewports.keys()]) {
        if (!present.has(id)) store.drop(id);
      }
      setPeers(list);
    };

    channel
      .on("presence", { event: "sync" }, sync)
      .on("broadcast", { event: "cursor" }, ({ payload }) => {
        if (!payload?.userId) return;
        if (payload.gone) store.dropCursor(payload.userId);
        else store.setCursor(payload.userId, payload.x, payload.y);
      })
      .on("broadcast", { event: "laser" }, ({ payload }) => {
        if (payload?.userId && Array.isArray(payload.pts)) store.addLaser(payload.userId, payload.pts);
      })
      .on("broadcast", { event: "viewport" }, ({ payload }) => {
        if (payload?.userId) store.setViewport(payload.userId, payload);
      })
      .on("broadcast", { event: "command" }, ({ payload }) => {
        try {
          if (payload?.type) onCommandRef.current?.(payload.type, payload);
        } catch (err) {
          console.error("[collab.live] bad command", err);
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          setConnected(true);
          if (myId) await channel.track(presencePayload());
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setConnected(false);
        }
      });
    channelRef.current = channel;

    const sweep = setInterval(() => store.prune(), 5000);
    const senders = sendersRef.current;
    return () => {
      clearInterval(sweep);
      senders.cursor.cancel();
      senders.flushLaser.cancel();
      senders.viewport.cancel();
      sendersRef.current = null;
      channelRef.current = null;
      supabase.removeChannel(channel);
      store.clear();
      setConnected(false);
      setPeers([]);
    };
  }, [active, sessionId, myId, store, presencePayload]);

  // Re-publish presence whenever anything others render from it changes.
  useEffect(() => {
    if (!connected || !myId) return;
    channelRef.current?.track(presencePayload());
  }, [connected, myId, me?.name, me?.color, me?.role, me?.avatarUrl, handRaisedAt, followingId, presencePayload]);

  const raiseHand = useCallback((raised) => {
    const value = raised ? new Date().toISOString() : null;
    selfRef.current.handRaisedAt = value;
    setHandRaisedAt(value);
  }, []);

  const follow = useCallback((userId) => {
    selfRef.current.followingId = userId || null;
    setFollowingId(userId || null);
  }, []);

  const sendCursor = useCallback((x, y) => sendersRef.current?.cursor(x, y), []);
  const leaveCursor = useCallback(() => {
    sendersRef.current?.cursor.cancel();
    sendersRef.current?.emit("cursor", { gone: true });
  }, []);
  const sendLaser = useCallback(
    (x, y) => {
      if (myId) store.addLaser(myId, [[x, y]]);
      sendersRef.current?.laser(x, y);
    },
    [myId, store],
  );
  const sendViewport = useCallback((viewport) => sendersRef.current?.viewport(viewport), []);
  const sendCommand = useCallback((type, payload = {}) => {
    sendersRef.current?.emit("command", { type, ...payload });
  }, []);

  const followers = useMemo(() => peers.filter((p) => myId && p.followingId === myId), [peers, myId]);

  return {
    connected: active && connected,
    myId,
    peers,
    followers,
    store,
    handRaisedAt,
    followingId,
    raiseHand,
    follow,
    sendCursor,
    leaveCursor,
    sendLaser,
    sendViewport,
    sendCommand,
  };
}
