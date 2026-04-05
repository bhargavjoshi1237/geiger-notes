"use client";

import React, { useEffect, useState } from "react";
import { MainSidebar } from "./sidebar/MainSidebar";
import EdgeSettingsSidebar from "./sidebar/EdgeSettingsSidebar";
import NodeSettingsSidebar from "./sidebar/NodeSettingsSidebar";
import ImageSettingsSidebar from "@/components/internal/layout/sidebar/ImageSettingsSidebar";
import FileSettingsSidebar from "@/components/internal/layout/sidebar/FileSettingsSidebar";
import CalendarSettingsSidebar from "@/components/internal/layout/sidebar/CalendarSettingsSidebar";

export default function Sidebar({
  debugBgLayers = false,
  selectedEdge,
  onUpdateEdge,
  onDeselect,
  selectedNode,
  onUpdateNode,
  onDeselectNode,
}) {
  const [cachedSelectedEdge, setCachedSelectedEdge] = useState(selectedEdge);
  const [cachedSelectedNode, setCachedSelectedNode] = useState(selectedNode);

  useEffect(() => {
    if (selectedEdge) {
      setCachedSelectedEdge(selectedEdge);
    }
  }, [selectedEdge]);

  useEffect(() => {
    if (selectedNode) {
      setCachedSelectedNode(selectedNode);
    }
  }, [selectedNode]);

  let activePanel = "main";
  if (selectedEdge) activePanel = "edge";
  else if (selectedNode?.type === "image") activePanel = "image";
  else if (selectedNode?.type === "file") activePanel = "file";
  else if (selectedNode?.type === "calendar") activePanel = "calendar";
  else if (selectedNode) activePanel = "node";

  const shellBgClass = debugBgLayers
    ? "bg-fuchsia-600/70 border-fuchsia-300/60"
    : "bg-[#161616]/50 border-[#2a2a2a]/50";
  const panelBgClass = debugBgLayers ? "bg-cyan-500/35" : "bg-transparent";
  const shellBlurClass = debugBgLayers ? "" : "backdrop-blur-md";

  const edgeToRender = selectedEdge || cachedSelectedEdge;
  const nodeToRender = selectedNode || cachedSelectedNode;

  return (
    <div
      className={`h-full w-16 ${shellBgClass} ${shellBlurClass} flex flex-col items-center shrink-0 z-50 border-r relative overflow-hidden`}
    >
      <div
        className={`absolute inset-0 flex flex-col py-4 w-full h-full transition-transform duration-300 ease-in-out ${panelBgClass} ${
          activePanel === "main" ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <MainSidebar />
      </div>
      <div
        className={`absolute inset-0 flex flex-col py-4 w-full h-full transition-transform duration-300 ease-in-out ${panelBgClass} ${
          activePanel === "edge" ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {edgeToRender && (
          <EdgeSettingsSidebar
            selectedEdge={edgeToRender}
            onUpdateEdge={onUpdateEdge}
            onBack={onDeselect}
          />
        )}
      </div>
      <div
        className={`absolute inset-0 flex flex-col py-4 w-full h-full transition-transform duration-300 ease-in-out ${panelBgClass} ${
          activePanel === "node" ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {nodeToRender && (
          <NodeSettingsSidebar
            selectedNode={nodeToRender}
            onUpdateNode={onUpdateNode}
            onBack={onDeselectNode}
          />
        )}
      </div>
      <div
        className={`absolute inset-0 flex flex-col py-4 w-full h-full transition-transform duration-300 ease-in-out ${panelBgClass} ${
          activePanel === "image" ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {nodeToRender && (
          <ImageSettingsSidebar
            selectedNode={nodeToRender}
            onUpdateNode={onUpdateNode}
            onBack={onDeselectNode}
          />
        )}
      </div>
      <div
        className={`absolute inset-0 flex flex-col py-4 w-full h-full transition-transform duration-300 ease-in-out ${panelBgClass} ${
          activePanel === "file" ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {nodeToRender && (
          <FileSettingsSidebar
            selectedNode={nodeToRender}
            onUpdateNode={onUpdateNode}
            onBack={onDeselectNode}
          />
        )}
      </div>
      <div
        className={`absolute inset-0 flex flex-col py-4 w-full h-full transition-transform duration-300 ease-in-out ${panelBgClass} ${
          activePanel === "calendar" ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {nodeToRender && (
          <CalendarSettingsSidebar
            selectedNode={nodeToRender}
            onUpdateNode={onUpdateNode}
            onBack={onDeselectNode}
          />
        )}
      </div>
    </div>
  );
}
