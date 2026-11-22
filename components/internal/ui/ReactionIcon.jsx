"use client";

import React from "react";
import { icons } from "lucide-react";
import { reactionName } from "@/lib/canvas/reactions";

// The quick picks: a label, extra search words and a tint so each reaction reads at a glance.
// Any other Lucide icon can be used too (via search); those render in the text colour.
export const QUICK_REACTIONS = [
  { name: "ThumbsUp", label: "Like", tone: "text-sky-500 dark:text-sky-400", words: "yes agree approve good plus one" },
  { name: "Heart", label: "Love", tone: "text-rose-500 dark:text-rose-400", words: "favourite adore" },
  { name: "Laugh", label: "Haha", tone: "text-amber-500 dark:text-amber-400", words: "funny lol joke smile" },
  { name: "PartyPopper", label: "Celebrate", tone: "text-fuchsia-500 dark:text-fuchsia-400", words: "party tada congrats" },
  { name: "Flame", label: "Fire", tone: "text-orange-500 dark:text-orange-400", words: "hot lit great" },
  { name: "Sparkles", label: "Wow", tone: "text-yellow-500 dark:text-yellow-400", words: "amazing magic surprise" },
  { name: "Eye", label: "Looking", tone: "text-violet-500 dark:text-violet-400", words: "watching seen review" },
  { name: "CircleCheck", label: "Done", tone: "text-emerald-500 dark:text-emerald-400", words: "check complete approved ok" },
  { name: "CircleQuestionMark", label: "Question", tone: "text-sky-500 dark:text-sky-400", words: "help unsure confused" },
  { name: "Lightbulb", label: "Idea", tone: "text-yellow-500 dark:text-yellow-400", words: "insight thought" },
  { name: "Rocket", label: "Ship it", tone: "text-indigo-500 dark:text-indigo-400", words: "launch fast go" },
  { name: "HandHeart", label: "Thanks", tone: "text-pink-500 dark:text-pink-400", words: "praise appreciate kudos" },
  { name: "Hand", label: "Clap", tone: "text-teal-500 dark:text-teal-400", words: "applause wave hi high five" },
  { name: "Brain", label: "Thinking", tone: "text-pink-500 dark:text-pink-400", words: "hmm think smart" },
  { name: "Trophy", label: "Win", tone: "text-amber-500 dark:text-amber-400", words: "award best champion" },
  { name: "Star", label: "Star", tone: "text-yellow-500 dark:text-yellow-400", words: "favourite important" },
  { name: "Zap", label: "Quick", tone: "text-yellow-500 dark:text-yellow-400", words: "energy fast power" },
  { name: "Target", label: "On point", tone: "text-red-500 dark:text-red-400", words: "goal focus bullseye" },
  { name: "Coffee", label: "Break", tone: "text-amber-700 dark:text-amber-500", words: "tired pause later" },
  { name: "Frown", label: "Sad", tone: "text-blue-500 dark:text-blue-400", words: "unhappy sorry" },
  { name: "Angry", label: "Angry", tone: "text-red-500 dark:text-red-400", words: "mad upset" },
  { name: "ThumbsDown", label: "Dislike", tone: "text-slate-500 dark:text-slate-400", words: "no disagree bad minus" },
  { name: "TriangleAlert", label: "Careful", tone: "text-amber-500 dark:text-amber-400", words: "warning risk caution" },
  { name: "Bug", label: "Bug", tone: "text-lime-600 dark:text-lime-400", words: "issue broken error" },
];

const QUICK_BY_NAME = Object.fromEntries(QUICK_REACTIONS.map((r) => [r.name, r]));

// "PartyPopper" -> "party popper"
export const spacedName = (name) => name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();

export function reactionLabel(key) {
  const name = reactionName(key);
  const quick = QUICK_BY_NAME[name];
  if (quick) return quick.label;
  const spaced = spacedName(name);
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

// Renders a stored reaction (icon name or legacy emoji) as its Lucide icon.
export function ReactionIcon({ reaction, className = "h-4 w-4" }) {
  const name = reactionName(reaction);
  const Icon = icons[name];
  if (!Icon) return <span className="leading-none">{reaction}</span>;
  return <Icon className={`${QUICK_BY_NAME[name]?.tone ?? "text-foreground"} ${className}`} strokeWidth={1.9} aria-hidden />;
}
