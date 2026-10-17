"use client";

import React from "react";
import { Eraser, MessageSquareText, Wand2 } from "lucide-react";
import { Label, Popover, PopoverContent, PopoverTrigger, Textarea } from "@geiger/ui";
import { SidebarButton } from "@/components/internal/layout/sidebar/SidebarPrimitives";
import { AI_ACTIONS } from "./AiNode";

const POPOVER_CLASS = "bg-surface-dialog border-border shadow-xl rounded-xl";

export default function AiSettings({ node, updateData }) {
  const data = node?.data ?? {};
  const action = data.action || "summarize";
  const hasResult = !!(data.output || data.items?.length || data.error);

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <SidebarButton icon={Wand2} label="Action" title="Action" />
        </PopoverTrigger>
        <PopoverContent side="right" align="start" sideOffset={8} className={`w-48 p-1 ${POPOVER_CLASS}`}>
          <div className="flex flex-col gap-0.5">
            <Label className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Action
            </Label>
            {AI_ACTIONS.map((a) => (
              <button
                key={a.value}
                type="button"
                onClick={() => updateData({ action: a.value })}
                className={`rounded-lg px-2 py-1.5 text-left text-xs transition-colors ${
                  action === a.value
                    ? "bg-surface-hover text-foreground"
                    : "text-muted-foreground hover:bg-surface-hover/50 hover:text-foreground"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <SidebarButton icon={MessageSquareText} label="Custom prompt" title="Custom prompt" />
        </PopoverTrigger>
        <PopoverContent side="right" align="start" sideOffset={8} className={`w-64 p-3 ${POPOVER_CLASS}`}>
          <Label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Custom prompt
          </Label>
          <Textarea
            value={data.prompt ?? ""}
            onChange={(e) => updateData({ prompt: e.target.value, action: "custom" })}
            rows={4}
            placeholder="e.g. Turn these notes into a project brief"
            className="resize-none text-xs"
          />
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            Runs against the text of every node connected to this one.
          </p>
        </PopoverContent>
      </Popover>

      {hasResult && (
        <SidebarButton
          icon={Eraser}
          label="Clear output"
          title="Clear output"
          onClick={() => updateData({ output: "", items: [], error: null, status: "idle", updatedAt: null })}
        />
      )}
    </>
  );
}
