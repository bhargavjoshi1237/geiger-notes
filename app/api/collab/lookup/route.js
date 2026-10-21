import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Resolve a session code. Ended sessions are gone; a locked one only lets its host and existing members back in.
export async function POST(request) {
    try {
        const supabase = await createClient();
        const { code } = await request.json();

        if (!code) {
            return NextResponse.json({ error: 'Code is required' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('collab')
            .select('id, host, joiners, preference')
            .eq('code', String(code).trim().toUpperCase())
            .single();

        if (error || !data) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        const preference = data.preference || {};
        if (preference.endedAt) {
            return NextResponse.json({ error: 'This session has ended' }, { status: 410 });
        }

        if (preference.locked) {
            const { data: { user } } = await supabase.auth.getUser();
            const status = user ? data.joiners?.[user.id]?.status : null;
            const member = user && (user.id === data.host || status === 'joined' || status === 'viewer' || status === 'requested');
            if (!member) {
                return NextResponse.json({ error: 'The host has locked this session' }, { status: 423 });
            }
        }

        return NextResponse.json({ sessionId: data.id });
    } catch (error) {
        console.error('[API] Error looking up session:', error);
        return NextResponse.json(
            { error: 'Internal Server Error', details: error.message },
            { status: 500 }
        );
    }
}
