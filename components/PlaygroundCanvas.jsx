"use client";

import React, { useCallback, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

const initialNodes = [
  {
    id: "1",
    type: "input",
    position: { x: 100, y: 100 },
    data: { label: "Welcome to Geiger Notes Playground" },
    style: {
      background: "var(--card)",
      border: "1px solid var(--border)",
      borderRadius: "8px",
      color: "var(--foreground)",
      padding: "10px 15px",
      fontSize: "14px",
    },
  },
  {
    id: "2",
    position: { x: 300, y: 200 },
    data: { label: "Click and drag nodes to move them" },
    style: {
      background: "var(--card)",
      border: "1px solid var(--border)",
      borderRadius: "8px",
      color: "var(--muted-foreground)",
      padding: "10px 15px",
      fontSize: "13px",
    },
  },
  {
    id: "3",
    position: { x: 150, y: 300 },
    data: { label: "Connect nodes by dragging from handle to handle" },
    style: {
      background: "var(--card)",
      border: "1px solid var(--border)",
      borderRadius: "8px",
      color: "var(--muted-foreground)",
      padding: "10px 15px",
      fontSize: "13px",
    },
  },
  {
    id: "4",
    position: { x: 400, y: 100 },
    data: { label: "Use the controls to zoom and pan" },
    style: {
      background: "var(--card)",
      border: "1px solid var(--border)",
      borderRadius: "8px",
      color: "var(--muted-foreground)",
      padding: "10px 15px",
      fontSize: "13px",
    },
  },
];

const initialEdges = [
  {
    id: "e1-2",
    source: "1",
    target: "2",
    animated: true,
    style: { stroke: "var(--muted-foreground)", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "var(--muted-foreground)" },
  },
  {
    id: "e1-3",
    source: "1",
    target: "3",
    animated: true,
    style: { stroke: "var(--muted-foreground)", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "var(--muted-foreground)" },
  },
  {
    id: "e2-4",
    source: "2",
    target: "4",
    animated: true,
    style: { stroke: "var(--muted-foreground)", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "var(--muted-foreground)" },
  },
];

export default function PlaygroundCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [rfInstance, setRfInstance] = useState(null);

  const onConnect = useCallback(
    (params) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: "var(--muted-foreground)", strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: "var(--muted-foreground)" },
          },
          eds
        )
      ),
    [setEdges]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const label = event.dataTransfer.getData("application/reactflow");

      const position = rfInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: `node-${Date.now()}`,
        position,
        data: { label: label || "New Node" },
        style: {
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          color: "var(--foreground)",
          padding: "10px 15px",
          fontSize: "14px",
        },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [rfInstance, setNodes]
  );

  return (
    <div className="h-[500px] rounded-xl border border-border bg-card overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={setRfInstance}
        onDragOver={onDragOver}
        onDrop={onDrop}
        fitView
        className="bg-background"
      >
        <Background color="var(--border)" gap={20} size={1} />
        <Controls className="bg-card border-border rounded-lg" />
        <MiniMap
          className="bg-card border-border rounded-lg"
          nodeColor="hsl(var(--border))"
          maskColor="rgba(0,0,0,0.8)"
        />
      </ReactFlow>
    </div>
  );
}
