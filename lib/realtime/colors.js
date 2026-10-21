// Assigned deterministically from the user id so a person is the same colour
// for everyone in the room without negotiation.
const COLORS = [
  "#f87171",
  "#fb923c",
  "#facc15",
  "#4ade80",
  "#2dd4bf",
  "#60a5fa",
  "#a78bfa",
  "#f472b6",
];

export function colorForUser(userId) {
  let hash = 5381;
  const id = String(userId || "");
  for (let i = 0; i < id.length; i += 1) {
    hash = ((hash << 5) + hash + id.charCodeAt(i)) >>> 0;
  }
  return COLORS[hash % COLORS.length];
}
