// notes.sketches: Excalidraw scenes for the sketch nodes on the Kestrel and
// Atlas boards. Elements carry the fields Excalidraw stores; anything left out
// is filled in by Excalidraw's own restore() when the scene loads.

import { personId } from "../cast.js";
import { PROJECT_ID, daysAgo, hoursAgo } from "./helpers.js";
import { BOARD_IDS, SKETCH_IDS } from "./boards.js";

const INK = "#1e1e1e";

function scene(prefix) {
  const elements = [];
  let n = 0;

  const add = (type, x, y, width, height, extra = {}) => {
    n += 1;
    const element = {
      id: `${prefix}-${n}`,
      type,
      x,
      y,
      width,
      height,
      angle: 0,
      strokeColor: INK,
      backgroundColor: "transparent",
      fillStyle: "solid",
      strokeWidth: 2,
      strokeStyle: "solid",
      roughness: 1,
      opacity: 100,
      groupIds: [],
      frameId: null,
      roundness: null,
      seed: 1000 + n * 97,
      version: 2,
      versionNonce: 5000 + n * 131,
      isDeleted: false,
      boundElements: null,
      updated: 1,
      link: null,
      locked: false,
      ...extra,
    };
    elements.push(element);
    return element;
  };

  return {
    elements,
    rect: (x, y, w, h, extra) => add("rectangle", x, y, w, h, { roundness: { type: 3 }, ...extra }),
    ellipse: (x, y, w, h, extra) => add("ellipse", x, y, w, h, extra),
    text: (x, y, value, { size = 20, color = INK, align = "left" } = {}) => {
      const lines = value.split("\n");
      const longest = Math.max(...lines.map((l) => l.length));
      return add("text", x, y, Math.round(longest * size * 0.55), Math.round(lines.length * size * 1.25), {
        strokeColor: color,
        text: value,
        originalText: value,
        fontSize: size,
        fontFamily: 5,
        textAlign: align,
        verticalAlign: "top",
        containerId: null,
        autoResize: true,
        lineHeight: 1.25,
      });
    },
    // points are relative to (x, y).
    line: (x, y, points, extra) => {
      const xs = points.map((pt) => pt[0]);
      const ys = points.map((pt) => pt[1]);
      return add("line", x, y, Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), {
        points,
        lastCommittedPoint: null,
        startBinding: null,
        endBinding: null,
        startArrowhead: null,
        endArrowhead: null,
        ...extra,
      });
    },
    arrow: (x, y, dx, dy, extra) =>
      add("arrow", x, y, Math.abs(dx), Math.abs(dy), {
        points: [
          [0, 0],
          [dx, dy],
        ],
        lastCommittedPoint: null,
        startBinding: null,
        endBinding: null,
        startArrowhead: null,
        endArrowhead: "arrow",
        elbowed: false,
        ...extra,
      }),
  };
}

// A side-on bike: two wheels and a frame, at (x, y) with wheel size r.
function bike(s, x, y, r, color = INK) {
  s.ellipse(x, y, r, r, { strokeColor: color });
  s.ellipse(x + r * 1.7, y, r, r, { strokeColor: color });
  const hub = [x + r / 2, y + r / 2];
  s.line(hub[0], hub[1], [
    [0, 0],
    [r * 0.75, -r * 0.6],
    [r * 1.55, -r * 0.6],
    [r * 1.7, 0],
    [r * 0.85, 0],
    [0, 0],
  ], { strokeColor: color });
  s.line(hub[0] + r * 0.85, hub[1], [
    [0, 0],
    [-r * 0.15, -r * 0.75],
  ], { strokeColor: color });
}

function storyboard() {
  const s = scene("story");
  const panelW = 280;
  const panelH = 170;
  const beats = [
    "01  Dawn — tram tracks, Lisbon",
    "02  Macro pan along the frame",
    "03  Rider slips through traffic",
    "04  Endcard: “Quiet speed.”",
  ];

  s.text(0, -70, "Kestrel Aero — hero film (45s)", { size: 28 });
  beats.forEach((beat, i) => {
    const x = i * (panelW + 60);
    s.rect(x, 0, panelW, panelH, { backgroundColor: "#f8f9fa" });
    s.text(x, panelH + 16, beat, { size: 18 });
    if (i < beats.length - 1) s.arrow(x + panelW + 8, panelH / 2, 44, 0, { strokeColor: "#E8613C" });
  });

  // 01: horizon, sun and the tram rails.
  s.ellipse(190, 30, 46, 46, { strokeColor: "#E8613C", backgroundColor: "#ffd8a8", fillStyle: "hachure" });
  s.line(16, 110, [[0, 0], [248, 0]]);
  s.line(40, 165, [[0, 0], [80, -55]]);
  s.line(220, 165, [[0, 0], [-80, -55]]);

  // 02: the frame, tight.
  bike(s, panelW + 60 + 30, 60, 80);

  // 03: rider on the bike between two cars.
  const third = 2 * (panelW + 60);
  bike(s, third + 85, 95, 50, "#2F6F73");
  s.ellipse(third + 150, 30, 22, 22, { strokeColor: "#2F6F73" });
  s.line(third + 160, 52, [[0, 0], [-12, 45]], { strokeColor: "#2F6F73" });
  s.rect(third + 12, 110, 60, 40, { backgroundColor: "#ced4da", fillStyle: "hachure" });
  s.rect(third + 212, 110, 56, 40, { backgroundColor: "#ced4da", fillStyle: "hachure" });

  // 04: the endcard.
  const fourth = 3 * (panelW + 60);
  s.text(fourth + 40, 55, "Quiet speed.", { size: 32 });
  s.text(fourth + 70, 105, "KESTREL AERO", { size: 16, color: "#E8613C" });

  // Sticky notes from the review.
  s.rect(0, 280, 300, 90, { backgroundColor: "#ffec99", strokeColor: "#f08c00" });
  s.text(14, 294, "VO: “The city never slows down.\nNeither do you.”", { size: 18 });
  s.rect(340, 280, 300, 90, { backgroundColor: "#d0ebff", strokeColor: "#1971c2" });
  s.text(354, 294, "Kenji: spokes wipe from\n02 into 03", { size: 18 });

  return s.elements;
}

function cafeLayout() {
  const s = scene("cafe");
  s.text(0, -60, "Príncipe Real — counter layout", { size: 28 });
  s.rect(0, 0, 620, 400, { strokeWidth: 4 });
  s.text(10, 10, "Street", { size: 16 });

  s.rect(360, 40, 230, 70, { backgroundColor: "#a5d8ff", fillStyle: "hachure" });
  s.text(390, 62, "Espresso bar", { size: 20 });
  s.rect(360, 130, 230, 60, { backgroundColor: "#ffec99", fillStyle: "hachure" });
  s.text(390, 148, "Retail shelf", { size: 20 });
  s.rect(40, 300, 140, 70, { backgroundColor: "#d3f9d8", fillStyle: "hachure" });
  s.text(60, 322, "Pick-up", { size: 20 });

  [[60, 90], [170, 90], [60, 190], [170, 190]].forEach(([x, y]) => {
    s.ellipse(x, y, 70, 70, { backgroundColor: "#e9ecef", fillStyle: "solid" });
  });
  s.text(70, 270, "Tables (12 seats)", { size: 16 });

  s.arrow(300, 380, 0, -230, { strokeColor: "#E8613C", strokeStyle: "dashed" });
  s.arrow(300, 150, 52, -60, { strokeColor: "#E8613C", strokeStyle: "dashed" });
  s.text(312, 260, "queue", { size: 16, color: "#E8613C" });
  s.arrow(360, 110, -170, 190, { strokeColor: "#2F6F73" });
  s.text(220, 215, "hand-off", { size: 16, color: "#2F6F73" });

  return s.elements;
}

const APP_STATE = { viewBackgroundColor: "#ffffff", gridSize: 20, gridModeEnabled: false };

export function sketchesSeed() {
  return {
    sketches: [
      {
        id: SKETCH_IDS.storyboard,
        project_id: PROJECT_ID,
        user_id: null,
        name: "Hero film storyboard",
        description: "4 beats · 45s cut",
        elements: storyboard(),
        app_state: APP_STATE,
        files: {},
        metadata: { parentBoardId: BOARD_IDS.kestrel, parentScope: "project" },
        created_by: personId(7),
        deleted_at: null,
        created_at: daysAgo(14),
        updated_at: hoursAgo(6),
      },
      {
        id: SKETCH_IDS.cafeLayout,
        project_id: PROJECT_ID,
        user_id: null,
        name: "Café counter layout",
        description: "Pilot site, Príncipe Real",
        elements: cafeLayout(),
        app_state: APP_STATE,
        files: {},
        metadata: { parentBoardId: BOARD_IDS.atlas, parentScope: "project" },
        created_by: personId(5),
        deleted_at: null,
        created_at: daysAgo(22),
        updated_at: daysAgo(2),
      },
    ],
  };
}
