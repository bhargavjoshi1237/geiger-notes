"use client";

import React from "react";
import { TOOLS } from "@/lib/settings/tools";

export default function ToolbarOptions({
  selectedTools = [],
  onToggleTool,
  onReset,
}) {
  const allOn = TOOLS.every((t) => selectedTools.includes(t.id));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500">
          {selectedTools.length} of {TOOLS.length} tools visible
        </p>
        <button
          type="button"
          onClick={onReset}
          disabled={allOn}
          className="text-xs text-zinc-400 hover:text-zinc-200 disabled:opacity-40 disabled:hover:text-zinc-400 transition-colors"
        >
          Show all
        </button>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
        {TOOLS.map((tool) => {
          const isActive = selectedTools.includes(tool.id);
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => onToggleTool(tool.id)}
              aria-pressed={isActive}
              className={`flex flex-col items-center justify-center gap-2 aspect-square rounded-xl transition-all pt-3 pb-3 border-2 ${
                isActive
                  ? "bg-zinc-800 border-zinc-500 text-white"
                  : "bg-zinc-900 border-transparent text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
              }`}
            >
              <Icon className={`w-6 h-6 ${isActive ? "text-[#e7e7e7]" : ""}`} />
              <span className="text-[10px] font-medium truncate w-full px-1">
                {tool.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
