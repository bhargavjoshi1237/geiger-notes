// The signed-in visitor's own rows: workspace settings (notes.user_settings)
// and the live sessions they hosted earlier (notes.collab), which the
// Collaborate dialog's Merge tab lists.

import { PLAYGROUND_PERSON, person } from "../cast.js";
import { sid, daysAgo, hoursAgo } from "./helpers.js";
import { comment, edge, note, todo } from "./nodes.js";

function joiners(ns) {
  return Object.fromEntries(
    ns.map((n) => [person(n).id, { status: "joined", name: person(n).name, joined_at: daysAgo(1) }]),
  );
}

// Each session's snapshot holds the cards added live, ready to merge into Home.
const SESSIONS = [
  {
    code: "GEIGER-K7QM-4XPA",
    days: 1,
    joined: [3, 4, 7],
    nodes: [
      note("live-1", 0, 840, "Launch event: open with the film on the warehouse wall, lights up on the bikes.", { h: 104 }),
      comment("live-2", 420, 840, "Need a quiet zone for press interviews.", 6),
    ],
    edges: [edge("live-e1", "live-2", "live-1", { dashed: true })],
  },
  {
    code: "GEIGER-A2TB-9WNC",
    days: 6,
    joined: [3, 5],
    nodes: [
      todo("live-3", 0, 960, [
        ["Azulejo pattern on the cup sleeve", true],
        ["Test origin bands on kraft", false],
      ]),
    ],
    edges: [],
  },
  {
    code: "GEIGER-S9LH-3RDE",
    days: 15,
    joined: [8, 10, 11, 2],
    nodes: [note("live-4", 420, 960, "Summit day 2: speaker dinner at the rooftop, 40 covers.", { h: 80 })],
    edges: [],
    merged: true,
  },
];

export function workspaceSeed() {
  return {
    user_settings: [
      {
        user_id: PLAYGROUND_PERSON.id,
        settings: { showMinimap: false, canvasBackground: "dots", nodeStyle: "classic" },
        updated_at: daysAgo(12),
      },
    ],
    collab: SESSIONS.map((s, i) => ({
      id: sid("collab", i + 1),
      host: PLAYGROUND_PERSON.id,
      code: s.code,
      joiners: joiners(s.joined),
      state_nodes: JSON.stringify(s.nodes),
      state_edges: JSON.stringify(s.edges),
      preference: {},
      rollback: s.merged ? { merged_at: daysAgo(s.days - 1) } : null,
      created_at: s.days === 1 ? hoursAgo(20) : daysAgo(s.days),
    })),
  };
}
