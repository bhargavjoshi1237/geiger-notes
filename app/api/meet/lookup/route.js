import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { meetingRefusal } from '@/lib/meet/access';

// Resolve a meeting code to its room. Mirrors /api/collab/lookup, but only ever
// matches a room that is still live — an ended meeting's code is dead, and the
// caller gets a clear 404 rather than joining an empty room. A locked room, or
// one the caller was removed from, refuses everyone but the host.

export async function POST(request) {
    try {
        const supabase = await createClient();
        const { code } = await request.json();

        if (!code) {
            return NextResponse.json({ error: 'Code is required' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('meet_rooms')
            .select('id, code, host, collab_session_id, metadata')
            .eq('code', String(code).trim().toUpperCase())
            .is('ended_at', null)
            .is('deleted_at', null)
            .maybeSingle();

        if (error || !data) {
            return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
        }

        const { data: { user } } = await supabase.auth.getUser();
        const refusal = meetingRefusal(data, user?.id ?? null);
        if (refusal) {
            return NextResponse.json({ error: refusal.error }, { status: refusal.status });
        }

        return NextResponse.json({
            roomId: data.id,
            code: data.code,
            host: data.host,
            collabSessionId: data.collab_session_id,
        });
    } catch (error) {
        console.error('[API] Error looking up meeting:', error);
        return NextResponse.json(
            { error: 'Internal Server Error', details: error.message },
            { status: 500 },
        );
    }
}
