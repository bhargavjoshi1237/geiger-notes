"use client";

import React, { Suspense } from "react";
import ProjectWorkspacePage from "@/app/project/[projectId]/page";
import ProjectScope from "@/app/project/[projectId]/project-scope";
import WorkspaceShell from "@/components/internal/canvas/WorkspaceShell";
import { ScreenErrorBoundary } from "@/components/landing/ScreenErrorBoundary";
import { ProjectProvider } from "@/context/project-context";
import { PLAYGROUND_PROJECT } from "@/lib/playground/mode";
import { usePlaygroundMode } from "@/lib/playground/use_playground_mode";
import { playgroundHandlers, playgroundRoutes } from "@/lib/playground/handlers";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";
const MODE_OPTIONS = { routes: playgroundRoutes, basePath: BASE_PATH };

// The landing-page playground: the real project workspace (/project/<id> — board
// canvas, sidebar, topbar, sketch editor, document editor) opened on Halcyon
// Studio's seeded boards, served by an in-memory database (lib/playground). The
// open board/sketch/document live in this iframe's own query string, so the
// landing page's URL never changes. Edits last for the tab; a reload resets.
export default function NotesPlayground() {
  usePlaygroundMode(playgroundHandlers, MODE_OPTIONS);

  return (
    <Suspense fallback={<WorkspaceShell />}>
      <ProjectProvider>
        <ProjectScope projectId={PLAYGROUND_PROJECT.id}>
          <ScreenErrorBoundary title="This board">
            <ProjectWorkspacePage />
          </ScreenErrorBoundary>
        </ProjectScope>
      </ProjectProvider>
    </Suspense>
  );
}
