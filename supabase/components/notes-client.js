// Reusable Supabase helpers for the Geiger Notes product schema.
//
// Import these directly wherever notes.* tables are read/written
// (e.g. `import { notesClient } from "@/supabase/components/notes-client"`).
// Keep this folder for small, shared helpers — not feature-specific data access.

import { createClient } from "@/lib/supabase/client";

// True only when both Supabase env vars are present. Guard every DB call with it
// so a missing env returns null/[]/false (the screen shows an empty state)
// rather than crashing — there is no static sample-data fallback.
export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// Browser Supabase client scoped to the dedicated `notes` Postgres schema
// (null when unconfigured). Use for every read/write against notes.* tables.
//
// Note: `.schema(...)` returns a data-only client (no `.auth`); when you also
// need the current user, create a base client via `createClient()` for auth and
// use `notesClient()` for the table operation.
export function notesClient() {
  return isSupabaseConfigured() ? createClient().schema("notes") : null;
}
