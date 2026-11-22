"use client";

import React from "react";
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react";
import { SidebarButton } from "../SidebarPrimitives";
import { CycleButton } from "@/components/internal/ui/CycleButton";

const ALIGNMENTS = [
  { value: "left", label: "Left", icon: AlignLeft },
  { value: "center", label: "Centre", icon: AlignCenter },
  { value: "right", label: "Right", icon: AlignRight },
];

export const TextFormattingPlug = ({ data, onChange }) => {
  const bold = data.bold || false;
  const italic = data.italic || false;
  const underline = data.underline || false;

  return (
    <>
      <SidebarButton
        icon={Bold}
        label="Bold"
        active={bold}
        onClick={() => onChange({ bold: !bold })}
      />
      <SidebarButton
        icon={Italic}
        label="Italic"
        active={italic}
        onClick={() => onChange({ italic: !italic })}
      />
      <SidebarButton
        icon={Underline}
        label="Underline"
        active={underline}
        onClick={() => onChange({ underline: !underline })}
      />
      <CycleButton
        label="Alignment"
        options={ALIGNMENTS}
        value={data.textAlign || "left"}
        onChange={(textAlign) => onChange({ textAlign })}
      />
    </>
  );
};
