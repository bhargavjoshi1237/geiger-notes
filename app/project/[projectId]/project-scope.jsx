"use client";

// Loads the project named in the URL into ProjectContext on mount / id change.

import { useEffect } from "react";
import { useProject } from "@/context/project-context";

export default function ProjectScope({ projectId, children }) {
  const { fetchProjectInfo } = useProject();

  useEffect(() => {
    if (projectId) {
      fetchProjectInfo(projectId);
    }
  }, [projectId, fetchProjectInfo]);

  return children;
}
