"use client";

import React, { useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  SelectionMode,
  MiniMap,
  addEdge,
  ConnectionLineType,
} from "@xyflow/react";
import { useUserSettings } from "@/lib/settings/useUserSettings";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import Sidebar from "@/components/internal/layout/Sidebar";
import Topbar from "@/components/internal/layout/Topbar";
import CenterEdge from "@/components/internal/edges/CenterEdge";
import { useHomeLogic } from "@/lib/wrapers/homepage/HomePage";
import CanvasSkeleton from "@/components/internal/canvas/CanvasSkeleton";
import { SketchPreviewProvider } from "@/components/internal/sketch/preview-context";
import { absorbDraggedNode, dropIntoColumnAtPoint } from "@/components/internal/nodes/ColumnNode";
import { NODE_TYPES, createLocalNode, newNodeId } from "@/components/internal/nodes/registry";
import BoardKeyDialog from "@/components/internal/layout/sidebar/dialogs/BoardKeyDialog";
import CanvasBackdrop from "@/components/internal/canvas/appearance/CanvasBackdrop";
import { checkBoardEntry } from "@/lib/supabase/board-access";
import { connectionLineStyleFor, newEdgeProps } from "@/lib/canvas/edge-style";
import { hasBackdrop, resolvePattern } from "@/lib/canvas/appearance";
import { useBoardAppearance } from "@/lib/canvas/useBoardAppearance";
import { stackIndex } from "@/lib/canvas/node-appearance";
import "@xyflow/react/dist/style.css";

const EDGE_TYPES = { center: CenterEdge };

export default function BoardCanvas({
  id,
  boardId,
  projectId,
  onNavigate,
  breadcrumbs,
  onBreadcrumbClick,
  onBoardNameResolved,
}) {
  const { resolvedTheme } = useTheme();

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
    onMove,
    isInitialized,
    isLoading,
    isSyncing,
    boardName,
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
    (connection) => setEdges((eds) => addEdge({ ...connection, ...newEdgeProps(settings.defaultEdge) }, eds)),
    [settings.defaultEdge, setEdges],
  );

  const gridSize = settings.gridSize || 15;
  const scrollZooms = settings.scrollMode === "zoom";

  const [rfInstance, setRfInstance] = React.useState(null);
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const lastPaneClick = React.useRef(0);
  const toggleSidebar = React.useCallback(() => setSidebarOpen((v) => !v), []);

  const handMode = settings.dragMode === "pan";

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Report the resolved board name up so a cold ?board=<id> load can show a
  // single-level breadcrumb without a second fetch.
  React.useEffect(() => {
    if (boardId && boardName) onBoardNameResolved?.(boardId, boardName);
  }, [boardId, boardName, onBoardNameResolved]);

  // Keep the rest of the query string (notably ?board=) so closing the editor
  // returns to the board the sketch was opened from.
  const openSketch = React.useCallback(
    (sketchId) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("sketch", sketchId);
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

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

      // Drops landing on a column become column items instead of loose nodes.
      const absorbedDrop = dropIntoColumnAtPoint(rfInstance.getNodes(), position, type);
      if (absorbedDrop) {
        setNodes(absorbedDrop);
        return;
      }

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
            id: newNodeId(),
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
            id: newNodeId(),
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

      if (type === "sketch") {
        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/api/sketches`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: "Untitled Sketch",
                ...(projectId ? { projectId } : {}),
                // Records the host board so a push lands on the right canvas;
                // a null parentBoardId means the root/home canvas.
                metadata: {
                  parentBoardId: boardId ?? null,
                  parentScope: projectId ? "project" : "personal",
                },
              }),
            },
          );

          if (!response.ok) throw new Error("Failed to create sketch");
          const sketchData = await response.json();

          const newNode = {
            id: newNodeId(),
            type: "sketch",
            position,
            data: { label: "Untitled Sketch", sketchId: sketchData.id },
            style: { width: 320, height: 240 },
          };
          setNodes((nds) => nds.concat(newNode));
        } catch (err) {
          console.error(err);
          toast.error("Failed to create sketch");
        }
        return;
      }

      const newNode = createLocalNode(type, position);
      if (newNode) setNodes((nds) => nds.concat(newNode));
    },
    [rfInstance, setNodes, projectId, boardId, canEdit],
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
            id: newNodeId(),
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

  const [trash, setTrash] = React.useState([]);
  const nodesRef = React.useRef(nodes);
  const edgesRef = React.useRef(edges);
  React.useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [nodes, edges]);

  // Drag stop: text-like nodes dropped on a column fold into it.
  const handleNodeDragStop = React.useCallback(
    (event, node) => {
      const absorbed = absorbDraggedNode(rfInstance?.getNodes?.() ?? nodesRef.current, node);
      if (absorbed) setNodes(absorbed);
    },
    [rfInstance, setNodes],
  );

  // Deletions are captured for Trash before they reach React Flow.
  const handleNodesChange = React.useCallback(
    (changes) => {
      const removedIds = new Set(changes.filter((c) => c.type === "remove").map((c) => c.id));
      const gone = removedIds.size ? nodesRef.current.filter((n) => removedIds.has(n.id)) : [];
      if (gone.length) {
        const goneIds = new Set(gone.map((n) => n.id));
        const d = gone[0].data || {};
        const title = String(d.title || d.label || d.text || d.name || d.question || "").slice(0, 40);
        setTrash((t) =>
          [
            {
              id: newNodeId(),
              title: title || `${gone[0].type} node`,
              nodes: gone,
              edges: edgesRef.current.filter((e) => goneIds.has(e.source) || goneIds.has(e.target)),
              deletedAt: Date.now(),
            },
            ...t,
          ].slice(0, 30),
        );
      }

      onNodesChange(changes);
    },
    [onNodesChange],
  );

  const restoreFromTrash = React.useCallback(
    (entryId) => {
      const entry = trash.find((t) => t.id === entryId);
      if (!entry) return;
      setTrash((t) => t.filter((x) => x.id !== entryId));
      setNodes((nds) => {
        const ids = new Set(nds.map((n) => n.id));
        return nds.concat(entry.nodes.filter((n) => !ids.has(n.id)).map((n) => ({ ...n, selected: false })));
      });
      setEdges((eds) => {
        const ids = new Set(eds.map((e) => e.id));
        return eds.concat(entry.edges.filter((e) => !ids.has(e.id)).map((e) => ({ ...e, selected: false })));
      });
      toast.success("Restored");
    },
    [trash, setNodes, setEdges],
  );

  // Arrange commands from the node sidebar, which sits outside the React Flow provider.
  const handleNodeCommand = React.useCallback(
    (command, nodeId) => {
      if (command === "front" || command === "back") {
        setNodes((nds) => nds.map((n) => (n.id === nodeId ? { ...n, zIndex: stackIndex(nds, nodeId, command) } : n)));
      } else if (command === "duplicate") {
        setNodes((nds) => {
          const src = nds.find((n) => n.id === nodeId);
          if (!src) return nds;
          const copy = {
            ...structuredClone(src),
            id: newNodeId(),
            position: { x: src.position.x + 30, y: src.position.y + 30 },
            selected: true,
          };
          return nds.map((n) => (n.selected ? { ...n, selected: false } : n)).concat(copy);
        });
      } else if (command === "delete") {
        rfInstance?.deleteElements({ nodes: [{ id: nodeId }] });
      }
    },
    [setNodes, rfInstance],
  );

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
      if (settings.fitViewOnOpen && nodesRef.current.length) {
        rfInstance.fitView({ padding: 0.15, duration: 1200 });
      } else {
        rfInstance.setViewport(viewport, { duration: 1600 });
      }
      hasAnimated.current = true;
    }
  }, [isInitialized, rfInstance, viewport, settings.fitViewOnOpen]);

  const handleMerge = React.useCallback(
    (newNodes, newEdges) => {
      setNodes(newNodes);
      setEdges(newEdges);
    },
    [setNodes, setEdges],
  );

  // Pending keyed board awaiting its access key before navigation.
  const [keyPrompt, setKeyPrompt] = React.useState(null);

  const openBoard = React.useCallback(
    async (targetId, name) => {
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

  const onNodeDoubleClick = React.useCallback(
    (event, node) => {
      if (node.type === "board") openBoard(node.data.boardId, node.data.name);
    },
    [openBoard],
  );

  // Mirror nodes ask to open their source board.
  React.useEffect(() => {
    const open = (e) => {
      const { boardId: target, name } = e.detail || {};
      if (!target) return;
      if (target === "home") onBreadcrumbClick?.(null);
      else openBoard(target, name);
    };
    window.addEventListener("geiger:open-board", open);
    return () => window.removeEventListener("geiger:open-board", open);
  }, [openBoard, onBreadcrumbClick]);

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

  // Per-board look: backdrop, pattern overrides and an optional forced canvas theme.
  const { appearance, update: updateAppearance } = useBoardAppearance(boardId, projectId, Boolean(id || projectId));
  const themeOverride = appearance.theme;
  const colorMode = themeOverride !== "inherit" ? themeOverride : resolvedTheme === "light" ? "light" : "dark";
  const themeClass = themeOverride === "dark" ? "dark" : themeOverride === "light" ? "theme-light" : "";
  const pattern = resolvePattern(appearance.pattern, settings);
  const backdrop = hasBackdrop(appearance);
  const boardAppearance = React.useMemo(
    () => ({ value: appearance, onChange: updateAppearance, boardKey: boardId || projectId || "home", disabled: !canEdit }),
    [appearance, updateAppearance, boardId, projectId, canEdit],
  );

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
        data-node-style={settings.nodeStyle || "classic"}
        className={`absolute inset-0 transition-opacity duration-1000 ${themeClass ? `${themeClass} bg-background text-foreground` : ""} ${!isInitialized || isLoading ? "opacity-0 pointer-events-none" : "opacity-100"}`}
      >
        <CanvasBackdrop appearance={appearance} viewport={viewport} />
        <SketchPreviewProvider nodes={nodes} onOpenSketch={openSketch}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStop={handleNodeDragStop}
          onMove={onMove}
          onInit={setRfInstance}
          onPaneClick={onPaneClick}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onNodeDoubleClick={onNodeDoubleClick}
          nodeTypes={NODE_TYPES}
          edgeTypes={EDGE_TYPES}
          colorMode={colorMode}
          defaultViewport={viewport}
          className={`touch-none ${backdrop ? "!bg-transparent" : "bg-background"}`}
          style={backdrop ? { "--xy-background-color": "transparent" } : undefined}
          proOptions={{ hideAttribution: true }}
          minZoom={0.1}
          maxZoom={Number(settings.maxZoom) || 2}
          nodesDraggable={canEdit}
          nodesConnectable={canEdit}
          deleteKeyCode={canEdit ? ["Backspace", "Delete"] : null}
          panOnDrag={isMobile || handMode ? true : panOnDrag}
          selectionOnDrag={isMobile || handMode ? false : selectionOnDrag}
          panOnScroll={panOnScroll && !scrollZooms}
          zoomOnScroll={zoomOnScroll || scrollZooms}
          zoomOnDoubleClick={false}
          selectionMode={settings.selectionMode === "full" ? SelectionMode.Full : SelectionMode.Partial}
          snapToGrid={!!settings.snapToGrid}
          snapGrid={[gridSize, gridSize]}
          connectionLineType={ConnectionLineType.Straight}
          connectionLineStyle={connectionLineStyleFor(settings.defaultEdge)}
        >
          {pattern.variant !== "none" && (
            <Background
              id="minor"
              color={pattern.color}
              bgColor={backdrop ? "transparent" : undefined}
              gap={pattern.gap}
              size={pattern.size}
              lineWidth={pattern.variant === "lines" ? pattern.size : 1}
              variant={pattern.variant}
              style={{ opacity: pattern.opacity }}
            />
          )}
          {pattern.variant !== "none" && pattern.majorEvery > 0 && (
            <Background
              id="major"
              color={pattern.color}
              bgColor="transparent"
              gap={pattern.gap * pattern.majorEvery}
              lineWidth={Math.max(1, pattern.size) * 1.6}
              variant={BackgroundVariant.Lines}
              style={{ opacity: Math.min(1, pattern.opacity * 1.4) }}
            />
          )}
          {settings.showMinimap && (
            <MiniMap
              position={settings.minimapPosition || "bottom-right"}
              pannable
              zoomable
              className="!bg-surface-dialog !border !border-border rounded-md"
              nodeColor="var(--minimap-node)"
              nodeStrokeColor="var(--minimap-stroke)"
              maskColor={colorMode === "light" ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)"}
            />
          )}
        </ReactFlow>
        </SketchPreviewProvider>
      </div>

      <div className={`absolute top-0 left-0 right-0 z-40`}>
        <Topbar
          id={id}
          settings={settings}
          onSettingsChange={handleSettingsChange}
          onSettingsSave={saveSettings}
          onSettingsDiscard={discardSettings}
          onSettingsReset={resetSettings}
          settingsDirty={settingsDirty}
          settingsSaving={settingsSaving}
          boardAppearance={boardAppearance}
          nodes={nodes}
          edges={edges}
          onMerge={handleMerge}
          breadcrumbs={breadcrumbs}
          onBreadcrumbClick={onBreadcrumbClick}
          isSyncing={isSyncing}
          onToggleSidebar={toggleSidebar}
        />
      </div>

      <div
        className={`absolute top-14 bottom-0 left-0 z-40 transition-all duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <Sidebar
          selectedEdge={selectedEdge}
          onUpdateEdge={updateEdge}
          onDeselect={deselectEdges}
          selectedNode={selectedNode}
          onUpdateNode={updateNode}
          onDeselectNode={deselectNodes}
          enabledTools={settings.toolbarTools}
          projectId={projectId}
          onNodeCommand={handleNodeCommand}
          trash={trash}
          onRestore={restoreFromTrash}
        />
      </div>

      <div
        className={`absolute bottom-4 z-50 flex flex-col gap-2 transition-all duration-300 ${
          sidebarOpen ? "left-20" : "left-4"
        }`}
      >
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
