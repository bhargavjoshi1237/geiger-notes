"use client";

import React from "react";
import { SidebarButton } from "../../SidebarPrimitives";
import { Settings2 } from "lucide-react";

export const CalendarMonthPlug = ({ onEdit }) => (
  <SidebarButton
    label="Calendar Settings"
    icon={Settings2}
    onClick={onEdit}
  />
);
