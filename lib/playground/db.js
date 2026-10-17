// The playground's in-memory database: every seeded table, built lazily the
// first time the playground queries it and kept for the rest of the page
// session, so edits survive board switches but a reload starts fresh.
//
// Tables use the bare names the data layer queries; notes.* tables resolve the
// same through `client.schema("notes")`, and public.* through `.schema("public")`.

import { createMemoryDb } from "./memory_client.js";
import { PLAYGROUND_PROJECT } from "./mode.js";
import { PEOPLE, PLAYGROUND_PERSON, STUDIO } from "./cast.js";
import { boardsSeed } from "./seed/boards.js";
import { documentsSeed } from "./seed/documents.js";
import { sketchesSeed } from "./seed/sketches.js";
import { workspaceSeed } from "./seed/workspace.js";

// Shaped like a Supabase auth user so the app's session parsing reads it
// unchanged.
export const PLAYGROUND_USER = {
  id: PLAYGROUND_PERSON.id,
  email: PLAYGROUND_PERSON.email,
  user_metadata: { full_name: PLAYGROUND_PERSON.name, avatar_url: PLAYGROUND_PERSON.avatar_url },
  app_metadata: {},
  aud: "authenticated",
  role: "authenticated",
  created_at: new Date(Date.now() - 400 * 864e5).toISOString(),
};

export const getPlaygroundDb = createMemoryDb(() => ({
  organizations: [
    {
      id: PLAYGROUND_PROJECT.organization_id,
      name: STUDIO.name,
      created_by: PLAYGROUND_PERSON.id,
      created_at: new Date(Date.now() - 900 * 864e5).toISOString(),
    },
  ],
  projects: [
    {
      ...PLAYGROUND_PROJECT,
      created_by: PLAYGROUND_PERSON.id,
      created_at: new Date(Date.now() - 400 * 864e5).toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    },
  ],
  // public.users + organization_users feed the board Manage Access roster.
  users: PEOPLE.map((p) => ({
    id: p.id,
    email: p.email,
    full_name: p.name,
    avatar_url: p.avatar_url,
  })),
  organization_users: PEOPLE.map((p) => ({
    organization: PLAYGROUND_PROJECT.organization_id,
    user: p.id,
    role: p.role,
  })),
  profiles: PEOPLE.map((p) => ({
    id: p.id,
    email: p.email,
    full_name: p.name,
    avatar_url: p.avatar_url,
    title: p.title,
    organization: STUDIO.name,
  })),
  ...boardsSeed(),
  ...documentsSeed(),
  ...sketchesSeed(),
  ...workspaceSeed(),
}));
