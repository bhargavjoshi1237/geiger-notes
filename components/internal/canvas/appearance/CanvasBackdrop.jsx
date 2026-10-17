"use client";

import React from "react";
import { gradientCss, youtubeId, youtubeThumb } from "@/lib/canvas/appearance";

// Video that pauses while the tab is hidden and stays on its first frame for reduced-motion users.
function BackdropVideo({ url }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const video = ref.current;
    if (!video) return undefined;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const sync = () => {
      if (reduced || document.hidden) video.pause();
      else video.play().catch(() => {});
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, [url]);
  return (
    <video
      ref={ref}
      key={url}
      src={url}
      muted
      loop
      playsInline
      preload="auto"
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}

const MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const subscribeMotion = (cb) => {
  const mq = window.matchMedia?.(MOTION_QUERY);
  mq?.addEventListener("change", cb);
  return () => mq?.removeEventListener("change", cb);
};
const useReducedMotion = () =>
  React.useSyncExternalStore(subscribeMotion, () => !!window.matchMedia?.(MOTION_QUERY).matches, () => false);

const YT_ORIGIN = "https://www.youtube-nocookie.com";

// Muted, looping, chrome-less YouTube embed scaled to cover; pauses in hidden tabs and shows the thumbnail under reduced motion.
function BackdropYouTube({ id }) {
  const ref = React.useRef(null);
  const reduced = useReducedMotion();

  React.useEffect(() => {
    if (reduced) return undefined;
    const sync = () =>
      ref.current?.contentWindow?.postMessage(
        JSON.stringify({ event: "command", func: document.hidden ? "pauseVideo" : "playVideo", args: [] }),
        YT_ORIGIN,
      );
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, [id, reduced]);

  if (reduced) {
    return <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url("${youtubeThumb(id)}")` }} />;
  }

  const params = new URLSearchParams({
    autoplay: "1",
    mute: "1",
    loop: "1",
    playlist: id,
    controls: "0",
    disablekb: "1",
    playsinline: "1",
    rel: "0",
    iv_load_policy: "3",
    enablejsapi: "1",
  });

  // 16:9 frame sized off the container (cq units) so it always covers, overscanned to hide YouTube's title bar.
  return (
    <div className="absolute inset-0" style={{ containerType: "size" }}>
      <iframe
        ref={ref}
        key={id}
        title="Board background video"
        src={`${YT_ORIGIN}/embed/${id}?${params.toString()}`}
        allow="autoplay; encrypted-media"
        tabIndex={-1}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 scale-[1.2] border-0"
        style={{ width: "max(100cqw, 177.78cqh)", height: "max(100cqh, 56.25cqw)" }}
      />
    </div>
  );
}

// Everything painted behind the React Flow pane: colour, gradient, image, video or a live animated preset.
export default function CanvasBackdrop({ appearance, viewport }) {
  const bg = appearance?.background;
  if (!bg || bg.type === "none") return null;

  let layer = null;
  let dim = 0;

  if (bg.type === "color" && bg.color) {
    layer = <div className="absolute inset-0" style={{ background: bg.color }} />;
  } else if (bg.type === "gradient") {
    layer = <div className="absolute inset-0" style={{ background: gradientCss(bg.gradient) }} />;
  } else if (bg.type === "image" && bg.image?.url) {
    const img = bg.image;
    dim = img.dim || 0;
    const onBoard = img.attach === "board" && viewport;
    const tile = img.fit === "tile";
    const style = {
      backgroundImage: `url("${img.url}")`,
      backgroundRepeat: tile ? "repeat" : "no-repeat",
      backgroundSize: tile ? "480px auto" : img.fit === "contain" ? "contain" : "cover",
      backgroundPosition: "center",
      filter: img.blur ? `blur(${img.blur}px)` : undefined,
    };
    // Board-attached images live in canvas space: a 4000px plate centred on the origin that pans and zooms with the nodes.
    layer = onBoard ? (
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})` }}
      >
        <div className="absolute" style={{ ...style, left: -2000, top: -2000, width: 4000, height: 4000 }} />
      </div>
    ) : (
      <div className="absolute inset-0" style={{ ...style, inset: img.blur ? -img.blur * 2 : 0 }} />
    );
  } else if (bg.type === "video" && bg.video?.url) {
    dim = bg.video.dim || 0;
    const ytId = youtubeId(bg.video.url);
    const blur = bg.video.blur || 0;
    const video = ytId ? <BackdropYouTube id={ytId} /> : <BackdropVideo url={bg.video.url} />;
    // Blurred video bleeds past the edges so the soft fringe stays off-screen, same as images.
    layer = blur ? (
      <div className="absolute" style={{ inset: -blur * 2, filter: `blur(${blur}px)` }}>
        {video}
      </div>
    ) : (
      video
    );
  } else if (bg.type === "animated") {
    layer = <div className={`absolute inset-0 canvas-live-${bg.animated?.preset || "aurora"}`} />;
  }

  if (!layer) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {layer}
      {dim > 0 && <div className="absolute inset-0 bg-background" style={{ opacity: dim }} />}
    </div>
  );
}
