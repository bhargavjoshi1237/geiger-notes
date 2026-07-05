"use client";

import React, { useMemo } from "react";
import {
  ReactFlow,
  Background,
  SelectionMode,
  MiniMap,
  addEdge,
  MarkerType,
} from "@xyflow/react";
import { useUserSettings } from "@/lib/settings/useUserSettings";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import Sidebar from "@/components/internal/layout/Sidebar";
import Topbar from "@/components/internal/layout/Topbar";
import CustomNode from "@/components/internal/nodes/CustomNode";
import CenterEdge from "@/components/internal/edges/CenterEdge";
import { useHomeLogic } from "@/lib/wrapers/homepage/HomePage";
import CanvasSkeleton from "@/components/internal/canvas/CanvasSkeleton";
import CommentNode from "@/components/internal/nodes/CommentNode";
import LinkNode from "@/components/internal/nodes/LinkNode";
import BoardNode from "@/components/internal/nodes/BoardNode";
import DocumentNode from "@/components/internal/nodes/DocumentNode";
import ImageNode from "@/components/internal/nodes/ImageNode";
import FileNode from "@/components/internal/nodes/FileNode";
import ClockNode from "@/components/internal/nodes/clock/ClockNode";
import CalendarNode from "@/components/internal/nodes/calendar/CalendarNode";
import CheckboxNode from "@/components/internal/nodes/CheckboxNode";
import TableNode from "@/components/internal/nodes/TableNode";
import BoardKeyDialog from "@/components/internal/layout/sidebar/dialogs/BoardKeyDialog";
import { checkBoardEntry } from "@/lib/supabase/board-access";
import "@xyflow/react/dist/style.css";

export default function BoardCanvas({
  id,
  boardId,
  projectId,
  onNavigate,
  breadcrumbs,
  onBreadcrumbClick,
}) {
  const { theme } = useTheme();

  // Advisory access for the currently open board. Starts editable and tightens
  // once resolved; personal boards and the project home board stay editable.
  const [canEdit, setCanEdit] = React.useState(true);
  React.useEffect(() => {
    let active = true;
    if (projectId && boardId) {
      checkBoardEntry(boardId, projectId).then((res) => {
        if (active) setCanEdit(res.canEdit);
      });
    } else {
      setCanEdit(true);
    }
    return () => {
      active = false;
    };
  }, [projectId, boardId]);

  const {
    nodes,
    edges,
    viewport,
    onNodesChange,
    onEdgesChange,
    onNodeDragStop,
    onMove,
    isInitialized,
    isLoading,
    isSyncing,
    panOnDrag,
    selectionOnDrag,
    panOnScroll,
    zoomOnScroll,
    setEdges,
    setNodes,
  } = useHomeLogic(id, boardId, projectId, canEdit);

  const {
    settings,
    setSetting: handleSettingsChange,
    save: saveSettings,
    discard: discardSettings,
    reset: resetSettings,
    isDirty: settingsDirty,
    isSaving: settingsSaving,
  } = useUserSettings();

  const onConnect = React.useCallback(
    (connection) => {
      const d = settings.defaultEdge || {};
      const stroke = d.stroke || "#71717a";
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            type: "center",
            animated: !!d.animated,
            style: {
              stroke,
              strokeWidth: d.strokeWidth || 2,
              strokeDasharray: d.dashed ? "6 6" : undefined,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
              color: stroke,
            },
          },
          eds
        )
      );
    },
    [settings.defaultEdge, setEdges]
  );

  const [rfInstance, setRfInstance] = React.useState(null);
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const lastPaneClick = React.useRef(0);
  const toggleSidebar = React.useCallback(() => setSidebarOpen((v) => !v), []);

  const onDragOver = React.useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = React.useCallback(
    async (event) => {
      event.preventDefault();
      if (!canEdit) return;
      const type = event.dataTransfer.getData("application/reactflow");
      if (typeof type === "undefined" || !type) {
        return;
      }

      const position = rfInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      if (type === "board") {
        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/api/create-board`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: "Untitled Board",
                ...(projectId ? { projectId } : {}),
              }),
            },
          );

          if (!response.ok) throw new Error("Failed to create board");

          const boardData = await response.json();

          const newNode = {
            id: `node-${Date.now()}`,
            type: "board",
            position,
            data: {
              label: boardData.name,
              boardId: boardData.id,
              name: boardData.name,
            },
            style: { width: 240, height: 68 },
          };
          setNodes((nds) => nds.concat(newNode));
        } catch (err) {
          console.error(err);
          toast.error("Failed to create board");
        }
        return;
      }

      if (type === "document") {
        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/api/documents`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({}),
            },
          );

          if (!response.ok) throw new Error("Failed to create document");
          const docData = await response.json();

          const newNode = {
            id: `node-${Date.now()}`,
            type: "document",
            position,
            data: { label: "Untitled Document", documentId: docData.id },
            style: { width: 240, height: 68 },
          };
          setNodes((nds) => nds.concat(newNode));
        } catch (err) {
          console.error(err);
          toast.error("Failed to create document");
        }
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

      if (type === "clock") {
        const newNode = {
          id: `node-${Date.now()}`,
          type: "clock",
          position,
          data: {
            label: "Clock",
            clockType: "analog",
            backgroundColor: "#232323",
          },
          style: { width: 156, height: 156 },
        };
        setNodes((nds) => nds.concat(newNode));
        return;
      }

      if (type === "todo") {
        const newNode = {
          id: `node-${Date.now()}`,
          type: "todo",
          position,
          data: {
            title: "To-do",
            items: [{ id: `todo-${Date.now()}`, text: "", checked: false }],
          },
        };
        setNodes((nds) => nds.concat(newNode));
        return;
      }

      if (type === "table") {
        const newNode = {
          id: `node-${Date.now()}`,
          type: "table",
          position,
          data: {
            columns: ["Column 1", "Column 2"],
            rows: [
              ["", ""],
              ["", ""],
            ],
          },
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
    [rfInstance, setNodes, projectId, canEdit],
  );

  const onPaneClick = React.useCallback(
    (event) => {
      if (!canEdit) return;
      if (!settings.doubleClickToInsert) return;

      const currentTime = Date.now();
      if (currentTime - lastPaneClick.current < 300) {
        if (rfInstance) {
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
      }
      lastPaneClick.current = currentTime;
    },
    [settings.doubleClickToInsert, rfInstance, setNodes, canEdit],
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
      clock: ClockNode,
      calendar: CalendarNode,
      todo: CheckboxNode,
      table: TableNode,
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
    const check = () => setIsMobile(window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const hasAnimated = React.useRef(false);

  React.useEffect(() => {
    if (isInitialized && rfInstance && !hasAnimated.current && viewport) {
      rfInstance.setViewport(viewport, { duration: 1600 });
      hasAnimated.current = true;
    }
  }, [isInitialized, rfInstance, viewport]);

  const handleMerge = React.useCallback(
    (newNodes, newEdges) => {
      setNodes(newNodes);
      setEdges(newEdges);
    },
    [setNodes, setEdges],
  );

  // Pending keyed board awaiting its access key before navigation.
  const [keyPrompt, setKeyPrompt] = React.useState(null);

  const onNodeDoubleClick = React.useCallback(
    async (event, node) => {
      if (node.type !== "board") return;

      const targetId = node.data.boardId;
      const name = node.data.name;

      // Personal boards (no project) are unchanged; project boards are gated.
      if (!projectId) {
        onNavigate(targetId, name);
        return;
      }

      const res = await checkBoardEntry(targetId, projectId);
      if (!res.canEnter) {
        toast.error("You don't have access to this board.");
        return;
      }
      if (res.needsKey) {
        setKeyPrompt({ boardId: targetId, name, key: res.key });
        return;
      }
      onNavigate(targetId, name);
    },
    [onNavigate, projectId],
  );

  const handleKeySubmit = React.useCallback(
    (value) => {
      if (!keyPrompt) return;
      if (value === keyPrompt.key) {
        const { boardId: bid, name } = keyPrompt;
        setKeyPrompt(null);
        onNavigate(bid, name);
      } else {
        toast.error("Incorrect access key.");
      }
    },
    [keyPrompt, onNavigate],
  );

  const colorMode = theme === "light" ? "light" : "dark";

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background text-foreground">
      <div
        className={`absolute inset-0 z-10 bg-background transition-opacity duration-700 pointer-events-none ${
          !isInitialized || isLoading ? "opacity-100" : "opacity-0"
        }`}
      >
        <CanvasSkeleton />
      </div>

      <div
        className={`absolute inset-0 transition-opacity duration-1000 ${
          !isInitialized || isLoading ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
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
          colorMode={colorMode}
          defaultViewport={viewport}
          className="bg-background touch-none"
          proOptions={{ hideAttribution: true }}
          minZoom={0.1}
          maxZoom={2}
          nodesDraggable={canEdit}
          nodesConnectable={canEdit}
          deleteKeyCode={canEdit ? ["Backspace", "Delete"] : null}
          panOnDrag={isMobile ? true : panOnDrag}
          selectionOnDrag={isMobile ? false : selectionOnDrag}
          panOnScroll={panOnScroll}
          zoomOnScroll={zoomOnScroll}
          zoomOnDoubleClick={false}
          selectionMode={SelectionMode.Partial}
          snapToGrid={!!settings.snapToGrid}
          snapGrid={[15, 15]}
        >
          <Background color="var(--canvas-dots)" gap={12} size={1} variant="dots" />
          {settings.showMinimap && (
            <MiniMap
              pannable
              zoomable
              className="!bg-surface-dialog !border !border-border rounded-md"
              nodeColor="var(--minimap-node)"
              nodeStrokeColor="var(--minimap-stroke)"
              maskColor={theme === "light" ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)"}
            />
          )}
        </ReactFlow>
      </div>

      <div className="absolute top-0 left-0 right-0 z-40">
        <Topbar
          id={id}
          settings={settings}
          onSettingsChange={handleSettingsChange}
          onSettingsSave={saveSettings}
          onSettingsDiscard={discardSettings}
          onSettingsReset={resetSettings}
          settingsDirty={settingsDirty}
          settingsSaving={settingsSaving}
          nodes={nodes}
          edges={edges}
          onMerge={handleMerge}
          breadcrumbs={breadcrumbs}
          onBreadcrumbClick={onBreadcrumbClick}
          isSyncing={isSyncing}
          onToggleSidebar={toggleSidebar}
        />
      </div>

      <div className={`absolute top-14 bottom-0 left-0 z-40 transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <Sidebar
          selectedEdge={selectedEdge}
          onUpdateEdge={updateEdge}
          onDeselect={deselectEdges}
          selectedNode={selectedNode}
          onUpdateNode={updateNode}
          onDeselectNode={deselectNodes}
          enabledTools={settings.toolbarTools}
          projectId={projectId}
        />
      </div>

      <div className={`absolute bottom-4 z-50 transition-all duration-300 ${sidebarOpen ? "left-20" : "left-4"}`}>
        <div className="flex flex-col bg-zoom-bg backdrop-blur-md rounded-lg shadow-xl border border-border/50 overflow-hidden">
          <button
            onClick={() => rfInstance?.zoomIn({ duration: 300 })}
            className="p-2 hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-colors border-b border-border/50"
            title="Zoom In"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
          <button
            onClick={() => rfInstance?.zoomOut({ duration: 300 })}
            className="p-2 hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-colors"
            title="Zoom Out"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>

      <BoardKeyDialog
        key={keyPrompt?.boardId || "none"}
        open={!!keyPrompt}
        onOpenChange={(o) => {
          if (!o) setKeyPrompt(null);
        }}
        boardName={keyPrompt?.name}
        onSubmit={handleKeySubmit}
      />
    </div>
  );
}
