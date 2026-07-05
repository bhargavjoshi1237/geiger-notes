import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name = "Untitled Board", description = "", projectId } = body;

    // Project sub-board: create in notes.project_boards (jsonb columns, RLS
    // enforces project access + abilities). Personal boards keep the text-column
    // shape keyed by user_id.
    if (projectId) {
      const { data, error } = await supabase
        .from("project_boards")
        .insert({
          project_id: projectId,
          name,
          description,
          nodes: [],
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 },
          created_by: user.id,
        })
        .select("id, name")
        .single();

      if (error) {
        console.error("[API] Supabase error:", error);
        return NextResponse.json(
          { error: "Database Error", details: error.message },
          { status: 500 },
        );
      }

      return NextResponse.json(data);
    }

    const { data, error } = await supabase
      .from("boards")
      .insert({
        user_id: user.id,
        name,
        description,
        nodes: "[]",
        edges: "[]",
        viewport: '{"x":0,"y":0,"zoom":1}',
      })
      .select()
      .single();

    if (error) {
      console.error("[API] Supabase error:", error);
      return NextResponse.json(
        { error: "Database Error", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[API] Error creating board:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 },
    );
  }
}
