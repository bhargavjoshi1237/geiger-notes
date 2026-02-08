import { useCallback, useRef } from 'react';
import { sanitizeNodes, sanitizeEdges } from '../utils';

export const usePersistence = (supabase, sessionId, role) => {
    const saveTimeoutRef = useRef(null);

    const saveState = useCallback(async (newNodes, newEdges) => {
        if (!sessionId || (role !== 'host' && role !== 'editor')) return;
        
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        
        saveTimeoutRef.current = setTimeout(async () => {
            const sanitizedNodes = sanitizeNodes(newNodes);
            const sanitizedEdges = sanitizeEdges(newEdges);

            const { error } = await supabase
                .from('collab')
                .update({
                    state_nodes: JSON.stringify(sanitizedNodes),
                    state_edges: JSON.stringify(sanitizedEdges),
                })
                .eq('id', sessionId);
            
            if (error) console.error("Error saving state:", error);
        }, 100); 
    }, [supabase, sessionId, role]);

    return { saveState };
};
