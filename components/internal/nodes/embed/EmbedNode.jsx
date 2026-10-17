"use client";

import React, { memo } from "react";
import { useReactFlow } from "@xyflow/react";
import { ExternalLink, Pencil, PanelsTopLeft } from "lucide-react";
import { toast } from "sonner";
import { Button, Input, LogoLoading } from "@geiger/ui";
import NodeShell, { useNodeDataUpdater } from "@/components/internal/nodes/shared/NodeShell";
import TextEditingTrait from "@/components/internal/nodes/traits/TextEditingTrait";
import { EMBED_DEFAULT_SIZE, resolveEmbed } from "./embed-providers";

const SANDBOX = "allow-scripts allow-same-origin allow-popups allow-presentation allow-forms";
const ALLOW = "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";

// Pick the provider-shaped node size for a freshly embedded URL.
function useEmbedResize(id) {
  const { setNodes } = useReactFlow();
  return React.useCallback(
    (size) =>
      setNodes((nodes) =>
        nodes.map((n) =>
          n.id === id ? { ...n, width: size.width, height: size.height, style: { ...n.style, ...size } } : n,
        ),
      ),
    [id, setNodes],
  );
}

function EmbedForm({ initial, onSubmit, onCancel }) {
  const [draft, setDraft] = React.useState(initial || "");
  const submit = () => {
    const resolved = resolveEmbed(draft);
    if (!resolved) {
      toast.error("That link can't be embedded");
      return;
    }
    onSubmit(draft.trim(), resolved);
  };

  return (
    <div className="flex h-full w-full flex-1 flex-col items-center justify-center gap-3 p-5 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-hover text-muted-foreground">
        <PanelsTopLeft className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">Embed a link</p>
        <p className="mt-0.5 text-xs text-muted-foreground">YouTube, Figma, Google Docs, Maps, Spotify, Loom, Miro…</p>
      </div>
      <TextEditingTrait
        className="flex w-full max-w-sm gap-2"
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") onCancel?.();
        }}
      >
        <Input
          autoFocus={Boolean(initial)}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Paste a URL"
          className="h-8 flex-1 bg-surface-card text-sm"
        />
        <Button size="sm" className="h-8" onClick={submit} disabled={!draft.trim()}>
          Embed
        </Button>
      </TextEditingTrait>
      {onCancel && (
        <button type="button" onClick={onCancel} className="nodrag text-xs text-muted-foreground hover:text-foreground">
          Cancel
        </button>
      )}
    </div>
  );
}

const EmbedNode = ({ id, data, selected, dragging }) => {
  const update = useNodeDataUpdater(id);
  const resize = useEmbedResize(id);
  const [editingState, setEditing] = React.useState(false);
  const [loadedUrl, setLoadedUrl] = React.useState(null);

  const embed = React.useMemo(() => resolveEmbed(data.url), [data.url]);
  const editing = !embed || (editingState && selected);
  const interactive = selected && !dragging;
  const Icon = embed?.provider.icon;

  const handleSubmit = (url, resolved) => {
    if (!embed || embed.provider.id !== resolved.provider.id) resize(resolved.size);
    update({ url });
    setEditing(false);
  };

  return (
    <NodeShell id={id} data={data} selected={selected} dragging={dragging} minWidth={240} minHeight={140}>
      {editing ? (
        <EmbedForm initial={data.url} onSubmit={handleSubmit} onCancel={embed ? () => setEditing(false) : undefined} />
      ) : (
        <div className="flex h-full w-full flex-1 flex-col overflow-hidden rounded-[inherit]">
          <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border px-3">
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate text-xs font-medium text-foreground">{embed.provider.name}</span>
            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
              {new URL(embed.originalUrl).hostname.replace(/^www\./, "")}
            </span>
            {selected && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                title="Change link"
                aria-label="Change link"
                className="nodrag flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-hover hover:text-foreground"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            <a
              href={embed.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              title="Open in new tab"
              aria-label="Open in new tab"
              className="nodrag flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-hover hover:text-foreground"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className={`relative min-h-0 flex-1 bg-surface-hover ${interactive ? "nodrag nopan nowheel" : ""}`}>
            {loadedUrl !== embed.embedUrl && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-muted-foreground">
                <LogoLoading size={36} />
              </div>
            )}
            <iframe
              key={embed.embedUrl}
              src={embed.embedUrl}
              title={`${embed.provider.name} embed`}
              sandbox={SANDBOX}
              allow={ALLOW}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              onLoad={() => setLoadedUrl(embed.embedUrl)}
              className="absolute inset-0 h-full w-full border-0"
              style={{ pointerEvents: interactive ? "auto" : "none" }}
            />
            {!selected && (
              <div className="pointer-events-none absolute bottom-2 right-2 rounded-md bg-background/80 px-2 py-0.5 text-[10px] text-muted-foreground opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
                Select to interact
              </div>
            )}
          </div>
        </div>
      )}
    </NodeShell>
  );
};

export const nodeMeta = {
  type: "embed",
  label: "Embed",
  icon: PanelsTopLeft,
  cardColor: true,
  create: () => ({ data: { url: "" }, style: { ...EMBED_DEFAULT_SIZE } }),
};

export default memo(EmbedNode);
