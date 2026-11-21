# Sketches — Phase 4: Convert selection to board nodes

**Date:** 2026-09-21
**Status:** Approved, not started
**Phase:** 4 of 5 — **depends on Phase 1**. Independent of phases 2 and 3.

## Context

A sketch is where thinking is cheap: boxes and arrows, fast, disposable. A board is where
thinking becomes structured: real nodes, real documents, real sub-boards. Today those are
separate acts — you draw the diagram, then you rebuild it by hand as nodes.

This phase makes the sketch the rough draft. Select shapes, push them to the board, and
they arrive as real React Flow nodes wired by real edges, positioned as you drew them.

## Goals

- Select any subset of a sketch and push it onto the board that hosts the sketch.
- Shapes become nodes, arrows between shapes become edges, relative layout is preserved.
- What cannot be converted is reported, not silently dropped.
- The sketch is unchanged by the push — it is a copy, not a move.

## Knowing the target board

The editor route is `?sketch=<id>`; it has no idea which board the sketch node lives on.
Fix this at creation time, in Phase 1's drop handler rather than by guessing later.

When `BoardCanvas` mints a sketch, include the host board in the `POST /api/sketches` body
and store it in the row's metadata bag:

```
metadata.parentBoardId = boardId ?? null   // null means the root/home canvas
metadata.parentScope   = projectId ? "project" : "personal"
```

The `metadata jsonb` column exists for exactly this kind of not-yet-promoted attribute
(`MIGRATION_CONVENTIONS.md`). No migration needed.

A sketch with no `parentBoardId` (created before this phase, or orphaned) disables the
push action with the tooltip "No host board".

## Mapping

| Excalidraw element | Becomes | Notes |
|---|---|---|
| `rectangle`, `diamond`, `ellipse` with a bound text element | `custom` node | `data.label` = the bound text |
| `rectangle`, `diamond`, `ellipse` with no text | `custom` node | empty label — a blank note, as if dropped from the palette |
| standalone `text` | `custom` node | `data.label` = the text |
| `arrow` with both `startBinding` and `endBinding` resolving to converted shapes | `center` edge | `source`/`target` from the mapped node ids |
| `image` | `image` node | file uploaded to the `homeboard` bucket first (below) |
| `frame` | `column` node | children sorted by `y` become the column's items; use `columnNodeDefaults()` and `COLUMN_DEFAULT_SIZE` from `ColumnNode.jsx` |
| `line`, `freedraw`, `arrow` with an unbound end, `embeddable`, `iframe` | skipped | counted and reported |

Rules that keep the result sane:

- **Bound text is consumed, not duplicated.** A text element referenced by a shape's
  `boundElements` must not also become its own node.
- **Deleted elements are ignored.** Excalidraw keeps `isDeleted: true` tombstones in the
  scene; filter them first or you will convert erased shapes.
- **Arrows to unconverted shapes are skipped.** An edge needs both endpoints in the
  pushed set; a dangling arrow is reported with the other skips.

### Images

An Excalidraw image lives as a dataURL inside the scene's `files`. A React Flow image node
expects a URL. Convert by uploading to the `homeboard` bucket under
`sketches/<sketchId>/<fileId>.<ext>` and using the public URL, mirroring the upload in
`ImageSettingsSidebar.jsx:158-178`. If the upload fails, skip the image and report it
rather than failing the whole push.

## Geometry

Excalidraw scene coordinates and React Flow flow coordinates are both unrotated
pixel spaces, so the translation is an offset, not a transform — no scaling, no
flipping.

1. Compute the selection's bounding box in scene coordinates (`minX`, `minY`).
2. Find the anchor on the board: the sketch node whose `data.sketchId` matches. Place the
   cluster immediately to its right — `anchor.position.x + (anchor.style?.width ?? 320) + 80`,
   same `y`. Falling back to `{ x: 0, y: 0 }` when no anchor is found.
3. Every node's position is `anchor + (element.{x,y} - min{X,Y})`.
4. Size: `width = max(element.width, 200)`, `height = max(element.height, 68)`, matching
   the minimums the existing nodes enforce through `NodeResizeControl`.
5. `element.angle` is dropped — React Flow nodes do not rotate. Rotated shapes land
   axis-aligned at their top-left; note it in the skip summary only if any angle is
   non-zero.

Node ids use `crypto.randomUUID()` per `crafting.md`, not `node-${Date.now()}` — a push
creates many nodes in one tick and the timestamp pattern would collide.

## Delivery: server-side append

The board is not mounted while the editor is open, so the new nodes cannot be handed to it
through React state. Do it on the server.

`app/api/sketches/push-to-board/route.js`, `POST { sketchId, elementIds }`:

1. Load the sketch row (RLS authorizes the read).
2. Read `metadata.parentBoardId` / `parentScope` and load the target board exactly the way
   `app/api/load-state/route.js` does — `notes.project_boards` by id or by
   `metadata->>home`, or `notes.boards` / `notes.base` for personal.
3. Convert the requested elements (the mapping above) server-side.
4. Append the new nodes and edges to the loaded arrays and write back using the same
   column shapes `app/api/save-state/route.js` uses — **jsonb for project boards, stringified
   text for personal**. Getting this wrong corrupts a board; mirror the existing
   `toJson` / `JSON.stringify` branches precisely.
5. Return `{ nodes: n, edges: m, skipped: [{ type, reason, count }] }`.

Appending server-side while the board is unmounted means no write race with the board's
own autosave. It also means the push survives the user navigating somewhere else entirely
instead of back to the board.

Conversion logic lives in `lib/sketch/to-board-nodes.js` as pure functions taking
`(elements, files, anchor)` and returning `{ nodes, edges, skipped }` — no Supabase, no
React. That keeps the mapping readable and independently checkable, which matters because
it is the one genuinely fiddly piece of this phase.

## UI

A `<Footer>` action in `SketchEditor` beside the Phase 2 link button: `Workflow` icon,
"Push to board", disabled unless something is selected and a `parentBoardId` exists.

On click: send the selected element ids, then a summary toast.

- Success: `toast.success("Added 7 nodes and 4 edges to Roadmap")`.
- Partial: same, plus `toast.info("3 freehand strokes skipped")` — one extra toast, not
  one per skipped element.
- Failure: `toast.error("Couldn't push to the board")`, nothing written (the append is a
  single update; a failed write leaves the board untouched).

Returning to the board remounts `BoardCanvas`, which loads state on mount, so the nodes are
simply there. No cache invalidation, no refetch plumbing.

## Deliberately not in scope

- **Round-tripping.** Pushed nodes have no link back to their source shapes, and editing
  the sketch afterwards does not update them. A live two-way binding is a much larger
  design and is not what this is for — the sketch is a draft, the push is a one-time
  crystallization.
- **Undo.** The pushed nodes are ordinary nodes; selecting and deleting them is the undo.
  An undo endpoint that removes nodes by id would race with any edits made after the push.

## Error handling

- Empty selection → the button is disabled; no request is possible.
- Target board deleted since the sketch was made → 404 from the route,
  `toast.error("That board no longer exists")`.
- A single element failing conversion → skip it, count it, continue. One bad shape must
  never fail the batch.
- More than 200 selected elements → convert the first 200 and report the cap, so a
  select-all on a large sketch cannot produce an unusable board.

## Verification

1. `npx eslint` clean on every changed file.
2. Draw three labelled boxes connected by two arrows, select all, push. Confirm three
   `custom` nodes with the right labels, two `center` edges connecting the right pairs, and
   relative positions matching the drawing.
3. Confirm the cluster lands beside the sketch node, not on top of it.
4. Include a freehand scribble in the selection; confirm the skip toast counts it and the
   rest still converts.
5. Push from a **personal** board and from a **project** board; confirm both persist —
   this is where the jsonb-versus-text column split will bite if it was copied wrong.
6. Confirm the sketch itself is byte-identical after a push (it is a copy, not a move).
7. Draw an arrow with one end unattached; confirm no edge and no crash.

## Files

| File | Action |
|---|---|
| `lib/sketch/to-board-nodes.js` | new — pure mapping, the heart of this phase |
| `app/api/sketches/push-to-board/route.js` | new |
| `components/internal/sketch/SketchEditor.jsx` | edit — push action |
| `components/internal/canvas/BoardCanvas.jsx` | edit — send `parentBoardId` on create |
| `app/api/sketches/route.js` | edit — persist `metadata.parentBoardId` / `parentScope` |
