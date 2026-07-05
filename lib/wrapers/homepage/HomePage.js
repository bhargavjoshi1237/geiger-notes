import React, { useCallback, useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { useNodesState, useEdgesState, addEdge, MarkerType } from '@xyflow/react';
import { useCanvasState, saveCanvasState } from '@/utils/supabase/State';
import { copyToClipboard, pasteFromClipboard } from '@/lib/accessibility/clipboard';

export const useHomeLogic = (id, boardId, projectId, canEdit = true) => {
    const { nodes: dbNodes, edges: dbEdges, viewport: dbViewport, isLoading } = useCanvasState(id, boardId, projectId);
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
            setNodes((dbNodes || []).map(node => {
                const { isDrawing, ...restData } = node.data || {};
                return { ...node, data: restData, selected: false };
            }));
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
    const isSavingRef = useRef(false);
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
        const debounceTime = process.env.NEXT_PUBLIC_DEBOUNCE_TIME || 2000;
        saveTimerRef.current = setTimeout(async () => {
            const { nodes, edges, viewport } = stateRef.current;
            isSavingRef.current = true;
            try {
                await saveCanvasState(id, nodes, edges, viewport, boardId, projectId);
            } catch (error) {
                console.error('Failed to save state:', error);
                toast.error('Failed to auto-save', { id: 'autosave-error' });
            } finally {
                isSavingRef.current = false;
                setIsSyncing(false);
            }
        }, parseInt(debounceTime));
    }, [id, isInitialized, boardId, projectId]);

    useEffect(() => {
        triggerSave();
    }, [nodes, edges, triggerSave]);

    const saveOnUnload = useCallback(() => {
        if (!isInitialized) return;
        const { nodes, edges, viewport } = stateRef.current;
        const isProd = process.env.NODE_ENV === 'production';
        const basePath = isProd ? (process.env.NEXT_PUBLIC_BASE_PATH || '/notes') : '';
        const payload = JSON.stringify({ userId: id, nodes, edges, viewport, boardId, projectId });
        // sendBeacon returns false (it does NOT throw) when it can't queue the
        // send — chiefly when the payload exceeds its ~64KB cap, which boards
        // with base64 image data routinely do. Fall back to a keepalive fetch on
        // either a false return or a throw so large boards still persist.
        let queued = false;
        try {
            queued = navigator.sendBeacon(`${basePath}/api/save-state`, new Blob([payload], { type: 'application/json' }));
        } catch {
            queued = false;
        }
        if (!queued) {
            fetch(`${basePath}/api/save-state`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: payload,
                keepalive: true,
            }).catch(() => {});
        }
    }, [id, isInitialized, boardId, projectId]);

    useEffect(() => {
        window.addEventListener('beforeunload', saveOnUnload);
        return () => {
            window.removeEventListener('beforeunload', saveOnUnload);
        };
    }, [saveOnUnload]);

    useEffect(() => {
        return () => {
             window.removeEventListener('beforeunload', saveOnUnload);
             if (saveTimerRef.current) {
                 clearTimeout(saveTimerRef.current);
             }
             if (isInitialized) {
                 // If a debounced save is already in-flight, don't fire a duplicate
                 if (!isSavingRef.current) {
                     const { nodes, edges, viewport } = stateRef.current;
                     saveCanvasState(id, nodes, edges, viewport, boardId, projectId).catch(err =>
                        console.error('Final save failed:', err)
                     );
                 }
             }
        };
    }, [id, boardId, projectId, isInitialized, saveOnUnload]);

    useEffect(() => {
        const handleKeyDown = (event) => {
            const activeElement = document.activeElement;
            const isInput = ['INPUT', 'TEXTAREA'].includes(activeElement.tagName) || activeElement.isContentEditable;

            if (isInput) return;

            // Copy is always allowed; edits (delete/paste) require edit access.
            if ((event.metaKey || event.ctrlKey) && event.key === 'c') {
                copyToClipboard(nodes, edges);
                return;
            }

            if (!canEdit) return;

            if (event.key === 'Delete' || event.key === 'Backspace') {
                setNodes((nds) => nds.filter((n) => !n.selected));
                setEdges((eds) => eds.filter((e) => !e.selected));
            } else if ((event.metaKey || event.ctrlKey) && event.key === 'v') {
                pasteFromClipboard(nodes, setNodes, setEdges);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [nodes, edges, setNodes, setEdges, canEdit]);

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
