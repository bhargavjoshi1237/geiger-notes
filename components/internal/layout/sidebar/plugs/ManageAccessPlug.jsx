"use client";

import React from "react";
import { SidebarButton } from "../SidebarPrimitives";
import { ShieldCheck } from "lucide-react";

export const ManageAccessPlug = ({ onManage }) => {
  return (
    <SidebarButton
      icon={ShieldCheck}
      label="Manage Access"
      onClick={onManage}
      title="Manage Access"
    />
  );
};
