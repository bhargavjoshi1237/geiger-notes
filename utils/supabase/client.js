import { createBrowserClient } from '@supabase/ssr'

// Default the data API to the `notes` schema so existing .from('boards'|'base'|
// 'collab'|'documents'|'user_settings') calls resolve to the relocated notes.*
// tables. Auth and Storage are unaffected by db.schema.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      db: { schema: 'notes' },
    }
  )
}
