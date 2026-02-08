import { useCallback } from 'react';
import { getRandomColor } from '../utils';

export const useAccess = (supabase, sessionId, user, sessionData, role, setSessionData, setRole) => {
    const requestAccess = useCallback(async () => {
        if (!user || !sessionData) return;
        const currentJoiners = sessionData.joiners || {};
        if (currentJoiners[user.id]) return;

        const newJoiners = {
            ...currentJoiners,
            [user.id]: {
                id: user.id,
                status: 'requested',
                email: user.email,
                name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown',
                requestedAt: new Date().toISOString()
            }
        };

        const { error } = await supabase
            .from('collab')
            .update({ joiners: newJoiners })
            .eq('id', sessionId);
        
        if (!error) {
             setSessionData(prev => ({ ...prev, joiners: newJoiners }));
             setRole('pending');
        }
    }, [supabase, sessionId, user, sessionData, setSessionData, setRole]);

    const acceptRequest = useCallback(async (userId) => {
        if (role !== 'host') return;
        const currentJoiners = sessionData.joiners || {};
        if (!currentJoiners[userId]) return;

        const newJoiners = {
            ...currentJoiners,
            [userId]: {
                ...currentJoiners[userId],
                status: 'joined',
                joinedAt: new Date().toISOString(),
                color: getRandomColor()
            }
        };
        
        await supabase.from('collab').update({ joiners: newJoiners }).eq('id', sessionId);
    }, [supabase, sessionId, sessionData, role]);

    return { requestAccess, acceptRequest };
};
