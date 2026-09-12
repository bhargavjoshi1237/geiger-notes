import React from "react";
import { Send } from "lucide-react";
import { Avatar, AvatarFallback } from "@geiger/ui";
import { CachedAvatarImage } from "@/components/cached-avatar-image";
import { getUser, getUserCached, getProfileImageUrl } from "@/lib/supabase/user";
import TextEditingTrait from "@/components/internal/nodes/traits/TextEditingTrait";

// Resolves whose face belongs on a comment: the stored commenter when the
// comment has already been sent, otherwise the signed-in user.
export function useCommentAuthor(data) {
  const [me, setMe] = React.useState(() => getUserCached());

  React.useEffect(() => {
    let active = true;
    getUser()
      .then((user) => {
        if (active) setMe(user);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const id = data?.avatarUserId || me?.id || null;
  const name = data?.authorName || me?.name || "";
  const initials = (
    name
      ? name
          .split(/\s+/)
          .filter(Boolean)
          .map((part) => part[0])
          .join("")
      : data?.initials || "YOU"
  )
    .toUpperCase()
    .slice(0, 2);

  return {
    id,
    name,
    initials,
    avatarUrl: getProfileImageUrl(id) || me?.avatar || data?.avatarUrl || "",
    userId: me?.id ?? null,
    userName: me?.name ?? null,
  };
}

// The comment row itself — avatar, input and send. Shared by the standalone
// comment node and the comment cards inside a column so both look identical.
export default function CommentComposer({ author, value, onChange, onSend }) {
  return (
    <div className="flex w-full items-center gap-3 p-4">
      <Avatar className="shrink-0">
        {author.avatarUrl && (
          <CachedAvatarImage
            src={author.avatarUrl}
            cacheKey={author.id || author.avatarUrl}
            alt={author.name || "Commenter"}
            className="object-cover"
          />
        )}
        <AvatarFallback className="bg-ring text-[10px] font-bold text-foreground">
          {author.initials}
        </AvatarFallback>
      </Avatar>

      <div className="relative flex flex-1 items-center">
        <TextEditingTrait
          className="w-full"
          onKeyDown={(e) => {
            if (e.key === "Enter") onSend();
          }}
        >
          <input
            type="text"
            className="w-full rounded bg-comment-input px-3 py-2 pr-16 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Write a comment..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </TextEditingTrait>
        <button
          type="button"
          onClick={onSend}
          title="Send comment"
          className="nodrag absolute right-2 flex items-center gap-1 text-xs font-medium text-blue-400 transition-colors hover:text-blue-300"
        >
          <Send className="h-3.5 w-3.5" />
          Send
        </button>
      </div>
    </div>
  );
}
