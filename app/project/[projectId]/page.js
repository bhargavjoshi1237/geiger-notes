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

import React, { useCallback, useEffect, useState } from "react";
import nextDynamic from "next/dynamic";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import WorkspaceShell from "@/components/internal/canvas/WorkspaceShell";
import { useProject } from "@/context/project-context";
import { createClient } from "@/utils/supabase/client";
import { canEditProjectSketch } from "@/lib/supabase/sketch-access";

const BoardCanvas = nextDynamic(
  () => import("@/components/internal/canvas/BoardCanvas"),
  { ssr: false, loading: () => <WorkspaceShell /> }
);

const SketchEditor = nextDynamic(
  () => import("@/components/internal/sketch/SketchEditor"),
  { ssr: false, loading: () => <WorkspaceShell /> }
);

const DocumentDialog = nextDynamic(
  () => import("@/components/internal/dialogs/DocumentDialog"),
  { ssr: false }
);

export default function ProjectWorkspacePage() {
  const { project, loading, notFound } = useProject();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sketchId = searchParams.get("sketch");
  // A ?document=<id> link (from a sketch element) opens the document over the
  // board it was linked from.
  const documentId = searchParams.get("document");
  // The open sub-board lives in the URL so it survives a refresh and can be
  // linked to; the ancestor trail stays in state (a cold deep link shows one
  // level).
  const activeBoardId = searchParams.get("board");
  const [userId, setUserId] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  // Advisory: a sketches.view-only member gets the editor in view mode.
  const [canEditSketch, setCanEditSketch] = useState(true);

  const setBoardParam = useCallback(
    (boardId) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("sketch");
      if (boardId) params.set("board", boardId);
      else params.delete("board");
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname, searchParams]
  );

  const closeDocument = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("document");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }, [router, pathname, searchParams]);

  const closeSketch = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("sketch");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }, [router, pathname, searchParams]);

  // A cold ?board=<id> load has no trail; seed one level once the canvas
  // reports the board's name.
  const handleBoardNameResolved = useCallback((boardId, name) => {
    setBreadcrumbs((prev) =>
      prev.some((b) => b.id === boardId)
        ? prev
        : [{ id: boardId, name: name || "Untitled Board" }]
    );
  }, []);

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

  useEffect(() => {
    if (!sketchId || !project?.id) return;
    let active = true;
    canEditProjectSketch(project.id).then((allowed) => {
      if (active) setCanEditSketch(allowed);
    });
    return () => {
      active = false;
    };
  }, [sketchId, project?.id]);

  const onBreadcrumbClick = (boardId) => {
    if (boardId === null) {
      setBreadcrumbs([]);
      setBoardParam(null);
    } else {
      const index = breadcrumbs.findIndex((b) => b.id === boardId);
      if (index !== -1) {
        setBreadcrumbs(breadcrumbs.slice(0, index + 1));
        setBoardParam(boardId);
      }
    }
  };

  const handleNavigate = (boardId, name) => {
    setBreadcrumbs((prev) => {
      if (prev.some((b) => b.id === boardId)) return prev;
      return [...prev, { id: boardId, name: name || "Untitled Board" }];
    });
    setBoardParam(boardId);
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

  if (sketchId) {
    return (
      <SketchEditor
        key={sketchId}
        sketchId={sketchId}
        projectId={project.id}
        canEdit={canEditSketch}
        onBack={closeSketch}
      />
    );
  }

  return (
    <>
      <BoardCanvas
        key={activeBoardId || "project-home"} // Forces unmount/remount when board changes
        id={userId}
        projectId={project.id}
        boardId={activeBoardId}
        onNavigate={handleNavigate}
        breadcrumbs={breadcrumbs}
        onBreadcrumbClick={onBreadcrumbClick}
        onBoardNameResolved={handleBoardNameResolved}
      />
      {documentId && (
        <DocumentDialog isOpen onClose={closeDocument} documentId={documentId} />
      )}
    </>
  );
}
