# Sketches — Phase 5: Realtime multiplayer sketching

**Date:** 2026-09-21
**Status:** Approved, not started
**Phase:** 5 of 5 — **depends on Phase 1**. Independent of phases 2, 3 and 4.

## Context

Two realtime patterns already exist in this repo and this phase should look like them
rather than inventing a third:

- `lib/collab/hooks/useRealtime.js` — a `collab:<sessionId>` channel mixing
  `postgres_changes` for durable state with a `broadcast` event for ephemeral selection,
  painting remote selections as coloured node outlines.
- `lib/meet/usePeerMesh.js` — a `meet:<roomId>` channel using **presence** for who is here
  and **broadcast** for per-peer signalling, with `broadcast: { self: false }`.

Excalidraw meets this halfway: it accepts a `collaborators` map (id → `{ username,
pointer, selectedElementIds, color }`) and renders remote cursors and selections itself.
We supply the transport; it supplies the rendering.

## Goals

- Two or more people with access to a sketch can draw on it at the same time.
- Remote cursors with names, live.
- Element changes converge — last-writer-wins per element, by Excalidraw's own version
  ordering.
- No lost work when someone drops offline mid-stroke.

## Deliberate divergence: no session ceremony

The existing `/colab` flow is a session model — generate a `GEIGER-XXXX` code, request to
join, host accepts, merge on exit. That exists because a *personal* board has no inherent
membership; strangers need to be let in.

A project sketch already has membership: `notes.has_ability(project_id, 'sketches.update')`
decides who may edit, and RLS enforces it. Re-asking that question with a join code would
be ceremony with no security value.

**Therefore:** collaboration on a project sketch is *ambient*. Open it, and anyone else
with edit access who is also in it appears. No code, no accept, no merge step.

A **personal** sketch (`project_id is null`) has exactly one person with access, so it has
no multiplayer. The presence UI is simply absent there. Sharing a personal sketch with a
stranger is the `/colab` session model's job and is out of scope.

## Channel

One channel per sketch, `sketch:<sketchId>`, configured like `usePeerMesh.js:222`:

```js
supabase.channel(`sketch:${sketchId}`, {
  config: { presence: { key: userId }, broadcast: { self: false } },
});
```

| Mechanism | Event | Payload | Rate |
|---|---|---|---|
| presence | — | `{ userId, name, color, avatar }` | on join/leave only |
| broadcast | `pointer` | `{ userId, x, y, tool, selectedElementIds }` | throttled, 33ms |
| broadcast | `elements` | `{ userId, elements: [changed only] }` | throttled, 300ms |

`self: false` keeps a client from processing its own echo — the same setting the meet mesh
relies on.

**Colour** is assigned deterministically from the user id (hash into a fixed 8-colour
palette) so a person is the same colour for everyone in the room without negotiation.

## Pointers

`SketchEditor` passes `onPointerUpdate={({ pointer, button, pointersMap }) => ...}`,
throttled to ~33ms with a trailing call so the final resting position always lands.

Inbound pointers build the `collaborators` map handed to Excalidraw:

```js
excalidrawAPI.updateScene({
  collaborators: new Map(remote.map((c) => [c.userId, {
    username: c.name, pointer: { x: c.x, y: c.y },
    selectedElementIds: c.selectedElementIds, color: { background: c.color, stroke: c.color },
  }])),
});
```

Excalidraw draws the cursors, labels and remote selection highlights. Do not build any of
that.

A collaborator with no `pointer` broadcast for 10 seconds is dropped from the map even if
presence still lists them — a stale cursor frozen mid-canvas reads as a bug.

## Element convergence

Every Excalidraw element carries `version`, `versionNonce` and `updated`. Excalidraw's own
protocol reconciles with them, and so do we:

**For each incoming element, keep the local one unless the remote `version` is higher; on
a version tie, keep the one with the lower `versionNonce`.** The nonce tiebreak is what
makes the rule deterministic — both sides independently reach the same answer, so the
scene cannot diverge.

Outbound, diff against the last broadcast snapshot and send only elements whose `version`
changed. A full-scene broadcast on every stroke is what makes naive implementations of
this unusable on a large drawing.

Deletions travel as elements with `isDeleted: true`, never as omissions — an absent
element is indistinguishable from an element the sender had not yet received.

Implementation lives in `lib/sketch/reconcile.js` as a pure function
`(local, remote) => merged`, no Supabase, no React. It is the piece most likely to harbour
a subtle bug and must be readable in isolation.

## Persistence

Broadcast is ephemeral; the row is the truth.

- **Only one client writes.** The presence entry with the lowest `joinedAt` is the writer;
  everyone else's autosave is suppressed while a writer exists. When the writer leaves,
  presence sync promotes the next — no election protocol needed, since presence state is
  already ordered and consistent for everyone.
- The writer's autosave is Phase 1's unchanged 2.5s debounce.
- **Every client flushes on unmount and `beforeunload` regardless of writer status.** If
  the writer's tab dies mid-stroke, the last survivor's flush is the safety net. Writes are
  idempotent — a duplicate PUT of a converged scene changes nothing.
- On joining, a client loads the row first, then applies incoming broadcasts on top. A
  broadcast arriving before the load completes is queued, not dropped.

## Presence UI

A stacked avatar row in the editor's top bar, left of the save status: up to five
`CachedAvatarImage` circles (the component already exists) in each person's assigned
colour, then "+N". Tooltip shows the name. Reuse the avatar treatment from the meet stage
rather than a new one.

A person with only `sketches.view` appears in presence and sees cursors, but their editor
is in `viewModeEnabled` and they broadcast no element changes. Watching is allowed;
editing is not.

## Error handling

- Channel subscribe fails → the editor stays fully functional as single-player,
  `toast.error("Live collaboration unavailable")` once, no retry storm.
- Realtime disconnect → Supabase's client reconnects on its own; on resubscribe, reload the
  row and re-reconcile rather than trusting local state accumulated while offline.
- A malformed broadcast payload → drop that message, `console.error`, never let one bad
  frame take down the channel handler.
- Two clients both believing they are the writer (a presence split) → harmless. Both write
  converged scenes; last write wins and the content is identical by construction.

## Deliberately not in scope

- **Persistent operation history / CRDT.** Last-writer-wins per element is what Excalidraw
  itself uses for its collaboration. A CRDT here would be a much larger project for an
  edge case this product does not have.
- **Follow-mode / viewport following.** Later, if asked.
- **Voice.** `lib/meet/` already exists for that and should stay separate.

## Verification

Needs two browsers (or one plus an incognito window) signed in as different members of the
same project.

1. `npx eslint` clean on every changed file.
2. Both open the same sketch: each sees the other's avatar and live cursor with the right
   name and a distinct colour.
3. Both draw at once: shapes from both appear on both sides within a beat, nothing flickers
   or reverts.
4. One deletes a shape the other is moving: both converge to the same result (deleted).
5. Kill one tab mid-drawing; reload it; confirm the drawing is intact — that exercises the
   flush-on-unload path.
6. Open as a `sketches.view`-only member: cursors visible, editing blocked.
7. Open a **personal** sketch: no presence UI, no channel opened (confirm in the Network
   tab's WS frames).
8. Watch the WS frames while drawing a long freehand stroke: element broadcasts should be
   diffs of a few elements, never the whole scene.

## Files

| File | Action |
|---|---|
| `lib/sketch/reconcile.js` | new — pure version/nonce reconciliation |
| `lib/sketch/useSketchPresence.js` | new — channel, presence, throttled broadcasts, writer election |
| `components/internal/sketch/SketchEditor.jsx` | edit — `onPointerUpdate`, collaborators map, writer-gated autosave |
| `components/internal/sketch/CollaboratorStack.jsx` | new — avatar row |
