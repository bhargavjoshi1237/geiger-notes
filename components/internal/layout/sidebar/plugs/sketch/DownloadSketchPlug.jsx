"use client";

import React from "react";
import { SidebarButton } from "../../SidebarPrimitives";
import { Download } from "lucide-react";

export const DownloadSketchPlug = ({ onDownload }) => {
  return (
    <SidebarButton
      icon={Download}
      label="Download Sketch"
      onClick={onDownload}
      title="Download Sketch"
    />
  );
};
