"use client";

// Project workspace: the exact same whiteboard as /[userId]/home, but persisted
// to the project's boards (notes.project_boards) instead of the user's personal
// base/boards. Access is gated by the resolved project (RLS); the canvas mounts
// only once the signed-in user is confirmed to have access.

import React, { useEffect, useState } from "react";
import BoardCanvas from "@/components/internal/canvas/BoardCanvas";
import { useProject } from "@/context/project-context";
import { createClient } from "@/utils/supabase/client";

export default function ProjectWorkspacePage() {
  const { project, loading, notFound } = useProject();
  const [userId, setUserId] = useState(null);
  const [activeBoardId, setActiveBoardId] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([]);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setUserId(data?.user?.id ?? null));
  }, []);

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
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Loading project…
      </div>
    );
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
