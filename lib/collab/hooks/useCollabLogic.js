import { useEffect, useState, useCallback, useRef } from 'react';
import { useNodesState, useEdgesState, addEdge, reconnectEdge, MarkerType } from '@xyflow/react';
import { createClient } from '@/utils/supabase/client';
import { getRole } from '../utils';
import { usePersistence } from './usePersistence';
import { useRealtime } from './useRealtime';
import { useAccess } from './useAccess';

export const useCollabLogic = (sessionId) => {
    const supabase = createClient();
    const [user, setUser] = useState(null);
    const [hostId, setHostId] = useState(null);
    const [sessionData, setSessionData] = useState(null);
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [role, setRole] = useState('viewer');
    
    // Using a ref for metadata that doesn't trigger re-renders or needs to be accessed in callbacks without being in dependencies
    const collabStateRef = useRef({ 
        nodes, 
        edges, 
        role, 
        isLocalChange: false 
    });
    
    useEffect(() => {
        collabStateRef.current = { 
            ...collabStateRef.current,
            nodes, 
            edges, 
            role 
        };
    }, [nodes, edges, role]);

    const { saveState } = usePersistence(supabase, sessionId, role);
    const { channelRef } = useRealtime(
        supabase, sessionId, isLoaded, user, sessionData, 
        collabStateRef, setNodes, setEdges, setSessionData, setRole
    );
    const { requestAccess, acceptRequest } = useAccess(
        supabase, sessionId, user, sessionData, role, setSessionData, setRole
    );

    // Initial Load
    useEffect(() => {
        const init = async () => {
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            setUser(currentUser);

            if (!sessionId) return;

            const { data, error } = await supabase
                .from('collab')
                .select('*')
                .eq('id', sessionId)
                .single();

            if (error || !data) {
                console.error('Session not found:', error);
                return;
            }

            setSessionData(data);
            setHostId(data.host);

            const myRole = getRole(currentUser, data);
            setRole(myRole);
            
            collabStateRef.current.isLocalChange = false;
            
            if (data.state_nodes) {
                try {
                    const parsedNodes = typeof data.state_nodes === 'string' 
                        ? JSON.parse(data.state_nodes) 
                        : data.state_nodes;
                    setNodes(parsedNodes || []);
                } catch (e) { console.error("Error parsing nodes", e); }
            }
            if (data.state_edges) {
                try {
                    const parsedEdges = typeof data.state_edges === 'string' 
                        ? JSON.parse(data.state_edges) 
                        : data.state_edges;
                    setEdges(parsedEdges || []);
                } catch (e) { console.error("Error parsing edges", e); }
            }
            
            setIsLoaded(true);
        };

        if (sessionId) init();
    }, [sessionId, supabase, setNodes, setEdges]);

    // Handle Selection Broadcast
    const handleSelectionChange = useCallback(({ nodes: selectedNodes }) => {
        if (!channelRef.current || !user || !sessionData) return;
        
        const joiners = sessionData.joiners || {};
        const myData = joiners[user.id];
        const myColor = myData?.color || '#ff0000';
        const myName = myData?.name || 'Host';

        channelRef.current.send({
            type: 'broadcast',
            event: 'selection',
            payload: {
                userId: user.id,
                userName: myName,
                userColor: myColor,
                selectedNodeIds: selectedNodes.map(n => n.id)
            }
        });
    }, [user, sessionData, channelRef]);

    // Event Wrappers
    const handledOnNodesChange = useCallback((changes) => {
        const isSelectionOnly = changes.every(change => change.type === 'select');
        if (!isSelectionOnly) {
            collabStateRef.current.isLocalChange = true;
        }
        onNodesChange(changes);
    }, [onNodesChange]);

    const handledOnEdgesChange = useCallback((changes) => {
        const isSelectionOnly = changes.every(change => change.type === 'select');
        if (!isSelectionOnly) {
             collabStateRef.current.isLocalChange = true;
        }
        onEdgesChange(changes);
    }, [onEdgesChange]);

    const handledOnConnect = useCallback((params) => {
        collabStateRef.current.isLocalChange = true;
        setEdges((eds) => addEdge({ ...params, type: 'center', markerEnd: { type: MarkerType.ArrowClosed } }, eds));
    }, [setEdges]);

    // Auto-save on local change
    useEffect(() => {
        if (!isLoaded) return;
        
        if (collabStateRef.current.isLocalChange) {
            const isAnyNodeSelected = nodes.some(n => n.selected);
            if (isAnyNodeSelected) return;
            
            saveState(nodes, edges);
        }
    }, [nodes, edges, saveState, isLoaded]);
    
    const onNodeDragStop = useCallback((_, node) => {
        collabStateRef.current.isLocalChange = true;
        saveState(collabStateRef.current.nodes, collabStateRef.current.edges);
    }, [saveState]);

    const onEdgeUpdate = useCallback((oldEdge, newConnection) => {
        collabStateRef.current.isLocalChange = false;
        setEdges((els) => reconnectEdge(oldEdge, newConnection, els));
    }, [setEdges]);

    const onEdgeUpdateEnd = useCallback((_, edge) => {
        collabStateRef.current.isLocalChange = true;
        saveState(collabStateRef.current.nodes, collabStateRef.current.edges);
    }, [saveState]);

    // Auto-request access if viewer
    useEffect(() => {
        if (isLoaded && role === 'viewer' && user && sessionData) {
            const currentJoiners = sessionData.joiners || {};
            if (!currentJoiners[user.id]) {
                requestAccess();
            }
        }
    }, [isLoaded, role, user, sessionData, requestAccess]);

    return {
        nodes,
        edges,
        onNodesChange: handledOnNodesChange,
        onEdgesChange: handledOnEdgesChange, 
        onConnect: handledOnConnect,
        onNodeDragStop,
        onSelectionChange: handleSelectionChange,
        onEdgeUpdate,
        onEdgeUpdateEnd,
        setNodes,
        setEdges,
        isLoaded,
        role,
        sessionData,
        currentUser: user,
        requestAccess,
        acceptRequest
    };
};
