"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Check, X, Pencil, ChevronRight, LogOut } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Input,
  LogoLoading,
  SettingRow,
  SettingsList,
} from "@geiger/ui";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getProfileImageUrl } from "@/lib/supabase/user";
import { getMyPlan, listMyWorkspaces } from "@/lib/supabase/account";
import { SUITE_LINKS } from "@/lib/suite-links";
import { GroupLabel } from "./SettingsPrimitives";

const RESOURCES = [
  { title: "Documentation", description: "Guides for boards, nodes and collaboration.", href: SUITE_LINKS.docs, action: "Open docs" },
  { title: "What's new", description: "Recent changes across the Geiger suite.", href: SUITE_LINKS.changelog, action: "Changelog" },
  { title: "Billing", description: "Plans, invoices and payment details.", href: SUITE_LINKS.billing, action: "Manage billing" },
  { title: "Support", description: "Questions about your account or plan.", href: SUITE_LINKS.support, action: "Email support" },
];

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// Dash convention: a versioned pfp upload wins, version 0 means removed, otherwise the OAuth picture.
function avatarFor(auth) {
  const meta = auth.user_metadata || {};
  if (meta.avatar_version) return `${getProfileImageUrl(auth.id)}?v=${meta.avatar_version}`;
  if (meta.avatar_version === 0) return "";
  return meta.avatar_url || meta.picture || "";
}

// Icon-only ghost link; `label` names it for screen readers and the tooltip.
function LinkButton({ href, label, icon: Icon = ChevronRight }) {
  const external = href.startsWith("http");
  return (
    <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
      <a
        href={href}
        aria-label={label}
        title={label}
        {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      >
        <Icon className="h-3.5 w-3.5" />
      </a>
    </Button>
  );
}

// One organization with its projects underneath; the open project is marked instead of linked.
function OrganizationBlock({ org, projectId }) {
  return (
    <div className="rounded-lg border border-border">
      <div className="flex items-center gap-3 px-3 py-2.5">
        <Avatar className="h-7 w-7 shrink-0 rounded-md border border-border bg-surface-hover">
          <AvatarImage src={org.avatarUrl || undefined} className="rounded-md" />
          <AvatarFallback className="rounded-md bg-surface-hover text-xs font-medium text-muted-foreground">
            {org.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{org.name}</p>
          <p className="text-xs text-text-secondary">
            {org.role} · {plural(org.memberCount, "member")} · {plural(org.projects.length, "project")}
          </p>
        </div>
        <LinkButton href={SUITE_LINKS.organization(org.id)} label={`Manage ${org.name}`} />
      </div>

      {org.projects.length > 0 ? (
        <ul className="divide-y divide-border border-t border-border">
          {org.projects.map((p) =>
            p.id === projectId ? (
              <li key={p.id} className="flex items-center gap-3 py-2 pl-[52px] pr-3">
                <span className="flex-1 truncate text-sm text-foreground">{p.name}</span>
                <span className="text-xs text-text-secondary">Current</span>
              </li>
            ) : (
              <li key={p.id}>
                <Link
                  href={`/project/${p.id}`}
                  className="flex items-center gap-3 py-2 pl-[52px] pr-3 text-sm text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
                >
                  <span className="flex-1 truncate">{p.name}</span>
                  <span className="text-xs text-text-secondary">Open</span>
                </Link>
              </li>
            ),
          )}
        </ul>
      ) : (
        <p className="border-t border-border py-2 pl-[52px] pr-3 text-xs text-text-secondary">No projects yet.</p>
      )}
    </div>
  );
}

function WorkspaceGroup({ label, description, orgs, projectId }) {
  if (!orgs.length) return null;
  return (
    <div className="space-y-3">
      <div>
        <GroupLabel>{label}</GroupLabel>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>
      {orgs.map((org) => (
        <OrganizationBlock key={org.id} org={org} projectId={projectId} />
      ))}
    </div>
  );
}

export default function AccountSettings({ projectId }) {
  const [user, setUser] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    let active = true;
    (async () => {
      const {
        data: { user: auth },
      } = await supabase.auth.getUser();
      if (!auth) {
        if (active) setLoading(false);
        return;
      }
      const meta = auth.user_metadata || {};
      const name = meta.full_name || meta.name || auth.email.split("@")[0];
      const [orgs, userPlan] = await Promise.all([listMyWorkspaces(auth.id), getMyPlan(auth.id)]);
      if (!active) return;
      setUser({
        id: auth.id,
        name,
        email: auth.email,
        avatarUrl: avatarFor(auth),
        headline: [meta.job_title, meta.company].filter(Boolean).join(" · "),
        memberSince: formatDate(auth.created_at),
      });
      setNameDraft(name);
      setWorkspaces(orgs ?? []);
      setPlan(userPlan);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startEdit = () => {
    setNameDraft(user.name);
    setEditingName(true);
  };

  const saveName = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === user.name) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    // Dash keeps name and full_name in sync.
    const { error } = await supabase.auth.updateUser({
      data: { full_name: trimmed, name: trimmed },
    });
    setSavingName(false);
    if (error) {
      toast.error("Couldn't update your name");
      return;
    }
    setUser((u) => ({ ...u, name: trimmed }));
    setEditingName(false);
    toast.success("Name updated");
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  if (loading)
    return (
      <div className="flex h-48 items-center justify-center">
        <LogoLoading size={48} />
      </div>
    );

  if (!user) return null;

  const planLine = [
    plan && `${plan.key.charAt(0).toUpperCase()}${plan.key.slice(1)} plan`,
    `Member since ${user.memberSince}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-8">
      <div className="pb-4 border-b border-border/50">
        <h3 className="text-sm font-medium text-foreground">Account</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Your profile, the organizations and projects you can reach, and where to get help.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <Avatar className="h-12 w-12 shrink-0 border border-border bg-surface-hover">
          <AvatarImage src={user.avatarUrl || undefined} />
          <AvatarFallback className="bg-surface-hover text-base font-medium text-muted-foreground">
            {user.name?.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          {editingName ? (
            <div className="flex items-center gap-1.5">
              <Input
                autoFocus
                aria-label="Display name"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveName();
                  if (e.key === "Escape") setEditingName(false);
                }}
                maxLength={60}
                className="h-8"
              />
              <Button size="icon-sm" onClick={saveName} disabled={savingName} aria-label="Save name">
                {savingName ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => setEditingName(false)}
                aria-label="Cancel editing"
                className="text-muted-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <span className="truncate text-sm font-medium text-foreground">{user.name}</span>
              <Button
                size="icon-xs"
                variant="ghost"
                onClick={startEdit}
                aria-label="Edit name"
                title="Edit name"
                className="text-text-secondary hover:text-foreground"
              >
                <Pencil />
              </Button>
            </div>
          )}
          <p className="truncate text-xs text-muted-foreground">
            {user.email}
            {user.headline ? ` · ${user.headline}` : ""}
          </p>
          <p className="mt-0.5 text-xs text-text-secondary">{planLine}</p>
        </div>

        {!editingName && <LinkButton href={SUITE_LINKS.profile(user.id)} label="Edit profile" icon={Pencil} />}
      </div>

      {/* Organizations & projects */}
      <div className="space-y-6 pt-6 border-t border-border/50">
        {workspaces.length === 0 ? (
          <div className="space-y-3">
            <GroupLabel>Organizations</GroupLabel>
            <div className="flex items-center justify-between gap-4 rounded-lg border border-dashed border-border px-4 py-3">
              <p className="text-xs text-muted-foreground">
                You&apos;re not in an organization yet. Create one or accept an invite in Geiger.
              </p>
              <LinkButton href={SUITE_LINKS.organizations} label="Organizations" />
            </div>
          </div>
        ) : (
          <>
            <WorkspaceGroup
              label="Your organizations"
              description="Organizations you own and their projects."
              orgs={workspaces.filter((o) => o.isOwner)}
              projectId={projectId}
            />
            <WorkspaceGroup
              label="Shared with you"
              description="Projects you can open as a member of someone else's organization."
              orgs={workspaces.filter((o) => !o.isOwner)}
              projectId={projectId}
            />
          </>
        )}
      </div>

      {/* Help & resources */}
      <div className="space-y-3 pt-6 border-t border-border/50">
        <GroupLabel>Help & resources</GroupLabel>
        <SettingsList>
          {RESOURCES.map((r) => (
            <SettingRow
              key={r.title}
              title={r.title}
              description={r.description}
              control={<LinkButton href={r.href} label={r.action} />}
            />
          ))}
          <SettingRow
            title="Sign out"
            description="End your session on this device."
            control={
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                disabled={signingOut}
                aria-label="Sign out"
                title="Sign out"
                className="text-red-600 hover:bg-red-500/10 hover:text-red-600 dark:text-red-400 dark:hover:text-red-400"
              >
                {signingOut ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
              </Button>
            }
          />
        </SettingsList>
      </div>
    </div>
  );
}
