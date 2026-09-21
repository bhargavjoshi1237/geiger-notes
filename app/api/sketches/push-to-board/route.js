import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { toBoardNodes } from "@/lib/sketch/to-board-nodes";

// Push a selection of sketch elements onto the board that hosts the sketch.
//
// The append happens server-side because the board is unmounted while the
// editor is open: there is no React state to hand the nodes to, and doing it
// here means no write race with the board's own autosave and no dependence on
// the user navigating back.
//
// The board's host is recorded on the sketch at creation time, in
// metadata.parentBoardId / metadata.parentScope.

function parseArray(value) {
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

function parseObject(value) {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof value === "object" ? value : {};
}

const EXT_FOR_MIME = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

// Excalidraw images live as dataURLs inside the scene's files; a React Flow
// image node needs a URL, so upload each one first. A failed upload skips that
// image rather than failing the whole push.
async function uploadSceneImages(supabase, sketchId, elements, files) {
  const imageUrls = {};
  const fileIds = [
    ...new Set(
      elements
        .filter((el) => el?.type === "image" && el.fileId && !el.locked)
        .map((el) => el.fileId)
    ),
  ];

  for (const fileId of fileIds) {
    const file = files[fileId];
    const dataURL = file?.dataURL;
    if (typeof dataURL !== "string" || !dataURL.startsWith("data:")) continue;

    try {
      const [header, payload] = dataURL.split(",");
      const mimeType = header.slice(5).split(";")[0] || "image/png";
      const bytes = Buffer.from(payload, "base64");
      const path = `sketches/${sketchId}/${fileId}.${EXT_FOR_MIME[mimeType] ?? "png"}`;

      const { error } = await supabase.storage
        .from("homeboard")
        .upload(path, bytes, { upsert: true, contentType: mimeType });
      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from("homeboard").getPublicUrl(path);
      imageUrls[fileId] = publicUrl;
    } catch (err) {
      console.error("[API] Sketch image upload failed:", err);
    }
  }

  return imageUrls;
}

// Resolve the host board exactly the way load-state does.
async function loadTargetBoard(supabase, { scope, boardId, projectId, userId }) {
  if (scope === "project") {
    let query = supabase
      .from("project_boards")
      .select("id, name, nodes, edges")
      .is("deleted_at", null);

    query = boardId
      ? query.eq("id", boardId)
      : query.eq("project_id", projectId).eq("metadata->>home", "true");

    const { data, error } = await query
      .order("updated_at", { ascending: false })
      .limit(1);
    if (error) throw error;
    const row = data && data[0];
    return row ? { table: "project_boards", row } : null;
  }

  if (boardId) {
    const { data, error } = await supabase
      .from("boards")
      .select("id, name, nodes, edges")
      .eq("id", boardId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data ? { table: "boards", row: data } : null;
  }

  const { data, error } = await supabase
    .from("base")
    .select("id, nodes, edges")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ? { table: "base", row: { ...data, name: "Home" } } : null;
}

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
    const { sketchId, elementIds } = body;

    if (!sketchId || !Array.isArray(elementIds) || !elementIds.length) {
      return NextResponse.json(
        { error: "Missing sketch id or selection" },
        { status: 400 }
      );
    }

    // RLS authorizes this read.
    const { data: sketch, error: sketchError } = await supabase
      .from("sketches")
      .select("id, project_id, elements, files, metadata")
      .eq("id", sketchId)
      .is("deleted_at", null)
      .single();

    if (sketchError || !sketch) {
      return NextResponse.json({ error: "Sketch not found" }, { status: 404 });
    }

    const metadata = parseObject(sketch.metadata);
    const scope = metadata.parentScope === "project" ? "project" : "personal";
    if (scope === "project" && !sketch.project_id) {
      return NextResponse.json({ error: "No host board" }, { status: 400 });
    }

    let target;
    try {
      target = await loadTargetBoard(supabase, {
        scope,
        boardId: metadata.parentBoardId ?? null,
        projectId: sketch.project_id,
        userId: user.id,
      });
    } catch (err) {
      console.error("[API] Supabase error:", err);
      return NextResponse.json(
        { error: "Database Error", details: err.message },
        { status: 500 }
      );
    }

    if (!target) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    const allElements = parseArray(sketch.elements);
    const files = parseObject(sketch.files);
    const wanted = new Set(elementIds);
    const selected = allElements.filter((el) => wanted.has(el?.id));

    if (!selected.length) {
      return NextResponse.json({ error: "Nothing to convert" }, { status: 400 });
    }

    const boardNodes = parseArray(target.row.nodes);
    const boardEdges = parseArray(target.row.edges);

    // Land the cluster immediately to the right of the sketch node it came from.
    const anchorNode = boardNodes.find(
      (node) => node?.type === "sketch" && node?.data?.sketchId === sketchId
    );
    const anchor = anchorNode
      ? {
          x: (anchorNode.position?.x ?? 0) + (anchorNode.style?.width ?? 320) + 80,
          y: anchorNode.position?.y ?? 0,
        }
      : { x: 0, y: 0 };

    const imageUrls = await uploadSceneImages(supabase, sketchId, selected, files);
    const { nodes, edges, skipped } = toBoardNodes(selected, files, anchor, {
      imageUrls,
    });

    if (!nodes.length && !edges.length) {
      return NextResponse.json({ nodes: 0, edges: 0, skipped, boardName: target.row.name });
    }

    const nextNodes = [...boardNodes, ...nodes];
    const nextEdges = [...boardEdges, ...edges];

    // Project boards store real jsonb; both personal tables store the array
    // stringified (notes.boards as text, notes.base as a JSON string inside
    // jsonb), exactly as save-state writes them. Getting this wrong corrupts a
    // board.
    const payload =
      target.table === "project_boards"
        ? { nodes: nextNodes, edges: nextEdges }
        : { nodes: JSON.stringify(nextNodes), edges: JSON.stringify(nextEdges) };

    const { error: writeError } = await supabase
      .from(target.table)
      .update(payload)
      .eq("id", target.row.id);

    if (writeError) {
      console.error("[API] Supabase error:", writeError);
      return NextResponse.json(
        { error: "Database Error", details: writeError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      nodes: nodes.length,
      edges: edges.length,
      skipped,
      boardName: target.row.name ?? "the board",
    });
  } catch (error) {
    console.error("[API] Error pushing sketch to board:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
