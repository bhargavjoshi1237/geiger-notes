import { useEffect, useState, useCallback, useRef } from 'react';
import { useNodesState, useEdgesState, addEdge, reconnectEdge } from '@xyflow/react';
import { newEdgeProps } from '@/lib/canvas/edge-style';
import { createClient } from '@/utils/supabase/client';
import { getRole } from '../utils';
import { canEditBoard, memberColor, readPreference } from '../session';
import { usePersistence } from './usePersistence';
import { useRealtime } from './useRealtime';
import { useAccess } from './useAccess';
import { useSessionSettings } from './useSessionSettings';

export const useCollabLogic = (sessionId) => {
    const supabase = createClient();
    const [user, setUser] = useState(null);
    const [hostId, setHostId] = useState(null);
    const [sessionData, setSessionData] = useState(null);
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [role, setRole] = useState('viewer');
    
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

    const preference = readPreference(sessionData);
    const ended = Boolean(preference.endedAt);
    const canEdit = !ended && canEditBoard(role, preference);

    const { saveState, lastSavedRef } = usePersistence(supabase, sessionId, canEdit);
    const { channelRef } = useRealtime({
        supabase, sessionId, isLoaded, user, sessionData, stateRef: collabStateRef, lastSavedRef,
        setNodes, setEdges, setSessionData, setRole,
    });
    const {
        requestAccess, acceptRequest, rejectRequest, setMemberRole, kickMember, leaveSession, transferHost, reclaimHost,
    } = useAccess(supabase, sessionId, user, sessionData, role, setSessionData, setRole);
    const { updatePreference, endSession, reopenSession } = useSessionSettings(
        supabase, sessionId, role, sessionData, setSessionData
    );

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
                    setNodes((parsedNodes || []).map(n => ({ ...n, selected: false })));
                } catch (e) { console.error("Error parsing nodes", e); }
            }
            if (data.state_edges) {
                try {
                    const parsedEdges = typeof data.state_edges === 'string' 
                        ? JSON.parse(data.state_edges) 
                        : data.state_edges;
                    setEdges((parsedEdges || []).map(e => ({ ...e, selected: false })));
                } catch (e) { console.error("Error parsing edges", e); }
            }            
            setIsLoaded(true);
        };

        if (sessionId) init();
    }, [sessionId, supabase, setNodes, setEdges]);

    const handleSelectionChange = useCallback(({ nodes: selectedNodes }) => {
        if (!channelRef.current || !user || !sessionData) return;
        const joiners = sessionData.joiners || {};
        const myData = joiners[user.id];
        const myColor = memberColor(user.id, myData);
        const myName = myData?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Host';
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
        setEdges((eds) => addEdge({ ...params, ...newEdgeProps() }, eds));
    }, [setEdges]);

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

    // Auto-request access only on a genuine first visit: a brand-new viewer has
    // no entry in `joiners` at all. Users who were kicked or who left keep an
    // entry (status 'kicked'/'left'), so this no longer fires for them — they
    // must opt back in explicitly via the "Request to join" action.
    useEffect(() => {
        if (!isLoaded || !user || !sessionData || ended) return;
        if (user.id === sessionData.host) return;
        if (role !== 'viewer') return;
        const currentJoiners = sessionData.joiners || {};
        if (!currentJoiners[user.id] && !preference.locked) {
            requestAccess();
        }
    }, [isLoaded, role, user, sessionData, ended, preference.locked, requestAccess]);

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
        canEdit,
        ended,
        preference,
        sessionData,
        currentUser: user,
        requestAccess,
        acceptRequest,
        rejectRequest,
        setMemberRole,
        kickMember,
        leaveSession,
        transferHost,
        reclaimHost,
        updatePreference,
        endSession,
        reopenSession,
    };
};
