import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

// Link targets for the sketch element-link picker, grouped and scoped in one
// response. URLs are assembled here so the client never builds routes by hand.
//
// Scope is decided by projectId: present -> the project's boards, sketches and
// the documents its boards reference; absent -> the caller's personal boards
// and sketches. RLS does the authorization.

const MAX_PER_GROUP = 200;

function parseNodes(value) {
  if (!value) return [];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return Array.isArray(value) ? value : [];
}

// Documents have no name of their own — the board node that points at one
// carries the label, so collect both from the boards' node arrays.
function collectDocuments(boardRows, basePath) {
  const seen = new Map();
  for (const board of boardRows) {
    for (const node of parseNodes(board.nodes)) {
      if (node?.type !== "document") continue;
      const documentId = node?.data?.documentId;
      if (!documentId || seen.has(documentId)) continue;
      seen.set(documentId, {
        id: documentId,
        name: node?.data?.label || "Untitled Document",
        url: `${basePath}?document=${documentId}`,
      });
    }
  }
  return [...seen.values()].slice(0, MAX_PER_GROUP);
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const excludeSketchId = searchParams.get("exclude");

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const basePath = projectId ? `/project/${projectId}` : `/${user.id}/home`;

    const boardQuery = projectId
      ? supabase
          .from("project_boards")
          .select("id, name, nodes, metadata")
          .eq("project_id", projectId)
          .is("deleted_at", null)
          .order("updated_at", { ascending: false })
          .limit(MAX_PER_GROUP)
      : supabase
          .from("boards")
          .select("id, name, nodes")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(MAX_PER_GROUP);

    let sketchQuery = supabase
      .from("sketches")
      .select("id, name")
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(MAX_PER_GROUP);

    sketchQuery = projectId
      ? sketchQuery.eq("project_id", projectId)
      : sketchQuery.eq("user_id", user.id).is("project_id", null);

    // The personal home canvas lives in notes.base, not notes.boards, so pull
    // its nodes separately to surface the documents it holds.
    const baseQuery = projectId
      ? Promise.resolve({ data: null, error: null })
      : supabase.from("base").select("nodes").eq("user_id", user.id).maybeSingle();

    const [boardsRes, sketchesRes, baseRes] = await Promise.all([
      boardQuery,
      sketchQuery,
      baseQuery,
    ]);

    if (boardsRes.error) {
      console.error("[API] Supabase error:", boardsRes.error);
      return NextResponse.json(
        { error: "Database Error", details: boardsRes.error.message },
        { status: 500 }
      );
    }
    if (sketchesRes.error) {
      console.error("[API] Supabase error:", sketchesRes.error);
      return NextResponse.json(
        { error: "Database Error", details: sketchesRes.error.message },
        { status: 500 }
      );
    }

    const boardRows = boardsRes.data ?? [];

    // The project home canvas is addressed by the bare path, not ?board=<id>.
    const boards = boardRows.map((board) => ({
      id: board.id,
      name: board.metadata?.home ? board.name || "Home" : board.name || "Untitled Board",
      url: board.metadata?.home ? basePath : `${basePath}?board=${board.id}`,
    }));

    // Personal scope has no home row in boards; add it explicitly.
    if (!projectId) {
      boards.unshift({ id: "home", name: "Home", url: basePath });
    }

    const documentSources = baseRes?.data ? [...boardRows, baseRes.data] : boardRows;

    const sketches = (sketchesRes.data ?? [])
      .filter((row) => row.id !== excludeSketchId)
      .map((row) => ({
        id: row.id,
        name: row.name || "Untitled Sketch",
        url: `${basePath}?sketch=${row.id}`,
      }));

    return NextResponse.json({
      boards,
      sketches,
      documents: collectDocuments(documentSources, basePath),
    });
  } catch (error) {
    console.error("[API] Error loading link targets:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
