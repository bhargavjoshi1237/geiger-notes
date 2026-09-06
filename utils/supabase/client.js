import { createBrowserClient } from '@supabase/ssr'

// Default the data API to the `notes` schema so existing .from('boards'|'base'|
// 'collab'|'documents'|'user_settings') calls resolve to the relocated notes.*
// tables. Auth and Storage are unaffected by db.schema.
// This default is global to the browser singleton: never use this factory for
// public-schema tables — scope those with .schema("public") explicitly.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      db: { schema: 'notes' },
    }
  )
}
