// notes.project_boards for Halcyon Studio: the project home canvas plus the
// boards it links to — the Kestrel Aero launch moodboard, the Atlas Coffee
// rebrand plan, the Lumen Health research wall and the Sprint 42 retro (each
// node type appears somewhere, with edges), and two nested sub-boards.

import { PEOPLE, personId } from "../cast.js";
import { PROJECT_ID, sid, daysAgo, daysFromNow, hoursAgo } from "./helpers.js";
import {
  board,
  calendar,
  clock,
  column,
  comment,
  documentNode,
  edge,
  file,
  image,
  link,
  note,
  sketchNode,
  table,
  todo,
} from "./nodes.js";

export const BOARD_IDS = {
  home: sid("board", 1),
  kestrel: sid("board", 2),
  atlas: sid("board", 3),
  research: sid("board", 4),
  retro: sid("board", 5),
  shotList: sid("board", 6),
  packaging: sid("board", 7),
};

export const DOCUMENT_IDS = {
  handbook: sid("document", 1),
  kestrelBrief: sid("document", 2),
  atlasPlatform: sid("document", 3),
  lumenSynthesis: sid("document", 4),
  retroNotes: sid("document", 5),
  shotNotes: sid("document", 6),
  packagingSpec: sid("document", 7),
};

export const SKETCH_IDS = {
  storyboard: sid("sketch", 1),
  cafeLayout: sid("sketch", 2),
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "14 Nov" relative to today, so tables never show stale dates.
function day(offset) {
  const d = new Date(offset >= 0 ? daysFromNow(offset) : daysAgo(-offset));
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

const ORANGE = "#E8613C";
const TEAL = "#2F6F73";
const VIOLET = "#6C5CE7";

function homeBoard() {
  const nodes = [
    note(
      "home-welcome",
      0,
      0,
      "Welcome to Halcyon Studio's shared canvas.\nEvery live engagement has a board — double-click one to open it, or drag a tool from the left rail to add your own.",
      { w: 420, h: 128, bold: false },
    ),
    board("home-kestrel", 510, 0, BOARD_IDS.kestrel, "Kestrel Aero — launch moodboard", {
      icon: "Bike",
      caption: "Brand film · launch event · pre-orders",
      light: "rgba(232, 97, 60, 0.12)",
      dark: "#F08A68",
      w: 300,
    }),
    board("home-atlas", 510, 90, BOARD_IDS.atlas, "Atlas Coffee — rebrand plan", {
      icon: "Coffee",
      caption: "Identity → packaging → 14 cafés",
      light: "rgba(212, 160, 23, 0.12)",
      dark: "#E3B341",
      w: 300,
    }),
    board("home-research", 510, 180, BOARD_IDS.research, "Lumen Health — research wall", {
      icon: "Microscope",
      caption: "12 patient interviews, synthesised",
      light: "rgba(47, 111, 115, 0.14)",
      dark: "#5FB3B8",
      w: 300,
    }),
    board("home-retro", 510, 270, BOARD_IDS.retro, "Sprint 42 — retro", {
      icon: "History",
      caption: "Studio ops · two-week sprint",
      w: 300,
    }),
    column("home-week", 900, 0, "This week at the studio", [
      { text: `Kestrel brand film shoot — ${day(3)}, LX Factory` },
      { kind: "todo", text: "Send Atlas 250g dielines to the printer" },
      { kind: "todo", text: "Book the Pier 17 walkthrough for the Summit", checked: true },
      { kind: "link", text: "Studio site", url: "https://halcyon.studio/work" },
      { kind: "comment", text: "Staging for the Kestrel pre-order page is up 🎉", n: 9 },
    ]),
    clock("home-clock", 1320, 0),
    clock("home-clock-digital", 1320, 180, { digital: true }),
    calendar("home-calendar", 1320, 345, { style: "simple", size: 250 }),
    documentNode("home-handbook", 0, 165, DOCUMENT_IDS.handbook, "Studio handbook 2026"),
    file("home-capabilities", 0, 255, "halcyon-capabilities-2026.pdf", 6_481_203, "application/pdf", {
      caption: "Latest credentials deck",
    }),
    comment("home-comment-maya", 0, 360, "Summit speaker list locks Friday — add names to the table below.", 2),
    table(
      "home-engagements",
      0,
      465,
      ["Client", "Engagement", "Lead", "Due"],
      [
        ["Kestrel Bikes", "Aero launch", "Sofia Rossi", day(18)],
        ["Atlas Coffee Roasters", "Rebrand + rollout", "Jonas Weber", day(32)],
        ["Lumen Health", "Patient app research", "Noor Haddad", day(11)],
        ["Solace Hotels", "Summer '26 campaign", "Priya Nair", day(46)],
        ["Halcyon", "Creative Summit", "Tomás Silva", day(60)],
      ],
    ),
    image("home-team", 900, 465, "photo-1522071820081-009f0129c71c", "Brooklyn studio, Tuesday crit", {
      w: 300,
      h: 250,
    }),
  ];

  const edges = [
    edge("home-e1", "home-welcome", "home-kestrel"),
    edge("home-e2", "home-welcome", "home-atlas"),
    edge("home-e3", "home-welcome", "home-research"),
    edge("home-e4", "home-welcome", "home-retro"),
    edge("home-e5", "home-week", "home-calendar", { dashed: true }),
    edge("home-e6", "home-comment-maya", "home-engagements", { color: ORANGE }),
  ];

  return { nodes, edges, viewport: { x: 90, y: 110, zoom: 0.6 } };
}

function kestrelBoard() {
  const nodes = [
    note(
      "kes-title",
      0,
      0,
      "Kestrel Aero — launch moodboard\nPremium urban e-bike. Mood: quiet speed, early light on wet streets, graphite + signal orange.",
      { w: 460, h: 128 },
    ),
    image("kes-img-1", 0, 180, "photo-1485965120184-e220f721d03e", "Frame study — chalk white"),
    image("kes-img-2", 250, 180, "photo-1532298229144-0ec0c57515c7", "Hero: matte graphite"),
    image("kes-img-3", 500, 180, "photo-1571068316344-75bc76f77890", "Soft daylight, no props"),
    image("kes-img-4", 750, 180, "photo-1541625602330-2277a4c46182", "Riders by the water"),
    image("kes-img-5", 1000, 180, "photo-1517649763962-0c623066013b", "Pace, not racing"),
    note("kes-palette-1", 0, 495, "Signal Orange · #E8613C", { w: 220, h: 68, backgroundColor: ORANGE }),
    note("kes-palette-2", 250, 495, "Deep Teal · #2F6F73", { w: 220, h: 68, backgroundColor: TEAL }),
    note("kes-palette-3", 500, 495, "Graphite · #8A94A6", { w: 220, h: 68, backgroundColor: "#8A94A6" }),
    comment("kes-comment-jonas", 1270, 0, "Hero frame: matte Aero against fog — no lifestyle clutter.", 3),
    comment("kes-comment-kenji", 1270, 90, "Motion: long lenses, spokes as the transition device.", 7),
    link("kes-link", 0, 615, "https://kestrelbikes.example/aero"),
    documentNode("kes-brief", 370, 615, DOCUMENT_IDS.kestrelBrief, "Creative brief — Kestrel Aero"),
    file("kes-guidelines", 660, 600, "kestrel-aero-guidelines-v3.pdf", 4_812_330, "application/pdf", {
      caption: "Client brand guidelines",
    }),
    sketchNode("kes-storyboard", 960, 495, SKETCH_IDS.storyboard, "Hero film storyboard", {
      caption: "4 beats · 45s cut",
    }),
    board("kes-shotlist", 1320, 495, BOARD_IDS.shotList, "Shot list — brand film", {
      icon: "Clapperboard",
      caption: `Shoot day ${day(3)}`,
      w: 280,
    }),
    todo("kes-launch", 1320, 600, [
      ["Lock hero film edit", false],
      ["Pre-order page copy review", true],
      ["Press kit renders (6)", false],
      ["Launch event run-of-show", false],
    ]),
  ];

  const edges = [
    edge("kes-e1", "kes-title", "kes-img-2", { color: ORANGE }),
    edge("kes-e2", "kes-img-2", "kes-comment-jonas", { label: "hero?" }),
    edge("kes-e3", "kes-img-5", "kes-comment-kenji", { dashed: true }),
    edge("kes-e4", "kes-palette-1", "kes-img-2", { color: ORANGE }),
    edge("kes-e5", "kes-brief", "kes-storyboard"),
    edge("kes-e6", "kes-storyboard", "kes-shotlist", { animated: true }),
    edge("kes-e7", "kes-link", "kes-brief"),
  ];

  return { nodes, edges, viewport: { x: 70, y: 70, zoom: 0.55 } };
}

function atlasBoard() {
  const nodes = [
    note(
      "atl-title",
      0,
      0,
      "Atlas Coffee Roasters — rebrand plan\nIdentity refresh, packaging system and rollout to 14 cafés across Lisbon and Porto.",
      { w: 480, h: 104 },
    ),
    column("atl-discovery", 0, 165, "Discovery", [
      { text: "Stakeholder interviews (9) — done" },
      { text: "Café audit: 14 sites photographed" },
      { kind: "comment", text: "Diogo loves the tile references — keep the azulejo blue.", n: 8 },
      { kind: "link", text: "Heritage archive", url: "https://atlascoffee.example/heritage" },
    ]),
    column("atl-identity", 420, 165, "Identity", [
      { text: "Wordmark: custom serif, tightened 'tl' ligature" },
      { kind: "todo", text: "Final logo lockups", checked: true },
      { kind: "todo", text: "Colour system tokens" },
      { kind: "comment", text: "Secondary mark needs more air at small sizes.", n: 3 },
    ]),
    column("atl-packaging", 840, 165, "Packaging", [
      { kind: "todo", text: "Dieline for the 250g bag", checked: true },
      { kind: "todo", text: "Origin labels (6 origins)" },
      { text: "Print run: 40k bags, matte kraft" },
      { kind: "link", text: "Shop", url: "https://atlascoffee.example/shop" },
    ]),
    column("atl-rollout", 1260, 165, "Café rollout", [
      { text: "Pilot café: Príncipe Real" },
      { kind: "todo", text: "Signage vendor quotes (3)" },
      { text: "Menu boards reprinted per site" },
      { kind: "comment", text: "Stagger it — two sites a week, Lisbon first.", n: 4 },
    ]),
    table(
      "atl-schedule",
      0,
      690,
      ["Café", "City", "Signage", "Opens"],
      [
        ["Príncipe Real", "Lisbon", "Installed", day(9)],
        ["Cais do Sodré", "Lisbon", "In production", day(16)],
        ["Alfama", "Lisbon", "Approved", day(16)],
        ["Campo de Ourique", "Lisbon", "Quoted", day(23)],
        ["Baixa", "Porto", "Quoted", day(30)],
        ["Foz do Douro", "Porto", "Not started", day(37)],
      ],
    ),
    calendar("atl-calendar", 640, 690, { style: "simple", theme: "light", size: 250 }),
    image("atl-img-1", 945, 690, "photo-1495474472287-4d71bcdd2085", "Ritual over product"),
    image("atl-img-2", 1185, 690, "photo-1511920170033-f8396924c348", "Tools on show"),
    image("atl-img-3", 1425, 690, "photo-1559925393-8be0ec4767c8", "Street-level presence"),
    documentNode("atl-platform", 1680, 165, DOCUMENT_IDS.atlasPlatform, "Atlas brand platform"),
    sketchNode("atl-layout", 1680, 255, SKETCH_IDS.cafeLayout, "Café counter layout", {
      caption: "Pilot site, Príncipe Real",
    }),
    board("atl-packaging-board", 1680, 540, BOARD_IDS.packaging, "Packaging explorations", {
      icon: "Package",
      caption: "Bag, tin and cup studies",
      w: 280,
    }),
    clock("atl-clock", 1680, 640, { digital: true }),
  ];

  const edges = [
    edge("atl-e1", "atl-discovery", "atl-identity", { color: TEAL }),
    edge("atl-e2", "atl-identity", "atl-packaging", { color: TEAL }),
    edge("atl-e3", "atl-packaging", "atl-rollout", { color: TEAL }),
    edge("atl-e4", "atl-title", "atl-discovery"),
    edge("atl-e5", "atl-rollout", "atl-layout", { dashed: true, label: "pilot" }),
    edge("atl-e6", "atl-platform", "atl-identity", { dashed: true }),
  ];

  return { nodes, edges, viewport: { x: 60, y: 60, zoom: 0.48 } };
}

function researchBoard() {
  const pain = { enabled: true, color: ORANGE, name: "Pain point" };
  const quote = { enabled: true, color: TEAL, name: "Quote" };
  const opportunity = { enabled: true, color: VIOLET, name: "Opportunity" };

  const nodes = [
    note(
      "res-title",
      0,
      0,
      "Lumen Health — patient app research wall\n12 interviews · 3 clinics · synthesis round 2.",
      { w: 440, h: 104 },
    ),
    note("res-pain-1", 0, 165, "Booking a follow-up takes three or more calls on average.", { h: 80, outline: pain }),
    note("res-pain-2", 0, 270, "Lab results arrive with no explanation of what they mean.", { h: 80, outline: pain }),
    note("res-pain-3", 0, 375, "Reminders feel generic, so people stop reading them.", { h: 80, outline: pain }),
    note("res-quote-1", 420, 165, "“I just want to know if I should worry.” — P4", { h: 80, outline: quote }),
    note("res-quote-2", 420, 270, "“My daughter manages my appointments for me.” — P9", { h: 80, outline: quote }),
    note("res-quote-3", 420, 375, "“The app logs me out every single time.” — P2", { h: 80, outline: quote }),
    note("res-opp-1", 840, 165, "Plain-language result summaries, reviewed by a clinician.", {
      h: 80,
      outline: opportunity,
      reactions: { "👍": 4 },
    }),
    note("res-opp-2", 840, 270, "Shared caregiver access with its own permissions.", {
      h: 80,
      outline: opportunity,
      reactions: { "🔥": 3 },
    }),
    note("res-opp-3", 840, 375, "One-tap rebooking straight from the visit summary.", { h: 80, outline: opportunity }),
    comment("res-comment-noor", 0, 480, "P7 and P11 contradict each other on reminders — worth a follow-up call.", 8, {
      w: 420,
    }),
    comment("res-comment-ravi", 840, 480, "Sketching the caregiver flow tomorrow morning.", 5),
    image("res-wall", 1260, 165, "photo-1531403009284-440f080d1e12", "Affinity wall, round 1", { w: 260, h: 290 }),
    image("res-team", 1260, 480, "photo-1522071820081-009f0129c71c", "Synthesis session", { w: 260, h: 250 }),
    table(
      "res-participants",
      0,
      585,
      ["ID", "Age", "Clinic", "Tech comfort"],
      [
        ["P1", "34", "Boston North", "High"],
        ["P2", "71", "Boston North", "Low"],
        ["P3", "45", "Cambridge", "Medium"],
        ["P4", "29", "Cambridge", "High"],
        ["P5", "63", "Quincy", "Low"],
        ["P6", "52", "Quincy", "Medium"],
        ["P7", "38", "Boston North", "High"],
        ["P8", "80", "Cambridge", "Low"],
      ],
    ),
    documentNode("res-synthesis", 560, 585, DOCUMENT_IDS.lumenSynthesis, "Interview synthesis — round 1"),
    file("res-notes", 560, 675, "lumen-interview-notes.zip", 18_204_611, "application/zip"),
    link("res-link", 560, 780, "https://lumenhealth.example/patient-app"),
    todo("res-next", 960, 585, [
      ["Recruit four more caregivers", false],
      ["Affinity map, round 2", true],
      ["Share readout with Grace", false],
    ]),
    calendar("res-calendar", 960, 760, { style: "default", size: 200 }),
  ];

  const edges = [
    edge("res-e1", "res-pain-1", "res-quote-2", { color: ORANGE }),
    edge("res-e2", "res-pain-2", "res-quote-1", { color: ORANGE }),
    edge("res-e3", "res-pain-3", "res-quote-3", { color: ORANGE }),
    edge("res-e4", "res-quote-1", "res-opp-1", { color: TEAL }),
    edge("res-e5", "res-quote-2", "res-opp-2", { color: TEAL }),
    edge("res-e6", "res-quote-3", "res-opp-3", { color: TEAL }),
    edge("res-e7", "res-opp-2", "res-comment-ravi", { dashed: true }),
    edge("res-e8", "res-synthesis", "res-next"),
  ];

  return { nodes, edges, viewport: { x: 70, y: 70, zoom: 0.55 } };
}

function retroBoard() {
  const nodes = [
    note(
      "ret-title",
      0,
      0,
      "Sprint 42 retro · studio ops\nTimebox 45 min — five minutes of silent writing per column, then vote.",
      { w: 460, h: 104 },
    ),
    clock("ret-timer", 520, 0),
    calendar("ret-today", 700, 0, { style: "default", size: 156 }),
    column("ret-well", 0, 195, "Went well", [
      { text: "Kestrel pre-order page shipped two days early" },
      { text: "Atlas tile pattern landed on the first round" },
      { kind: "comment", text: "Producer handoffs felt calm this sprint.", n: 6 },
    ]),
    column("ret-improve", 420, 195, "To improve", [
      { text: "Too many review rounds on the Summit poster" },
      { text: "Render box queue blocked motion for a day" },
      { kind: "comment", text: "We need a booking slot system for the render box.", n: 7 },
    ]),
    column("ret-actions", 840, 195, "Actions", [
      { kind: "todo", text: "Cap creative reviews at two rounds — Jonas" },
      { kind: "todo", text: "Render queue calendar — Lucas" },
      { kind: "todo", text: "Share retro notes in #studio — Maya", checked: true },
    ]),
    note("ret-shoutout", 0, 585, "Shout-out to Tomás for the Pier 17 site-visit logistics 🙌", {
      h: 80,
      reactions: { "🙌": 5, "🔥": 2 },
    }),
    image("ret-img", 1260, 195, "photo-1600880292203-757bb62b4baf", "Ship it", { w: 260, h: 250 }),
    table(
      "ret-velocity",
      420,
      585,
      ["Sprint", "Planned", "Done", "Carry-over"],
      [
        ["38", "34", "29", "5"],
        ["39", "31", "30", "1"],
        ["40", "36", "27", "9"],
        ["41", "30", "28", "2"],
        ["42", "33", "32", "1"],
      ],
    ),
    todo("ret-next", 1260, 495, [
      ["Kestrel launch event", false],
      ["Atlas café pilot", false],
      ["Summit speaker announcements", false],
    ]),
    documentNode("ret-notes", 840, 585, DOCUMENT_IDS.retroNotes, "Sprint 42 retro notes"),
    link("ret-link", 840, 675, "https://halcyon.studio/handbook/rituals"),
  ];

  const edges = [
    edge("ret-e1", "ret-improve", "ret-actions", { color: ORANGE, label: "turn into" }),
    edge("ret-e2", "ret-well", "ret-shoutout", { dashed: true }),
    edge("ret-e3", "ret-actions", "ret-next"),
    edge("ret-e4", "ret-actions", "ret-notes"),
  ];

  return { nodes, edges, viewport: { x: 70, y: 70, zoom: 0.6 } };
}

function shotListBoard() {
  const nodes = [
    note("shot-title", 0, 0, `Shot list — Kestrel Aero brand film\nShoot day ${day(3)} · LX Factory, Lisbon · call 06:30`, {
      w: 440,
      h: 104,
    }),
    table(
      "shot-table",
      0,
      165,
      ["#", "Shot", "Lens", "Notes"],
      [
        ["01", "Tram tracks at dawn", "85mm", "Wet street, backlight"],
        ["02", "Frame macro pan", "100mm macro", "Slider, 3 passes"],
        ["03", "Rider through traffic", "135mm", "Tracking from the car"],
        ["04", "Spokes transition", "50mm", "High shutter"],
        ["05", "Endcard plate", "35mm", "Locked off, fog"],
      ],
    ),
    todo("shot-gear", 600, 165, [
      ["Car rig + tracking arm", true],
      ["Haze machine", false],
      ["Two Aero units (graphite)", true],
      ["Rain bars for the street", false],
    ]),
    image("shot-ref", 600, 390, "photo-1532298229144-0ec0c57515c7", "Hero unit reference", { w: 220, h: 250 }),
    comment("shot-comment", 0, 465, "Weather backup: indoor plate at the warehouse.", 4),
    documentNode("shot-doc", 0, 555, DOCUMENT_IDS.shotNotes, "Shoot day notes"),
  ];
  const edges = [
    edge("shot-e1", "shot-title", "shot-table"),
    edge("shot-e2", "shot-gear", "shot-ref", { dashed: true }),
  ];
  return { nodes, edges, viewport: { x: 90, y: 90, zoom: 0.75 } };
}

function packagingBoard() {
  const nodes = [
    note("pkg-title", 0, 0, "Packaging explorations\nMatte kraft bags, tile-blue origin bands, one typeface.", {
      w: 420,
      h: 104,
    }),
    image("pkg-img-1", 0, 165, "photo-1509042239860-f550ce710b93", "Cup sleeve study"),
    image("pkg-img-2", 250, 165, "photo-1511920170033-f8396924c348", "Bean colour reference"),
    note("pkg-band", 500, 165, "Origin band colours: Ethiopia → ochre, Colombia → tile blue, Brazil → terracotta.", {
      h: 104,
    }),
    comment("pkg-comment", 500, 300, "Printer needs dielines by Friday for the first run.", 4),
    documentNode("pkg-spec", 500, 390, DOCUMENT_IDS.packagingSpec, "Packaging spec v2"),
    file("pkg-dieline", 500, 480, "atlas-250g-dieline.ai", 2_204_118, "application/postscript"),
  ];
  const edges = [
    edge("pkg-e1", "pkg-title", "pkg-band"),
    edge("pkg-e2", "pkg-band", "pkg-spec", { dashed: true }),
  ];
  return { nodes, edges, viewport: { x: 90, y: 90, zoom: 0.75 } };
}

function row(key, n, { name, description, build, createdBy, created, updatedHours, metadata = {} }) {
  const { nodes, edges, viewport } = build();
  return {
    id: BOARD_IDS[key],
    project_id: PROJECT_ID,
    name,
    description,
    nodes,
    edges,
    viewport,
    metadata,
    created_by: personId(createdBy),
    deleted_at: null,
    created_at: daysAgo(created),
    updated_at: hoursAgo(updatedHours + n),
  };
}

// Research wall is keyed to show the Manage Access config; the owner bypasses the key.
const RESEARCH_ACCESS = {
  mode: "keyed",
  key: "lumen-r2",
  defaultLevel: "view",
  members: Object.fromEntries(
    PEOPLE.filter((p) => [5, 8, 10].includes(p.n)).map((p) => [p.id, p.n === 8 ? "manage" : "edit"]),
  ),
};

export function boardsSeed() {
  return {
    project_boards: [
      row("home", 1, {
        name: "Home",
        description: "Halcyon Studio's shared canvas.",
        build: homeBoard,
        createdBy: 1,
        created: 210,
        updatedHours: 1,
        metadata: { home: true },
      }),
      row("kestrel", 2, {
        name: "Kestrel Aero — launch moodboard",
        description: "Brand film, launch event and pre-order campaign for Kestrel's new e-bike.",
        build: kestrelBoard,
        createdBy: 3,
        created: 34,
        updatedHours: 2,
      }),
      row("atlas", 3, {
        name: "Atlas Coffee — rebrand plan",
        description: "Identity refresh, packaging system and café rollout.",
        build: atlasBoard,
        createdBy: 3,
        created: 61,
        updatedHours: 5,
      }),
      row("research", 4, {
        name: "Lumen Health — research wall",
        description: "Patient app discovery research.",
        build: researchBoard,
        createdBy: 8,
        created: 19,
        updatedHours: 20,
        metadata: { access: RESEARCH_ACCESS },
      }),
      row("retro", 5, {
        name: "Sprint 42 — retro",
        description: "Two-week studio ops sprint retrospective.",
        build: retroBoard,
        createdBy: 2,
        created: 3,
        updatedHours: 26,
      }),
      row("shotList", 6, {
        name: "Shot list — brand film",
        description: "Kestrel Aero hero film shoot plan.",
        build: shotListBoard,
        createdBy: 7,
        created: 12,
        updatedHours: 9,
      }),
      row("packaging", 7, {
        name: "Packaging explorations",
        description: "Atlas bag, tin and cup studies.",
        build: packagingBoard,
        createdBy: 5,
        created: 27,
        updatedHours: 48,
      }),
    ],
  };
}
