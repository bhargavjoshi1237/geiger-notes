"use client";

import React, { useMemo } from "react";
import { CircleDot, Globe, ImageIcon, Link as LinkIcon, Plus, UserRound, X } from "lucide-react";
import { Input, Label, Popover, PopoverContent, PopoverTrigger } from "@geiger/ui";
import { SidebarButton } from "@/components/internal/layout/sidebar/SidebarPrimitives";
import { PERSON_STATUS, applyCurrentUser, browserTimeZone } from "./PersonNode";

const SECTION_LABEL = "text-[10px] uppercase tracking-wider text-muted-foreground font-semibold";
const makeLinkId = () => `lnk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

function SettingPopover({ icon, label, width = "w-64", children }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <SidebarButton icon={icon} label={label} aria-label={label} title={label} />
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        sideOffset={8}
        className={`${width} bg-surface-dialog border-border p-3 shadow-xl rounded-xl`}
      >
        <div className="flex flex-col gap-2">
          <Label className={SECTION_LABEL}>{label}</Label>
          {children}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function PersonSettings({ node, updateData }) {
  const data = node.data || {};
  const links = Array.isArray(data.links) ? data.links : [];
  const zones = useMemo(() => {
    try {
      return Intl.supportedValuesOf("timeZone");
    } catch {
      return [];
    }
  }, []);

  const setLink = (linkId, patch) => updateData({ links: links.map((l) => (l.id === linkId ? { ...l, ...patch } : l)) });

  return (
    <>
      <SidebarButton
        icon={UserRound}
        label="Use me"
        aria-label="Fill from my profile"
        title="Fill from my profile"
        onClick={() => applyCurrentUser(updateData)}
      />

      <SettingPopover icon={CircleDot} label="Status">
        <div className="flex flex-col gap-0.5">
          {Object.entries(PERSON_STATUS).map(([key, s]) => (
            <button
              key={key}
              type="button"
              onClick={() => updateData({ status: key })}
              className={`flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors ${
                (data.status || "available") === key
                  ? "bg-surface-hover text-foreground"
                  : "text-muted-foreground hover:bg-surface-hover/50 hover:text-foreground"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${s.dot}`} />
              {s.label}
            </button>
          ))}
        </div>
      </SettingPopover>

      <SettingPopover icon={ImageIcon} label="Avatar">
        <Input
          value={data.avatarUrl || ""}
          onChange={(e) => updateData({ avatarUrl: e.target.value.trim() })}
          placeholder="https://… image URL"
          className="h-8 bg-surface-card text-sm"
        />
        <p className="text-[11px] text-muted-foreground">Leave empty to show initials.</p>
      </SettingPopover>

      <SettingPopover icon={Globe} label="Timezone">
        <Input
          list="person-node-timezones"
          value={data.timezone || ""}
          onChange={(e) => updateData({ timezone: e.target.value })}
          placeholder="e.g. Europe/Berlin"
          className="h-8 bg-surface-card text-sm"
        />
        <datalist id="person-node-timezones">
          {zones.map((z) => (
            <option key={z} value={z} />
          ))}
        </datalist>
        <button
          type="button"
          onClick={() => updateData({ timezone: browserTimeZone() })}
          className="rounded-md border border-border px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          Use my timezone
        </button>
      </SettingPopover>

      <SettingPopover icon={LinkIcon} label="Links" width="w-72">
        {links.map((l) => (
          <div key={l.id} className="flex items-center gap-1.5">
            <Input
              value={l.label || ""}
              onChange={(e) => setLink(l.id, { label: e.target.value })}
              placeholder="Label"
              className="h-8 w-20 bg-surface-card text-xs"
            />
            <Input
              value={l.url || ""}
              onChange={(e) => setLink(l.id, { url: e.target.value.trim() })}
              placeholder="URL"
              className="h-8 min-w-0 flex-1 bg-surface-card text-xs"
            />
            <button
              type="button"
              onClick={() => updateData({ links: links.filter((x) => x.id !== l.id) })}
              aria-label="Remove link"
              className="text-muted-foreground hover:text-red-600 dark:hover:text-red-400"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => updateData({ links: [...links, { id: makeLinkId(), label: "", url: "" }] })}
          className="flex items-center justify-center gap-1 rounded-md border border-dashed border-border py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" /> Add link
        </button>
      </SettingPopover>
    </>
  );
}
