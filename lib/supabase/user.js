// Single source of truth for "who is logged in". Wraps the Supabase session
// into a small view model and caches it briefly. Ported from geiger-flow.

import { createClient } from "./client";

let _cached = null;
let _cacheTimestamp = 0;
const CACHE_TTL = 30 * 1000;

function parseSession(session) {
  if (!session?.user) return null;

  const meta = session.user.user_metadata ?? {};
  const email = session.user.email ?? "";

  return {
    id: session.user.id,
    name: meta.full_name || meta.name || email.split("@")[0] || "User",
    email,
    avatar: meta.avatar_url || null,
  };
}

export async function getUser() {
  const now = Date.now();
  if (_cached && now - _cacheTimestamp < CACHE_TTL) {
    return _cached;
  }

  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = parseSession(session);

  _cached = user;
  _cacheTimestamp = now;

  return user;
}

export function getUserCached() {
  return _cached;
}

// Public storage URL for a user's profile picture. Mirrors the header's
// `pfp/<userId>/latest.jpg` convention; empty when it cannot be built.
export function getProfileImageUrl(userId) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base || !userId) return "";
  return `${base}/storage/v1/object/public/pfp/${userId}/latest.jpg`;
}

export function invalidateUserCache() {
  _cached = null;
  _cacheTimestamp = 0;
}
