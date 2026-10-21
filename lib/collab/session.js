// Host controls for live board sessions: the durable settings bag (notes.collab.preference) and the role helpers built on it.

import { colorForUser } from "@/lib/realtime/colors";

// Every key in notes.collab.preference, with the value it has when unset.
export const DEFAULT_PREFERENCE = {
  ownerId: null, // the original host, who may always reclaim the role
  endedAt: null,
  editLock: false, // only hosts may change the board
  locked: false, // no new join requests
  facilitation: "anyone", // "anyone" | "hosts" — who runs polls and timers
  laser: "everyone", // "everyone" | "hosts"
  hideCursors: false,
  focus: null, // { by, name, at } while a host has locked everyone's view to theirs
};

export function readPreference(sessionData) {
  const raw = sessionData?.preference;
  return { ...DEFAULT_PREFERENCE, ...(raw && typeof raw === "object" ? raw : {}) };
}

export const canModerate = (role) => role === "host" || role === "cohost";

export const canEditBoard = (role, preference) =>
  canModerate(role) || (role === "editor" && !preference?.editLock);

export const ROLE_LABEL = {
  host: "Host",
  cohost: "Co-host",
  editor: "Editor",
  viewer: "Viewer",
  pending: "Waiting",
};

// Members as one list: the host first, then joined, viewer and pending entries; kicked/left are dropped.
export function sessionMembers(sessionData, currentUserId) {
  if (!sessionData) return [];
  const joiners = sessionData.joiners || {};
  const hostId = sessionData.host;
  const list = [];
  for (const [id, m] of Object.entries(joiners)) {
    if (id === hostId) continue;
    if (!["joined", "viewer", "requested"].includes(m.status)) continue;
    const role =
      m.status === "requested" ? "pending" : m.status === "viewer" ? "viewer" : m.cohost ? "cohost" : "editor";
    list.push({
      id,
      name: m.name || m.email?.split("@")[0] || "Guest",
      email: m.email || null,
      color: memberColor(id, m),
      role,
      status: m.status,
      isMe: id === currentUserId,
      requestedAt: m.requestedAt,
      joinedAt: m.joinedAt,
    });
  }
  const hostEntry = joiners[hostId];
  list.unshift({
    id: hostId,
    name: hostEntry?.name || (hostId === currentUserId ? "You" : "Host"),
    email: hostEntry?.email || null,
    color: memberColor(hostId, hostEntry),
    role: "host",
    status: "joined",
    isMe: hostId === currentUserId,
    joinedAt: sessionData.created_at,
  });
  return list;
}

export const memberColor = (id, entry) => entry?.color || colorForUser(id);

// True when following `leaderId` leads back to `myId` through the chain of who-follows-whom (A→B→C→A),
// which would bounce viewports around the loop forever.
export function followLoops(myId, leaderId, followingOf, limit = 32) {
  let id = leaderId;
  for (let hops = 0; id && hops < limit; hops += 1) {
    if (id === myId) return true;
    id = followingOf(id);
  }
  return false;
}

// Fit a leader's visible flow rect inside our own pane ("contain"), so we see at least everything they see.
export function followViewport(leader, width, height, { minZoom = 0.1, maxZoom = 2 } = {}) {
  if (!leader?.zoom || !leader.width || !leader.height || !width || !height) return null;
  const rectW = leader.width / leader.zoom;
  const rectH = leader.height / leader.zoom;
  const cx = -leader.x / leader.zoom + rectW / 2;
  const cy = -leader.y / leader.zoom + rectH / 2;
  const zoom = Math.min(maxZoom, Math.max(minZoom, Math.min(width / rectW, height / rectH)));
  return { x: width / 2 - cx * zoom, y: height / 2 - cy * zoom, zoom };
}
