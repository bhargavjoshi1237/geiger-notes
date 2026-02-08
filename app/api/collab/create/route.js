import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { randomBytes } from 'crypto';

function generateSessionCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const segment1 = Array.from(randomBytes(4)).map(b => chars[b % chars.length]).join('');
    const segment2 = Array.from(randomBytes(4)).map(b => chars[b % chars.length]).join('');
    return `GEIGER-${segment1}-${segment2}`;
}

export async function POST(request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const body = await request.json();
        const { nodes, edges } = body;
        const sessionCode = generateSessionCode();
        const nodesStr = typeof nodes === 'string' ? nodes : JSON.stringify(nodes);
        const edgesStr = typeof edges === 'string' ? edges : JSON.stringify(edges);
        const { data, error } = await supabase
            .from('collab')
            .insert({
                host: user.id,
                code: sessionCode, 
                state_nodes: nodesStr,
                state_edges: edgesStr,
                joiners: {}, 
                preference: {} 
            })
            .select() 
            .single();

        if (error) {
            console.error('[API] Supabase error creating collab session:', error);
            return NextResponse.json(
                { error: 'Database Error', details: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ 
            success: true, 
            sessionId: data.id,
            sessionCode: data.code 
        });

    } catch (error) {
        console.error('[API] Error creating collab session:', error);
        return NextResponse.json(
            { error: 'Internal Server Error', details: error.message },
            { status: 500 }
        );
    }
}
