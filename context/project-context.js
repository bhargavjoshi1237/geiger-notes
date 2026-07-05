"use client";

// Resolves the current project from a /project/<projectId> URL and exposes it to
// the tree. Ported from geiger-flow. Data only loads for an id that resolves to
// a real row in public.projects — RLS returns nothing for a project the signed-in
// user is not a member of, so a non-member deep-link renders as notFound.

import React, { createContext, useContext, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

const ProjectContext = createContext(undefined);

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function ProjectProvider({ children }) {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchProjectInfo = useCallback(async (id) => {
    setLoading(true);
    setNotFound(false);

    // A non-uuid id can never match the uuid `id` column, so short-circuit it as
    // not found rather than querying with an invalid uuid.
    if (!UUID_PATTERN.test(id)) {
      setProject(null);
      setNotFound(true);
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error(
        "[project-context] fetch error:",
        error.message || error,
        error.code
      );
    }

    if (data) {
      setProject(data);
      setNotFound(false);
    } else {
      setProject(null);
      setNotFound(true);
    }
    setLoading(false);
  }, []);

  return (
    <ProjectContext.Provider
      value={{ project, setProject, fetchProjectInfo, loading, notFound }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
}
