"use client";

import React, { useMemo } from 'react';
import { ReactFlow, Background, SelectionMode } from '@xyflow/react';
import { useTheme } from "next-themes"
import '@xyflow/react/dist/style.css';
import Sidebar from '@/components/internal/layout/Sidebar';
import Topbar from '@/components/internal/layout/Topbar';
import CustomNode from '@/components/internal/nodes/CustomNode';
import CenterEdge from '@/components/internal/edges/CenterEdge';
import ZoomControls from '@/components/internal/canvas/zoom-controls';
import { useHomeLogic } from '@/lib/wrapers/homepage/HomePage';
import CanvasSkeleton from '@/components/internal/canvas/CanvasSkeleton';
import CommentNode from '@/components/internal/nodes/CommentNode';
import LinkNode from '@/components/internal/nodes/LinkNode';

export default function Home({ params }) {
    const { id } = React.use(params);
    const {
        nodes,
        edges,
        viewport,
        onNodesChange,
        onEdgesChange,
        onConnect,
        onNodeDragStop,
        onMove,
        isInitialized,
        isLoading,
        panOnDrag,
        selectionOnDrag,
        panOnScroll,
        zoomOnScroll,
        setEdges,
        setNodes
    } = useHomeLogic(id);

    const [settings, setSettings] = React.useState({
        doubleClickToInsert: false,
    });

    const handleSettingsChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const [rfInstance, setRfInstance] = React.useState(null);
    const lastPaneClick = React.useRef(0);

    const onDragOver = React.useCallback((event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = React.useCallback(
        (event) => {
            event.preventDefault();
            const type = event.dataTransfer.getData('application/reactflow');
            if (typeof type === 'undefined' || !type) {
                return;
            }
            const position = rfInstance.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            const newNode = {
                id: `node-${Date.now()}`,
                type,
                position,
                data: { label: '' },
                style: { width: 338, height: 68 },
            };

            setNodes((nds) => nds.concat(newNode));
        },
        [rfInstance, setNodes],
    );

    const onPaneClick = React.useCallback((event) => {
        if (!settings.doubleClickToInsert) return;

        const currentTime = Date.now();
        if (currentTime - lastPaneClick.current < 300) {
            if (rfInstance) {
                const position = rfInstance.screenToFlowPosition({ 
                    x: event.clientX, 
                    y: event.clientY 
                });
                const newNode = {
                    id: `node-${Date.now()}`,
                    type: 'custom',
                    position,
                    data: { label: '' },
                    style: { width: 336, height: 68 },
                };
                setNodes((nds) => [...nds, newNode]);
            }
        }
        lastPaneClick.current = currentTime;
    }, [settings.doubleClickToInsert, rfInstance, setNodes]);

    const selectedEdge = useMemo(() => edges.find(e => e.selected), [edges]);
    const selectedNode = useMemo(() => nodes.find(n => n.selected), [nodes]);

    const updateEdge = React.useCallback((edgeId, updates) => {
        setEdges(eds => eds.map(e => e.id === edgeId ? { ...e, ...updates } : e));
    }, [setEdges]);

    const updateNode = React.useCallback((nodeId, updates) => {
        setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, ...updates } : n));
    }, [setNodes]);

    const deselectEdges = React.useCallback(() => {
        setEdges(eds => eds.map(e => ({ ...e, selected: false })));
    }, [setEdges]);

    const deselectNodes = React.useCallback(() => {
        setNodes(nds => nds.map(n => ({ ...n, selected: false })));
    }, [setNodes]);

    const nodeTypes = useMemo(() => ({
        custom: CustomNode,
        comment: CommentNode,
        link: LinkNode,
    }), []);

    const edgeTypes = useMemo(() => ({
        center: CenterEdge,
    }), []);

    const { theme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    const hasAnimated = React.useRef(false);

    React.useEffect(() => {
        if (isInitialized && rfInstance && !hasAnimated.current) {
            rfInstance.setViewport(viewport, { duration: 1600 });
            hasAnimated.current = true;
        }
    }, [isInitialized, rfInstance, viewport]);

    return (
        <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#232323] text-white">
            <Topbar id={id} settings={settings} onSettingsChange={handleSettingsChange} />
            <div className="flex-1 flex h-full relative">
                <Sidebar 
                    selectedEdge={selectedEdge} 
                    onUpdateEdge={updateEdge} 
                    onDeselect={deselectEdges}
                    selectedNode={selectedNode}
                    onUpdateNode={updateNode}
                    onDeselectNode={deselectNodes}
                />
                <main className="flex-1 relative h-full bg-[#232323]">
                    <div 
                        className={`absolute inset-0 z-10 bg-[#232323] transition-opacity duration-700 pointer-events-none 
                        ${(!isInitialized || isLoading) ? 'opacity-100' : 'opacity-0'}`}
                    >
                         <CanvasSkeleton />
                    </div>

                    <div className={`absolute inset-0 transition-opacity duration-1000 ${(!isInitialized || isLoading) ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
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
                            nodeTypes={nodeTypes}
                            edgeTypes={edgeTypes}
                            colorMode="dark"
                            defaultViewport={viewport}
                            className="bg-[#232323]"
                            proOptions={{ hideAttribution: true }}
                            minZoom={0.1}
                            maxZoom={2}
                            deleteKeyCode={['Backspace', 'Delete']}
                            panOnDrag={panOnDrag}
                            selectionOnDrag={selectionOnDrag}
                            panOnScroll={panOnScroll}
                            zoomOnScroll={zoomOnScroll}
                            zoomOnDoubleClick={false}
                            selectionMode={SelectionMode.Partial}
                        >
                            <Background
                                color="#373737"
                                gap={12}
                                size={1}
                                variant="dots"
                            />
                            <ZoomControls />
                        </ReactFlow>
                    </div>  
                </main>
            </div>
        </div>
    );
}
