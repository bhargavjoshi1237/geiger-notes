"use client";

import React from "react";
import { Search, icons } from "lucide-react";
import { Input } from "@geiger/ui";
import { QUICK_REACTIONS, ReactionIcon, reactionLabel, spacedName } from "./ReactionIcon";

const MAX_RESULTS = 48;
let allNames = null; // [name, "spaced name"], built on first search

function search(query) {
  const q = query.trim().toLowerCase();
  if (!q) return QUICK_REACTIONS.map((r) => r.name);
  const quick = QUICK_REACTIONS.filter((r) => `${r.label} ${r.words} ${spacedName(r.name)}`.toLowerCase().includes(q)).map(
    (r) => r.name,
  );
  allNames ??= Object.keys(icons).map((name) => [name, spacedName(name)]);
  const seen = new Set(quick);
  const rest = [];
  for (const [name, spaced] of allNames) {
    if (quick.length + rest.length >= MAX_RESULTS) break;
    if (!seen.has(name) && spaced.includes(q)) rest.push(name);
  }
  return [...quick, ...rest];
}

// Searchable Lucide reaction grid: quick picks first, any Lucide icon by name once you type. Enter picks the first match.
export default function ReactionPicker({ onPick }) {
  const [query, setQuery] = React.useState("");
  const results = React.useMemo(() => search(query), [query]);

  return (
    <div className="flex w-64 flex-col gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && results[0]) onPick(results[0]);
          }}
          placeholder="Search reactions"
          aria-label="Search reactions"
          className="h-8 bg-surface-card pl-8 text-xs"
        />
      </div>
      <p className="px-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {query.trim() ? `${results.length === MAX_RESULTS ? `${MAX_RESULTS}+` : results.length} matches` : "Quick reactions"}
      </p>
      {results.length ? (
        <div className="grid max-h-56 grid-cols-6 gap-1 overflow-y-auto scrollbar-subtle">
          {results.map((name) => (
            <button
              key={name}
              type="button"
              title={reactionLabel(name)}
              aria-label={`React with ${reactionLabel(name)}`}
              onClick={() => onPick(name)}
              className="flex h-9 w-9 items-center justify-center rounded-lg transition-[transform,background-color] duration-150 hover:scale-110 hover:bg-surface-hover active:scale-95"
            >
              <ReactionIcon reaction={name} className="h-[18px] w-[18px]" />
            </button>
          ))}
        </div>
      ) : (
        <p className="py-6 text-center text-xs text-muted-foreground">No icons match “{query.trim()}”</p>
      )}
    </div>
  );
}
