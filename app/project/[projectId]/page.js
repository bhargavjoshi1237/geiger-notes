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

    const resolveUserId = async () => {
      const supabase = createClient();

      try {
        const { data } = await supabase.auth.getClaims();
        if (data?.claims?.sub) return data.claims.sub;
      } catch {
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
