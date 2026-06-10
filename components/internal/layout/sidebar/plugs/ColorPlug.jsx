"use client";

import React from "react";
import { SidebarButton } from "../SidebarPrimitives";
import ColorPicker from "../../../edges/ColorePicker";

export const ColorPlug = ({
  value,
  onChange,
  label = "Color",
  side = "right",
  align = "start",
}) => (
  <ColorPicker value={value} onChange={onChange} side={side} align={align}>
    <div>
      <SidebarButton
        label={label}
        icon={() => (
          <div
            className="w-5 h-5 rounded border border-ring shadow-sm"
            style={{ backgroundColor: value || "#333333" }}
          />
        )}
      />
    </div>
  </ColorPicker>
);
