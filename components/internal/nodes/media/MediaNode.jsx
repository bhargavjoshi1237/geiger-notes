"use client";

import React, { memo } from "react";
import { useReactFlow } from "@xyflow/react";
import { Clapperboard, Film, Mic, Music, Pause, Play, Square, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button, Input, Slider } from "@geiger/ui";
import NodeShell, { useNodeDataUpdater } from "@/components/internal/nodes/shared/NodeShell";
import TextEditingTrait from "@/components/internal/nodes/traits/TextEditingTrait";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_RECORD_SEC = 180;
const AUDIO_EXT = /\.(mp3|wav|m4a|aac|oga|ogg|opus|flac)(\?|#|$)/i;
const VIDEO_EXT = /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i;

export const MEDIA_SIZES = {
  empty: { width: 340, height: 180 },
  audio: { width: 340, height: 90 },
  video: { width: 480, height: 300 },
};

export const EMPTY_MEDIA = { src: "", name: "", durationSec: 0 };

export const formatTime = (sec) => {
  const s = Math.max(0, Math.floor(sec || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

// Guess audio vs video from a URL; unknown extensions default to video.
export const kindFromUrl = (url) => (AUDIO_EXT.test(url) && !VIDEO_EXT.test(url) ? "audio" : "video");

const fileNameFromUrl = (url) => {
  try {
    return decodeURIComponent(new URL(url).pathname.split("/").pop() || "") || "Media";
  } catch {
    return "Media";
  }
};

const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

function useMediaResize(id) {
  const { setNodes } = useReactFlow();
  return React.useCallback(
    (size) =>
      setNodes((nodes) =>
        nodes.map((n) => (n.id === id ? { ...n, width: size.width, height: size.height, style: { ...n.style, ...size } } : n)),
      ),
    [id, setNodes],
  );
}

// In-node voice memo capture via MediaRecorder; resolves to a data URL on stop.
function useVoiceRecorder(onDone) {
  const [elapsed, setElapsed] = React.useState(0);
  const [recording, setRecording] = React.useState(false);
  const ref = React.useRef({ recorder: null, stream: null, timer: null, cancelled: false, startedAt: 0 });
  const onDoneRef = React.useRef(onDone);
  React.useEffect(() => {
    onDoneRef.current = onDone;
  });

  const teardown = React.useCallback(() => {
    const r = ref.current;
    clearInterval(r.timer);
    r.stream?.getTracks().forEach((t) => t.stop());
    r.stream = null;
  }, []);

  const stop = React.useCallback(() => {
    const rec = ref.current.recorder;
    if (rec && rec.state !== "inactive") rec.stop();
  }, []);

  const cancel = React.useCallback(() => {
    ref.current.cancelled = true;
    stop();
    teardown();
    setRecording(false);
  }, [stop, teardown]);

  const start = React.useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast.error("Recording isn't supported in this browser");
      return;
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast.error("Microphone access was blocked");
      return;
    }
    const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((t) => MediaRecorder.isTypeSupported(t));
    const recorder = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 48000 });
    const chunks = [];
    const r = ref.current;
    Object.assign(r, { recorder, stream, cancelled: false, startedAt: Date.now() });

    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder.onstop = async () => {
      const durationSec = Math.min(MAX_RECORD_SEC, Math.round((Date.now() - r.startedAt) / 1000));
      teardown();
      setRecording(false);
      if (r.cancelled || !chunks.length) return;
      const blob = new Blob(chunks, { type: (recorder.mimeType || "audio/webm").split(";")[0] });
      try {
        onDoneRef.current(await blobToDataUrl(blob), durationSec);
      } catch {
        toast.error("Couldn't save the recording");
      }
    };

    recorder.start(1000);
    setElapsed(0);
    setRecording(true);
    r.timer = setInterval(() => {
      const sec = (Date.now() - r.startedAt) / 1000;
      setElapsed(sec);
      if (sec >= MAX_RECORD_SEC) stop();
    }, 250);
  }, [stop, teardown]);

  React.useEffect(
    () => () => {
      ref.current.cancelled = true;
      const rec = ref.current.recorder;
      if (rec && rec.state !== "inactive") rec.stop();
      teardown();
    },
    [teardown],
  );

  return { recording, elapsed, start, stop, cancel };
}

function SourcePicker({ onPick }) {
  const fileRef = React.useRef(null);
  const [url, setUrl] = React.useState("");
  const recorder = useVoiceRecorder((src, durationSec) =>
    onPick({ kind: "audio", src, name: `Voice memo · ${new Date().toLocaleString()}`, durationSec }),
  );

  const handleFile = async (file) => {
    if (!file) return;
    const kind = file.type.startsWith("audio/") ? "audio" : file.type.startsWith("video/") ? "video" : null;
    if (!kind) return toast.error("Pick an audio or video file");
    if (file.size > MAX_UPLOAD_BYTES) return toast.error("Files must be 5 MB or smaller — paste a URL for larger media");
    try {
      onPick({ kind, src: await blobToDataUrl(file), name: file.name, durationSec: 0 });
    } catch {
      toast.error("Couldn't read that file");
    }
  };

  const submitUrl = () => {
    const trimmed = url.trim();
    if (!/^https?:\/\/\S+$/i.test(trimmed)) return toast.error("Enter an http(s) media URL");
    onPick({ kind: kindFromUrl(trimmed), src: trimmed, name: fileNameFromUrl(trimmed), durationSec: 0 });
  };

  if (recorder.recording) {
    return (
      <div className="flex h-full w-full flex-1 flex-col items-center justify-center gap-3 p-4">
        <div className="flex items-center gap-2 text-sm text-foreground">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
          <span className="font-mono tabular-nums">{formatTime(recorder.elapsed)}</span>
          <span className="text-xs text-muted-foreground">/ {formatTime(MAX_RECORD_SEC)}</span>
        </div>
        <div className="nodrag nopan flex gap-2">
          <Button size="sm" variant="ghost" className="h-8" onClick={recorder.cancel}>
            <X className="h-3.5 w-3.5" /> Discard
          </Button>
          <Button size="sm" className="h-8" onClick={recorder.stop}>
            <Square className="h-3.5 w-3.5 fill-current" /> Stop
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-1 flex-col justify-center gap-3 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Clapperboard className="h-4 w-4 text-muted-foreground" /> Add audio or video
      </div>
      <div className="nodrag nopan grid grid-cols-2 gap-2">
        <Button size="sm" variant="outline" className="h-8 bg-surface-card" onClick={() => fileRef.current?.click()}>
          <Upload className="h-3.5 w-3.5" /> Upload
        </Button>
        <Button size="sm" variant="outline" className="h-8 bg-surface-card" onClick={recorder.start}>
          <Mic className="h-3.5 w-3.5" /> Record
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="audio/*,video/*"
          className="hidden"
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      <TextEditingTrait className="flex gap-2" onKeyDown={(e) => e.key === "Enter" && submitUrl()}>
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="…or paste an mp4 / mp3 URL"
          className="h-8 flex-1 bg-surface-card text-xs"
        />
        <Button size="sm" className="h-8" onClick={submitUrl} disabled={!url.trim()}>
          Add
        </Button>
      </TextEditingTrait>
    </div>
  );
}

function AudioPlayer({ src, name, durationSec, loop, onDuration }) {
  const audioRef = React.useRef(null);
  const [playing, setPlaying] = React.useState(false);
  const [time, setTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const total = Number.isFinite(duration) && duration > 0 ? duration : durationSec || 0;

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => toast.error("Couldn't play this audio"));
    else el.pause();
  };

  return (
    <div className="flex h-full w-full flex-1 items-center gap-3 px-3">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        loop={loop}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          setDuration(d);
          if (Number.isFinite(d) && d > 0) onDuration(d);
        }}
        onError={() => toast.error("Couldn't load this audio")}
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause" : "Play"}
        className="nodrag nopan flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105"
      >
        {playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="ml-0.5 h-4 w-4 fill-current" />}
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center gap-1.5 text-xs text-foreground">
          <Music className="h-3 w-3 shrink-0 text-muted-foreground" />
          <span className="truncate">{name || "Audio"}</span>
        </div>
        <div className="flex items-center gap-2">
          <Slider
            className="nodrag nopan flex-1"
            min={0}
            max={total || 1}
            step={0.1}
            value={[Math.min(time, total || 1)]}
            disabled={!total}
            onValueChange={([v]) => {
              if (audioRef.current) audioRef.current.currentTime = v;
              setTime(v);
            }}
          />
          <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
            {formatTime(time)} / {formatTime(total)}
          </span>
        </div>
      </div>
    </div>
  );
}

const MediaNode = ({ id, data, selected, dragging }) => {
  const update = useNodeDataUpdater(id);
  const resize = useMediaResize(id);
  const kind = data.kind === "video" ? "video" : "audio";

  const handlePick = (media) => {
    update(media);
    resize(MEDIA_SIZES[media.kind]);
  };

  const handleDuration = (d) => {
    if (Math.round(d) !== data.durationSec) update({ durationSec: Math.round(d) });
  };

  let body;
  if (!data.src) body = <SourcePicker onPick={handlePick} />;
  else if (kind === "audio")
    body = (
      <AudioPlayer src={data.src} name={data.name} durationSec={data.durationSec} loop={!!data.loop} onDuration={handleDuration} />
    );
  else
    body = (
      <div className="flex h-full w-full flex-1 flex-col overflow-hidden rounded-[inherit]">
        <div className="flex h-8 shrink-0 items-center gap-2 border-b border-border px-3 text-xs text-foreground">
          <Film className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">{data.name || "Video"}</span>
        </div>
        <div className={`relative min-h-0 flex-1 bg-black ${selected ? "nodrag nopan" : ""}`}>
          <video
            src={data.src}
            controls
            playsInline
            preload="metadata"
            loop={!!data.loop}
            className="absolute inset-0 h-full w-full object-contain"
            style={{ pointerEvents: selected && !dragging ? "auto" : "none" }}
            onLoadedMetadata={(e) => {
              const d = e.currentTarget.duration;
              if (Number.isFinite(d) && d > 0) handleDuration(d);
            }}
            onError={() => toast.error("Couldn't load this video")}
          />
        </div>
      </div>
    );

  return (
    <NodeShell id={id} data={data} selected={selected} dragging={dragging} minWidth={260} minHeight={75}>
      {body}
    </NodeShell>
  );
};

export const nodeMeta = {
  type: "media",
  label: "Media",
  icon: Clapperboard,
  cardColor: true,
  create: () => ({ data: { kind: "audio", ...EMPTY_MEDIA }, style: { ...MEDIA_SIZES.empty } }),
};

export default memo(MediaNode);
