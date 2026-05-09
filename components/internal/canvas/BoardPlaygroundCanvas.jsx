"use client";

import React, { useMemo } from "react";
import { ReactFlow, Background, SelectionMode } from "@xyflow/react";
import { toast } from "sonner";
import Sidebar from "@/components/internal/layout/Sidebar";
import Topbar from "@/components/internal/layout/Topbar";
import CustomNode from "@/components/internal/nodes/CustomNode";
import CenterEdge from "@/components/internal/edges/CenterEdge";
import CommentNode from "@/components/internal/nodes/CommentNode";
import LinkNode from "@/components/internal/nodes/LinkNode";
import BoardNode from "@/components/internal/nodes/BoardNode";
import DocumentNode from "@/components/internal/nodes/DocumentNode";
import ImageNode from "@/components/internal/nodes/ImageNode";
import FileNode from "@/components/internal/nodes/FileNode";
import CalendarNode from "@/components/internal/nodes/calendar/CalendarNode";
import { useLandingPlaygroundLogic } from "@/lib/hooks/useLandingPlaygroundLogic";
import "@xyflow/react/dist/style.css";

export default function BoardPlaygroundCanvas({ className = "" }) {
  const {
    nodes,
    edges,
    viewport,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodeDragStop,
    onMove,
    panOnDrag,
    selectionOnDrag,
    panOnScroll,
    zoomOnScroll,
    setEdges,
    setNodes,
  } = useLandingPlaygroundLogic();

  const [settings, setSettings] = React.useState({
    doubleClickToInsert: false,
  });
  const [rfInstance, setRfInstance] = React.useState(null);
  const [dialogContainer, setDialogContainer] = React.useState(null);
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const lastPaneClick = React.useRef(0);

  const handleSettingsChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const toggleSidebar = React.useCallback(() => setSidebarOpen((v) => !v), []);

  const onDragOver = React.useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = React.useCallback(
    (event) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow");
      if (!type || !rfInstance) {
        return;
      }

      const position = rfInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      if (type === "board") {
        const boardId = `playground-board-${Date.now()}`;
        const newNode = {
          id: `node-${Date.now()}`,
          type: "board",
          position,
          data: {
            label: "Untitled Board",
            boardId,
            name: "Untitled Board",
          },
          style: { width: 240, height: 68 },
        };
        setNodes((nds) => nds.concat(newNode));
        return;
      }

      if (type === "document") {
        const newNode = {
          id: `node-${Date.now()}`,
          type: "document",
          position,
          data: {
            label: "Untitled Document",
            documentId: null,
          },
          style: { width: 240, height: 68 },
        };
        setNodes((nds) => nds.concat(newNode));
        return;
      }

      if (type === "image") {
        const newNode = {
          id: `node-${Date.now()}`,
          type: "image",
          position,
          data: {
            label: "Image",
            src: "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?q=80&w=1000&auto=format&fit=crop",
            alt: "Placeholder Image",
          },
          style: { width: 200, height: 250 },
        };
        setNodes((nds) => nds.concat(newNode));
        return;
      }

      if (type === "file") {
        const newNode = {
          id: `node-${Date.now()}`,
          type: "file",
          position,
          data: {
            label: "File",
            fileName: "No file selected",
            fileSize: 0,
            fileType: "",
            src: null,
          },
          style: { width: 200, height: 80 },
        };
        setNodes((nds) => nds.concat(newNode));
        return;
      }

      if (type === "calendar") {
        const newNode = {
          id: `node-${Date.now()}`,
          type: "calendar",
          position,
          data: {
            calendarTheme: "light",
            calendarStyle: "default",
            backgroundColor: "#2a2a2a",
          },
          style: { width: 200, height: 200 },
        };
        setNodes((nds) => nds.concat(newNode));
        return;
      }

      const newNode = {
        id: `node-${Date.now()}`,
        type,
        position,
        data: { label: "" },
        style: { width: 338, height: 68 },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [rfInstance, setNodes],
  );

  const onPaneClick = React.useCallback(
    (event) => {
      if (!settings.doubleClickToInsert || !rfInstance) return;

      const currentTime = Date.now();
      if (currentTime - lastPaneClick.current < 300) {
        const position = rfInstance.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        const newNode = {
          id: `node-${Date.now()}`,
          type: "custom",
          position,
          data: { label: "" },
          style: { width: 336, height: 68 },
        };

        setNodes((nds) => [...nds, newNode]);
      }

      lastPaneClick.current = currentTime;
    },
    [settings.doubleClickToInsert, rfInstance, setNodes],
  );

  const selectedEdge = useMemo(() => edges.find((e) => e.selected), [edges]);
  const selectedNode = useMemo(() => nodes.find((n) => n.selected), [nodes]);

  const updateEdge = React.useCallback(
    (edgeId, updates) => {
      setEdges((eds) =>
        eds.map((e) => (e.id === edgeId ? { ...e, ...updates } : e)),
      );
    },
    [setEdges],
  );

  const updateNode = React.useCallback(
    (nodeId, updates) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, ...updates } : n)),
      );
    },
    [setNodes],
  );

  const deselectEdges = React.useCallback(() => {
    setEdges((eds) => eds.map((e) => ({ ...e, selected: false })));
  }, [setEdges]);

  const deselectNodes = React.useCallback(() => {
    setNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
  }, [setNodes]);

  const nodeTypes = useMemo(
    () => ({
      custom: CustomNode,
      comment: CommentNode,
      link: LinkNode,
      board: BoardNode,
      document: DocumentNode,
      image: ImageNode,
      file: FileNode,
      calendar: CalendarNode,
    }),
    [],
  );

  const edgeTypes = useMemo(
    () => ({
      center: CenterEdge,
    }),
    [],
  );

  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const check = () =>
      setIsMobile(
        window.matchMedia("(pointer: coarse)").matches ||
          window.innerWidth < 768,
      );

    check();
    window.addEventListener("resize", check);

    return () => window.removeEventListener("resize", check);
  }, []);

  React.useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  const handleMerge = React.useCallback(
    (newNodes, newEdges) => {
      setNodes(newNodes);
      setEdges(newEdges);
    },
    [setNodes, setEdges],
  );

  const onNodeDoubleClick = React.useCallback((_, node) => {
    if (node.type === "board") {
      toast("Nested board navigation is disabled in landing playground mode.");
    }
  }, []);

  return (
    <div
      ref={setDialogContainer}
      className={`relative h-full w-full overflow-hidden bg-[#161616] text-white ${className}`}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onMove={onMove}
        onInit={setRfInstance}
        onPaneClick={onPaneClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onNodeDoubleClick={onNodeDoubleClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        colorMode="dark"
        defaultViewport={viewport}
        fitView
        fitViewOptions={{ padding: 0.18, minZoom: 0.55, maxZoom: 0.85 }}
        className="bg-[#161616] touch-none"
        proOptions={{ hideAttribution: true }}
        minZoom={0.1}
        maxZoom={2}
        deleteKeyCode={["Backspace", "Delete"]}
        panOnDrag={isMobile ? true : panOnDrag}
        selectionOnDrag={isMobile ? false : selectionOnDrag}
        panOnScroll={panOnScroll}
        zoomOnScroll={zoomOnScroll}
        zoomOnDoubleClick={false}
        selectionMode={SelectionMode.Partial}
      >
        <Background color="#373737" gap={12} size={1} variant="dots" />
      </ReactFlow>

      <div className="absolute top-0 left-0 right-0 z-40">
        <Topbar
          id="landing-playground"
          settings={settings}
          onSettingsChange={handleSettingsChange}
          nodes={nodes}
          edges={edges}
          onMerge={handleMerge}
          breadcrumbs={[]}
          onBreadcrumbClick={() => {}}
          isSyncing={false}
          onToggleSidebar={toggleSidebar}
          dialogContainer={dialogContainer}
        />
      </div>

      <div
        className={`absolute top-14 bottom-0 left-0 z-40 transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <Sidebar
          selectedEdge={selectedEdge}
          onUpdateEdge={updateEdge}
          onDeselect={deselectEdges}
          selectedNode={selectedNode}
          onUpdateNode={updateNode}
          onDeselectNode={deselectNodes}
        />
      </div>

      <div
        className={`absolute bottom-4 z-50 transition-all duration-300 ${sidebarOpen ? "left-20" : "left-4"}`}
      >
        <div className="flex flex-col bg-[#333333]/60 backdrop-blur-md rounded-lg shadow-xl border border-zinc-700/50 overflow-hidden">
          <button
            onClick={() => rfInstance?.zoomIn({ duration: 300 })}
            className="p-2 hover:bg-zinc-700/60 text-zinc-400 hover:text-white transition-colors border-b border-zinc-700/50"
            title="Zoom In"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
          <button
            onClick={() => rfInstance?.zoomOut({ duration: 300 })}
            className="p-2 hover:bg-zinc-700/60 text-zinc-400 hover:text-white transition-colors"
            title="Zoom Out"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
