"use client";

import React from "react";
import { RAIL_POPOVER, SidebarButton } from "../SidebarPrimitives";
import ColorPicker from "../../../edges/ColorePicker";

export const ColorPlug = ({ value, onChange, label = "Color" }) => (
  <ColorPicker value={value} onChange={onChange} {...RAIL_POPOVER}>
    <div>
      <SidebarButton
        label={label}
        icon={() => (
          <div
            className="w-5 h-5 rounded border border-ring shadow-sm"
            style={{ backgroundColor: value || "var(--node-default)" }}
          />
        )}
      />
    </div>
  </ColorPicker>
);
