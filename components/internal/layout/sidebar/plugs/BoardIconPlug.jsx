"use client";

import React from "react";
import { SidebarButton } from "../SidebarPrimitives";
import { Palette } from "lucide-react";

export const BoardIconPlug = ({ onEdit }) => {
  return (
    <SidebarButton
      icon={Palette}
      label="Icon & Accent"
      onClick={onEdit}
      title="Change Icon & Accents"
    />
  );
};
