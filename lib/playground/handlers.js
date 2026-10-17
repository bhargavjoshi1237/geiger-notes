// Everything the playground swaps into the data layer while it is mounted (see
// ./mode.js and ./use_playground_mode.js): the Supabase client stand-in, the
// profile-image URL helper, and the /api/* routes from ./api_routes.js.

import { createMemoryClient } from "./memory_client.js";
import { getPlaygroundDb, PLAYGROUND_USER } from "./db.js";
import { createApiRoutes } from "./api_routes.js";

// One client for the whole session, so every createClient() call shares state.
let client = null;

function createPlaygroundClient() {
  client ??= createMemoryClient({
    getDb: getPlaygroundDb,
    user: PLAYGROUND_USER,
    rpc: {
      // The visitor owns the Halcyon project, so every advisory gate opens.
      project_role: () => "owner",
      has_ability: () => true,
    },
  });
  return client;
}

export const playgroundHandlers = {
  createClient: createPlaygroundClient,
  // Avatars fall back to initials instead of reaching for real storage.
  getProfileImageUrl: () => "",
};

export const playgroundRoutes = createApiRoutes(createPlaygroundClient);
