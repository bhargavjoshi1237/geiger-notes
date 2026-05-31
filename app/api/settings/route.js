import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// GET /api/settings -> { settings: {...} }
// Returns the raw persisted blob (empty object for a first-time user). The
// client merges this on top of DEFAULT_SETTINGS, so a missing row — or even a
// not-yet-migrated table — degrades gracefully to defaults rather than erroring.
export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data, error } = await supabase
            .from('user_settings')
            .select('settings')
            .eq('user_id', user.id)
            .single();

        if (error) {
            // PGRST116 = no row yet. 42P01 = table missing (migration not run).
            if (error.code === 'PGRST116' || error.code === '42P01') {
                return NextResponse.json({ settings: {} });
            }
            console.error('[API settings] load error:', error);
            return NextResponse.json({ settings: {} });
        }

        return NextResponse.json({ settings: data?.settings || {} });
    } catch (error) {
        console.error('[API settings] Error loading settings:', error);
        return NextResponse.json({ settings: {} });
    }
}

// PUT /api/settings  body: { settings: {...} } -> { success: true }
export async function PUT(request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let body;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }

        const settings = body?.settings;
        if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
            return NextResponse.json({ error: 'Invalid settings payload' }, { status: 400 });
        }

        const { error } = await supabase
            .from('user_settings')
            .upsert(
                {
                    user_id: user.id,
                    settings,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'user_id' }
            );

        if (error) {
            console.error('[API settings] save error:', error);
            return NextResponse.json(
                { error: 'Database Error', details: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[API settings] Error saving settings:', error);
        return NextResponse.json(
            { error: 'Internal Server Error', details: error.message },
            { status: 500 }
        );
    }
}
