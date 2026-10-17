"use client";

import React from "react";
import { LayoutTemplate } from "lucide-react";
import { toast } from "sonner";
import { Label, Popover, PopoverContent, PopoverTrigger } from "@geiger/ui";
import { SidebarButton } from "@/components/internal/layout/sidebar/SidebarPrimitives";
import { MERMAID_TEMPLATES } from "./templates";
import { MERMAID_VIEWS } from "./MermaidNode";

const SectionLabel = ({ children }) => (
  <Label className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</Label>
);

const itemClass = (active) =>
  `flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors ${
    active ? "bg-surface-hover text-foreground" : "text-muted-foreground hover:bg-surface-hover/50 hover:text-foreground"
  }`;

export default function MermaidSettings({ node, updateData }) {
  const data = node?.data ?? {};
  const view = data.view || "split";
  const ViewIcon = MERMAID_VIEWS.find((v) => v.value === view)?.icon ?? MERMAID_VIEWS[1].icon;

  const applyTemplate = (template) => {
    const previous = data.source ?? "";
    if (previous === template.source) return;
    updateData({ source: template.source });
    toast.success(`${template.label} template applied`, {
      action: { label: "Undo", onClick: () => updateData({ source: previous }) },
    });
  };

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <SidebarButton icon={LayoutTemplate} label="Templates" title="Templates" />
        </PopoverTrigger>
        <PopoverContent side="right" align="start" sideOffset={8} className="w-56 bg-surface-dialog border-border p-1 shadow-xl rounded-xl">
          <div className="flex flex-col gap-0.5">
            <SectionLabel>Starter templates</SectionLabel>
            {MERMAID_TEMPLATES.map((t) => (
              <button key={t.id} type="button" onClick={() => applyTemplate(t)} className={itemClass(false)}>
                {t.label}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <SidebarButton icon={ViewIcon} label="Editor layout" title="Editor layout" />
        </PopoverTrigger>
        <PopoverContent side="right" align="start" sideOffset={8} className="w-44 bg-surface-dialog border-border p-1 shadow-xl rounded-xl">
          <div className="flex flex-col gap-0.5">
            <SectionLabel>When selected</SectionLabel>
            {MERMAID_VIEWS.map(({ value, label, icon: Icon }) => (
              <button key={value} type="button" onClick={() => updateData({ view: value })} className={itemClass(view === value)}>
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
