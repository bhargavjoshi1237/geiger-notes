import { useEffect, useRef } from 'react';

export const useRealtime = (supabase, sessionId, isLoaded, user, sessionData, stateRef, setNodes, setEdges, setSessionData, setRole) => {
    const channelRef = useRef(null);

    useEffect(() => {
        if (!sessionId || !isLoaded) return;

        const channel = supabase
            .channel(`collab:${sessionId}`)
            .on('postgres_changes', 
                { event: 'UPDATE', schema: 'public', table: 'collab', filter: `id=eq.${sessionId}` },
                (payload) => {
                    const newData = payload.new;
                    
                    if (JSON.stringify(newData.joiners) !== JSON.stringify(sessionData?.joiners)) {
                        setSessionData(prev => ({ ...prev, joiners: newData.joiners }));
                        if (user && user.id !== newData.host) {
                            const joiners = newData.joiners || {};
                            const myStatus = joiners[user.id];
                            if (myStatus?.status === 'joined') setRole('editor');
                            else if (myStatus?.status === 'requested') setRole('pending');
                            else setRole('viewer');
                        }
                    }

                    const newNodesStr = newData.state_nodes;
                    const newEdgesStr = newData.state_edges;
                    
                    try {
                        const newNodes = typeof newNodesStr === 'string' ? JSON.parse(newNodesStr) : newNodesStr;
                        const newEdges = typeof newEdgesStr === 'string' ? JSON.parse(newEdgesStr) : newEdgesStr;

                        const currentNodes = stateRef.current.nodes;
                        
                        if (newNodes) {
                             const mergedNodes = newNodes.map(newNode => {
                                const currentNode = currentNodes.find(n => n.id === newNode.id);
                                if (currentNode && currentNode.data?.outline?.enabled) {
                                    return {
                                        ...newNode,
                                        data: {
                                            ...newNode.data,
                                            outline: currentNode.data.outline
                                        }
                                    };
                                }
                                return newNode;
                            });
                             // Mark as external change to avoid loop
                             stateRef.current.isLocalChange = false;
                             setNodes(mergedNodes);
                        }

                        if (newEdges) {
                             stateRef.current.isLocalChange = false;
                             setEdges(newEdges);
                        }
                        
                    } catch(e) {
                        console.error("Error processing collab update", e);
                    }
                }
            )
            .on('broadcast', { event: 'selection' }, ({ payload }) => {
                if (payload.userId === user?.id) return;

                 setNodes((nds) => nds.map((node) => {
                    const isSelectedByRemote = payload.selectedNodeIds.includes(node.id);
                    
                    if (isSelectedByRemote) {
                        return {
                            ...node,
                            data: {
                                ...node.data,
                                outline: {
                                    name: payload.userName,
                                    color: payload.userColor,
                                    enabled: true
                                }
                            }
                        };
                    } 
                    
                    if (node.data.outline?.name === payload.userName && !isSelectedByRemote) {
                         return {
                            ...node,
                            data: {
                                ...node.data,
                                outline: { enabled: false }
                            }
                        };
                    }
                    
                    return node;
                }));
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    channelRef.current = channel;
                }
            });

        return () => {
            supabase.removeChannel(channel);
            channelRef.current = null;
        };
    }, [sessionId, isLoaded, user, sessionData, supabase, stateRef, setNodes, setEdges, setSessionData, setRole]);

    return { channelRef };
};
