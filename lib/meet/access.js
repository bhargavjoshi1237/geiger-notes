// Who a meeting turns away at the door: people the host removed, and everyone but the host while it's locked.
export function meetingRefusal(room, userId) {
  const metadata = room?.metadata || {};
  if (!room || room.host === userId) return null;
  if (userId && metadata.removed?.[userId]) {
    return { status: 403, error: "The host removed you from this meeting" };
  }
  if (metadata.locked) {
    return { status: 423, error: "The host has locked this meeting" };
  }
  return null;
}
