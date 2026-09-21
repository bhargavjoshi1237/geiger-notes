"use client";

import { Avatar, AvatarFallback } from "@geiger/ui";
import { CachedAvatarImage } from "@/components/cached-avatar-image";

// Stacked avatars for everyone else in the sketch, in the colour Excalidraw
// draws their cursor with. Up to five, then "+N".
const MAX_SHOWN = 5;

function initials(name) {
  return (name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function CollaboratorStack({ collaborators = [] }) {
  if (!collaborators.length) return null;

  const shown = collaborators.slice(0, MAX_SHOWN);
  const overflow = collaborators.length - shown.length;

  return (
    <div className="flex shrink-0 items-center">
      {shown.map((person) => (
        <Avatar
          key={person.userId}
          title={person.name}
          className="-ml-1.5 h-6 w-6 border-2 first:ml-0"
          style={{ borderColor: person.color }}
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
      ))}
      {overflow > 0 && (
        <span className="-ml-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-border bg-surface-strong text-[9px] font-bold text-text-secondary">
          +{overflow}
        </span>
      )}
    </div>
  );
}
