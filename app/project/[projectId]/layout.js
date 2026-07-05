// Project-scoped route: /project/<projectId>. Establishes the project context
// from the URL so anything rendered underneath can read the current project via
// useProject(). Access is enforced by RLS on public.projects (a non-member's
// deep-link resolves to notFound).

import { ProjectProvider } from "@/context/project-context";
import ProjectScope from "./project-scope";

export default async function ProjectLayout({ children, params }) {
  const { projectId } = await params;

  return (
    <ProjectProvider>
      <ProjectScope projectId={projectId}>{children}</ProjectScope>
    </ProjectProvider>
  );
}
