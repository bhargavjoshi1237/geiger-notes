"use client";

import React from "react";
import { ExternalLink, Link2, Ratio, Unlink } from "lucide-react";
import { toast } from "sonner";
import { Button, Input, Label, Popover, PopoverContent, PopoverTrigger } from "@geiger/ui";
import { SidebarButton } from "@/components/internal/layout/sidebar/SidebarPrimitives";
import { resolveEmbed } from "./embed-providers";

const POPOVER_CLASS = "w-64 bg-surface-dialog border-border p-3 shadow-xl rounded-xl";

// Embed node rail: change the URL, snap back to the provider's size, open or remove the embed.
export default function EmbedSettings({ node, updateData, updateNode }) {
  const url = node?.data?.url || "";
  const embed = resolveEmbed(url);
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState(url);

  const applySize = (size) => updateNode({ width: size.width, height: size.height, style: { ...(node.style || {}), ...size } });

  const save = () => {
    const resolved = resolveEmbed(draft);
    if (!resolved) {
      toast.error("That link can't be embedded");
      return;
    }
    if (!embed || embed.provider.id !== resolved.provider.id) applySize(resolved.size);
    updateData({ url: draft.trim() });
    setOpen(false);
  };

  return (
    <>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) setDraft(url);
        }}
      >
        <PopoverTrigger asChild>
          <SidebarButton icon={Link2} label="Embed link" title="Embed link" active={open} />
        </PopoverTrigger>
        <PopoverContent side="right" align="start" sideOffset={8} className={POPOVER_CLASS}>
          <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Embed link</Label>
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            placeholder="Paste a URL"
            className="mt-2 h-8 bg-surface-card text-sm"
          />
          {draft.trim() && (
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              {resolveEmbed(draft)?.provider.name ?? "Not embeddable"}
            </p>
          )}
          <Button size="sm" className="mt-3 h-8 w-full" onClick={save} disabled={!draft.trim()}>
            Save
          </Button>
        </PopoverContent>
      </Popover>

      {embed && (
        <>
          <SidebarButton icon={Ratio} label="Reset size" title="Reset to provider size" onClick={() => applySize(embed.size)} />
          <SidebarButton
            icon={ExternalLink}
            label="Open in new tab"
            title="Open in new tab"
            onClick={() => window.open(embed.originalUrl, "_blank", "noopener,noreferrer")}
          />
          <SidebarButton icon={Unlink} label="Remove embed" title="Remove embed" onClick={() => updateData({ url: "" })} />
        </>
      )}
    </>
  );
}
