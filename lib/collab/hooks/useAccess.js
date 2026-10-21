import { useCallback } from 'react';
import { toast } from "sonner";
import { getRandomColor } from '../utils';
import { canModerate, readPreference } from '../session';
import { updateCollabRow } from './collabRow';

const displayName = (user) => user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Unknown';
const refusal = (error, fallback) => (error?.code === '42501' ? error.message : fallback);

// Membership writes on notes.collab.joiners. Hosts and co-hosts manage others; anyone may request or leave.
// Each write re-reads joiners and changes only the entry it is about.
export const useAccess = (supabase, sessionId, user, sessionData, role, setSessionData, setRole) => {
    const writeRow = useCallback(async (columns, buildPatch) => {
        const result = await updateCollabRow(supabase, sessionId, columns, buildPatch);
        if (result.error) console.error('[collab.joiners]', result.error);
        else if (result.patch) setSessionData(prev => ({ ...prev, ...result.patch }));
        return result;
    }, [supabase, sessionId, setSessionData]);

    const requestAccess = useCallback(async () => {
        if (!user || !sessionData) return;
        // Kicked/left/viewer entries may ask again, which overwrites them; requested/joined have nothing to ask.
        const local = sessionData.joiners?.[user.id];
        if (local && (local.status === 'requested' || local.status === 'joined')) return;
        if (readPreference(sessionData).locked) {
            toast.error("The host has locked this session");
            return;
        }
        const { error, skipped } = await writeRow('joiners', ({ joiners }) => {
            const existing = joiners?.[user.id];
            if (existing && (existing.status === 'requested' || existing.status === 'joined')) return null;
            return {
                joiners: {
                    ...(joiners || {}),
                    [user.id]: {
                        id: user.id,
                        status: 'requested',
                        email: user.email,
                        name: displayName(user),
                        requestedAt: new Date().toISOString(),
                        ...(existing?.color ? { color: existing.color } : {}),
                    },
                },
            };
        });
        if (skipped) return;
        if (!error) {
            setRole('pending');
            toast.success(local?.status === 'viewer' ? "Asked the host for edit access" : "Request sent to host");
        } else {
            toast.error(refusal(error, "Failed to send request"));
        }
    }, [user, sessionData, writeRow, setRole]);

    // Admit a pending member, or move a member between editor / viewer / co-host.
    const setMemberRole = useCallback(async (userId, nextRole) => {
        if (!canModerate(role)) return;
        if (nextRole === 'cohost' && role !== 'host') return;
        let target = null;
        const { error, skipped } = await writeRow('joiners', ({ joiners }) => {
            target = joiners?.[userId];
            if (!target) return null;
            return {
                joiners: {
                    ...joiners,
                    [userId]: {
                        ...target,
                        status: nextRole === 'viewer' ? 'viewer' : 'joined',
                        cohost: nextRole === 'cohost',
                        joinedAt: target.status === 'requested' || !target.joinedAt ? new Date().toISOString() : target.joinedAt,
                        color: target.color || getRandomColor(),
                    },
                },
            };
        });
        if (skipped) return;
        const name = target?.name || 'Member';
        if (error) toast.error(refusal(error, "Couldn't update that member"));
        else if (target.status === 'requested') toast.success(nextRole === 'viewer' ? `${name} joined as a viewer` : "Member accepted");
        else toast.success(`${name} is now ${nextRole === 'cohost' ? 'a co-host' : nextRole === 'viewer' ? 'a viewer' : 'an editor'}`);
    }, [role, writeRow]);

    const acceptRequest = useCallback((userId) => setMemberRole(userId, 'editor'), [setMemberRole]);

    // Keep the record (status flag) so the removed client doesn't auto-request again.
    const removeEntry = useCallback(async (userId, successMessage) => {
        if (!canModerate(role)) return;
        const { error, skipped } = await writeRow('joiners', ({ joiners }) => {
            const target = joiners?.[userId];
            if (!target) return null;
            return {
                joiners: { ...joiners, [userId]: { ...target, status: 'kicked', cohost: false, kickedAt: new Date().toISOString() } },
            };
        });
        if (skipped) return;
        if (error) toast.error(refusal(error, "Failed to remove member"));
        else toast.success(successMessage);
    }, [role, writeRow]);

    const kickMember = useCallback((userId) => removeEntry(userId, "Member removed"), [removeEntry]);
    const rejectRequest = useCallback((userId) => removeEntry(userId, "Request declined"), [removeEntry]);

    const leaveSession = useCallback(async () => {
        if (!user || !sessionData) return;
        // Mark as left rather than deleting, otherwise the auto-request effect would re-add a request.
        const { error, skipped } = await writeRow('joiners', ({ joiners }) => {
            const mine = joiners?.[user.id];
            if (!mine) return null;
            return {
                joiners: { ...joiners, [user.id]: { ...mine, status: 'left', cohost: false, leftAt: new Date().toISOString() } },
            };
        });
        if (skipped) return;
        if (!error) {
            setRole('viewer');
            toast.info("You have left the session");
        } else {
            toast.error("Failed to leave session");
        }
    }, [user, sessionData, writeRow, setRole]);

    // Hand the host role to a member; the original owner is remembered so they can take it back.
    const transferHost = useCallback(async (userId) => {
        if (role !== 'host' || !user || userId === user.id) return;
        let target = null;
        const { error, skipped } = await writeRow('joiners, preference, created_at', ({ joiners, preference, created_at }) => {
            target = joiners?.[userId];
            if (!target) return null;
            const mine = joiners?.[user.id] || {};
            return {
                host: userId,
                preference: { ...(preference || {}), ownerId: preference?.ownerId || user.id },
                joiners: {
                    ...joiners,
                    [userId]: { ...target, status: 'joined', cohost: false },
                    [user.id]: {
                        ...mine,
                        id: user.id,
                        status: 'joined',
                        cohost: false,
                        email: user.email,
                        name: displayName(user),
                        joinedAt: mine.joinedAt || created_at,
                        color: mine.color || getRandomColor(),
                    },
                },
            };
        });
        if (skipped) return;
        if (error) toast.error(refusal(error, "Couldn't hand over the session"));
        else {
            setRole('editor');
            toast.success(`${target.name || 'Your pick'} is now the host`);
        }
    }, [role, user, writeRow, setRole]);

    const reclaimHost = useCallback(async () => {
        if (!user || !sessionData) return;
        if (readPreference(sessionData).ownerId !== user.id || sessionData.host === user.id) return;
        const { error } = await supabase.from('collab').update({ host: user.id }).eq('id', sessionId);
        if (error) {
            toast.error(refusal(error, "Couldn't reclaim the host role"));
            return;
        }
        setSessionData(prev => ({ ...prev, host: user.id }));
        setRole('host');
        toast.success("You're the host again");
    }, [supabase, sessionId, user, sessionData, setSessionData, setRole]);

    return {
        requestAccess, acceptRequest, rejectRequest, setMemberRole, kickMember, leaveSession, transferHost, reclaimHost,
    };
};
