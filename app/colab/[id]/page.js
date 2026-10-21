"use client";

import React, { useMemo } from 'react';
import { useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { ReactFlow, Background, SelectionMode } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { toast } from "sonner";
import Sidebar from '@/components/internal/layout/Sidebar';
import Topbar from '@/components/internal/layout/Topbar';
import CenterEdge from '@/components/internal/edges/CenterEdge';
import ZoomControls from '@/components/internal/canvas/zoom-controls';
import { useCollabLogic } from '@/lib/collab/hooks/useCollabLogic';
import { useSessionControls } from '@/lib/collab/hooks/useSessionControls';
import { canModerate } from '@/lib/collab/session';
import CanvasSkeleton from '@/components/internal/canvas/CanvasSkeleton';
import { absorbDraggedNode, dropIntoColumnAtPoint } from '@/components/internal/nodes/ColumnNode';
import { NODE_TYPES, createLocalNode, newNodeId } from '@/components/internal/nodes/registry';
import { DEFAULT_TOOLBAR_TOOLS } from '@/lib/settings/defaults';
import UserDrawer from '@/components/internal/layout/UserDrawer';
import { SessionControlsContext } from '@/components/internal/colab/live/SessionContext';
import SessionLiveLayer from '@/components/internal/colab/live/SessionLiveLayer';
import SessionStatusBar from '@/components/internal/colab/live/SessionStatusBar';
import SessionEndedOverlay from '@/components/internal/colab/live/SessionEndedOverlay';
import SessionToolbar, { useLiveMembers } from '@/components/internal/colab/live/SessionToolbar';
import MakeHostDialog from '@/components/internal/colab/live/MakeHostDialog';

// Live sessions have no board/document/sketch rows of their own, so tools that need one are left out.
const COLLAB_TOOLS = DEFAULT_TOOLBAR_TOOLS.filter((t) => !['board', 'document', 'draw', 'mirror', 'huddle'].includes(t));
const DELETE_KEYS = ['Backspace', 'Delete'];

export default function CollabPage({ params }) {
    const { id } = React.use(params);
    const searchParams = useSearchParams();
    const debugBgLayers = searchParams.get("layerdebug") === "1";
    const { resolvedTheme } = useTheme();

    const shellBgClass = debugBgLayers ? "bg-red-700/85" : "bg-background";
    const mainBgClass = debugBgLayers ? "bg-emerald-700/55" : "";
    const loadingBgClass = debugBgLayers ? "bg-yellow-500/70" : "bg-background";
    const flowBgClass = debugBgLayers ? "bg-blue-700/45" : "bg-background";

    const {
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        onConnect,
        onNodeDragStop,
        onSelectionChange,
        onEdgeUpdate,
        onEdgeUpdateEnd,
        setNodes,
        setEdges,
        isLoaded,
        sessionData,
        role,
        canEdit,
        ended,
        preference,
        acceptRequest,
        rejectRequest,
        setMemberRole,
        requestAccess,
        currentUser,
        kickMember,
        leaveSession,
        transferHost,
        reclaimHost,
        updatePreference,
        endSession,
        reopenSession,
    } = useCollabLogic(id);

    const controls = useSessionControls({
        sessionId: id, isLoaded, user: currentUser, role, sessionData, preference, ended, updatePreference, endSession,
    });
    const members = useLiveMembers(sessionData, controls, currentUser?.id);
    const [hostCandidate, setHostCandidate] = React.useState(null);

    const moderator = canModerate(role);
    const sessionEnded = controls.ended;
    const editable = canEdit && !sessionEnded;
    const viewLocked = controls.viewLocked;
    const removed = Boolean(
        currentUser && sessionData && sessionData.host !== currentUser.id && sessionData.joiners?.[currentUser.id]?.status === 'kicked'
    );
    const homeHref = currentUser ? `/${currentUser.id}/home` : '/';

    const sessionContext = useMemo(() => ({
        inSession: true,
        moderator,
        canEdit: editable,
        facilitationLocked: !moderator && preference.facilitation === 'hosts',
        myId: currentUser?.id ?? null,
    }), [moderator, editable, preference.facilitation, currentUser?.id]);

    const [settings, setSettings] = React.useState({
        doubleClickToInsert: false,
    });

    const handleSettingsChange = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));
    const [rfInstance, setRfInstance] = React.useState(null);
    const nodeTypes = NODE_TYPES;

    const edgeTypes = useMemo(() => ({
        center: CenterEdge,
    }), []);

    const selectedEdge = useMemo(() => edges.find(e => e.selected), [edges]);
    const selectedNode = useMemo(() => nodes.find(n => n.selected), [nodes]);

    const blockedEdit = React.useCallback(() => {
        toast.info(sessionEnded ? "This session has ended" : preference.editLock ? "The host has paused editing" : "You're viewing this session");
    }, [sessionEnded, preference.editLock]);

    const updateEdge = React.useCallback((edgeId, updates) => {
        if (!editable) return blockedEdit();
        setEdges(eds => eds.map(e => e.id === edgeId ? { ...e, ...updates } : e));
    }, [setEdges, editable, blockedEdit]);

    const updateNode = React.useCallback((nodeId, updates) => {
        if (!editable) return blockedEdit();
        setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, ...updates } : n));
    }, [setNodes, editable, blockedEdit]);

    const deselectEdges = React.useCallback(() => {
        setEdges(eds => eds.map(e => ({ ...e, selected: false })));
    }, [setEdges]);

    const deselectNodes = React.useCallback(() => {
        setNodes(nds => nds.map(n => ({ ...n, selected: false })));
    }, [setNodes]);

    const lastPaneClick = React.useRef(0);
    const onDragOver = React.useCallback((event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = editable ? 'move' : 'none';
    }, [editable]);

    const onDrop = React.useCallback(
        (event) => {
            event.preventDefault();
            const type = event.dataTransfer.getData('application/reactflow');
            if (typeof type === 'undefined' || !type) {
                return;
            }
            if (!rfInstance) return;
            if (!editable) return blockedEdit();

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

            const newNode = createLocalNode(type, position);
            if (newNode) setNodes((nds) => nds.concat(newNode));
        },
        [rfInstance, setNodes, editable, blockedEdit],
    );

    const onPaneClick = React.useCallback((event) => {
        if (!settings.doubleClickToInsert || !editable) return;
        const currentTime = Date.now();
        if (currentTime - lastPaneClick.current < 300) {
            if (rfInstance) {
                const position = rfInstance.screenToFlowPosition({
                    x: event.clientX,
                    y: event.clientY
                });
                const newNode = {
                    id: newNodeId(),
                    type: 'custom',
                    position,
                    data: { label: '' },
                    style: { width: 336, height: 68 },
                };
                setNodes((nds) => [...nds, newNode]);
            }
        }
        lastPaneClick.current = currentTime;
    }, [settings.doubleClickToInsert, rfInstance, setNodes, editable]);

    // Dropping a text-like node onto a column folds it into the column.
    const handleNodeDragStop = React.useCallback((event, node) => {
        const current = rfInstance?.getNodes?.() ?? nodes;
        const absorbed = absorbDraggedNode(current, node);
        if (absorbed) {
            setNodes(absorbed);
            return;
        }
        onNodeDragStop(event, node);
    }, [rfInstance, nodes, setNodes, onNodeDragStop]);

    // A user-initiated pan/zoom ends a soft follow; programmatic moves (event === null) don't.
    const { leader, stopFollowing } = controls;
    const handleMoveStart = React.useCallback((event) => {
        if (event && leader && !viewLocked) stopFollowing();
    }, [leader, viewLocked, stopFollowing]);

    const confirmMakeHost = React.useCallback((candidate) => {
        if (candidate) transferHost(candidate.id);
        setHostCandidate(null);
    }, [transferHost]);

    return (
        <SessionControlsContext.Provider value={sessionContext}>
        <div className={`flex flex-col h-screen w-screen overflow-hidden ${shellBgClass} text-foreground`}>
            <Topbar
                id={id}
                settings={settings}
                onSettingsChange={handleSettingsChange}
                nodes={nodes}
                edges={edges}
                sessionData={sessionData}
                role={role}
                onAcceptRequest={acceptRequest}
                onRejectRequest={rejectRequest}
                onKickMember={kickMember}
                onLeaveSession={leaveSession}
                onEndSession={controls.endForEveryone}
                actions={sessionData ? (
                    <SessionToolbar
                        controls={controls}
                        members={members}
                        role={role}
                        preference={preference}
                        updatePreference={updatePreference}
                        setMemberRole={setMemberRole}
                        kickMember={kickMember}
                        rejectRequest={rejectRequest}
                        onMakeHost={setHostCandidate}
                        selectedNodeId={selectedNode?.id}
                        ended={sessionEnded}
                        participating={Boolean(currentUser) && role !== 'pending' && !removed}
                    />
                ) : null}
            />

            {debugBgLayers && (
                <div className="pointer-events-none fixed top-14 right-3 z-[120] rounded-md border border-white/30 bg-black/70 px-2 py-1 text-[10px] leading-4 text-white font-mono">
                    shell: red | main: green | loading: yellow | flow: blue
                </div>
            )}

            <div className="flex-1 flex h-full relative">
                <Sidebar
                    debugBgLayers={debugBgLayers}
                    selectedEdge={selectedEdge}
                    onUpdateEdge={updateEdge}
                    onDeselect={deselectEdges}
                    selectedNode={selectedNode}
                    onUpdateNode={updateNode}
                    onDeselectNode={deselectNodes}
                    enabledTools={COLLAB_TOOLS}
                />
                <main className={`flex-1 relative h-full ${mainBgClass}`}>
                    <div
                        className={`absolute inset-0 z-10 ${loadingBgClass} transition-opacity duration-700 pointer-events-none
                        ${!isLoaded ? 'opacity-100' : 'opacity-0'}`}
                    >
                         <CanvasSkeleton />
                    </div>

                    <div className={`absolute inset-0 transition-opacity duration-1000 ${!isLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            onConnect={onConnect}
                            onSelectionChange={onSelectionChange}
                            onNodeDragStop={handleNodeDragStop}
                            onEdgeUpdate={onEdgeUpdate}
                            onEdgeUpdateEnd={onEdgeUpdateEnd}
                            onInit={setRfInstance}
                            onPaneClick={onPaneClick}
                            onMoveStart={handleMoveStart}
                            onDragOver={onDragOver}
                            onDrop={onDrop}
                            nodeTypes={nodeTypes}
                            edgeTypes={edgeTypes}
                            colorMode={resolvedTheme === "light" ? "light" : "dark"}
                            className={flowBgClass}
                            minZoom={0.1}
                            maxZoom={2}
                            deleteKeyCode={editable ? DELETE_KEYS : null}
                            selectionMode={SelectionMode.Partial}
                            proOptions={{ hideAttribution: true }}
                            panOnDrag={!viewLocked}
                            selectionOnDrag={true}
                            panOnScroll={!viewLocked}
                            zoomOnScroll={!viewLocked}
                            zoomOnPinch={!viewLocked}
                            zoomOnDoubleClick={false}
                            nodesDraggable={editable}
                            nodesConnectable={editable}
                            elementsSelectable={true}
                        >
                            <Background color="var(--canvas-dots)" gap={12} size={1} variant="dots" />
                            {!viewLocked && <ZoomControls />}
                            {isLoaded && (
                                <SessionLiveLayer
                                    controls={controls}
                                    hideCursors={preference.hideCursors && !moderator}
                                />
                            )}
                        </ReactFlow>
                        <SessionStatusBar controls={controls} canEdit={editable} role={role} preference={preference} />
                        <UserDrawer
                            members={members}
                            role={role}
                            followingId={controls.live.followingId}
                            canReclaim={Boolean(currentUser) && preference.ownerId === currentUser?.id && role !== 'host'}
                            locked={preference.locked}
                            onFollow={controls.followUser}
                            onStopFollow={controls.stopFollowing}
                            onSetRole={setMemberRole}
                            onMakeHost={setHostCandidate}
                            onKickMember={kickMember}
                            onRejectRequest={rejectRequest}
                            onLowerHand={controls.lowerHand}
                            onLeaveSession={leaveSession}
                            onRequestAccess={requestAccess}
                            onReclaimHost={reclaimHost}
                        />
                    </div>
                    {isLoaded && (
                        <SessionEndedOverlay
                            ended={sessionEnded}
                            removed={removed}
                            isHost={role === 'host'}
                            locked={preference.locked}
                            homeHref={homeHref}
                            onReopen={reopenSession}
                            onRequestAccess={requestAccess}
                        />
                    )}
                </main>
            </div>
            <MakeHostDialog candidate={hostCandidate} onCancel={() => setHostCandidate(null)} onConfirm={confirmMakeHost} />
        </div>
        </SessionControlsContext.Provider>
    );
}
