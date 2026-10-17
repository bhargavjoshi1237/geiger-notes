// In-browser stand-ins for the app's own /api/* route handlers (app/api/**),
// answered by interceptFetch from the in-memory database. Each one mirrors its
// server route's query and response shape — notably load-state returns
// nodes/edges/viewport as JSON strings — so the canvas, document editor,
// sketch editor and settings run unchanged.

import { json } from "./intercept_fetch.js";
import { PLAYGROUND_USER } from "./db.js";
import { toBoardNodes } from "@/lib/sketch/to-board-nodes";

const UNAVAILABLE = "Live sessions and meetings need a Geiger account — sign in to start one.";

const asStr = (v) => (v == null ? null : JSON.stringify(v));

function toJson(v) {
  if (typeof v !== "string") return v;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}

function parseArray(value) {
  const parsed = toJson(value);
  return Array.isArray(parsed) ? parsed : [];
}

function parseObject(value) {
  const parsed = toJson(value);
  return parsed && typeof parsed === "object" ? parsed : {};
}

function dbError(error) {
  return json({ error: "Database Error", details: error.message }, 500);
}

export function createApiRoutes(getClient) {
  const sb = () => getClient();
  const userId = PLAYGROUND_USER.id;

  async function newestProjectBoard(projectId, boardId, columns) {
    let query = sb().from("project_boards").select(columns).is("deleted_at", null);
    query = boardId ? query.eq("id", boardId) : query.eq("project_id", projectId).eq("metadata->>home", "true");
    const { data, error } = await query.order("updated_at", { ascending: false }).limit(1);
    if (error) throw error;
    return data?.[0] ?? null;
  }

  async function loadState({ query }) {
    const { boardId, projectId } = query;
    if (projectId) {
      const row = await newestProjectBoard(projectId, boardId, "nodes, edges, viewport, name");
      if (!row) return { nodes: null, edges: null, viewport: null, name: null };
      return { nodes: asStr(row.nodes), edges: asStr(row.edges), viewport: asStr(row.viewport), name: row.name ?? null };
    }

    if (boardId) {
      const { data } = await sb().from("boards").select("nodes, edges, viewport, name").eq("id", boardId).maybeSingle();
      if (data) return { nodes: data.nodes, edges: data.edges, viewport: data.viewport, name: data.name };
      // A project board downloaded by id alone (Download Board) still resolves here.
      const row = await newestProjectBoard(null, boardId, "nodes, edges, viewport, name");
      if (!row) return { nodes: null, edges: null, viewport: null, name: null };
      return { nodes: asStr(row.nodes), edges: asStr(row.edges), viewport: asStr(row.viewport), name: row.name ?? null };
    }

    const { data } = await sb().from("base").select("nodes, edges, viewport").eq("user_id", userId).maybeSingle();
    return data
      ? { nodes: data.nodes, edges: data.edges, viewport: data.viewport, name: null }
      : { nodes: null, edges: null, viewport: null, name: null };
  }

  async function saveState({ body }) {
    const { nodes, edges, viewport, boardId, projectId } = body || {};
    if (projectId) {
      const patch = { nodes: toJson(nodes), edges: toJson(edges), viewport: toJson(viewport) };
      if (boardId) {
        const { data, error } = await sb()
          .from("project_boards")
          .update(patch)
          .eq("id", boardId)
          .eq("project_id", projectId)
          .select("id");
        if (error) return dbError(error);
        if (!data?.length) return json({ error: "Board not found or no write access" }, 404);
        return { success: true };
      }
      const home = await newestProjectBoard(projectId, null, "id");
      const { error } = home
        ? await sb().from("project_boards").update(patch).eq("id", home.id)
        : await sb()
            .from("project_boards")
            .insert({ ...patch, project_id: projectId, name: "Home", metadata: { home: true }, created_by: userId, deleted_at: null });
      return error ? dbError(error) : { success: true };
    }

    const stringified = { nodes: asStr(toJson(nodes)), edges: asStr(toJson(edges)), viewport: asStr(toJson(viewport)) };
    if (boardId) {
      const { data, error } = await sb().from("boards").update(stringified).eq("id", boardId).eq("user_id", userId).select("id");
      if (error) return dbError(error);
      if (!data?.length) return json({ error: "Board not found or no write access" }, 404);
      return { success: true };
    }
    const { error } = await sb().from("base").upsert({ user_id: userId, ...stringified }, { onConflict: "user_id" });
    return error ? dbError(error) : { success: true };
  }

  async function createBoard({ body }) {
    const { name = "Untitled Board", description = "", projectId } = body || {};
    if (projectId) {
      const { data, error } = await sb()
        .from("project_boards")
        .insert({
          project_id: projectId,
          name,
          description,
          nodes: [],
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 },
          metadata: {},
          created_by: userId,
          deleted_at: null,
        })
        .select("id, name")
        .single();
      return error ? dbError(error) : data;
    }
    const { data, error } = await sb()
      .from("boards")
      .insert({ user_id: userId, name, description, nodes: "[]", edges: "[]", viewport: '{"x":0,"y":0,"zoom":1}' })
      .select()
      .single();
    return error ? dbError(error) : data;
  }

  // The real route only renames personal boards; here a project board renames too.
  async function updateBoard({ body }) {
    const { boardId, name } = body || {};
    const personal = await sb().from("boards").update({ name }).eq("id", boardId).eq("user_id", userId).select().maybeSingle();
    if (personal.data) return personal.data;
    const { data, error } = await sb().from("project_boards").update({ name }).eq("id", boardId).select().single();
    return error ? dbError(error) : data;
  }

  async function createDocument() {
    const { data, error } = await sb().from("documents").insert({ content: {} }).select().single();
    return error ? dbError(error) : data;
  }

  async function getDocument({ query }) {
    if (!query.id) return json({ error: "Missing document ID" }, 400);
    const { data, error } = await sb().from("documents").select("*").eq("id", query.id).single();
    return error ? json({ error: "Document not found", details: error.message }, 404) : data;
  }

  async function updateDocument({ body }) {
    const { id, content } = body || {};
    if (!id || !content) return json({ error: "Missing ID or content" }, 400);
    const { data, error } = await sb()
      .from("documents")
      .update({ content, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    return error ? dbError(error) : data;
  }

  async function getSettings() {
    const { data } = await sb().from("user_settings").select("settings").eq("user_id", userId).maybeSingle();
    return { settings: data?.settings || {} };
  }

  async function saveSettings({ body }) {
    const settings = body?.settings;
    if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
      return json({ error: "Invalid settings payload" }, 400);
    }
    const { error } = await sb()
      .from("user_settings")
      .upsert({ user_id: userId, settings, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    return error ? dbError(error) : { success: true };
  }

  async function createSketch({ body }) {
    const { name, description, projectId, metadata } = body || {};
    const payload = {
      name: name ?? "Untitled Sketch",
      description: description ?? null,
      ...(projectId ? { project_id: projectId, user_id: null } : { project_id: null, user_id: userId }),
      created_by: userId,
      elements: [],
      app_state: {},
      files: {},
      metadata: metadata && typeof metadata === "object" ? metadata : {},
      deleted_at: null,
    };
    const { data, error } = await sb().from("sketches").insert(payload).select("id, name, metadata").single();
    return error ? dbError(error) : data;
  }

  async function getSketches({ query }) {
    if (query.ids) {
      const list = query.ids.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 50);
      if (!list.length) return json({ error: "Missing sketch IDs" }, 400);
      const { data, error } = await sb()
        .from("sketches")
        .select("id, name, elements, files, updated_at")
        .in("id", list)
        .is("deleted_at", null);
      return error ? dbError(error) : data ?? [];
    }
    if (!query.id) return json({ error: "Missing sketch ID" }, 400);
    const { data, error } = await sb().from("sketches").select("*").eq("id", query.id).is("deleted_at", null).single();
    return error ? json({ error: "Sketch not found", details: error.message }, 404) : data;
  }

  async function updateSketch({ body }) {
    if (!body?.id) return json({ error: "Missing ID" }, 400);
    const patch = {};
    for (const key of ["elements", "app_state", "files", "name", "metadata"]) {
      if (key in body) patch[key] = body[key];
    }
    if ("description" in body) patch.description = body.description || null;
    const { data, error } = await sb().from("sketches").update(patch).eq("id", body.id).select().single();
    return error ? dbError(error) : data;
  }

  async function deleteSketch({ query }) {
    if (!query.id) return json({ error: "Missing sketch ID" }, 400);
    const { error } = await sb().from("sketches").update({ deleted_at: new Date().toISOString() }).eq("id", query.id);
    return error ? dbError(error) : { success: true };
  }

  async function linkTargets({ query }) {
    const { projectId, exclude } = query;
    const basePath = projectId ? `/project/${projectId}` : `/${userId}/home`;
    const boardQuery = projectId
      ? sb().from("project_boards").select("id, name, nodes, metadata").eq("project_id", projectId).is("deleted_at", null)
      : sb().from("boards").select("id, name, nodes").eq("user_id", userId);
    let sketchQuery = sb().from("sketches").select("id, name").is("deleted_at", null);
    sketchQuery = projectId ? sketchQuery.eq("project_id", projectId) : sketchQuery.eq("user_id", userId).is("project_id", null);

    const [boardsRes, sketchesRes] = await Promise.all([
      boardQuery.order("updated_at", { ascending: false }).limit(200),
      sketchQuery.order("updated_at", { ascending: false }).limit(200),
    ]);
    if (boardsRes.error) return dbError(boardsRes.error);
    if (sketchesRes.error) return dbError(sketchesRes.error);

    const boardRows = boardsRes.data ?? [];
    const boards = boardRows.map((b) => ({
      id: b.id,
      name: b.metadata?.home ? b.name || "Home" : b.name || "Untitled Board",
      url: b.metadata?.home ? basePath : `${basePath}?board=${b.id}`,
    }));
    if (!projectId) boards.unshift({ id: "home", name: "Home", url: basePath });

    const documents = new Map();
    for (const b of boardRows) {
      for (const n of parseArray(b.nodes)) {
        const documentId = n?.type === "document" ? n?.data?.documentId : null;
        if (!documentId || documents.has(documentId)) continue;
        documents.set(documentId, { id: documentId, name: n.data.label || "Untitled Document", url: `${basePath}?document=${documentId}` });
      }
    }

    return {
      boards,
      sketches: (sketchesRes.data ?? [])
        .filter((s) => s.id !== exclude)
        .map((s) => ({ id: s.id, name: s.name || "Untitled Sketch", url: `${basePath}?sketch=${s.id}` })),
      documents: [...documents.values()].slice(0, 200),
    };
  }

  // Images keep their dataURL as the node src — nothing is uploaded from the playground.
  async function pushToBoard({ body }) {
    const { sketchId, elementIds } = body || {};
    if (!sketchId || !Array.isArray(elementIds) || !elementIds.length) {
      return json({ error: "Missing sketch id or selection" }, 400);
    }
    const { data: sketch } = await sb()
      .from("sketches")
      .select("id, project_id, elements, files, metadata")
      .eq("id", sketchId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!sketch) return json({ error: "Sketch not found" }, 404);

    const metadata = parseObject(sketch.metadata);
    const target = metadata.parentScope === "project"
      ? await newestProjectBoard(sketch.project_id, metadata.parentBoardId ?? null, "id, name, nodes, edges")
      : null;
    if (!target) return json({ error: "Board not found" }, 404);

    const wanted = new Set(elementIds);
    const selected = parseArray(sketch.elements).filter((el) => wanted.has(el?.id));
    if (!selected.length) return json({ error: "Nothing to convert" }, 400);

    const files = parseObject(sketch.files);
    const imageUrls = Object.fromEntries(
      Object.entries(files)
        .filter(([, f]) => typeof f?.dataURL === "string")
        .map(([fileId, f]) => [fileId, f.dataURL]),
    );
    const boardNodes = parseArray(target.nodes);
    const anchorNode = boardNodes.find((n) => n?.type === "sketch" && n?.data?.sketchId === sketchId);
    const anchor = anchorNode
      ? { x: (anchorNode.position?.x ?? 0) + (anchorNode.style?.width ?? 320) + 80, y: anchorNode.position?.y ?? 0 }
      : { x: 0, y: 0 };
    const { nodes, edges, skipped } = toBoardNodes(selected, files, anchor, { imageUrls });

    if (nodes.length || edges.length) {
      const { error } = await sb()
        .from("project_boards")
        .update({ nodes: [...boardNodes, ...nodes], edges: [...parseArray(target.edges), ...edges] })
        .eq("id", target.id);
      if (error) return dbError(error);
    }
    return { nodes: nodes.length, edges: edges.length, skipped, boardName: target.name ?? "the board" };
  }

  // Same lookup as app/api/board-appearance: the jsonb bag that holds this board's metadata.appearance.
  async function appearanceRow(boardId, projectId) {
    if (projectId) {
      const row = await newestProjectBoard(projectId, boardId || null, "id, metadata");
      return row ? { table: "project_boards", column: "metadata", id: row.id, bag: parseObject(row.metadata) } : null;
    }
    if (boardId) {
      const { data } = await sb().from("boards").select("id, metadata").eq("id", boardId).maybeSingle();
      return data ? { table: "boards", column: "metadata", id: data.id, bag: parseObject(data.metadata) } : null;
    }
    const { data } = await sb().from("base").select("id, preference").eq("user_id", userId).maybeSingle();
    return { table: "base", column: "preference", id: data?.id ?? null, bag: parseObject(data?.preference) };
  }

  async function getAppearance({ query }) {
    const row = await appearanceRow(query.boardId, query.projectId);
    return { appearance: row?.bag?.appearance ?? null };
  }

  async function saveAppearance({ body }) {
    const { boardId, projectId, appearance } = body || {};
    const row = await appearanceRow(boardId, projectId);
    if (!row) return json({ error: "Board not found" }, 404);
    const bag = { ...row.bag, appearance };
    const { error } = row.id
      ? await sb().from(row.table).update({ [row.column]: bag }).eq("id", row.id)
      : await sb().from("base").upsert({ user_id: userId, preference: bag }, { onConflict: "user_id" });
    return error ? dbError(error) : { success: true };
  }

  // Offline link cards fall back to the plain URL row; the hostname is the only thing we know.
  function linkPreview({ query }) {
    try {
      const url = new URL(query.url);
      return { title: null, description: null, image: null, favicon: null, siteName: url.hostname, url: url.href };
    } catch {
      return json({ error: "Invalid URL" }, 400);
    }
  }

  // Canned AI output so the playground's AI node demonstrates the flow without a model call.
  function aiNode({ body }) {
    const lines = String(body?.context || "")
      .split("\n")
      .map((l) => l.replace(/^[-*\s#]+/, "").trim())
      .filter((l) => l.length > 3)
      .slice(0, 4);
    const items = lines.length ? lines : ["Sign in to run real AI actions", "Connect notes to this node", "Pick an action and run it"];
    return {
      text: "This is a playground preview — sign in to a Geiger account to run AI on your own notes. Here's a sketch of what it would return:",
      items,
    };
  }

  const unavailable = () => json({ error: UNAVAILABLE }, 403);

  return [
    ["GET", "/api/load-state", loadState],
    ["POST", "/api/save-state", saveState],
    ["POST", "/api/create-board", createBoard],
    ["POST", "/api/update-board", updateBoard],
    ["POST", "/api/documents", createDocument],
    ["GET", "/api/documents", getDocument],
    ["PUT", "/api/documents", updateDocument],
    ["GET", "/api/settings", getSettings],
    ["PUT", "/api/settings", saveSettings],
    ["POST", "/api/sketches", createSketch],
    ["GET", "/api/sketches", getSketches],
    ["PUT", "/api/sketches", updateSketch],
    ["DELETE", "/api/sketches", deleteSketch],
    ["GET", "/api/sketches/link-targets", linkTargets],
    ["POST", "/api/sketches/push-to-board", pushToBoard],
    ["GET", "/api/board-appearance", getAppearance],
    ["PUT", "/api/board-appearance", saveAppearance],
    ["GET", "/api/link-preview", linkPreview],
    ["POST", "/api/ai/node", aiNode],
    ["POST", "/api/collab/create", unavailable],
    ["POST", "/api/collab/lookup", unavailable],
    ["POST", "/api/meet/create", unavailable],
    ["POST", "/api/meet/lookup", unavailable],
  ];
}
