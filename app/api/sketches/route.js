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

    const body = await request.json().catch(() => ({}));
    const { name, description, projectId } = body;

    const payload = projectId
      ? {
          name: name ?? "Untitled Sketch",
          description: description ?? null,
          project_id: projectId,
          created_by: user.id,
        }
      : {
          name: name ?? "Untitled Sketch",
          description: description ?? null,
          user_id: user.id,
          created_by: user.id,
        };

    const { data, error } = await supabase
      .from("sketches")
      .insert(payload)
      .select("id, name")
      .single();

    if (error) {
      console.error("[API] Supabase error:", error);
      return NextResponse.json(
        { error: "Database Error", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[API] Error creating sketch:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const ids = searchParams.get("ids");

  if (!id && !ids) {
    return NextResponse.json({ error: "Missing sketch ID" }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (ids) {
      const list = ids
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 50);
      if (!list.length) {
        return NextResponse.json({ error: "Missing sketch IDs" }, { status: 400 });
      }
      const { data, error } = await supabase
        .from("sketches")
        .select("id, name, elements, files, updated_at")
        .in("id", list)
        .is("deleted_at", null);

      if (error) {
        console.error("[API] Supabase error:", error);
        return NextResponse.json(
          { error: "Database Error", details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json(data ?? []);
    }

    const { data, error } = await supabase
      .from("sketches")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error) {
      console.error("[API] Supabase error:", error);
      return NextResponse.json(
        { error: "Sketch not found", details: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[API] Error fetching sketch:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
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
    const { id, elements, app_state, files, name } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    const patch = {};
    if ("elements" in body) patch.elements = elements;
    if ("app_state" in body) patch.app_state = app_state;
    if ("files" in body) patch.files = files;
    if ("name" in body) patch.name = name;

    const { data, error } = await supabase
      .from("sketches")
      .update(patch)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[API] Supabase error:", error);
      return NextResponse.json(
        { error: "Database Error", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[API] Error updating sketch:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing sketch ID" }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("sketches")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.error("[API] Supabase error:", error);
      return NextResponse.json(
        { error: "Database Error", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] Error deleting sketch:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
