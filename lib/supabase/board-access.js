"use client";

// Advisory per-board access control for project boards (Phase 1: UI-gated).
//
// A project board can restrict who (among the project's members) may enter,
// view, or edit it, and can require an access key. The config lives in the
// board's own metadata bag at notes.project_boards.metadata.access:
//
//   { mode: 'keyless'|'keyed', key, defaultLevel, members: { [uid]: level } }
//
// Levels: 'none' | 'view' | 'edit' | 'manage'. The board creator and the project
// owner always have manage rights and bypass the entry key. An unconfigured
// board stays fully open (edit for every member) so existing boards are
// unchanged until someone opens Manage Access and saves.
//
// This is advisory — it gates the app, not the raw DB. Reads/writes go through
// the project-boards data layer; the member roster comes from the shared public
// tables. Pure data access: validates, console.errors, returns null/[]/false —
// never throws, never toasts.

import { createClient } from "@/lib/supabase/client";
import { getUser } from "@/lib/supabase/user";
import {
  isSupabaseConfigured,
  notesClient,
} from "@/supabase/components/notes-client";
import {
  getProjectBoard,
  updateProjectBoard,
} from "@/lib/supabase/project-boards";

export const ACCESS_LEVELS = ["none", "view", "edit", "manage"];
export const ACCESS_LEVEL_LABELS = {
  none: "No access",
  view: "View only",
  edit: "Can edit",
  manage: "Manage",
};
// A default level can't be "manage" — that's an explicit per-member grant.
export const DEFAULT_LEVEL_OPTIONS = ["none", "view", "edit"];
export const ENTRY_MODES = ["keyless", "keyed"];

// Coerce any stored/incoming shape into a complete, safe config object.
export function normalizeAccessConfig(raw) {
  const safe = raw && typeof raw === "object" ? raw : {};
  return {
    mode: safe.mode === "keyed" ? "keyed" : "keyless",
    key: typeof safe.key === "string" ? safe.key : "",
    defaultLevel: DEFAULT_LEVEL_OPTIONS.includes(safe.defaultLevel)
      ? safe.defaultLevel
      : "view",
    members:
      safe.members && typeof safe.members === "object"
        ? { ...safe.members }
        : {},
  };
}

// Pure resolver: given a board's config + who is asking, what can they do?
export function resolveBoardAccess({
  config,
  configured,
  uid,
  createdBy,
  role,
}) {
  const isManager =
    (uid && createdBy && uid === createdBy) || role === "owner";

  let level;
  if (isManager) {
    level = "manage";
  } else if (!configured) {
    level = "edit"; // unconfigured boards stay fully open
  } else {
    level = (uid && config.members?.[uid]) || config.defaultLevel || "view";
  }

  const canEnter = level !== "none";
  const canEdit = level === "edit" || level === "manage";
  const canManage = level === "manage";
  const needsKey =
    configured && config.mode === "keyed" && !isManager && canEnter;

  return {
    level,
    canEnter,
    canEdit,
    canManage,
    needsKey,
    key: config?.key || "",
  };
}

// The caller's role for a project via the shared security-definer resolver
// ('owner' | a role key | null). Falls back to null when unavailable.
export async function getMyProjectRole(projectId) {
  if (!projectId || !isSupabaseConfigured()) return null;
  try {
    const sb = notesClient();
    if (!sb) return null;
    const { data, error } = await sb.rpc("project_role", {
      target_project_id: projectId,
    });
    if (error) {
      console.error("[board-access] role error:", error.message);
      return null;
    }
    return data ?? null;
  } catch (e) {
    console.error("[board-access] role error:", e);
    return null;
  }
}

// The project's members (from the shared public tables). Degrades to [] when the
// project has no org, the tables aren't readable, or the DB is unconfigured — so
// the dialog still works with just the default level + entry mode controls.
export async function listProjectMembers(projectId) {
  if (!projectId || !isSupabaseConfigured()) return [];
  try {
    const supabase = createClient();
    const { data: project } = await supabase
      .from("projects")
      .select("organization_id, created_by")
      .eq("id", projectId)
      .maybeSingle();

    const orgId = project?.organization_id;
    if (!orgId) return [];

    const { data: memberships, error } = await supabase
      .from("organization_users")
      .select("user, role")
      .eq("organization", orgId);

    if (error) {
      console.error("[board-access] members error:", error.message);
      return [];
    }

    const ids = (memberships || []).map((m) => m.user).filter(Boolean);
    const usersById = {};
    if (ids.length) {
      const { data: users } = await supabase
        .from("users")
        .select("*")
        .in("id", ids);
      (users || []).forEach((u) => {
        usersById[u.id] = u;
      });
    }

    return (memberships || []).map((m) => {
      const u = usersById[m.user] || {};
      return {
        id: m.user,
        name: u.full_name || u.name || u.display_name || u.email || "Member",
        email: u.email || "",
        avatar: u.avatar_url || u.avatar || null,
        role: (m.role || "member").toString(),
        isCreator: project.created_by === m.user,
      };
    });
  } catch (e) {
    console.error("[board-access] members error:", e);
    return [];
  }
}

// Load a board's access config (+ its creator) for the Manage Access dialog.
export async function getBoardAccessConfig(boardId) {
  if (!boardId) return null;
  const board = await getProjectBoard(boardId);
  if (!board) return null;
  const raw = board.metadata?.access ?? null;
  return {
    createdBy: board.createdBy ?? null,
    config: normalizeAccessConfig(raw),
    configured: Boolean(raw),
    metadata: board.metadata || {},
  };
}

// Persist a board's access config, shallow-merged into its metadata bag so other
// metadata (e.g. home flag) is preserved.
export async function saveBoardAccessConfig(boardId, config) {
  if (!boardId || !isSupabaseConfigured()) return false;
  const board = await getProjectBoard(boardId);
  if (!board) return false;
  const nextMeta = {
    ...(board.metadata || {}),
    access: normalizeAccessConfig(config),
  };
  const updated = await updateProjectBoard(boardId, { metadata: nextMeta });
  return Boolean(updated);
}

// Gate for opening a board node: resolves the current user's access to the
// target board. Fails open (advisory) so a personal board or any read failure
// never blocks navigation.
export async function checkBoardEntry(boardId, projectId) {
  const open = {
    canEnter: true,
    canEdit: true,
    canManage: false,
    needsKey: false,
    key: "",
    level: "edit",
  };
  if (!boardId || !projectId || !isSupabaseConfigured()) return open;
  try {
    const [info, user, role] = await Promise.all([
      getBoardAccessConfig(boardId),
      getUser(),
      getMyProjectRole(projectId),
    ]);
    if (!info) return open;
    return resolveBoardAccess({
      config: info.config,
      configured: info.configured,
      uid: user?.id ?? null,
      createdBy: info.createdBy,
      role,
    });
  } catch (e) {
    console.error("[board-access] entry check error:", e);
    return open;
  }
}

// Whether the current user may open Manage Access for a board (creator/owner).
export async function canManageBoard(boardId, projectId) {
  if (!boardId || !projectId || !isSupabaseConfigured()) return false;
  try {
    const info = await getBoardAccessConfig(boardId);
    if (!info) return false;
    const [user, role] = await Promise.all([
      getUser(),
      getMyProjectRole(projectId),
    ]);
    const res = resolveBoardAccess({
      config: info.config,
      configured: info.configured,
      uid: user?.id ?? null,
      createdBy: info.createdBy,
      role,
    });
    return res.canManage;
  } catch (e) {
    console.error("[board-access] canManage error:", e);
    return false;
  }
}
