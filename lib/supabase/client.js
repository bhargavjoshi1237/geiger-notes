// The one browser Supabase client factory. createBrowserClient is a page-wide singleton whose first caller sets its options.
// The data API defaults to the `notes` schema; scope public tables with .schema("public"). Auth and Storage are unaffected.

import { createBrowserClient } from "@supabase/ssr";
import { playgroundHandler } from "@/lib/playground/mode";

export function createClient() {
  // The landing playground serves an in-memory copy of the data instead.
  const playground = playgroundHandler("createClient");
  if (playground) return playground();
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      db: { schema: "notes" },
    }
  );
}
