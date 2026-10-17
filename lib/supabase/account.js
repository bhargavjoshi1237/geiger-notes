"use client";

// Read-only view of the signed-in user's place in the suite: the organizations they own or belong to, each org's projects, and their plan. These public.* tables are owned by geiger-dash; notes only reads them.

import { createClient } from "./client";
import { isSupabaseConfigured } from "@/supabase/components/notes-client";

const pub = () => createClient().schema("public");

// Mirrors geiger-dash: owner/creator wins, the enum default "User" reads as Member, other roles are shown as stored.
function roleLabel(org, membershipRole, userId) {
  if (org.owner === userId || org.created_by === userId) return "Owner";
  if (!membershipRole || /^user$/i.test(membershipRole)) return "Member";
  return membershipRole.charAt(0).toUpperCase() + membershipRole.slice(1);
}

function normalizeProject(row) {
  return {
    id: row.id,
    name: row.name || "Untitled project",
    avatarUrl: row.avatar_url || "",
    createdAt: row.created_at || null,
  };
}

// Orgs the user owns, created or is a member of, each with its projects; null when unconfigured or a read fails.
export async function listMyWorkspaces(userId) {
  if (!userId || !isSupabaseConfigured()) return null;
  try {
    const sb = pub();
    const [memberships, owned] = await Promise.all([
      sb.from("organization_users").select("organization, role").eq("user", userId),
      sb.from("organizations").select("*").or(`created_by.eq.${userId},owner.eq.${userId}`),
    ]);
    if (memberships.error || owned.error) {
      console.error("[account.workspaces]", (memberships.error || owned.error).message);
      return null;
    }

    const roleByOrg = new Map((memberships.data || []).map((m) => [m.organization, m.role]));
    const orgsById = new Map((owned.data || []).map((o) => [o.id, o]));
    const missing = [...roleByOrg.keys()].filter((id) => !orgsById.has(id));
    if (missing.length) {
      const { data, error } = await sb.from("organizations").select("*").in("id", missing);
      if (error) {
        console.error("[account.workspaces]", error.message);
        return null;
      }
      (data || []).forEach((o) => orgsById.set(o.id, o));
    }

    const orgs = [...orgsById.values()].filter((o) => !o.deleted_at);
    if (!orgs.length) return [];
    const orgIds = orgs.map((o) => o.id);

    const [projects, members] = await Promise.all([
      sb.from("projects").select("*").in("organization_id", orgIds),
      sb.from("organization_users").select("organization, user").in("organization", orgIds),
    ]);
    if (projects.error) {
      console.error("[account.projects]", projects.error.message);
      return null;
    }

    return orgs
      .map((org) => {
        const people = new Set(
          (members.data || []).filter((m) => m.organization === org.id).map((m) => m.user),
        );
        [org.owner, org.created_by].forEach((id) => id && people.add(id));
        const role = roleLabel(org, roleByOrg.get(org.id), userId);
        return {
          id: org.id,
          name: org.name || "Untitled organization",
          avatarUrl: org.avatar_url || "",
          role,
          isOwner: role === "Owner",
          memberCount: people.size,
          projects: (projects.data || [])
            .filter((p) => p.organization_id === org.id && !p.deleted_at)
            .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
            .map(normalizeProject),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (e) {
    console.error("[account.workspaces]", e);
    return null;
  }
}

// The user's suite plan from public.user_plan ({ key, status }); null when there is none or it can't be read.
export async function getMyPlan(userId) {
  if (!userId || !isSupabaseConfigured()) return null;
  try {
    const { data, error } = await pub()
      .from("user_plan")
      .select("plan_key, status")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data?.plan_key) return null;
    return { key: data.plan_key, status: data.status || "" };
  } catch (e) {
    console.error("[account.plan]", e);
    return null;
  }
}
