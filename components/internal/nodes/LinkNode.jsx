"use client";

import React, { memo } from "react";
import { useStore } from "@xyflow/react";
import { ExternalLink, Globe, Link, Loader2, Pencil } from "lucide-react";
import NodeShell, { useNodeDataUpdater } from "./shared/NodeShell";
import TextEditingTrait from "./traits/TextEditingTrait";

const FAILED_RETRY_MS = 6 * 60 * 60 * 1000;
const IMAGE_MIN_HEIGHT = 230;
const CARD_MIN_HEIGHT = 110;

// Normalise a typed link to an absolute http(s) URL, or null when it isn't one.
export function normalizeLinkUrl(raw) {
  const trimmed = (raw || "").trim();
  if (!trimmed || /\s/.test(trimmed)) return null;
  const candidate = /^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".") && url.hostname !== "localhost") return null;
    return url.toString();
  } catch {
    return null;
  }
}

const hostOf = (href) => {
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return href;
  }
};

function Favicon({ src, className = "h-5 w-5" }) {
  const [failed, setFailed] = React.useState(false);
  if (!src || failed) return <Globe className={`${className} shrink-0 text-muted-foreground`} />;
  return (
    <img
      src={src}
      alt=""
      referrerPolicy="no-referrer"
      className={`${className} shrink-0 rounded-sm object-contain`}
      onError={() => setFailed(true)}
    />
  );
}

function OpenButton({ href }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      title="Open link"
      aria-label="Open link"
      className="nodrag nopan flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
    >
      <ExternalLink className="h-3.5 w-3.5" />
    </a>
  );
}

function EditButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title="Edit link"
      aria-label="Edit link"
      className="nodrag nopan flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
    >
      <Pencil className="h-3.5 w-3.5" />
    </button>
  );
}

const LinkNode = ({ id, data, selected, dragging }) => {
  const update = useNodeDataUpdater(id);
  const height = useStore((s) => s.nodeLookup.get(id)?.measured?.height ?? 68);
  const [editingState, setEditing] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const href = normalizeLinkUrl(data.url);
  const editing = !href || (editingState && selected);
  const preview = data.preview?.sourceUrl === href ? data.preview : null;
  const hasPreview = Boolean(preview && !preview.error && (preview.title || preview.description || preview.image));

  // Fetch and cache the preview once per URL; failed fetches retry after a few hours.
  const cached = data.preview;
  React.useEffect(() => {
    if (!href || editing) return;
    if (cached?.sourceUrl === href && !(cached.error && Date.now() - (cached.fetchedAt || 0) > FAILED_RETRY_MS)) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      let next = { error: true, sourceUrl: href, fetchedAt: Date.now() };
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/api/link-preview?url=${encodeURIComponent(href)}`,
        );
        if (res.ok) {
          const json = await res.json();
          next = {
            title: json.title || null,
            description: json.description || null,
            image: json.image || null,
            favicon: json.favicon || null,
            siteName: json.siteName || null,
            sourceUrl: href,
            fetchedAt: Date.now(),
          };
        }
      } catch {
        // Network failure: cache the error so we fall back to the plain row.
      }
      if (cancelled) return;
      setLoading(false);
      update({ preview: next });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      setLoading(false);
    };
  }, [href, editing, cached, update]);

  const handleUrlChange = (evt) => {
    setEditing(true);
    update({ url: evt.target.value });
  };

  const compact = data.display === "compact" || height < CARD_MIN_HEIGHT;
  const showImage = !compact && preview?.image && height >= IMAGE_MIN_HEIGHT;

  let body;
  if (editing) {
    body = (
      <div className="flex h-full w-full flex-1 items-center overflow-hidden px-4">
        <Link className="mr-3 h-5 w-5 flex-shrink-0 text-muted-foreground" />
        <TextEditingTrait
          className="w-full"
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === "Escape") && href) setEditing(false);
          }}
        >
          <input
            className="w-full bg-transparent font-sans text-foreground outline-none placeholder:text-muted-foreground"
            placeholder="Enter a link URL"
            value={data.url || ""}
            autoFocus={editingState}
            onChange={handleUrlChange}
            onFocus={() => setEditing(true)}
            onBlur={() => setEditing(false)}
          />
        </TextEditingTrait>
      </div>
    );
  } else if (!hasPreview || compact) {
    body = (
      <div
        className="flex h-full w-full flex-1 items-center gap-3 overflow-hidden px-4"
        onDoubleClick={() => setEditing(true)}
      >
        {loading && !hasPreview ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
        ) : hasPreview ? (
          <Favicon key={preview.favicon} src={preview.favicon} />
        ) : (
          <Link className="h-5 w-5 shrink-0 text-muted-foreground" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-sans text-sm text-foreground">{hasPreview ? preview.title || hostOf(href) : data.url}</p>
          {hasPreview && (
            <p className="truncate text-xs text-muted-foreground">{preview.siteName || hostOf(href)}</p>
          )}
        </div>
        {selected && <EditButton onClick={() => setEditing(true)} />}
        <OpenButton href={href} />
      </div>
    );
  } else {
    body = (
      <div className="flex h-full w-full flex-1 flex-col overflow-hidden rounded-[inherit]" onDoubleClick={() => setEditing(true)}>
        {showImage && (
          <div className="relative min-h-0 flex-1 overflow-hidden border-b border-border bg-surface-hover">
            <img
              src={preview.image}
              alt=""
              referrerPolicy="no-referrer"
              loading="lazy"
              draggable={false}
              className="absolute inset-0 h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
        )}
        <div className={`flex min-h-0 flex-col gap-1 px-4 py-3 ${showImage ? "shrink-0" : "flex-1"}`}>
          <div className="flex items-center gap-2">
            <Favicon key={preview.favicon} src={preview.favicon} className="h-4 w-4" />
            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
              {preview.siteName || hostOf(href)}
            </span>
            {selected && <EditButton onClick={() => setEditing(true)} />}
            <OpenButton href={href} />
          </div>
          <p className="line-clamp-2 font-sans text-sm font-medium leading-snug text-foreground">
            {preview.title || hostOf(href)}
          </p>
          {preview.description && (
            <p
              className={`text-xs leading-relaxed text-muted-foreground ${
                showImage ? "line-clamp-2" : "line-clamp-3 min-h-0 overflow-hidden"
              }`}
            >
              {preview.description}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <NodeShell id={id} data={data} selected={selected} dragging={dragging} minWidth={338} minHeight={68}>
      {body}
    </NodeShell>
  );
};

export default memo(LinkNode);
