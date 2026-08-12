import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { randomBytes } from 'crypto';

// Open a meeting room. Mirrors /api/collab/create, but a meeting is its own
// feature: it mints its own code and stands on its own. `collabSessionId` is
// optional — pass it when the meeting was started from a running collab session
// so its members can join without typing a code.

function generateMeetCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const segment = () =>
        Array.from(randomBytes(4)).map((b) => chars[b % chars.length]).join('');
    return `MEET-${segment()}-${segment()}`;
}

export async function POST(request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json().catch(() => ({}));
        const collabSessionId = body?.collabSessionId || null;

        // Reuse the live room when one is already attached to this collab
        // session, so two people starting a meeting from the same board land in
        // the same call instead of two half-empty ones.
        if (collabSessionId) {
            const { data: existing } = await supabase
                .from('meet_rooms')
                .select('id, code')
                .eq('collab_session_id', collabSessionId)
                .is('ended_at', null)
                .is('deleted_at', null)
                .maybeSingle();
            if (existing) {
                return NextResponse.json({
                    success: true,
                    roomId: existing.id,
                    code: existing.code,
                    reused: true,
                });
            }
        }

        const { data, error } = await supabase
            .from('meet_rooms')
            .insert({
                code: generateMeetCode(),
                host: user.id,
                collab_session_id: collabSessionId,
                participants: {},
                created_by: user.id,
            })
            .select()
            .single();

        if (error) {
            console.error('[API] Supabase error creating meet room:', error);
            return NextResponse.json(
                { error: 'Database Error', details: error.message },
                { status: 500 },
            );
        }

        return NextResponse.json({
            success: true,
            roomId: data.id,
            code: data.code,
        });
    } catch (error) {
        console.error('[API] Error creating meet room:', error);
        return NextResponse.json(
            { error: 'Internal Server Error', details: error.message },
            { status: 500 },
        );
    }
}
