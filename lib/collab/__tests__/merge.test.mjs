// Session merge diff: what counts as a change, and the board a merge produces. Run from the app root:
//   npm run test:collab
import test from "node:test";
import assert from "node:assert/strict";
import { buildMergedBoard, computeMergeDiff, mergeStatus, nodeLabel, nodeTypeLabel } from "../merge.js";

const node = (id, label, extra = {}) => ({ id, type: "custom", position: { x: 0, y: 0 }, data: { label }, ...extra });
const session = (nodes, edges = []) => ({ state_nodes: JSON.stringify(nodes), state_edges: JSON.stringify(edges) });

test("selection, measurement and key order are not changes", () => {
  const board = [node("a", "A", { selected: true, measured: { width: 10, height: 10 } })];
  const reordered = { data: { label: "A" }, position: { y: 0, x: 0 }, type: "custom", id: "a" };
  const diff = computeMergeDiff(session([reordered]), board, []);
  assert.equal(diff.total, 0);
  assert.equal(mergeStatus({}, diff), "none");
});

test("new, changed, edge-only and board-only items are told apart", () => {
  const board = [node("a", "A"), node("b", "B"), node("local", "Local")];
  const edges = [{ id: "e1", source: "a", target: "b" }];
  const diff = computeMergeDiff(
    session([node("a", "A"), node("b", "B2"), node("c", "C")], [...edges, { id: "e2", source: "b", target: "c" }]),
    board,
    edges,
  );
  assert.deepEqual(diff.newNodes.map((n) => n.id), ["c"]);
  assert.deepEqual(diff.changedNodes.map((n) => n.id), ["b"]);
  assert.deepEqual(diff.localNodes.map((n) => n.id), ["local"]);
  assert.equal(diff.edgeChanges, 1);
  assert.equal(diff.total, 3);
  assert.equal(mergeStatus({}, diff), "ready");

  const edgeOnly = computeMergeDiff(session([node("a", "A")], [{ id: "e9", source: "a", target: "a" }]), [node("a", "A")], []);
  assert.equal(edgeOnly.total, 1);
});

test("a session sharing no nodes with a non-empty board is flagged as from another board", () => {
  const diff = computeMergeDiff(session([node("x", "X")]), [node("a", "A")], []);
  assert.equal(diff.fromOtherBoard, true);
  assert.equal(mergeStatus({}, diff), "other");

  assert.equal(computeMergeDiff(session([node("x", "X")]), [], []).fromOtherBoard, false);
});

test("merged sessions stay merged whatever the diff says, unreadable ones have nothing to merge", () => {
  assert.equal(mergeStatus({ rollback: { nodes: [] } }, { total: 4 }), "merged");
  assert.equal(computeMergeDiff({ state_nodes: "{not json" }, [], []), null);
  assert.equal(mergeStatus({}, null), "none");
});

test("merging keeps board-only items and lets session versions win", () => {
  const board = [node("a", "old"), node("local", "Local")];
  const edges = [{ id: "e1", source: "a", target: "local", label: "old" }, { id: "e2", source: "a", target: "a" }];
  const diff = computeMergeDiff(session([node("a", "new")], [{ id: "e1", source: "a", target: "local", label: "new" }]), board, edges);
  const merged = buildMergedBoard(diff, edges);
  assert.deepEqual(merged.nodes.map((n) => [n.id, n.data.label]), [["a", "new"], ["local", "Local"]]);
  assert.deepEqual(merged.edges.map((e) => [e.id, e.label]), [["e1", "new"], ["e2", undefined]]);
});

test("node names fall back sensibly", () => {
  assert.equal(nodeLabel(node("a", "<p>Hello   <b>there</b></p>")), "Hello there");
  assert.equal(nodeLabel({ data: { name: "Doc" } }), "Doc");
  assert.equal(nodeLabel({ data: {} }), "Untitled");
  assert.equal(nodeTypeLabel({ type: "custom" }), "Note");
  assert.equal(nodeTypeLabel({ type: "sketch" }), "Sketch");
});
