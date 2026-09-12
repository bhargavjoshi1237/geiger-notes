// Shown while a client-side navigation into the project route resolves, so the
// transition lands on the same frame the CDN shell paints on a cold load.

import WorkspaceShell from "@/components/internal/canvas/WorkspaceShell";

export default function ProjectLoading() {
  return <WorkspaceShell />;
}
