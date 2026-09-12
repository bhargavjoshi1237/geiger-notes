// Project-scoped route: /project/<projectId>. Establishes the project context
// from the URL so anything rendered underneath can read the current project via
// useProject(). Access is enforced by RLS on public.projects (a non-member's
// deep-link resolves to notFound).
//
// force-static: nothing in this subtree reads the request, so Next prerenders
// the loading shell and Vercel's CDN serves it with a long s-maxage. The project
// and the session both resolve client-side, after the shell has already painted.

import { ProjectProvider } from "@/context/project-context";
import ProjectScope from "./project-scope";

export const dynamic = "force-static";

export default async function ProjectLayout({ children, params }) {
  const { projectId } = await params;

  return (
    <ProjectProvider>
      <ProjectScope projectId={projectId}>{children}</ProjectScope>
    </ProjectProvider>
  );
}
