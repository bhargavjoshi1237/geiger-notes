"use client";

import React from "react";
import { Copy, Download, Languages, ListOrdered, WrapText } from "lucide-react";
import { Label, Popover, PopoverContent, PopoverTrigger } from "@geiger/ui";
import { SidebarButton } from "@/components/internal/layout/sidebar/SidebarPrimitives";
import { LANGUAGES } from "./highlight";
import { copyCode } from "./CodeNode";

// Code node rail: language, line numbers, wrap, copy and download.
export default function CodeSettings({ node, updateData }) {
  const data = node?.data || {};
  const language = data.language || "js";
  const showLineNumbers = data.showLineNumbers !== false;

  const download = () => {
    const ext = LANGUAGES.find((l) => l.value === language)?.ext ?? "txt";
    const blob = new Blob([data.code ?? ""], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = data.filename?.trim() || `snippet.${ext}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <SidebarButton icon={Languages} label="Language" title="Language" />
        </PopoverTrigger>
        <PopoverContent
          side="right"
          align="start"
          sideOffset={8}
          className="w-48 bg-surface-dialog border-border p-1 shadow-xl rounded-xl"
        >
          <Label className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Language
          </Label>
          <div className="flex max-h-72 flex-col gap-0.5 overflow-y-auto">
            {LANGUAGES.map((l) => (
              <button
                key={l.value}
                type="button"
                onClick={() => updateData({ language: l.value })}
                className={`rounded-lg px-2 py-1.5 text-left text-xs transition-colors ${
                  language === l.value
                    ? "bg-surface-hover text-foreground"
                    : "text-muted-foreground hover:bg-surface-hover/50 hover:text-foreground"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      <SidebarButton
        icon={ListOrdered}
        label="Line numbers"
        title={showLineNumbers ? "Hide line numbers" : "Show line numbers"}
        active={showLineNumbers}
        onClick={() => updateData({ showLineNumbers: !showLineNumbers })}
      />
      <SidebarButton
        icon={WrapText}
        label="Wrap lines"
        title={data.wrap ? "Disable wrap" : "Wrap lines"}
        active={!!data.wrap}
        onClick={() => updateData({ wrap: !data.wrap })}
      />
      <SidebarButton icon={Copy} label="Copy code" title="Copy code" onClick={() => copyCode(data.code)} />
      <SidebarButton icon={Download} label="Download" title="Download as file" onClick={download} />
    </>
  );
}
