// Data-access layer for project boards (notes.project_boards).
//
// Reads/writes target the dedicated `notes` schema via notesClient(). The schema
// must be added to Settings -> API -> Exposed schemas in Supabase for these
// calls to resolve. RLS scopes every row to members of the board's project (and
// gates writes by the caller's abilities), so this module only filters by
// project_id + deleted_at — no user filtering here.
//
// The DB stores snake_case columns; the UI works in camelCase, so this module
// adapts between the two (toRow / normalizeProjectBoard) and always returns
// view-model objects the caller can render directly. Pure data access: it
// validates, console.errors on failure, and returns null/[]/false — never
// throws, never toasts.

import { createClient } from "@/lib/supabase/client";
import {
  notesClient,
  isSupabaseConfigured,
} from "@/supabase/components/notes-client";

const TABLE = "project_boards";

// DB row (snake_case) -> UI view model (camelCase). The metadata bag's keys are
// spread onto the view model so they read like first-class fields.
export function normalizeProjectBoard(row) {
  if (!row) {
    return null;
  }

  const metadata =
    row.metadata && typeof row.metadata === "object" ? row.metadata : {};

  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name ?? "Untitled Board",
    description: row.description ?? "",
    nodes: row.nodes ?? [],
    edges: row.edges ?? [],
    viewport: row.viewport ?? {},
    metadata,
    createdBy: row.created_by ?? null,
    deletedAt: row.deleted_at ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
    ...metadata,
  };
}

// Maps a camelCase patch (full or partial) to DB columns. Only keys present in
// `input` are emitted, so the same helper serves full creates and partial inline
// updates (e.g. { name } from a rename).
function toRow(input) {
  const row = {};

  if ("name" in input) {
    row.name = input.name?.trim() || "Untitled Board";
  }
  if ("description" in input) {
    row.description = input.description?.trim() || null;
  }
  if ("nodes" in input) {
    row.nodes = input.nodes ?? [];
  }
  if ("edges" in input) {
    row.edges = input.edges ?? [];
  }
  if ("viewport" in input) {
    row.viewport = input.viewport ?? {};
  }
  if ("metadata" in input) {
    row.metadata =
      input.metadata && typeof input.metadata === "object" ? input.metadata : {};
  }

  return row;
}

export async function listProjectBoards(projectId) {
  if (!projectId || !isSupabaseConfigured()) {
    return null;
  }

  try {
    const { data, error } = await notesClient()
      .from(TABLE)
      .select("*")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[notes.project_boards] list error:", error.message);
      return null;
    }

    return (data ?? []).map(normalizeProjectBoard);
  } catch (e) {
    console.error("[notes.project_boards] list error:", e);
    return null;
  }
}

export async function getProjectBoard(id) {
  if (!id || !isSupabaseConfigured()) {
    return null;
  }

  try {
    const { data, error } = await notesClient()
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      console.error("[notes.project_boards] get error:", error.message);
      return null;
    }

    return normalizeProjectBoard(data);
  } catch (e) {
    console.error("[notes.project_boards] get error:", e);
    return null;
  }
}

export async function createProjectBoard(projectId, input = {}) {
  if (!projectId || !isSupabaseConfigured()) {
    return null;
  }

  try {
    const {
      data: { user },
    } = await createClient().auth.getUser();

    const payload = {
      ...toRow(input),
      project_id: projectId,
      created_by: user?.id ?? null,
    };
    // Honor a caller-supplied UUID so an optimistic row and the inserted row match.
    if (input.id) {
      payload.id = input.id;
    }

    const { data, error } = await notesClient()
      .from(TABLE)
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      console.error("[notes.project_boards] create error:", error.message);
      return null;
    }

    return normalizeProjectBoard(data);
  } catch (e) {
    console.error("[notes.project_boards] create error:", e);
    return null;
  }
}

export async function updateProjectBoard(id, patch) {
  if (!id || !patch || !isSupabaseConfigured()) {
    return null;
  }

  const row = toRow(patch);
  if (Object.keys(row).length === 0) {
    return null;
  }

  try {
    const { data, error } = await notesClient()
      .from(TABLE)
      .update(row)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("[notes.project_boards] update error:", error.message);
      return null;
    }

    return normalizeProjectBoard(data);
  } catch (e) {
    console.error("[notes.project_boards] update error:", e);
    return null;
  }
}

// Soft delete — preserves the row; list queries filter on deleted_at.
export async function softDeleteProjectBoard(id) {
  if (!id || !isSupabaseConfigured()) {
    return false;
  }

  try {
    const { error } = await notesClient()
      .from(TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.error("[notes.project_boards] delete error:", error.message);
      return false;
    }

    return true;
  } catch (e) {
    console.error("[notes.project_boards] delete error:", e);
    return false;
  }
}
