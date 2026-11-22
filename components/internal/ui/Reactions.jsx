import React from "react";
import { reactionName } from "@/lib/canvas/reactions";
import { ReactionIcon, reactionLabel } from "./ReactionIcon";

// Reaction chips under a node. Legacy emoji keys fold into their Lucide icon, so "👍" and "ThumbsUp"
// show as one chip; clicking a chip adds one more under the icon name.
const Reactions = ({ reactions = {}, onReactionClick }) => {
  const totals = new Map();
  for (const [key, count] of Object.entries(reactions)) {
    if (count > 0) {
      const name = reactionName(key);
      totals.set(name, (totals.get(name) || 0) + count);
    }
  }

  if (totals.size === 0) return null;

  return (
    <div className="absolute -bottom-3 right-2 flex flex-row-reverse flex-wrap gap-1.5 z-20 pointer-events-auto">
      {[...totals].map(([name, count]) => (
        <button
          key={name}
          type="button"
          title={`${reactionLabel(name)} · ${count}`}
          className={`
            group flex items-center gap-1.5
            bg-muted/80 backdrop-blur-md
            hover:bg-surface-hover transition-all duration-300
            px-2 py-1 rounded-lg text-xs
            border border-border/50 hover:border-ring
            shadow-lg shadow-black/20
            animate-in fade-in zoom-in duration-300
          `}
          onClick={(e) => {
            e.stopPropagation();
            onReactionClick(name);
          }}
        >
          <ReactionIcon reaction={name} className="h-3.5 w-3.5 transform transition-transform duration-300 group-hover:scale-125" />
          <span className="font-medium text-foreground tabular-nums">{count}</span>
        </button>
      ))}
    </div>
  );
};

export default Reactions;
