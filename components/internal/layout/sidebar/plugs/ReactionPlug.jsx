"use client";

import React from "react";
import { SmilePlus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@geiger/ui";
import ReactionPicker from "@/components/internal/ui/ReactionPicker";
import { RAIL_POPOVER, SidebarButton } from "../SidebarPrimitives";

// Rail button that opens the searchable Lucide reaction picker; `onReaction` gets the icon name.
export const ReactionPlug = ({ onReaction }) => (
  <Popover>
    <PopoverTrigger asChild>
      <SidebarButton icon={SmilePlus} label="Add reaction" title="Add reaction" aria-label="Add reaction" />
    </PopoverTrigger>
    <PopoverContent {...RAIL_POPOVER} className="w-auto bg-surface-dialog border-border p-3 shadow-xl rounded-xl">
      <ReactionPicker onPick={onReaction} />
    </PopoverContent>
  </Popover>
);
