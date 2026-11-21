# Sketches — Phase 3: Excalidraw replaces the homegrown image drawing tool

**Date:** 2026-09-21
**Status:** Approved, not started
**Phase:** 3 of 5 — **depends on Phase 1** (`SketchEditor`, `notes.sketches`).

## Context

`components/internal/nodes/image-node/` contains a hand-rolled freehand drawing tool for
annotating image nodes: a 2D-canvas overlay, pencil and eraser, four brush sizes, a preset
colour row, and a dataURL of the composited strokes stored on the node.

```
useDrawing.js          159 lines   canvas strokes, tool/size/colour state
DrawingToolbar.jsx     166 lines   pencil / eraser / sizes / colours
constants.js            27 lines   PRESET_COLORS, PRESET_SIZES (used only by the toolbar)
```

It works, but it is a second drawing engine in an app that — after Phase 1 — already
ships a far better one. Two engines means two sets of tools, two visual languages, and two
places to fix a drawing bug. This phase retires the homegrown one.

What annotation gains by moving to Excalidraw: arrows, text, shapes, sticky-note colours,
undo/redo, selection and transform, copy/paste, zoom, and export — none of which the
canvas overlay has or should grow.

## Goals

- Annotating an image opens the Phase 1 Excalidraw editor with the image as a locked
  backdrop.
- Annotations persist as a real sketch row, so they are editable forever rather than
  flattened into a dataURL.
- Existing `data.drawing` annotations are preserved, not discarded.
- `useDrawing.js`, `DrawingToolbar.jsx` and `constants.js` are deleted.

## Model

An annotated image is an image node that carries `data.annotationSketchId`. The annotation
itself is an ordinary row in `notes.sketches` — no new table, no new API, no new RLS. It
is created lazily, the first time someone annotates.

```
ImageNode.data = {
  src, alt, label, transform, caption,
  annotationSketchId,      // new — null until first annotated
  // drawing, isDrawing    // removed
}
```

## The backdrop

`SketchEditor` grows one optional prop: `backdrop = { url, width, height }`.

On first mount of a sketch whose `elements` are empty and whose `backdrop` is set:

1. Fetch the image URL and convert it to a dataURL. The `homeboard` bucket is public, so
   a plain `fetch` plus `FileReader` works; there is no CORS obstacle.
2. `excalidrawAPI.addFiles([{ id: fileId, dataURL, mimeType, created: Date.now() }])`
   where `fileId` is a stable hash of the source URL, so re-opening never duplicates the
   file entry.
3. Insert one image element via `updateScene`:
   `{ type: "image", fileId, x: 0, y: 0, width, height, locked: true }`.
4. `scrollToContent` so the image fills the viewport.

`locked: true` is the important part — the backdrop cannot be selected, dragged or
deleted by accident, which is precisely the behaviour the old overlay had for free.

The image is written into the sketch's `files` on the first autosave, so subsequent opens
load it from the row and skip steps 1–3 entirely.

**Storage note.** A dataURL of a large photo inside `files` jsonb is heavy. Cap the
backdrop at 1600px on the long edge, re-encoding with the same canvas-resize approach
`ImageSettingsSidebar.jsx:158` already uses for its high-res/thumbnail pair. Annotation
fidelity does not need the original pixels.

## Entry point

`ImageSettingsSidebar.jsx:77-79` currently toggles `isDrawing` and toasts "Drawing mode
enabled". Replace that action with **Annotate**:

1. If `data.annotationSketchId` is absent, `POST /api/sketches` with
   `{ name: <image label> + " — annotation", ...(projectId ? { projectId } : {}) }` and
   write the returned id onto the node.
2. `router.push(pathname + "?sketch=" + id)` — the same route Phase 1 established.
3. The editor opens with `backdrop` set from the node's `src` and rendered dimensions.

No new surface, no second editor. The sidebar button at `:240` loses its `active` state
(there is no longer a persistent drawing mode) and becomes a plain action button.

## Node rendering

`ImageNode.jsx` composites the annotation over the image the same way it does today, but
the overlay source changes from `data.drawing` to the Phase 1 preview pipeline:
`useSketchPreview(data.annotationSketchId)` returns the rendered SVG, which is layered
over the `<img>` with `pointer-events-none`.

This reuses Phase 1's batch fetch and memo cache — an annotated image costs no extra
request beyond the sketch batch the board already makes.

The backdrop image element is part of that SVG, so to avoid drawing the photo twice,
export the preview with the backdrop filtered out:
`elements.filter((el) => !(el.type === "image" && el.locked))`. Add an optional
`filterElements` argument to the preview renderer for this; default is no filtering.

## Migrating existing annotations

`data.drawing` holds a dataURL of the old composited strokes. Do not drop it.

On first Annotate of a node that has `data.drawing` and no `annotationSketchId`, seed the
new scene with **two** locked image elements: the photo underneath, the old annotation
dataURL on top at identical dimensions. The user's existing marks are preserved as a
flattened layer they can draw over, erase around, or delete outright — and nothing is
silently lost.

Keep `data.drawing` on the node after migration (it costs a few KB and is the only copy of
the original strokes). A later cleanup migration can drop it once this has shipped and
settled.

## Deletions

Blast radius, already mapped:

| File / site | Action |
|---|---|
| `components/internal/nodes/image-node/useDrawing.js` | delete |
| `components/internal/nodes/image-node/DrawingToolbar.jsx` | delete |
| `components/internal/nodes/image-node/constants.js` | delete `PRESET_COLORS`, `PRESET_SIZES`; keep `DEFAULT_CAPTION`, `DEFAULT_TRANSFORM`, `PLACEHOLDER_SRC` |
| `components/internal/nodes/image-node/index.js` | drop the `DrawingToolbar`, `useDrawing`, `PRESET_*` exports |
| `components/internal/nodes/ImageNode.jsx` | drop `useDrawing`, `isDrawing`, `drawingData`; render the annotation via `useSketchPreview` |
| `components/internal/nodes/image-node/ImageFullscreenModal.jsx` | drop the `DrawingToolbar`, the stroke canvas and `redrawCanvas`; keep zoom, transform and download |
| `components/internal/nodes/image-node/useImageModal.js` | drop the `isDrawing` parameter and its guard at `:22` |
| `components/internal/nodes/image-node/downloadImage.js` | `drawingData` parameter becomes the rendered annotation SVG rasterized to canvas; same compositing order |
| `lib/wrapers/homepage/HomePage.js:22` | drop the `isDrawing` strip — the transient flag no longer exists |

Delete in that order and lint after each file; the barrel makes a missed reference a hard
error rather than a silent one.

## Error handling

- Backdrop fetch fails → open the editor with an empty scene and
  `toast.error("Couldn't load the image into the annotation")`. Annotating on a blank
  canvas is still better than a dead route.
- Image node with an `annotationSketchId` whose row was deleted → render the plain image,
  no overlay, no error. The next Annotate mints a fresh sketch.
- Migration seeding fails on the old dataURL → proceed with just the photo; log, keep
  `data.drawing` intact so nothing is lost and a retry is possible.

## Verification

1. `npx eslint` clean; specifically confirm no dangling imports of the deleted modules
   anywhere (`grep -rn "useDrawing\|DrawingToolbar\|PRESET_COLORS"` returns nothing under
   `app/`, `components/`, `lib/`).
2. Annotate a fresh image: draw an arrow and some text, go back, confirm the overlay
   renders on the node over the photo, and the photo is not doubled.
3. Re-open the annotation: confirm the backdrop loads from the saved `files` (no refetch in
   the Network tab) and remains locked and unselectable.
4. Take a node that still has a legacy `data.drawing`, annotate it, and confirm the old
   strokes appear as a locked layer.
5. Fullscreen the image and download it; confirm the annotation composites into the
   exported file.
6. Confirm nothing on the board still toggles a "drawing mode".

## Files

| File | Action |
|---|---|
| `components/internal/sketch/SketchEditor.jsx` | edit — `backdrop` prop, locked image seeding |
| `components/internal/sketch/preview-context.jsx` | edit — optional `filterElements` |
| `components/internal/layout/sidebar/ImageSettingsSidebar.jsx` | edit — Annotate action |
| `components/internal/nodes/ImageNode.jsx` | edit — preview overlay, drawing removed |
| `components/internal/nodes/image-node/*` | edits + 2 deletions (table above) |
| `lib/wrapers/homepage/HomePage.js` | edit — drop `isDrawing` strip |
