"use client";

import { createContext, useContext } from "react";

// What a node or sidebar control may do inside a live session; outside one every control behaves as before.
const OUTSIDE_SESSION = {
  inSession: false,
  moderator: true,
  canEdit: true,
  facilitationLocked: false,
  myId: null,
};

export const SessionControlsContext = createContext(OUTSIDE_SESSION);

export const useSessionControlsContext = () => useContext(SessionControlsContext);
