# Sketches — Phase 2: Element links to Notes entities

**Date:** 2026-09-21
**Status:** Approved, not started
**Phase:** 2 of 5 — **depends on Phase 1** (`notes.sketches`, `SketchEditor`, `SketchNode`).

## Context

Excalidraw stores a `link` string on every element natively, renders a link badge on
linked shapes, and exposes an `onLinkOpen(element, event)` prop for intercepting clicks.
That machinery already exists; we are not building a link system, we are deciding what a
link means inside Notes and where it lands.

The payoff: draw your architecture, service map, or org chart once, attach each box to the
board or document that holds the real work, and the sketch becomes a navigable map of the
project rather than a picture of one.

## Goals

- A shape in a sketch can point at a board, a document, or another sketch.
- Clicking it navigates **in-app** — no new browser tab, no full page load.
- Setting a link is a picker, not a hand-typed UUID.
- Links survive copy/paste of the element and export of the scene.

## Design decision: real URLs, not a custom scheme

The Phase 1 design sketched a `sketch://board/<id>` custom scheme. **Use same-origin app
URLs instead.**

```
/project/<projectId>?board=<boardId>
/project/<projectId>?sketch=<sketchId>
/[userId]/home?sketch=<sketchId>
/project/<projectId>?document=<documentId>
```

Three reasons this is better:

1. Excalidraw's own link editor normalizes and validates what it is given; a real URL
   round-trips through it cleanly, an invented scheme may not.
2. It degrades correctly. If a link escapes the app — pasted into Slack, opened from an
   exported `.excalidraw` file, clicked by a user on a build without the interceptor — it
   is still a working URL that lands in the right place.
3. No resolver table. The URL *is* the address.

The interceptor is then a narrow rule: **same-origin links are handled in-app, everything
else opens in a tab as Excalidraw would normally.**

## Prerequisite: `?board=<id>` on the project page

Today `app/project/[projectId]/page.js` tracks the open sub-board in React state
(`activeBoardId` plus a `breadcrumbs` array) — there is no URL representation, so a board
cannot be linked to at all. Phase 2 must add one, mirroring the `?sketch=` handling from
Phase 1:

- Read `?board=<id>` with `useSearchParams()` and use it to seed `activeBoardId`.
- `handleNavigate` pushes `?board=<id>` alongside its existing state update.
- `onBreadcrumbClick` back to root clears the param.
- Breadcrumbs stay in state. Rebuilding an ancestor trail from a cold deep link is out of
  scope; a cold `?board=` load shows a single-level breadcrumb.

This is a standalone improvement — sub-boards become deep-linkable and survive refresh
whether or not a sketch ever links to one. Land it as its own commit before the link work.

## The link picker

Excalidraw's native link field (element context menu → "Add link") keeps working; a user
who pastes a Notes URL there gets a working link with no extra UI. The picker is the
discoverable path on top of it.

**Trigger.** Excalidraw accepts children for its UI slots. Render a `<Footer>` child inside
`SketchEditor` holding one button, `Link2` icon, labelled "Link to Notes". It is disabled
unless exactly one element is selected.

**Selection.** Read via the `excalidrawAPI` ref captured in `SketchEditor`:

```js
const selected = excalidrawAPI
  .getSceneElements()
  .filter((el) => excalidrawAPI.getAppState().selectedElementIds[el.id]);
```

**Dialog.** `components/internal/sketch/LinkPickerDialog.jsx` — a shadcn/`@geiger/ui`
`Dialog` with a search input and a grouped, scrollable result list:

| Group | Source | Icon |
|---|---|---|
| Boards | `notes.project_boards` for this project (`deleted_at is null`), or `notes.boards` for a personal sketch | `LayoutDashboard` |
| Sketches | `notes.sketches` in the same scope, excluding the current one | `PenTool` |
| Documents | `notes.documents` referenced by nodes on the project's boards | `FileText` |

One `GET /api/sketches/link-targets?projectId=` returns all three groups in a single
response, shaped `{ boards: [...], sketches: [...], documents: [...] }`, each entry
`{ id, name, url }` with the URL built server-side so the client never assembles routes by
hand. Loading state uses `LogoLoading` at `size={40}`; empty state uses the shared
`EmptyState` treatment.

**Apply.** On pick, write the link onto the selected element and let Excalidraw redraw:

```js
excalidrawAPI.updateScene({
  elements: elements.map((el) =>
    el.id === targetId ? { ...el, link: chosen.url, version: el.version + 1 } : el
  ),
});
```

Bumping `version` matters — it keeps the element ordered correctly against Phase 5's
reconciliation, and costs nothing now. The existing autosave debounce persists it; no new
write path.

**Remove.** The same button reads "Edit link" when the selected element already has one,
and the dialog grows a destructive "Remove link" action that sets `link: null`.

## Interception

In `SketchEditor`, pass `onLinkOpen`:

```js
const onLinkOpen = useCallback((element, event) => {
  const url = element.link;
  if (!url) return;
  const target = new URL(url, window.location.origin);
  if (target.origin !== window.location.origin) return; // external: let Excalidraw handle it

  event.preventDefault();
  event.detail?.nativeEvent?.preventDefault();
  router.push(target.pathname + target.search);
}, [router]);
```

Both `preventDefault` calls are required — Excalidraw checks the synthetic event and the
native one separately, and missing either opens a stray tab alongside the in-app
navigation.

Navigating away flushes the pending autosave through the existing unmount handler from
Phase 1; no extra save call here.

## Broken links

Targets get deleted. The picker stores a URL, not a foreign key, so nothing cascades.

- Navigation to a deleted board or sketch lands on the existing not-found treatment for
  that surface. That is acceptable and needs no new UI.
- **Do not** add a background job that validates links or rewrites elements. Rewriting a
  user's drawing because a row disappeared is worse than a dead link.
- `metadata.links` on the sketch row is explicitly **not** maintained as an index. If a
  "what links here" feature is ever wanted, it is a separate design; a denormalized index
  that drifts silently is not worth it here.

## Scope of the preview

`exportToSvg` does not render link badges, so the `SketchNode` preview shows the shapes
without link affordances. That is correct — the preview is a thumbnail, and links are only
actionable inside the editor. No change to Phase 1's preview pipeline.

## Error handling

- `new URL(...)` throws on a malformed link → wrap in try/catch, fall through to default
  Excalidraw behaviour rather than swallowing the click.
- `link-targets` request fails → `toast.error("Couldn't load link targets")`, the dialog
  shows its empty state, and the native Excalidraw link field remains available.
- No selection when the footer button is somehow activated → no-op, button stays disabled.

## Verification

1. `npx eslint` clean on every changed file.
2. Land and verify `?board=<id>` on its own first: open a sub-board, confirm the URL
   updates, refresh, confirm the same sub-board loads, confirm Back returns to the project
   root board.
3. Draw a rectangle, link it to a board through the picker, confirm Excalidraw renders its
   link badge, click it, confirm in-app navigation with **no new tab**.
4. Link to a sketch and to a document; confirm both land correctly.
5. Paste an external `https://` URL into Excalidraw's native link field; confirm it still
   opens in a new tab.
6. Copy a linked element, paste it, confirm the duplicate keeps the link.
7. Reload the sketch; confirm links persisted through the normal autosave.

## Files

| File | Action |
|---|---|
| `app/project/[projectId]/page.js` | edit — `?board=<id>` URL param (commit separately) |
| `app/api/sketches/link-targets/route.js` | new — grouped, scoped target list |
| `components/internal/sketch/LinkPickerDialog.jsx` | new |
| `components/internal/sketch/SketchEditor.jsx` | edit — `<Footer>` button, `onLinkOpen`, `excalidrawAPI` ref |
