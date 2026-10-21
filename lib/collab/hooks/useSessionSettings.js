import { useCallback, useMemo } from 'react';
import { toast } from "sonner";
import { canModerate, readPreference } from '../session';
import { updateCollabRow } from './collabRow';

// Host settings on notes.collab.preference: applied locally at once, then shallow-merged into a fresh read of the
// row, so two hosts toggling different settings don't overwrite each other. A refusal restores the stored value.
export const useSessionSettings = (supabase, sessionId, role, sessionData, setSessionData) => {
    const preference = useMemo(() => readPreference(sessionData), [sessionData]);

    const mergePreference = useCallback(async (patch, previous) => {
        setSessionData(prev => ({ ...prev, preference: { ...(prev?.preference || {}), ...patch } }));
        const result = await updateCollabRow(supabase, sessionId, 'preference', ({ preference: stored }) => ({
            preference: { ...(stored || {}), ...patch },
        }));
        if (result.error) {
            console.error('[collab.preference]', result.error);
            const restore = result.row ? result.row.preference : previous;
            setSessionData(prev => ({ ...prev, preference: restore }));
            toast.error(result.error.code === '42501' ? result.error.message : "Couldn't update the session");
            return false;
        }
        setSessionData(prev => ({ ...prev, preference: result.patch.preference }));
        return true;
    }, [supabase, sessionId, setSessionData]);

    const updatePreference = useCallback(
        (patch) => (canModerate(role) && sessionData ? mergePreference(patch, sessionData.preference) : Promise.resolve(false)),
        [role, sessionData, mergePreference]
    );

    const endSession = useCallback(
        () =>
            role === 'host' && sessionData
                ? mergePreference({ endedAt: new Date().toISOString(), focus: null }, sessionData.preference)
                : Promise.resolve(false),
        [role, sessionData, mergePreference]
    );

    const reopenSession = useCallback(async () => {
        if (role !== 'host' || !sessionData) return false;
        const ok = await mergePreference({ endedAt: null }, sessionData.preference);
        if (ok) toast.success("Session reopened");
        return ok;
    }, [role, sessionData, mergePreference]);

    return { preference, updatePreference, endSession, reopenSession };
};
