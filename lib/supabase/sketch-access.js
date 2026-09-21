"use client";

// Advisory edit gate for a project sketch. RLS is the real enforcement — this
// only decides whether the editor opens in view mode and whether the client
// broadcasts element changes.
//
// Pure data access: validates, console.errors, returns a boolean — never
// throws, never toasts.

import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/supabase/components/notes-client";

// A personal sketch is always editable by its owner (RLS sees to that), so this
// is only asked for project sketches.
export async function canEditProjectSketch(projectId) {
  if (!projectId || !isSupabaseConfigured()) return true;
  try {
    const { data, error } = await createClient()
      .schema("notes")
      .rpc("has_ability", {
        target_project_id: projectId,
        ability: "sketches.update",
      });
    if (error) {
      console.error("[sketch-access]", error.message);
      // Fail open: RLS still refuses the write, and a false negative would
      // lock an editor out of their own sketch on a transient error.
      return true;
    }
    return data !== false;
  } catch (e) {
    console.error("[sketch-access]", e);
    return true;
  }
}
