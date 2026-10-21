"use client";

import { Avatar, AvatarFallback, cn } from "@geiger/ui";
import { CachedAvatarImage } from "@/components/cached-avatar-image";

// Stacked avatars for everyone else in the sketch, in the colour Excalidraw
// draws their cursor with. Up to five, then "+N". Clicking one follows their view.
const MAX_SHOWN = 5;

function initials(name) {
  return (name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function CollaboratorStack({ collaborators = [], followingId = null, onFollow }) {
  if (!collaborators.length) return null;

  const shown = collaborators.slice(0, MAX_SHOWN);
  const overflow = collaborators.length - shown.length;

  return (
    <div className="flex shrink-0 items-center">
      {shown.map((person) => {
        const following = followingId === person.userId;
        return (
          <button
            key={person.userId}
            type="button"
            onClick={() => onFollow?.(person.userId)}
            disabled={!onFollow}
            title={following ? `Stop following ${person.name}` : `Follow ${person.name}`}
            aria-pressed={following}
            className="-ml-1.5 rounded-full transition-transform first:ml-0 hover:z-10 hover:scale-110 disabled:hover:scale-100"
          >
            <Avatar
              className={cn("h-6 w-6 border-2", following && "ring-2 ring-offset-1 ring-offset-topbar-bg")}
              style={{ borderColor: person.color, "--tw-ring-color": person.color }}
            >
              {person.avatar && (
                <CachedAvatarImage
                  src={person.avatar}
                  cacheKey={person.userId}
                  alt={person.name}
                  className="object-cover"
                />
              )}
              <AvatarFallback className="bg-surface-strong text-[9px] font-bold text-foreground">
                {initials(person.name)}
              </AvatarFallback>
            </Avatar>
          </button>
        );
      })}
      {overflow > 0 && (
        <span className="-ml-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-border bg-surface-strong text-[9px] font-bold text-text-secondary">
          +{overflow}
        </span>
      )}
    </div>
  );
}
