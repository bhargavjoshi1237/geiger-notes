import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request) {
    try {
        const supabase = await createClient();
        
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const contentLength = request.headers.get('content-length');
        if (!contentLength || contentLength === '0') {
            return NextResponse.json({ error: 'Empty request body' }, { status: 400 });
        }

        const body = await request.json();
        const { nodes, edges, viewport, boardId, projectId } = body;

        const nodesStr = typeof nodes === 'string' ? nodes : JSON.stringify(nodes);
        const edgesStr = typeof edges === 'string' ? edges : JSON.stringify(edges);
        const viewportStr = typeof viewport === 'string' ? viewport : JSON.stringify(viewport);

        let result;

        // Project board: persist to notes.project_boards as real jsonb (RLS
        // enforces project access + abilities). The project "home" canvas is the
        // row flagged with metadata.home, created on first save; sub-boards are
        // addressed by id.
        if (projectId) {
            const toJson = (v) => {
                if (v == null) return v;
                if (typeof v === 'string') { try { return JSON.parse(v); } catch { return v; } }
                return v;
            };
            const nodesJson = toJson(nodes);
            const edgesJson = toJson(edges);
            const viewportJson = toJson(viewport);

            const homePayload = {
                project_id: projectId,
                name: 'Home',
                nodes: nodesJson,
                edges: edgesJson,
                viewport: viewportJson,
                metadata: { home: true },
                created_by: user.id,
            };

            // Newest live home row for this project (resilient to legacy dupes;
            // order+limit instead of maybeSingle so >1 row never errors).
            const findHome = () =>
                supabase
                    .from('project_boards')
                    .select('id')
                    .eq('project_id', projectId)
                    .eq('metadata->>home', 'true')
                    .is('deleted_at', null)
                    .order('updated_at', { ascending: false })
                    .limit(1);

            if (boardId) {
                result = await supabase
                    .from('project_boards')
                    .update({ nodes: nodesJson, edges: edgesJson, viewport: viewportJson })
                    .eq('id', boardId)
                    .eq('project_id', projectId)
                    .select('id');

                // A matching-zero-rows update returns no error; surface it so the
                // client shows a failure instead of silently "saving" nothing.
                if (!result.error && !(result.data && result.data.length)) {
                    return NextResponse.json(
                        { error: 'Board not found or no write access' },
                        { status: 404 }
                    );
                }
            } else {
                const { data: homeRows, error: findErr } = await findHome();
                if (findErr) {
                    console.error('[API] Supabase error:', findErr);
                    return NextResponse.json(
                        { error: 'Database Error', details: findErr.message },
                        { status: 500 }
                    );
                }

                const existingHome = homeRows && homeRows[0];
                if (existingHome) {
                    result = await supabase
                        .from('project_boards')
                        .update({ nodes: nodesJson, edges: edgesJson, viewport: viewportJson })
                        .eq('id', existingHome.id)
                        .select('id');
                } else {
                    result = await supabase
                        .from('project_boards')
                        .insert(homePayload)
                        .select('id');

                    // Lost the create race (unique home index): update the winner.
                    if (result.error && result.error.code === '23505') {
                        const { data: winner } = await findHome();
                        if (winner && winner[0]) {
                            result = await supabase
                                .from('project_boards')
                                .update({ nodes: nodesJson, edges: edgesJson, viewport: viewportJson })
                                .eq('id', winner[0].id)
                                .select('id');
                        }
                    }
                }
            }

            if (result.error) {
                console.error('[API] Supabase error:', result.error);
                return NextResponse.json(
                    { error: 'Database Error', details: result.error.message },
                    { status: 500 }
                );
            }

            return NextResponse.json({ success: true });
        }

        if (boardId) {
             result = await supabase
                .from('boards')
                .update({
                    nodes: nodesStr,
                    edges: edgesStr,
                    viewport: viewportStr,
                    updated_at: new Date().toISOString()
                })
                .eq('id', boardId)
                .eq('user_id', user.id)
                .select('id');

            // Zero-row updates return no error; surface it instead of a silent no-op.
            if (!result.error && !(result.data && result.data.length)) {
                return NextResponse.json(
                    { error: 'Board not found or no write access' },
                    { status: 404 }
                );
            }
        } else {
            const { data: existing } = await supabase
                .from('base')
                .select('id')
                .eq('user_id', user.id)
                .single();

            if (existing) {
                 result = await supabase
                    .from('base')
                    .update({
                        nodes: nodesStr,
                        edges: edgesStr,
                        viewport: viewportStr
                    })
                    .eq('user_id', user.id);
            } else {
                 result = await supabase
                    .from('base')
                    .insert({
                        user_id: user.id,
                        nodes: nodesStr,
                        edges: edgesStr,
                        viewport: viewportStr
                    });
            }
        }

        if (result.error) {
            console.error('[API] Supabase error:', result.error);
             return NextResponse.json(
                { error: 'Database Error', details: result.error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[API] Error saving state:', error);
        return NextResponse.json(
            { error: 'Internal Server Error', details: error.message },
            { status: 500 }
        );
    }
}
