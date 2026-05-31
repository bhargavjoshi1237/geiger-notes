import { useCallback } from 'react';
import { toast } from "sonner";
import { getRandomColor } from '../utils';

export const useAccess = (supabase, sessionId, user, sessionData, role, setSessionData, setRole) => {
    const requestAccess = useCallback(async () => {
        if (!user || !sessionData) return;
        const currentJoiners = sessionData.joiners || {};
        // Already in the room or waiting on the host – nothing to do. Users who
        // were kicked or who left keep an entry (status 'kicked'/'left'); they
        // are allowed to request again, which overwrites that entry below.
        const existing = currentJoiners[user.id];
        if (existing && (existing.status === 'requested' || existing.status === 'joined')) return;
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
             toast.success("Request sent to host");
        } else {
             toast.error("Failed to send request");
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
        
        const { error } = await supabase.from('collab').update({ joiners: newJoiners }).eq('id', sessionId);
        if (!error) {
            setSessionData(prev => ({ ...prev, joiners: newJoiners }));
            toast.success("Member accepted");
        } else {
            toast.error("Failed to accept member");
        }
    }, [supabase, sessionId, sessionData, role, setSessionData]);

    const kickMember = useCallback(async (userId) => {
        if (role !== 'host') return;
        const currentJoiners = sessionData.joiners || {};
        const target = currentJoiners[userId];
        if (!target) return;
        // Mark the member as kicked instead of deleting the entry. Keeping a
        // record stops the kicked client from auto re-requesting access (which
        // only fires when there is no entry at all).
        const newJoiners = {
            ...currentJoiners,
            [userId]: { ...target, status: 'kicked', kickedAt: new Date().toISOString() }
        };
        const { error } = await supabase.from('collab').update({ joiners: newJoiners }).eq('id', sessionId);
        if (!error) {
            setSessionData(prev => ({ ...prev, joiners: newJoiners }));
            toast.success("Member removed");
        } else {
            toast.error("Failed to remove member");
        }
    }, [supabase, sessionId, sessionData, role, setSessionData]);

    const leaveSession = useCallback(async () => {
        if (!user || !sessionData) return;
        const currentJoiners = sessionData.joiners || {};
        const mine = currentJoiners[user.id];
        if (!mine) return;
        // Mark as left rather than deleting, otherwise the auto-request effect
        // would immediately re-add a join request and make leaving impossible.
        const newJoiners = {
            ...currentJoiners,
            [user.id]: { ...mine, status: 'left', leftAt: new Date().toISOString() }
        };
        const { error } = await supabase.from('collab').update({ joiners: newJoiners }).eq('id', sessionId);
        if (!error) {
            setSessionData(prev => ({ ...prev, joiners: newJoiners }));
            setRole('viewer');
            toast.info("You have left the session");
        } else {
            toast.error("Failed to leave session");
        }
    }, [supabase, sessionId, user, sessionData, setSessionData, setRole]);

    return { requestAccess, acceptRequest, kickMember, leaveSession };
};
