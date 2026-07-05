import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request) {
    try {
        const supabase = await createClient();
        const { searchParams } = new URL(request.url);
        const boardId = searchParams.get('boardId');
        const projectId = searchParams.get('projectId');

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Project board: read from notes.project_boards (RLS enforces project
        // access + abilities). The project "home" canvas is the row flagged with
        // metadata.home; sub-boards are addressed by id. jsonb values are
        // returned stringified so the client parses them exactly like the
        // personal (text) columns.
        if (projectId) {
            let pQuery = supabase
                .from('project_boards')
                .select('nodes, edges, viewport, name')
                .is('deleted_at', null);

            // Take the newest matching row via order+limit rather than
            // maybeSingle so a legacy duplicate home never errors the load.
            pQuery = boardId
                ? pQuery.eq('id', boardId)
                : pQuery.eq('project_id', projectId).eq('metadata->>home', 'true');

            const { data: pRows, error } = await pQuery
                .order('updated_at', { ascending: false })
                .limit(1);

            if (error) {
                console.error('[API] Supabase error:', error);
                return NextResponse.json(
                    { error: 'Database Error', details: error.message },
                    { status: 500 }
                );
            }

            const data = pRows && pRows[0];

            if (!data) {
                return NextResponse.json({ nodes: null, edges: null, viewport: null, name: null });
            }

            const asStr = (v) => (v == null ? null : JSON.stringify(v));
            return NextResponse.json({
                nodes: asStr(data.nodes),
                edges: asStr(data.edges),
                viewport: asStr(data.viewport),
                name: data.name ?? null,
            });
        }

        let query;
        if (boardId) {
            query = supabase
                .from('boards')
                .select('nodes, edges, viewport, name')
                .eq('id', boardId)
                .single();
        } else {
            query = supabase
                .from('base')
                .select('nodes, edges, viewport')
                .eq('user_id', user.id)
                .single();
        }

        const { data, error } = await query;

        if (error) {
            // If no record exists, return null (first time user)
            if (error.code === 'PGRST116') {
                return NextResponse.json({ 
                    nodes: null, 
                    edges: null, 
                    viewport: null,
                    name: null 
                });
            }
            console.error('[API] Supabase error:', error);
            return NextResponse.json(
                { error: 'Database Error', details: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            nodes: data.nodes,
            edges: data.edges,
            viewport: data.viewport,
            name: data.name
        });
    } catch (error) {
        console.error('[API] Error loading state:', error);
        return NextResponse.json(
            { error: 'Internal Server Error', details: error.message },
            { status: 500 }
        );
    }
}
