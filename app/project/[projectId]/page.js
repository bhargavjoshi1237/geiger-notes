"use client";

// Project workspace: the exact same whiteboard as /[userId]/home, but persisted
// to the project's boards (notes.project_boards) instead of the user's personal
// base/boards. Access is gated by the resolved project (RLS); the canvas mounts
// only once the signed-in user is confirmed to have access.
//
// Fast-first-paint contract: this component's initial render IS the shell the
// CDN serves, so it must stay cheap and request-independent. The canvas bundle
// (React Flow + every node type + tiptap) is pulled in behind next/dynamic so it
// downloads in the background instead of blocking that first paint.

import React, { useEffect, useState } from "react";
import nextDynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import WorkspaceShell from "@/components/internal/canvas/WorkspaceShell";
import { useProject } from "@/context/project-context";
import { createClient } from "@/utils/supabase/client";

const BoardCanvas = nextDynamic(
  () => import("@/components/internal/canvas/BoardCanvas"),
  { ssr: false, loading: () => <WorkspaceShell /> }
);

export default function ProjectWorkspacePage() {
  const { project, loading, notFound } = useProject();
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [activeBoardId, setActiveBoardId] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([]);

  useEffect(() => {
    let active = true;

    // getClaims() verifies the JWT locally against the cached signing key, so
    // the id we scope the canvas by usually costs no network round-trip at all;
    // it only falls back to the auth server for legacy symmetric-secret tokens.
    // RLS is what actually enforces access, so a locally-read id is safe here.
    const resolveUserId = async () => {
      const supabase = createClient();

      try {
        const { data } = await supabase.auth.getClaims();
        if (data?.claims?.sub) return data.claims.sub;
      } catch {
        // fall through to the auth server
      }

      try {
        const { data } = await supabase.auth.getUser();
        return data?.user?.id ?? null;
      } catch {
        return null;
      }
    };

    resolveUserId().then((id) => {
      if (!active) return;

      // The proxy only checks that an auth cookie exists, so an expired session
      // still reaches this shell. Nothing here can recover it — send them to log
      // in rather than leaving the loading frame up forever.
      if (!id) {
        const returnTo = `${window.location.pathname}${window.location.search}`;
        router.replace(`/login?next=${encodeURIComponent(returnTo)}`);
        return;
      }

      setUserId(id);
    });

    return () => {
      active = false;
    };
  }, [router]);

  const onBreadcrumbClick = (boardId) => {
    if (boardId === null) {
      setActiveBoardId(null);
      setBreadcrumbs([]);
    } else {
      const index = breadcrumbs.findIndex((b) => b.id === boardId);
      if (index !== -1) {
        setActiveBoardId(boardId);
        setBreadcrumbs(breadcrumbs.slice(0, index + 1));
      }
    }
  };

  const handleNavigate = (boardId, name) => {
    setActiveBoardId(boardId);
    setBreadcrumbs((prev) => {
      if (prev.some((b) => b.id === boardId)) return prev;
      return [...prev, { id: boardId, name: name || "Untitled Board" }];
    });
  };

  if (loading || !userId) {
    return <WorkspaceShell />;
  }

  if (notFound || !project) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Project not found, or you don&apos;t have access to it.
      </div>
    );
  }

  return (
    <BoardCanvas
      key={activeBoardId || "project-home"} // Forces unmount/remount when board changes
      id={userId}
      projectId={project.id}
      boardId={activeBoardId}
      onNavigate={handleNavigate}
      breadcrumbs={breadcrumbs}
      onBreadcrumbClick={onBreadcrumbClick}
    />
  );
}
