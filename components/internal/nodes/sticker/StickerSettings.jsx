"use client";

import React from "react";
import { Shapes, Smile } from "lucide-react";
import { IconPicker, Input, LucideIcon } from "@geiger/ui";
import { PlugSectionLabel, PopoverPlug, SwatchPlug } from "@/components/internal/nodes/shared/BasicNodePlugs";

const EMOJIS = [
  "⭐", "🔥", "✅", "❌", "⚠️", "❗", "❓", "💡", "🎯", "🚀",
  "🎉", "👍", "👎", "👏", "🙌", "💪", "👀", "🤔", "😀", "😂",
  "😍", "😎", "🥳", "😅", "😢", "😡", "🤯", "😴", "❤️", "💔",
  "💯", "✨", "⚡", "🌟", "🏆", "🥇", "📌", "📍", "📎", "📝",
  "📅", "⏰", "⏳", "📈", "📉", "📊", "💰", "🔒", "🔑", "🛠️",
  "🐛", "🧪", "🧠", "💬", "📣", "🔔", "🎨", "🌈", "☕", "🍕",
];

const ICONS = [
  "Star", "Heart", "Flag", "Bookmark", "Check", "X", "CircleAlert", "CircleQuestionMark",
  "Lightbulb", "Target", "Rocket", "Zap", "Flame", "Trophy", "ThumbsUp", "ThumbsDown",
  "Pin", "MapPin", "Lock", "Key", "Bell", "Clock", "Calendar", "MessageCircle",
  "Bug", "Code", "Database", "Cloud", "Users", "User", "Sparkles", "Smile",
];

// First grapheme of free-form input, so pasted emoji sequences (ZWJ, flags) stay intact.
const firstGrapheme = (value) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    const [first] = new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(trimmed);
    return first?.segment ?? "";
  }
  return Array.from(trimmed)[0];
};

const tileClass = (active) =>
  `flex aspect-square items-center justify-center rounded-md transition-colors ${
    active ? "bg-surface-active ring-1 ring-border-strong" : "hover:bg-surface-hover"
  }`;

export default function StickerSettings({ node, updateData }) {
  const data = node?.data || {};
  const isIcon = data.kind === "icon";
  const [custom, setCustom] = React.useState("");

  const pickEmoji = (emoji) => emoji && updateData({ kind: "emoji", emoji });
  const pickIcon = (icon) => icon && updateData({ kind: "icon", icon });

  return (
    <>
      <PopoverPlug icon={Smile} label="Emoji" width="w-72">
        <PlugSectionLabel>Emoji</PlugSectionLabel>
        <div className="nowheel grid max-h-56 grid-cols-8 gap-1 overflow-y-auto pr-1">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              aria-label={emoji}
              onClick={() => pickEmoji(emoji)}
              className={`${tileClass(!isIcon && data.emoji === emoji)} text-lg`}
            >
              {emoji}
            </button>
          ))}
        </div>
        <form
          className="mt-3 flex gap-2 border-t border-border pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            pickEmoji(firstGrapheme(custom));
            setCustom("");
          }}
        >
          <Input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Paste any emoji…"
            aria-label="Custom emoji"
            className="h-8 flex-1 bg-surface-card text-sm"
          />
          <button
            type="submit"
            disabled={!custom.trim()}
            className="h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-opacity disabled:opacity-50"
          >
            Use
          </button>
        </form>
      </PopoverPlug>

      <PopoverPlug icon={Shapes} label="Icon" width="w-72">
        <PlugSectionLabel>Icon</PlugSectionLabel>
        <div className="grid grid-cols-8 gap-1">
          {ICONS.map((name) => (
            <button
              key={name}
              type="button"
              title={name}
              aria-label={name}
              onClick={() => pickIcon(name)}
              className={`${tileClass(isIcon && data.icon === name)} text-muted-foreground hover:text-foreground`}
            >
              <LucideIcon name={name} className="h-4 w-4" />
            </button>
          ))}
        </div>
        <div className="mt-3 border-t border-border pt-3">
          <PlugSectionLabel>Search all icons</PlugSectionLabel>
          <IconPicker
            value={isIcon ? data.icon : ""}
            onValueChange={pickIcon}
            placeholder="Find an icon"
            className="h-9"
          />
        </div>
      </PopoverPlug>

      {isIcon && (
        <SwatchPlug
          label="Icon Color"
          value={data.color}
          fallback="var(--foreground)"
          onChange={(color) => updateData({ color })}
          onClear={() => updateData({ color: "" })}
        />
      )}
    </>
  );
}
