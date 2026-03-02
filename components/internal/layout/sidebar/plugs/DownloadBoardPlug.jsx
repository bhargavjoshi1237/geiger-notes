"use client";

import React from "react";
import { SidebarButton } from "../SidebarPrimitives";
import { Download } from "lucide-react";

export const DownloadBoardPlug = ({ onDownload }) => {
  return (
    <SidebarButton
      icon={Download}
      label="Download Board"
      onClick={onDownload}
      title="Download Board Data"
    />
  );
};
