// notes.documents: the Tiptap (StarterKit) JSON behind every document node on
// the seeded boards. Documents carry no name of their own — the board node that
// points at one holds the label.

import { daysAgo, hoursAgo } from "./helpers.js";
import { DOCUMENT_IDS } from "./boards.js";

const text = (value, marks) => ({ type: "text", text: value, ...(marks ? { marks: marks.map((type) => ({ type })) } : {}) });
const p = (...runs) => ({
  type: "paragraph",
  content: runs.map((run) => (typeof run === "string" ? text(run) : run)),
});
const h = (level, value) => ({ type: "heading", attrs: { level }, content: [text(value)] });
const list = (type, items) => ({
  type,
  ...(type === "orderedList" ? { attrs: { start: 1 } } : {}),
  content: items.map((item) => ({ type: "listItem", content: [p(item)] })),
});
const ul = (items) => list("bulletList", items);
const ol = (items) => list("orderedList", items);
const quote = (value) => ({ type: "blockquote", content: [p(value)] });
const bold = (value) => text(value, ["bold"]);
const doc = (...content) => ({ type: "doc", content });

const CONTENT = {
  handbook: doc(
    h(1, "Halcyon Studio handbook"),
    p("How we work across Lisbon and Brooklyn. Short on purpose — if it isn't here, ask Maya."),
    h(2, "Rituals"),
    ul([
      "Monday stand-up, 10:00 Lisbon / 05:00 Brooklyn (async notes welcome).",
      "Tuesday crit: every live project shows work, nobody presents slides.",
      "Sprint retro every second Friday — boards live in Notes.",
    ]),
    h(2, "Reviews"),
    p(bold("Two rounds, then ship."), " A third round needs Alex or Jonas to sign off on why."),
    h(2, "Tools"),
    ul(["Notes for thinking out loud", "Flow for tracking work", "Assets for anything a client will see"]),
    quote("Make the thing people would miss if it were gone."),
  ),
  kestrelBrief: doc(
    h(1, "Creative brief — Kestrel Aero"),
    p(bold("Client: "), "Kestrel Bikes (Pieter de Vries)  ·  ", bold("Lead: "), "Sofia Rossi"),
    h(2, "The problem"),
    p("E-bikes are sold on range and torque. Commuters in Amsterdam and Lisbon tell us they buy on how the ride feels."),
    h(2, "The idea"),
    quote("Quiet speed."),
    p("A bike so smooth the city seems to slow down around you. Everything we make should feel unhurried, precise and calm."),
    h(2, "Deliverables"),
    ol([
      "45-second hero film plus 15s and 6s cut-downs",
      "Launch event at LX Factory for 300 guests",
      "Pre-order campaign across paid social and out-of-home",
    ]),
    h(2, "Mandatories"),
    ul(["Signal Orange used only as an accent", "No helmetless riding on screen", "Price never in the hero frame"]),
  ),
  atlasPlatform: doc(
    h(1, "Atlas brand platform"),
    p("Atlas has roasted in Lisbon since 1987. The rebrand keeps the craft and drops the nostalgia."),
    h(2, "Positioning"),
    p(bold("For"), " people who care where their coffee comes from, ", bold("Atlas"), " is the roaster that shows its work."),
    h(2, "Personality"),
    ul(["Generous, not fussy", "Precise about origin", "Proud of Lisbon without leaning on postcards"]),
    h(2, "Identity system"),
    ul([
      "Custom serif wordmark with a tightened 'tl' ligature",
      "Azulejo blue as the anchor colour, origin colours as bands",
      "Photography: hands, tools, steam — never staged smiles",
    ]),
  ),
  lumenSynthesis: doc(
    h(1, "Interview synthesis — round 1"),
    p("Twelve patients across three clinics, 45 minutes each. Three themes came up in almost every session."),
    h(2, "1. Results without meaning"),
    p("Patients see numbers before anyone explains them. Several described searching their results online at night."),
    quote("I just want to know if I should worry. — P4"),
    h(2, "2. Care is a family job"),
    p("Five of twelve rely on a relative to book and attend appointments, usually by sharing a password."),
    h(2, "3. Friction at the moment of need"),
    p("Rebooking a follow-up averages three calls. The app's session timeout makes it worse."),
    h(2, "Next"),
    ol(["Recruit four more caregivers", "Run affinity mapping round 2", "Readout with Grace Okafor"]),
  ),
  retroNotes: doc(
    h(1, "Sprint 42 retro notes"),
    p("Facilitated by Maya. Eleven people, 44 minutes."),
    h(2, "Top votes"),
    ol(["Too many review rounds on the Summit poster (7 votes)", "Render box queue (6 votes)", "Calm producer handoffs (5 votes)"]),
    h(2, "Actions"),
    ul(["Cap creative reviews at two rounds — Jonas", "Render queue calendar — Lucas", "Share these notes in #studio — Maya"]),
  ),
  shotNotes: doc(
    h(1, "Shoot day notes"),
    p(bold("Call: "), "06:30 at LX Factory  ·  ", bold("Wrap: "), "18:00"),
    ul(["Sunrise 07:42 — tram tracks first", "Lunch on set at 12:30", "Rain bars from 15:00 for the street sequence"]),
    p("Weather backup: the warehouse plate and macro shots move indoors."),
  ),
  packagingSpec: doc(
    h(1, "Packaging spec v2"),
    ul(["250g and 1kg bags, matte kraft, one-way valve", "Origin band: 18mm, full wrap", "Typeface: Atlas Serif, two weights only"]),
    p("First run: 40,000 bags across six origins."),
  ),
};

const AGES = {
  handbook: [180, 30],
  kestrelBrief: [33, 4],
  atlasPlatform: [58, 9],
  lumenSynthesis: [16, 1],
  retroNotes: [2, 1],
  shotNotes: [10, 2],
  packagingSpec: [25, 6],
};

export function documentsSeed() {
  return {
    documents: Object.entries(CONTENT).map(([key, content], i) => ({
      id: DOCUMENT_IDS[key],
      content,
      created_at: daysAgo(AGES[key][0]),
      updated_at: AGES[key][1] <= 2 ? hoursAgo(3 + i * 2) : daysAgo(AGES[key][1]),
    })),
  };
}
