"use client";

import React from "react";
import {
  SmilePlus,
  ThumbsUp,
  Heart,
  Laugh,
  ScanEye,
  Frown,
  Angry,
  PartyPopper,
  Flame,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SidebarButton } from "../SidebarPrimitives";

const defaultReactions = [
  { icon: ThumbsUp, label: "Like"},
  { icon: Heart, label: "Love"},
  { icon: Laugh, label: "Laugh"},
  { icon: ScanEye, label: "Wow"},
  { icon: Frown, label: "Sad"},
  { icon: Angry, label: "Angry"},
  { icon: PartyPopper, label: "Celebrate"},
  { icon: Flame, label: "Fire"},
];

export const ReactionPlug = ({ onReaction, emojis, reactions }) => {
  const items = reactions || defaultReactions;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <SidebarButton icon={SmilePlus} label="Add reaction" />
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-1.5 bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 shadow-2xl rounded-2xl"
        side="right"
        align="start"
        sideOffset={12}
      >
        <div className="flex flex-wrap gap-0.5 p-0.5 max-w-[180px]">
          {items.map(({ icon: Icon, label, color }) => (
            <button
              key={label}
              title={label}
              className="
                group relative p-2 rounded-xl
                transition-all duration-150
                hover:bg-zinc-800/80
                active:scale-90 flex items-center justify-center
              "
              onClick={() => onReaction(label)}
            >
              <Icon
                className={`w-[18px] h-[18px] ${color} transition-transform duration-150 group-hover:scale-110`}
                strokeWidth={1.8}
              />
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
