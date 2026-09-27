"use client";

import React from "react";
import { SidebarButton } from "../../SidebarPrimitives";
import { PenLine } from "lucide-react";

export const EditSketchDetailsPlug = ({ currentName, onEdit }) => {
  return (
    <SidebarButton
      icon={PenLine}
      label="Edit Details"
      onClick={onEdit}
      title={`Edit Sketch: ${currentName || "Untitled Sketch"}`}
    />
  );
};
