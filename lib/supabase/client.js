// Canonical browser Supabase client (anon key) for the data layer and project
// context. Talks to the default `public` schema — for notes.* tables use
// notesClient() from @/supabase/components/notes-client, which scopes this
// client to the `notes` schema.
// Browser clients are singletons shared with the notes-schema factory, so
// scope every public-table query with .schema("public") explicitly.

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
