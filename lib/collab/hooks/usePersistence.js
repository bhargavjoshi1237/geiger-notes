import { useCallback, useRef } from 'react';
import { toast } from "sonner";
import { sanitizeNodes, sanitizeEdges } from '../utils';

// Debounced whole-board save. lastSavedRef lets the realtime layer recognise its own echo.
export const usePersistence = (supabase, sessionId, canEdit) => {
    const saveTimeoutRef = useRef(null);
    const lastSavedRef = useRef({ nodes: null, edges: null });
    const saveState = useCallback(async (newNodes, newEdges) => {
        if (!sessionId || !canEdit) return;
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(async () => {
            const nodes = JSON.stringify(sanitizeNodes(newNodes));
            const edges = JSON.stringify(sanitizeEdges(newEdges));
            lastSavedRef.current = { nodes, edges };
            const { error } = await supabase
                .from('collab')
                .update({ state_nodes: nodes, state_edges: edges })
                .eq('id', sessionId);
            if (error) {
                console.error("Error saving state:", error);
                // The guard trigger explains host-imposed refusals (paused editing, ended session).
                toast.error(error.code === '42501' ? error.message : "Failed to save changes");
            }
        }, 100);
    }, [supabase, sessionId, canEdit]);

    return { saveState, lastSavedRef };
};
