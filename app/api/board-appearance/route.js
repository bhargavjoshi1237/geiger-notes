import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Per-board canvas appearance lives in the board row's jsonb bag: project_boards.metadata, boards.metadata, or base.preference for the personal home canvas.

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

// Resolve which row + jsonb column holds this board's appearance.
async function locate(supabase, user, boardId, projectId) {
    if (projectId) {
        let q = supabase.from('project_boards').select('id, metadata').is('deleted_at', null);
        q = boardId ? q.eq('id', boardId) : q.eq('project_id', projectId).eq('metadata->>home', 'true');
        const { data, error } = await q.order('updated_at', { ascending: false }).limit(1);
        if (error) return { error };
        const row = data?.[0];
        return { table: 'project_boards', column: 'metadata', id: row?.id ?? null, bag: row?.metadata };
    }
    if (boardId) {
        const { data, error } = await supabase
            .from('boards')
            .select('id, metadata')
            .eq('id', boardId)
            .maybeSingle();
        if (error) return { error };
        return { table: 'boards', column: 'metadata', id: data?.id ?? null, bag: data?.metadata };
    }
    const { data, error } = await supabase
        .from('base')
        .select('id, preference')
        .eq('user_id', user.id)
        .maybeSingle();
    if (error) return { error };
    return { table: 'base', column: 'preference', id: data?.id ?? null, bag: data?.preference, personalHome: true };
}

async function authed() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return { supabase, user };
}

export async function GET(request) {
    try {
        const { supabase, user } = await authed();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const loc = await locate(supabase, user, searchParams.get('boardId'), searchParams.get('projectId'));
        if (loc.error) {
            console.error('[API] board-appearance load:', loc.error.message);
            return NextResponse.json({ appearance: null });
        }
        const bag = isObj(loc.bag) ? loc.bag : {};
        return NextResponse.json({ appearance: isObj(bag.appearance) ? bag.appearance : null });
    } catch (error) {
        console.error('[API] board-appearance load:', error);
        return NextResponse.json({ appearance: null });
    }
}

export async function PUT(request) {
    try {
        const { supabase, user } = await authed();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { boardId, projectId, appearance } = await request.json();
        if (!isObj(appearance)) return NextResponse.json({ error: 'Invalid appearance' }, { status: 400 });

        const loc = await locate(supabase, user, boardId || null, projectId || null);
        if (loc.error) {
            return NextResponse.json({ error: 'Database Error', details: loc.error.message }, { status: 500 });
        }

        // Merge so other metadata keys (e.g. project home's { home: true }) survive.
        const bag = { ...(isObj(loc.bag) ? loc.bag : {}), appearance };

        let result;
        if (loc.id) {
            let q = supabase.from(loc.table).update({ [loc.column]: bag }).eq('id', loc.id);
            if (loc.table === 'boards') q = q.eq('user_id', user.id);
            result = await q.select('id');
        } else if (loc.personalHome) {
            result = await supabase.from('base').insert({ user_id: user.id, preference: bag }).select('id');
        } else {
            return NextResponse.json({ error: 'Board not found' }, { status: 404 });
        }

        if (result.error) {
            console.error('[API] board-appearance save:', result.error.message);
            return NextResponse.json({ error: 'Database Error', details: result.error.message }, { status: 500 });
        }
        if (!result.data?.length) {
            return NextResponse.json({ error: 'Board not found or no write access' }, { status: 404 });
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[API] board-appearance save:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
