"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { diffForBroadcast } from "./reconcile";

// Ambient collaboration on a project sketch, over one Supabase Realtime channel
// per sketch, shaped like lib/meet/usePeerMesh.js:
//
//   * presence  — who is in the sketch (join/leave only)
//   * broadcast — pointers (33ms) and changed elements (300ms)
//
// There is no session ceremony: a project sketch already has membership, and
// notes.has_ability(project_id, 'sketches.update') decides who may edit. A
// personal sketch has exactly one person with access, so it opens no channel
// at all.

const POINTER_EVENT = "pointer";
const ELEMENTS_EVENT = "elements";

const POINTER_THROTTLE_MS = 33;
const ELEMENTS_THROTTLE_MS = 300;

// A cursor frozen mid-canvas reads as a bug, so drop a collaborator who has not
// moved for this long even while presence still lists them.
const POINTER_STALE_MS = 10_000;

// Assigned deterministically from the user id so a person is the same colour
// for everyone in the room without negotiation.
const COLORS = [
  "#f87171",
  "#fb923c",
  "#facc15",
  "#4ade80",
  "#2dd4bf",
  "#60a5fa",
  "#a78bfa",
  "#f472b6",
];

export function colorForUser(userId) {
  let hash = 5381;
  const id = String(userId || "");
  for (let i = 0; i < id.length; i += 1) {
    hash = ((hash << 5) + hash + id.charCodeAt(i)) >>> 0;
  }
  return COLORS[hash % COLORS.length];
}

// Trailing-edge throttle: the final resting position always lands.
function throttle(fn, wait) {
  let last = 0;
  let timer = null;
  let pending = null;

  const invoke = () => {
    last = Date.now();
    timer = null;
    const args = pending;
    pending = null;
    if (args) fn(...args);
  };

  const throttled = (...args) => {
    pending = args;
    const elapsed = Date.now() - last;
    if (elapsed >= wait) invoke();
    else if (!timer) timer = setTimeout(invoke, wait - elapsed);
  };

  throttled.cancel = () => {
    clearTimeout(timer);
    timer = null;
    pending = null;
  };
  return throttled;
}

/**
 * @param {Object}   params
 * @param {string}   params.sketchId
 * @param {boolean}  params.enabled     false for a personal sketch — no channel
 * @param {Object}   params.me          { id, name, avatar }
 * @param {Function} params.onRemoteElements  called with an array of elements
 * @param {Function} params.onReconnect  called on a re-subscribe, so the caller
 *        can reload the row instead of trusting state accumulated while offline
 */
export function useSketchPresence({
  sketchId,
  enabled,
  me,
  onRemoteElements,
  onReconnect,
}) {
  const [collaborators, setCollaborators] = useState([]);
  const [connected, setConnected] = useState(false);
  // The presence entry with the lowest joinedAt writes; everyone else's
  // autosave is suppressed while a writer exists.
  const [isWriter, setIsWriter] = useState(true);

  const sendersRef = useRef(null);
  const pointersRef = useRef(new Map());
  const onRemoteElementsRef = useRef(onRemoteElements);
  const onReconnectRef = useRef(onReconnect);
  const joinedAtRef = useRef(new Date().toISOString());
  // The client retries a failed subscribe on its own; say it once per outage.
  const unavailableToastRef = useRef(false);

  useEffect(() => {
    onRemoteElementsRef.current = onRemoteElements;
    onReconnectRef.current = onReconnect;
  }, [onRemoteElements, onReconnect]);

  const active = Boolean(enabled && sketchId && me?.id);

  useEffect(() => {
    if (!active) return undefined;

    const supabase = createClient();
    const channel = supabase.channel(`sketch:${sketchId}`, {
      config: {
        presence: { key: me.id },
        // Our own echo would only ever be noise.
        broadcast: { self: false },
      },
    });
    const emit = (event, payload) =>
      channel.send({ type: "broadcast", event, payload: { userId: me.id, ...payload } });

    sendersRef.current = {
      pointer: throttle(
        (x, y, selectedElementIds) => emit(POINTER_EVENT, { x, y, selectedElementIds }),
        POINTER_THROTTLE_MS
      ),
      elements: throttle((elements) => {
        if (elements.length) emit(ELEMENTS_EVENT, { elements });
      }, ELEMENTS_THROTTLE_MS),
      sentVersions: new Map(),
    };

    let subscribedOnce = false;

    const applyPresence = () => {
      const state = channel.presenceState();
      const list = Object.entries(state).map(([id, entries]) => ({
        userId: id,
        ...(entries[0] || {}),
      }));

      // Presence is already ordered and consistent for everyone, so the
      // earliest joiner is the writer with no election protocol.
      const earliest = list.reduce(
        (best, entry) =>
          !best || (entry.joinedAt ?? "") < (best.joinedAt ?? "") ? entry : best,
        null
      );
      setIsWriter(!earliest || earliest.userId === me.id);

      const now = Date.now();
      setCollaborators(
        list
          .filter((entry) => entry.userId !== me.id)
          .map((entry) => {
            const pointer = pointersRef.current.get(entry.userId);
            const fresh = pointer && now - pointer.at < POINTER_STALE_MS;
            return {
              userId: entry.userId,
              name: entry.name || "Guest",
              avatar: entry.avatar || null,
              color: colorForUser(entry.userId),
              pointer: fresh ? { x: pointer.x, y: pointer.y } : null,
              selectedElementIds: fresh ? pointer.selectedElementIds : {},
            };
          })
      );
    };

    channel
      .on("presence", { event: "sync" }, applyPresence)
      .on("broadcast", { event: POINTER_EVENT }, ({ payload }) => {
        try {
          if (!payload?.userId) return;
          pointersRef.current.set(payload.userId, {
            x: payload.x,
            y: payload.y,
            selectedElementIds: payload.selectedElementIds || {},
            at: Date.now(),
          });
          applyPresence();
        } catch (err) {
          // One bad frame must never take down the channel handler.
          console.error("[sketch.presence] bad pointer frame", err);
        }
      })
      .on("broadcast", { event: ELEMENTS_EVENT }, ({ payload }) => {
        try {
          if (!Array.isArray(payload?.elements)) return;
          onRemoteElementsRef.current?.(payload.elements);
        } catch (err) {
          console.error("[sketch.presence] bad elements frame", err);
        }
      })
      .subscribe(async (state) => {
        if (state === "CHANNEL_ERROR" || state === "TIMED_OUT") {
          setConnected(false);
          if (!unavailableToastRef.current) {
            unavailableToastRef.current = true;
            toast.error("Live collaboration unavailable");
          }
          return;
        }
        if (state !== "SUBSCRIBED") return;
        unavailableToastRef.current = false;
        // Supabase reconnects on its own; on a re-subscribe the local scene may
        // have drifted while offline, so the caller reloads and re-reconciles.
        if (subscribedOnce) onReconnectRef.current?.();
        subscribedOnce = true;
        setConnected(true);
        await channel.track({
          name: me.name || "Guest",
          avatar: me.avatar || null,
          joinedAt: joinedAtRef.current,
        });
      });

    // Stale cursors expire on their own even when nobody moves.

    const sweep = setInterval(applyPresence, POINTER_STALE_MS / 2);

    const pointers = pointersRef.current;
    const senders = sendersRef.current;
    return () => {
      clearInterval(sweep);
      setConnected(false);
      senders.pointer.cancel();
      senders.elements.cancel();
      sendersRef.current = null;
      pointers.clear();
      supabase.removeChannel(channel);
    };
  }, [active, sketchId, me?.id, me?.name, me?.avatar]);

  // The throttled senders are built by the channel effect and own the channel
  // directly, so nothing reads a ref during render.
  const broadcastPointer = useCallback((x, y, selectedElementIds) => {
    sendersRef.current?.pointer(x, y, selectedElementIds);
  }, []);

  // Diffing against the last broadcast snapshot keeps a long freehand stroke to
  // a few elements per frame instead of the whole scene.
  const broadcastElements = useCallback((elements) => {
    const senders = sendersRef.current;
    if (!senders) return;
    const { changed, next } = diffForBroadcast(elements, senders.sentVersions);
    senders.sentVersions = next;
    if (changed.length) senders.elements(changed);
  }, []);

  return { collaborators, connected: active && connected, isWriter, broadcastPointer, broadcastElements };
}
