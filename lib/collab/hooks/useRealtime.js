import { useEffect, useRef } from 'react';
import { toast } from "sonner";
import { getRole } from '../utils';

// Durable session sync: UPDATEs on notes.collab (board, members, host settings) plus remote selection outlines.
// The channel lives for the whole session; the latest user/session values reach its handlers through a ref.
export const useRealtime = ({
    supabase, sessionId, isLoaded, user, sessionData, stateRef, lastSavedRef,
    setNodes, setEdges, setSessionData, setRole,
}) => {
    const channelRef = useRef(null);
    const latestRef = useRef({ user, sessionData });
    useEffect(() => {
        latestRef.current = { user, sessionData };
    }, [user, sessionData]);

    useEffect(() => {
        if (!sessionId || !isLoaded) return;
        const lastApplied = {
            nodes: latestRef.current.sessionData?.state_nodes ?? null,
            edges: latestRef.current.sessionData?.state_edges ?? null,
        };

        const applyBoard = (next) => {
            // Postgres leaves unchanged large (TOASTed) columns out of the payload; those keep what we have.
            const nodesStr = next.state_nodes === undefined ? lastApplied.nodes : next.state_nodes;
            const edgesStr = next.state_edges === undefined ? lastApplied.edges : next.state_edges;
            // Skip our own save echoing back, and rows whose board didn't change (member or settings updates).
            const ownEcho = nodesStr === lastSavedRef.current.nodes && edgesStr === lastSavedRef.current.edges;
            let applied = false;
            let keptLocalEdit = false;
            try {
                if (nodesStr !== lastApplied.nodes) {
                    lastApplied.nodes = nodesStr;
                    const newNodes = typeof nodesStr === 'string' ? JSON.parse(nodesStr) : nodesStr;
                    if (newNodes && !ownEcho) {
                        const currentById = new Map(stateRef.current.nodes.map((n) => [n.id, n]));
                        // A node selected here is being edited (selected nodes don't save yet), so it keeps our copy.
                        const merged = newNodes.map((newNode) => {
                            const currentNode = currentById.get(newNode.id);
                            if (currentNode?.selected) {
                                if (nodeSignature(currentNode) !== nodeSignature(newNode)) keptLocalEdit = true;
                                return currentNode;
                            }
                            return currentNode?.data?.outline?.enabled
                                ? { ...newNode, data: { ...newNode.data, outline: currentNode.data.outline } }
                                : newNode;
                        });
                        applied = true;
                        setNodes(merged);
                    }
                }
                if (edgesStr !== lastApplied.edges) {
                    lastApplied.edges = edgesStr;
                    const newEdges = typeof edgesStr === 'string' ? JSON.parse(edgesStr) : edgesStr;
                    if (newEdges && !ownEcho) {
                        applied = true;
                        setEdges(newEdges);
                    }
                }
                // A kept local edit still owes a save; otherwise the board now matches the row.
                if (applied) stateRef.current.isLocalChange = keptLocalEdit;
            } catch (e) {
                console.error("Error processing collab update", e);
            }
        };

        const channel = supabase
            .channel(`collab:${sessionId}`)
            .on('postgres_changes',
                { event: 'UPDATE', schema: 'notes', table: 'collab', filter: `id=eq.${sessionId}` },
                (payload) => {
                    const next = payload.new;
                    const { user: me, sessionData: prev } = latestRef.current;
                    const merged = { ...prev };
                    for (const key of ['host', 'code', 'joiners', 'preference', 'state_nodes', 'state_edges']) {
                        if (next[key] !== undefined) merged[key] = next[key];
                    }
                    notifyMembership(me, prev, merged);
                    latestRef.current = { user: me, sessionData: merged };
                    setSessionData(merged);
                    setRole(getRole(me, merged));
                    applyBoard(next);
                }
            )
            .on('broadcast', { event: 'selection' }, ({ payload }) => {
                if (payload.userId === latestRef.current.user?.id) return;
                setNodes((nds) => nds.map((node) => {
                    const isSelectedByRemote = payload.selectedNodeIds.includes(node.id);
                    if (isSelectedByRemote) {
                        return {
                            ...node,
                            data: { ...node.data, outline: { name: payload.userName, color: payload.userColor, enabled: true } },
                        };
                    }
                    if (node.data.outline?.name === payload.userName) {
                        return { ...node, data: { ...node.data, outline: { enabled: false } } };
                    }
                    return node;
                }));
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') channelRef.current = channel;
            });

        return () => {
            supabase.removeChannel(channel);
            channelRef.current = null;
        };
    }, [sessionId, isLoaded, supabase, stateRef, lastSavedRef, setNodes, setEdges, setSessionData, setRole]);

    return { channelRef };
};

// What a save would persist for a node (remote outlines aside), to tell a real local edit from a stale copy.
function nodeSignature(node) {
    const data = { ...(node.data || {}) };
    delete data.outline;
    return JSON.stringify([data, node.position, node.width, node.height, node.style]);
}

// Toasts for membership changes that affect the host (new requests) or me (admitted, demoted, promoted, removed).
function notifyMembership(me, prev, next) {
    if (!me || !prev) return;
    const oldJoiners = prev.joiners || {};
    const newJoiners = next.joiners || {};

    if (next.host !== prev.host) {
        if (next.host === me.id) toast.success("You're now the host");
        else if (prev.host === me.id) toast.info(`${newJoiners[next.host]?.name || "Someone else"} is now the host`);
    }

    if (me.id === next.host) {
        for (const [uid, member] of Object.entries(newJoiners)) {
            if (member.status === 'requested' && oldJoiners[uid]?.status !== 'requested') {
                toast.info(`New request from ${member.name}`, {
                    description: "Open Members to let them in.",
                });
            }
        }
        return;
    }

    const before = oldJoiners[me.id] || {};
    const after = newJoiners[me.id] || {};
    if (before.status === after.status && !!before.cohost === !!after.cohost) return;
    if (after.status === 'joined' && before.status !== 'joined') {
        toast.success(before.status === 'viewer' ? "The host let you edit again" : "You have joined the session!");
    } else if (after.status === 'viewer' && before.status !== 'viewer') {
        toast.info(before.status === 'requested' ? "You've joined as a viewer" : "The host made you a viewer");
    } else if (after.status === 'kicked' && before.status !== 'kicked') {
        toast.error("You have been removed from the session.");
    }
    if (after.status === 'joined' && after.cohost && !before.cohost) toast.success("You're now a co-host");
    if (before.cohost && !after.cohost && after.status === 'joined') toast.info("You're no longer a co-host");
}
