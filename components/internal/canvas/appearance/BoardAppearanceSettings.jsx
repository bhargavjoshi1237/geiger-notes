"use client";

import React from "react";
import {
  Upload,
  Loader2,
  Sun,
  Moon,
  MonitorSmartphone,
  Ban,
  PaintBucket,
  Blend,
  Image as ImageIcon,
  Clapperboard,
  Sparkles,
  Check,
  Play,
  Youtube,
} from "lucide-react";
import { Input, SegmentedTabs, SettingRow, SettingsList, Switch } from "@geiger/ui";
import { toast } from "sonner";
import { SliderRow, ColorRow } from "@/components/internal/layout/sidebar/plugs/PlugControls";
import { COLORS } from "@/components/internal/edges/ColorePicker";
import {
  ANIMATED_PRESETS,
  BACKGROUND_TYPES,
  GRADIENT_PRESETS,
  IMAGE_PRESETS,
  PATTERN_VARIANTS,
  gradientCss,
  resolvePattern,
  youtubeId,
  youtubeThumb,
} from "@/lib/canvas/appearance";
import { MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, uploadBackdrop } from "@/lib/canvas/upload-backdrop";

const CANVAS_COLORS = ["#fafaf9", "#f1f5f9", "#fef3c7", "#ecfccb", "#e0f2fe", "#18181b", "#0f172a", "#1c1917", "#14532d", "#3b0764"];

const TYPE_ICONS = { none: Ban, color: PaintBucket, gradient: Blend, image: ImageIcon, video: Clapperboard, animated: Sparkles };

const MAJOR_GRID = [0, 4, 5, 8, 10].map((v) => ({ value: v, label: v ? `${v}` : "Off" }));

const THEMES = [
  { value: "inherit", label: "App", icon: MonitorSmartphone },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

const thumb = (url) => url.replace("w=2400", "w=320");

// Titled card that groups one part of the board's look.
function Block({ title, description, children }) {
  return (
    <div className="space-y-4 rounded-md border border-border bg-muted/30 p-4">
      {title ? (
        <div>
          <p className="text-sm font-medium text-foreground">{title}</p>
          {description ? <p className="text-xs text-text-secondary">{description}</p> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}

function Field({ label, aside, children }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {aside}
      </div>
      {children}
    </div>
  );
}

// Selectable preview tile: a visual swatch over a caption, with a check on the active choice.
function PreviewTile({ active, onClick, title, label, icon: Icon, preview, previewClassName = "", previewStyle }) {
  return (
    <button
      type="button"
      title={title || label}
      aria-pressed={active}
      onClick={onClick}
      className={`group flex flex-col gap-1.5 rounded-md border p-1.5 text-left transition-colors ${
        active ? "border-foreground bg-surface-active" : "border-border hover:border-ring hover:bg-surface-hover"
      }`}
    >
      <span
        className={`relative flex h-14 w-full items-center justify-center overflow-hidden rounded border border-border/50 bg-background bg-cover bg-center ${previewClassName}`}
        style={previewStyle}
      >
        {preview}
        {active && (
          <span className="absolute right-1 top-1 rounded-full bg-foreground p-0.5 text-background shadow-sm">
            <Check className="h-2.5 w-2.5" strokeWidth={3} />
          </span>
        )}
      </span>
      {label ? (
        <span className={`flex items-center gap-1 px-0.5 text-[11px] ${active ? "font-medium text-foreground" : "text-muted-foreground"}`}>
          {Icon ? <Icon className="h-3 w-3 shrink-0" strokeWidth={2} /> : null}
          <span className="truncate">{label}</span>
        </span>
      ) : null}
    </button>
  );
}

// SVG rendering of a canvas pattern, mirroring React Flow's dots/lines/cross so previews match the board.
export function PatternSwatch({ variant, color, size = 1, gap = 15, opacity = 1, majorEvery = 0 }) {
  const id = `pat${React.useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  if (variant === "none") return null;
  const paint = color || "var(--canvas-dots)";
  const c = gap / 2;
  const major = gap * majorEvery;

  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full">
      <defs>
        <pattern id={id} width={gap} height={gap} patternUnits="userSpaceOnUse">
          {variant === "dots" && <circle cx={c} cy={c} r={Math.max(0.5, size / 2)} style={{ fill: paint }} />}
          {variant === "lines" && <path d={`M${c} 0V${gap}M0 ${c}H${gap}`} style={{ stroke: paint, strokeWidth: size }} />}
          {variant === "cross" && (
            <path d={`M${c - size / 2} ${c}H${c + size / 2}M${c} ${c - size / 2}V${c + size / 2}`} style={{ stroke: paint, strokeWidth: 1 }} />
          )}
        </pattern>
        {major > 0 && (
          <pattern id={`${id}m`} width={major} height={major} patternUnits="userSpaceOnUse">
            <path d={`M${c} 0V${major}M0 ${c}H${major}`} style={{ stroke: paint, strokeWidth: Math.max(1, size) * 1.6 }} />
          </pattern>
        )}
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} opacity={opacity} />
      {major > 0 && <rect width="100%" height="100%" fill={`url(#${id}m)`} opacity={Math.min(1, opacity * 1.4)} />}
    </svg>
  );
}

// Mini preview of what each background type looks like with the board's current settings.
function typePreview(type, bg) {
  if (type === "color") return { background: bg.color || CANVAS_COLORS[4] };
  if (type === "gradient") return { background: gradientCss(bg.gradient) };
  if (type === "image") return { backgroundImage: `url("${bg.image.url || thumb(IMAGE_PRESETS[0].url)}")` };
  const ytId = type === "video" && youtubeId(bg.video.url);
  return ytId ? { backgroundImage: `url("${youtubeThumb(ytId)}")` } : undefined;
}

function UploadButton({ kind, boardKey, onUploaded }) {
  const input = React.useRef(null);
  const [busy, setBusy] = React.useState(false);
  const max = kind === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith(`${kind}/`)) return toast.error(`Choose a ${kind} file.`);
    if (file.size > max) return toast.error(`That ${kind} is over ${Math.round(max / 1024 / 1024)} MB.`);
    setBusy(true);
    try {
      onUploaded(await uploadBackdrop(file, kind, boardKey));
      toast.success("Background updated");
    } catch (err) {
      console.error("[backdrop upload]", err);
      toast.error(err.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <input ref={input} type="file" accept={`${kind}/*`} className="hidden" onChange={onFile} />
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        className="flex h-9 items-center justify-center gap-2 rounded-md border border-dashed border-border text-xs text-muted-foreground hover:border-ring hover:text-foreground disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        Upload {kind}
      </button>
    </>
  );
}

function BlurDim({ value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="Blur">
        <SliderRow value={value.blur} min={0} max={20} format={(v) => `${v}px`} onChange={(blur) => onChange({ blur })} />
      </Field>
      <Field label="Dim for readability">
        <SliderRow value={Math.round(value.dim * 100)} min={0} max={85} step={5} format={(v) => `${v}%`} onChange={(v) => onChange({ dim: v / 100 })} />
      </Field>
    </div>
  );
}

function BackgroundControls({ bg, setBg, setBgPart, boardKey }) {
  if (bg.type === "none") {
    return <p className="text-xs text-muted-foreground">Just the canvas and its pattern — no backdrop behind your nodes.</p>;
  }

  if (bg.type === "color") {
    return (
      <Field label="Colour">
        <div className="grid grid-cols-10 gap-1.5">
          {[...CANVAS_COLORS, ...COLORS.slice(0, 10)].map((c) => (
            <button
              key={c}
              type="button"
              title={c}
              aria-pressed={bg.color === c}
              onClick={() => setBg({ color: c })}
              style={{ background: c }}
              className={`h-8 rounded border transition-all ${
                bg.color === c ? "border-foreground ring-2 ring-foreground/20" : "border-border/70 hover:border-ring"
              }`}
            />
          ))}
        </div>
        <ColorRow value={bg.color} onChange={(color) => setBg({ color })} placeholder="Pick a colour" />
      </Field>
    );
  }

  if (bg.type === "gradient") {
    const g = bg.gradient;
    return (
      <>
        <div className="grid grid-cols-5 gap-2">
          {GRADIENT_PRESETS.map((p) => (
            <PreviewTile
              key={p.id}
              label={p.label}
              active={g.preset === p.id}
              onClick={() => setBgPart("gradient", { preset: p.id })}
              previewStyle={{ background: p.css }}
            />
          ))}
          <PreviewTile
            label="Custom"
            active={g.preset === "custom"}
            onClick={() => setBgPart("gradient", { preset: "custom" })}
            previewStyle={{ background: gradientCss({ ...g, preset: "custom" }) }}
          />
        </div>
        {g.preset === "custom" && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="From">
              <ColorRow value={g.from} onChange={(from) => setBgPart("gradient", { from })} allowClear={false} />
            </Field>
            <Field label="To">
              <ColorRow value={g.to} onChange={(to) => setBgPart("gradient", { to })} allowClear={false} />
            </Field>
            <Field label="Shape">
              <SegmentedTabs
                tabs={[{ value: "linear", label: "Linear" }, { value: "radial", label: "Radial" }]}
                value={g.kind}
                onChange={(kind) => setBgPart("gradient", { kind })}
                fullWidth
              />
            </Field>
            {g.kind !== "radial" && (
              <Field label="Angle">
                <SliderRow value={g.angle} min={0} max={360} step={15} format={(v) => `${v}°`} onChange={(angle) => setBgPart("gradient", { angle })} />
              </Field>
            )}
          </div>
        )}
      </>
    );
  }

  if (bg.type === "image") {
    const img = bg.image;
    return (
      <>
        <div className="grid grid-cols-6 gap-2">
          {IMAGE_PRESETS.map((p) => (
            <PreviewTile
              key={p.id}
              label={p.label}
              active={img.url === p.url}
              onClick={() => setBgPart("image", { url: p.url })}
              previewStyle={{ backgroundImage: `url("${thumb(p.url)}")` }}
            />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <UploadButton kind="image" boardKey={boardKey} onUploaded={(url) => setBgPart("image", { url })} />
          <Input
            placeholder="…or paste an image URL"
            value={img.url?.startsWith("data:") ? "" : img.url}
            onChange={(e) => setBgPart("image", { url: e.target.value.trim() })}
            className="h-9 bg-surface-card text-xs"
          />
        </div>
        <SettingsList>
          <SettingRow
            title="Fit"
            control={
              <SegmentedTabs
                tabs={[{ value: "cover", label: "Cover" }, { value: "contain", label: "Contain" }, { value: "tile", label: "Tile" }]}
                value={img.fit}
                onChange={(fit) => setBgPart("image", { fit })}
              />
            }
          />
          <SettingRow
            title="Move with the board"
            description="Pans and zooms with your nodes, like a map."
            control={
              <Switch checked={img.attach === "board"} onCheckedChange={(c) => setBgPart("image", { attach: c ? "board" : "screen" })} />
            }
          />
        </SettingsList>
        <BlurDim value={img} onChange={(patch) => setBgPart("image", patch)} />
      </>
    );
  }

  if (bg.type === "video") {
    const ytId = youtubeId(bg.video.url);
    return (
      <>
        <div className="grid grid-cols-2 gap-2">
          <UploadButton kind="video" boardKey={boardKey} onUploaded={(url) => setBgPart("video", { url })} />
          <Input
            placeholder="YouTube link or .mp4 / .webm URL"
            value={bg.video.url}
            onChange={(e) => setBgPart("video", { url: e.target.value.trim() })}
            className="h-9 bg-surface-card text-xs"
          />
        </div>
        {ytId && (
          <div className="flex items-center gap-3 rounded-md border border-border/60 bg-surface-card p-2">
            <span className="h-10 w-16 shrink-0 rounded bg-surface-strong bg-cover bg-center" style={{ backgroundImage: `url("${youtubeThumb(ytId)}")` }} />
            <span className="flex items-center gap-1.5 text-xs text-foreground">
              <Youtube className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
              YouTube video linked
            </span>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Plays muted on loop, pauses in background tabs and stays still with reduced motion on.
        </p>
        <BlurDim value={bg.video} onChange={(patch) => setBgPart("video", patch)} />
      </>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {ANIMATED_PRESETS.map((p) => (
        <PreviewTile
          key={p.id}
          label={p.label}
          active={bg.animated.preset === p.id}
          onClick={() => setBgPart("animated", { preset: p.id })}
          preview={<span className={`absolute inset-0 canvas-live-${p.id}`} />}
        />
      ))}
    </div>
  );
}

// Board-level appearance editor (background, pattern, theme); every change saves to the board straight away.
export default function BoardAppearanceSettings({ appearance, onChange, boardKey, settings }) {
  const bg = appearance.background;
  const resolved = resolvePattern(appearance.pattern, settings);
  const defaultVariant = settings.canvasBackground || "dots";

  const setBg = (patch) => onChange((a) => ({ ...a, background: { ...a.background, ...patch } }));
  const setBgPart = (part, patch) =>
    onChange((a) => ({ ...a, background: { ...a.background, [part]: { ...a.background[part], ...patch } } }));
  const setPattern = (patch) => onChange((a) => ({ ...a, pattern: { ...a.pattern, ...patch } }));

  return (
    <div className="space-y-3">
      <Block title="Background" description="What sits behind your nodes.">
        <div className="grid grid-cols-6 gap-2">
          {BACKGROUND_TYPES.map((opt) => (
            <PreviewTile
              key={opt.value}
              label={opt.label}
              icon={TYPE_ICONS[opt.value]}
              active={bg.type === opt.value}
              onClick={() => setBg({ type: opt.value })}
              previewClassName={opt.value === "none" ? "" : "bg-surface-strong"}
              previewStyle={typePreview(opt.value, bg)}
              preview={
                <>
                  {opt.value === "none" && <PatternSwatch variant={resolved.variant === "none" ? "dots" : resolved.variant} size={1} gap={8} />}
                  {opt.value === "animated" && <span className={`absolute inset-0 canvas-live-${bg.animated.preset}`} />}
                  {opt.value === "video" && (
                    <span className="rounded-full bg-background/80 p-1 text-foreground">
                      <Play className="h-3 w-3 fill-current" />
                    </span>
                  )}
                </>
              }
            />
          ))}
        </div>
        <BackgroundControls bg={bg} setBg={setBg} setBgPart={setBgPart} boardKey={boardKey} />
      </Block>

      <Block title="Pattern" description="The grid drawn over the background.">
        <div className="relative h-24 overflow-hidden rounded-md border border-border/60 bg-background">
          <PatternSwatch {...resolved} />
          <span className="absolute bottom-2 left-2 rounded bg-surface-card/90 px-1.5 py-0.5 text-[11px] text-muted-foreground shadow-sm">
            {PATTERN_VARIANTS.find((p) => p.value === resolved.variant)?.label} · {resolved.gap}px
          </span>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {PATTERN_VARIANTS.map((opt) => {
            const variant = opt.value === "inherit" ? defaultVariant : opt.value;
            return (
              <PreviewTile
                key={opt.value}
                label={opt.value === "inherit" ? `Default (${PATTERN_VARIANTS.find((p) => p.value === defaultVariant)?.label})` : opt.label}
                title={opt.value === "inherit" ? "Follow your default pattern from All boards" : opt.label}
                active={(appearance.pattern.variant || "inherit") === opt.value}
                onClick={() => setPattern({ variant: opt.value })}
                preview={
                  variant === "none" ? (
                    <Ban className="h-4 w-4 text-muted-foreground/60" />
                  ) : (
                    <PatternSwatch
                      variant={variant}
                      color={resolved.color}
                      size={variant === "cross" ? 6 : Math.min(resolved.size, 3)}
                      gap={variant === "cross" ? 14 : 10}
                    />
                  )
                }
              />
            );
          })}
        </div>

        {resolved.variant !== "none" && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Colour">
              <ColorRow value={appearance.pattern.color} onChange={(color) => setPattern({ color })} />
            </Field>
            <Field label="Opacity">
              <SliderRow value={Math.round(resolved.opacity * 100)} min={10} max={100} step={5} format={(v) => `${v}%`} onChange={(v) => setPattern({ opacity: v / 100 })} />
            </Field>
            <Field label={resolved.variant === "cross" ? "Cross size" : resolved.variant === "lines" ? "Line width" : "Dot size"}>
              <SliderRow value={resolved.size} min={1} max={8} step={0.5} onChange={(size) => setPattern({ size })} />
            </Field>
            <Field
              label="Spacing"
              aside={
                appearance.pattern.gap ? (
                  <button type="button" onClick={() => setPattern({ gap: null })} className="text-[11px] text-muted-foreground hover:text-foreground">
                    Use grid size
                  </button>
                ) : null
              }
            >
              <SliderRow value={resolved.gap} min={8} max={96} onChange={(gap) => setPattern({ gap })} format={(v) => `${v}px`} />
            </Field>
            <div className="col-span-2">
              <SettingRow
                title="Major grid line"
                description="A heavier line every N cells."
                control={<SegmentedTabs tabs={MAJOR_GRID} value={resolved.majorEvery} onChange={(majorEvery) => setPattern({ majorEvery })} />}
              />
            </div>
          </div>
        )}
      </Block>

      <Block>
        <SettingRow
          title="Canvas theme"
          description="Force this board light or dark regardless of the app theme."
          control={<SegmentedTabs tabs={THEMES} value={appearance.theme} onChange={(theme) => onChange((a) => ({ ...a, theme }))} />}
        />
      </Block>
    </div>
  );
}
