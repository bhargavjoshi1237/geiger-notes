import React, { useCallback, useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { useNodesState, useEdgesState, addEdge, MarkerType } from '@xyflow/react';
import { useCanvasState, saveCanvasState } from '@/utils/supabase/State';
import { copyToClipboard, pasteFromClipboard } from '@/lib/accessibility/clipboard';

export const useHomeLogic = (id, boardId) => {
    const { nodes: dbNodes, edges: dbEdges, viewport: dbViewport, isLoading } = useCanvasState(id, boardId);
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
    const [isInitialized, setIsInitialized] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        setIsInitialized(false);
    }, [boardId]);

    useEffect(() => {
        if (!isLoading && !isInitialized) {
            setNodes((dbNodes || []).map(node => ({ ...node, selected: false })));
            setEdges((dbEdges || []).map(edge => ({ ...edge, selected: false })));
            setViewport(dbViewport || { x: 0, y: 0, zoom: 1 });
            setIsInitialized(true);
        }
    }, [isLoading, dbNodes, dbEdges, dbViewport, isInitialized, setNodes, setEdges, boardId]);

    const onConnect = useCallback(
        (connection) => setEdges((eds) => addEdge({ ...connection, type: 'center', markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 } }, eds)),
        [setEdges],
    );

    const onNodeDragStop = useCallback((event, node) => {
        setNodes((nodes) =>
            nodes.map((n) => {
                if (n.id === node.id) {
                    return {
                        ...n,
                        position: {
                            x: Math.round(n.position.x / 15) * 15,
                            y: Math.round(n.position.y / 15) * 15,
                        },
                    };
                }
                return n;
            })
        );
    }, [setNodes]);

    const saveTimerRef = useRef(null);
    const stateRef = useRef({ nodes, edges, viewport });

    useEffect(() => {
        stateRef.current.nodes = nodes;
        stateRef.current.edges = edges;
        stateRef.current.viewport = viewport;
    }, [nodes, edges, viewport]);

    const triggerSave = useCallback(() => {
        if (!isInitialized) return; 
        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
        }
        setIsSyncing(true);
        const debounceTime = process.env.NEXT_PUBLIC_DEBOUNCE_TIME || 5000;
        saveTimerRef.current = setTimeout(async () => {
            const { nodes, edges, viewport } = stateRef.current;
            try {
                await saveCanvasState(id, nodes, edges, viewport, boardId);
            } catch (error) {
                console.error('Failed to save state:', error);
                toast.error('Failed to auto-save', { id: 'autosave-error' });
            } finally {
                setIsSyncing(false);
            }
        }, parseInt(debounceTime));
    }, [id, isInitialized, boardId]);

    useEffect(() => {
        triggerSave();
    }, [nodes, edges, triggerSave]);

    useEffect(() => {
        return () => {
             if (saveTimerRef.current) {
                 clearTimeout(saveTimerRef.current);
             }
             if (isInitialized) {
                 const { nodes, edges, viewport } = stateRef.current;
                 saveCanvasState(id, nodes, edges, viewport, boardId).catch(err => 
                    console.error('Final save failed:', err)
                 );
             }
        };
    }, [id, boardId, isInitialized]);

    useEffect(() => {
        const handleKeyDown = (event) => {
            const activeElement = document.activeElement;
            const isInput = ['INPUT', 'TEXTAREA'].includes(activeElement.tagName) || activeElement.isContentEditable;

            if (isInput) return;

            if (event.key === 'Delete' || event.key === 'Backspace') {
                setNodes((nds) => nds.filter((n) => !n.selected));
                setEdges((eds) => eds.filter((e) => !e.selected));
            } else if ((event.metaKey || event.ctrlKey) && event.key === 'c') {
                copyToClipboard(nodes, edges);
            } else if ((event.metaKey || event.ctrlKey) && event.key === 'v') {
                pasteFromClipboard(nodes, setNodes, setEdges);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [nodes, edges, setNodes, setEdges]);

    const onMove = useCallback((_, newViewport) => {
        stateRef.current.viewport = newViewport;
        setViewport(newViewport);
        triggerSave();
    }, [triggerSave]);

    return {
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
        isSyncing,
        panOnDrag: [1],
        selectionOnDrag: true,
        panOnScroll: true,
        zoomOnScroll: true,
        zoomOnScroll: true,
        setEdges, 
        setNodes,   
    };
};
