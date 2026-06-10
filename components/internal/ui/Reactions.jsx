import React from "react";

const Reactions = ({ reactions = {}, onReactionClick }) => {
  const reactionEntries = Object.entries(reactions).filter(
    ([_, count]) => count > 0,
  );

  if (reactionEntries.length === 0) return null;

  return (
    <div className="absolute -bottom-3 right-2 flex flex-row-reverse flex-wrap gap-1.5 z-20 pointer-events-auto">
      {reactionEntries.map(([emoji, count]) => (
        <button
          key={emoji}
          title={`${count} reactions`}
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
            onReactionClick(emoji);
          }}
        >
          <span className="text-sm transform group-hover:scale-125 transition-transform duration-300">
            {emoji}
          </span>
          <span className="font-medium text-foreground tabular-nums">
            {count}
          </span>
        </button>
      ))}
    </div>
  );
};

export default Reactions;
