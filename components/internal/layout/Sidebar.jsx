"use client";

import React, { useEffect, useState } from "react";
import { MainSidebar } from "./sidebar/MainSidebar";
import EdgeSettingsSidebar from "./sidebar/EdgeSettingsSidebar";
import NodeSettingsSidebar from "./sidebar/NodeSettingsSidebar";
import ImageSettingsSidebar from "@/components/internal/layout/sidebar/ImageSettingsSidebar";
import FileSettingsSidebar from "@/components/internal/layout/sidebar/FileSettingsSidebar";

export default function Sidebar({
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
  else if (selectedNode) activePanel = "node";

  const edgeToRender = selectedEdge || cachedSelectedEdge;
  const nodeToRender = selectedNode || cachedSelectedNode;

  return (
    <div className="h-full w-16 bg-[#1e1e1e] flex flex-col items-center shrink-0 z-50 border-r border-zinc-800 relative overflow-hidden">
      <div
        className={`absolute inset-0 flex flex-col py-4 w-full h-full transition-transform duration-300 ease-in-out bg-[#1e1e1e] ${
          activePanel === "main" ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <MainSidebar />
      </div>
      <div
        className={`absolute inset-0 flex flex-col py-4 w-full h-full transition-transform duration-300 ease-in-out bg-[#1e1e1e] ${
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
        className={`absolute inset-0 flex flex-col py-4 w-full h-full transition-transform duration-300 ease-in-out bg-[#1e1e1e] ${
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
        className={`absolute inset-0 flex flex-col py-4 w-full h-full transition-transform duration-300 ease-in-out bg-[#1e1e1e] ${
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
        className={`absolute inset-0 flex flex-col py-4 w-full h-full transition-transform duration-300 ease-in-out bg-[#1e1e1e] ${
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
    </div>
  );
}
