"use client";

import dynamic from "next/dynamic";
import WorkspaceShell from "@/components/internal/canvas/WorkspaceShell";

// Client-only: the playground swaps the data layer for an in-memory database,
// which must never run during server rendering.
const NotesPlayground = dynamic(() => import("@/components/landing/NotesPlayground"), {
  ssr: false,
  loading: () => <WorkspaceShell />,
});

export default function NotesPlaygroundLoader() {
  return <NotesPlayground />;
}
