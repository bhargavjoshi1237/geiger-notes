"use client";

import React, { useEffect, useRef, useSyncExternalStore } from "react";
import { useOnViewportChange, useReactFlow, useStore } from "@xyflow/react";
import { LASER_FADE_MS } from "@/lib/realtime/live-store";
import { followViewport } from "@/lib/collab/session";

// Screen-space overlay rendered inside <ReactFlow>: remote cursors, laser trails, follow border, spotlight ring and
// reactions; it also streams our pointer/viewport and applies the viewport of whoever we follow.

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 2;
const SPOTLIGHT_MS = 4500;

const transformSelector = (s) => s.transform;
const sizeSelector = (s) => `${s.width}x${s.height}`;
const domSelector = (s) => s.domNode;

function Cursor({ x, y, color, name }) {
  return (
    <div
      className="pointer-events-none absolute left-0 top-0 z-[60] transition-transform duration-75 ease-linear will-change-transform"
      style={{ transform: `translate(${x}px, ${y}px)` }}
    >
      <svg width="18" height="18" viewBox="0 0 18 18" className="drop-shadow-sm" aria-hidden="true">
        <path d="M2 1.5 15.5 8.2 9 9.7 6.2 16Z" fill={color} stroke="var(--background)" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
      <span
        className="ml-3 -mt-1 inline-block max-w-[10rem] truncate rounded-full px-2 py-0.5 text-[10px] font-semibold text-black shadow-sm"
        style={{ backgroundColor: color }}
      >
        {name}
      </span>
    </div>
  );
}

export default function SessionLiveLayer({ controls, hideCursors }) {
  const { live, me, peerById, leader, viewLocked, spotlight, laserActive, setLaserOn, reactions } = controls;
  const myColor = me?.color;
  const { store, followers, followingId, myId } = live;
  const { screenToFlowPosition, setViewport, getViewport, fitView, getInternalNode } = useReactFlow();
  const transform = useStore(transformSelector);
  const size = useStore(sizeSelector);
  const domNode = useStore(domSelector);
  const [width, height] = size.split("x").map(Number);
  useSyncExternalStore(store.subscribe, store.getVersion, store.getVersion);

  const canvasRef = useRef(null);
  const liveRef = useRef(live);
  useEffect(() => {
    liveRef.current = live;
  });

  // Stream our pointer as flow coordinates; while the laser is on it also draws.
  const laserRef = useRef(laserActive);
  useEffect(() => {
    laserRef.current = laserActive;
  }, [laserActive]);
  useEffect(() => {
    if (!domNode) return undefined;
    const onMove = (event) => {
      const point = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      liveRef.current.sendCursor(point.x, point.y);
      if (laserRef.current) liveRef.current.sendLaser(point.x, point.y);
    };
    const onLeave = () => liveRef.current.leaveCursor();
    domNode.addEventListener("pointermove", onMove, { passive: true });
    domNode.addEventListener("pointerleave", onLeave);
    return () => {
      domNode.removeEventListener("pointermove", onMove);
      domNode.removeEventListener("pointerleave", onLeave);
    };
  }, [domNode, screenToFlowPosition]);

  useEffect(() => {
    if (!laserActive) return undefined;
    const onKey = (event) => event.key === "Escape" && setLaserOn(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [laserActive, setLaserOn]);

  // Leading: publish our viewport only while somebody follows us, and once right away for a new follower.
  const followerCount = followers.length;
  const publishViewport = React.useCallback(
    (viewport = getViewport()) => {
      if (!width || !height) return;
      liveRef.current.sendViewport({ x: viewport.x, y: viewport.y, zoom: viewport.zoom, width, height });
    },
    [getViewport, width, height],
  );
  useEffect(() => {
    if (followerCount > 0) publishViewport();
  }, [followerCount, publishViewport]);
  useOnViewportChange({
    onChange: (viewport) => {
      if (followerCount > 0) publishViewport(viewport);
    },
  });

  // Following: fit the leader's visible area into our own pane whenever a frame arrives.
  const appliedRef = useRef(null);
  useEffect(() => {
    if (!followingId) {
      appliedRef.current = null;
      return undefined;
    }
    let first = true;
    const apply = () => {
      const frame = store.viewports.get(followingId);
      if (!frame || frame === appliedRef.current) return;
      appliedRef.current = frame;
      const next = followViewport(frame, width, height, { minZoom: MIN_ZOOM, maxZoom: MAX_ZOOM });
      if (next) setViewport(next, { duration: first ? 450 : 0 });
      first = false;
    };
    apply();
    return store.subscribe(apply);
  }, [followingId, store, width, height, setViewport]);

  // Spotlight: everyone not already riding the spotlighter's view flies to the node — once per spotlight,
  // so a later follow/lock change doesn't fly them back to a stale one.
  const followStateRef = useRef({ followingId, viewLocked, myId });
  useEffect(() => {
    followStateRef.current = { followingId, viewLocked, myId };
  }, [followingId, viewLocked, myId]);
  useEffect(() => {
    if (!spotlight?.nodeId) return;
    const state = followStateRef.current;
    if (spotlight.by !== state.myId && (state.followingId === spotlight.by || state.viewLocked)) return;
    fitView({ nodes: [{ id: spotlight.nodeId }], duration: 800, padding: 0.6, maxZoom: 1.25 });
  }, [spotlight, fitView]);

  const [expiredSpotlight, setExpiredSpotlight] = React.useState(null);
  useEffect(() => {
    if (!spotlight) return undefined;
    const timer = setTimeout(() => setExpiredSpotlight(spotlight.at), SPOTLIGHT_MS);
    return () => clearTimeout(timer);
  }, [spotlight]);

  // Laser trails fade on a canvas; keep animating while any point is still visible.
  const [tx, ty, zoom] = transform;
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !width || !height) return undefined;
    const dpr = window.devicePixelRatio || 1;
    const pixelW = Math.round(width * dpr);
    const pixelH = Math.round(height * dpr);
    if (canvas.width !== pixelW) canvas.width = pixelW;
    if (canvas.height !== pixelH) canvas.height = pixelH;
    const ctx = canvas.getContext("2d");
    let raf = 0;
    const draw = () => {
      raf = 0;
      const alive = store.prune();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const now = Date.now();
      for (const [userId, trail] of store.trails) {
        if (trail.length < 2) continue;
        const color = (userId === myId ? myColor : peerById.get(userId)?.color) || "#f43f5e";
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
        for (let i = 1; i < trail.length; i += 1) {
          const a = trail[i - 1];
          const b = trail[i];
          const life = 1 - (now - b.t) / LASER_FADE_MS;
          if (life <= 0) continue;
          ctx.strokeStyle = color;
          ctx.globalAlpha = Math.min(1, life * 1.15);
          ctx.lineWidth = 2 + 4 * life;
          ctx.beginPath();
          ctx.moveTo(a.x * zoom + tx, a.y * zoom + ty);
          ctx.lineTo(b.x * zoom + tx, b.y * zoom + ty);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      if (alive) raf = requestAnimationFrame(draw);
    };
    draw();
    return () => raf && cancelAnimationFrame(raf);
  });

  const cursors = [];
  if (!hideCursors) {
    for (const [userId, cursor] of store.cursors) {
      if (userId === myId) continue;
      const peer = peerById.get(userId);
      if (!peer) continue;
      cursors.push(
        <Cursor
          key={userId}
          x={cursor.x * zoom + tx}
          y={cursor.y * zoom + ty}
          color={peer.color || "#60a5fa"}
          name={peer.name || "Guest"}
        />,
      );
    }
  }

  let ring = null;
  if (spotlight && expiredSpotlight !== spotlight.at) {
    const node = getInternalNode(spotlight.nodeId);
    if (node) {
      const { x, y } = node.internals.positionAbsolute;
      const w = node.measured?.width ?? node.width ?? 0;
      const h = node.measured?.height ?? node.height ?? 0;
      const pad = 10;
      ring = (
        <div
          className="pointer-events-none absolute left-0 top-0 z-[55] rounded-xl border-2 border-primary animate-pulse"
          style={{
            transform: `translate(${x * zoom + tx - pad}px, ${y * zoom + ty - pad}px)`,
            width: w * zoom + pad * 2,
            height: h * zoom + pad * 2,
            boxShadow: "0 0 0 6px color-mix(in oklab, var(--primary) 25%, transparent), 0 0 40px color-mix(in oklab, var(--primary) 45%, transparent)",
          }}
        />
      );
    }
  }

  return (
    <>
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-[58]"
        style={{ width: width || "100%", height: height || "100%" }}
        aria-hidden="true"
      />
      {ring}
      {cursors}
      {laserActive ? (
        <div
          className="absolute inset-0 z-[57] cursor-crosshair"
          onPointerDown={(event) => event.stopPropagation()}
          title="Laser pointer — press Esc to stop"
        />
      ) : null}
      {leader ? (
        <div
          className="pointer-events-none absolute inset-0 z-[59] rounded-[2px]"
          style={{ boxShadow: `inset 0 0 0 3px ${leader.color || "var(--primary)"}` }}
        />
      ) : null}
      {reactions.length ? (
        <div className="pointer-events-none absolute bottom-20 left-1/2 z-[61] flex -translate-x-1/2 items-end gap-3">
          {reactions.map((r) => (
            <span key={r.id} className="session-reaction flex flex-col items-center gap-1">
              <span className="text-3xl leading-none drop-shadow">{r.emoji}</span>
              {r.name ? (
                <span
                  className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-black"
                  style={{ backgroundColor: r.color || "var(--surface-active)" }}
                >
                  {r.name}
                </span>
              ) : null}
            </span>
          ))}
        </div>
      ) : null}
    </>
  );
}
