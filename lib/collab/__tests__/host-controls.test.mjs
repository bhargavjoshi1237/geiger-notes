// Host-control helpers: follow math, roles/members, meeting door rules. Run from the app root:
//   node --import ./lib/playground/__tests__/register.mjs --test lib/collab/__tests__/host-controls.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {
  canEditBoard,
  canModerate,
  followLoops,
  followViewport,
  readPreference,
  sessionMembers,
} from "../session.js";
import { getRole } from "../utils.js";
import { followScroll, movedByUser, viewportOf } from "../../sketch/follow.js";
import { meetingRefusal } from "../../meet/access.js";

const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);

test("followViewport shows at least the leader's visible area, centred", () => {
  // Leader sees flow x 0..1000, y 0..500 at zoom 1 on a 1000x500 pane.
  const leader = { x: 0, y: 0, zoom: 1, width: 1000, height: 500 };
  const same = followViewport(leader, 1000, 500);
  assert.deepEqual(same, { x: 0, y: 0, zoom: 1 });

  // Half-size follower zooms out to fit and keeps the same centre (500, 250).
  const small = followViewport(leader, 500, 250);
  close(small.zoom, 0.5);
  close((250 - small.x) / small.zoom, 500);
  close((125 - small.y) / small.zoom, 250);

  // Taller follower: width-bound, so the whole rect stays visible.
  const tall = followViewport(leader, 1000, 2000);
  close(tall.zoom, 1);
  close((1000 - tall.y) / tall.zoom, 250);

  assert.equal(followViewport(null, 100, 100), null);
  assert.equal(followViewport(leader, 0, 0), null);
});

test("followViewport clamps to the canvas zoom range", () => {
  const far = { x: 0, y: 0, zoom: 0.01, width: 1000, height: 1000 };
  assert.equal(followViewport(far, 1000, 1000, { minZoom: 0.1, maxZoom: 2 }).zoom, 0.1);
});

test("followLoops catches direct and longer follow cycles", () => {
  const following = { a: "b", b: "c", c: "a", d: "b", e: null };
  const of = (id) => following[id];
  // a wants to follow b: b → c → a comes back to a.
  assert.equal(followLoops("a", of("b"), of), true);
  assert.equal(followLoops("a", "a", of), true);
  // d following b is fine: the chain b → c → a → b never reaches d.
  assert.equal(followLoops("d", of("b"), of), false);
  assert.equal(followLoops("e", null, of), false);
});

test("sketch followScroll centres the leader's scene rect", () => {
  const leader = { scrollX: -100, scrollY: -50, zoom: 2, width: 800, height: 600 };
  const next = followScroll(leader, 800, 600);
  close(next.zoom, 2);
  close(next.scrollX, -100);
  close(next.scrollY, -50);
  assert.equal(movedByUser(next, next.scrollX, next.scrollY, next.zoom), false);
  assert.equal(movedByUser(next, next.scrollX + 40, next.scrollY, next.zoom), true);
  assert.equal(movedByUser(null, 0, 0, 1), true);
  assert.deepEqual(viewportOf({ scrollX: 1, scrollY: 2, zoom: { value: 3 }, width: 4, height: 5 }), {
    scrollX: 1,
    scrollY: 2,
    zoom: 3,
    width: 4,
    height: 5,
  });
});

test("roles: host, co-host, editor, viewer, pending", () => {
  const session = {
    host: "h",
    joiners: {
      c: { status: "joined", cohost: true },
      e: { status: "joined" },
      v: { status: "viewer" },
      p: { status: "requested" },
      k: { status: "kicked" },
    },
  };
  const role = (id) => getRole({ id }, session);
  assert.equal(role("h"), "host");
  assert.equal(role("c"), "cohost");
  assert.equal(role("e"), "editor");
  assert.equal(role("v"), "viewer");
  assert.equal(role("p"), "pending");
  assert.equal(role("k"), "viewer");
  assert.equal(role("stranger"), "viewer");

  assert.equal(canModerate("host"), true);
  assert.equal(canModerate("cohost"), true);
  assert.equal(canModerate("editor"), false);
  assert.equal(canEditBoard("editor", { editLock: false }), true);
  assert.equal(canEditBoard("editor", { editLock: true }), false);
  assert.equal(canEditBoard("cohost", { editLock: true }), true);
  assert.equal(canEditBoard("viewer", {}), false);
});

test("sessionMembers lists the host first and drops kicked/left entries", () => {
  const members = sessionMembers(
    {
      host: "h",
      created_at: "t0",
      joiners: {
        e: { status: "joined", name: "Eve", color: "#123456" },
        k: { status: "kicked", name: "Kim" },
        l: { status: "left", name: "Lee" },
        p: { status: "requested", name: "Pat" },
      },
    },
    "e",
  );
  assert.deepEqual(
    members.map((m) => [m.id, m.role]),
    [
      ["h", "host"],
      ["e", "editor"],
      ["p", "pending"],
    ],
  );
  assert.equal(members[1].isMe, true);
  assert.equal(members[1].color, "#123456");
  assert.match(members[0].color, /^#[0-9a-f]{6}$/);
});

test("readPreference fills defaults over a partial bag", () => {
  const pref = readPreference({ preference: { editLock: true } });
  assert.equal(pref.editLock, true);
  assert.equal(pref.locked, false);
  assert.equal(pref.facilitation, "anyone");
  assert.equal(readPreference(null).focus, null);
});

test("meetingRefusal: removed people and locked rooms, never the host", () => {
  const room = { host: "h", metadata: { locked: true, removed: { r: "t" } } };
  assert.equal(meetingRefusal(room, "h"), null);
  assert.equal(meetingRefusal(room, "r").status, 403);
  assert.equal(meetingRefusal(room, "x").status, 423);
  assert.equal(meetingRefusal({ host: "h", metadata: {} }, "x"), null);
  assert.equal(meetingRefusal({ host: "h", metadata: { removed: { r: "t" } } }, "r").status, 403);
});
