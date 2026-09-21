# Sketches — Phase 1: Core (table, node, editor)

**Date:** 2026-09-21
**Status:** Approved, not started
**Phase:** 1 of 5 — every other phase depends on this one.

## Context

`geiger-canvas` is a standalone 4-commit Next.js app wrapping `@excalidraw/excalidraw`:
one `canvas_boards` table, one `ExcalidrawEditor.jsx`, one board-grid home page. It is
being dropped as a product and folded into Geiger Notes as a feature that lives *on* a
board rather than beside it.

Its schema is on the pre-suite conventions (`public.canvas_boards`, `flow_projects`,
`user_id` RLS) and cannot be lifted as-is. What we lift is the editor's shape: lazy
`next/dynamic` mount, 2.5s debounced autosave, save-status indicator, theme sync, inline
rename.

`lib/settings/tools.js:35` already carries `{ id: "draw", label: "Draw", icon: PenTool }`
with no `dragType` — a palette slot reserved for exactly this.

**The old repo is not to be touched.** No migration of `canvas_boards` data, no archiving,
no edits under `C:\Pro\geiger-canvas`. That call is the user's to make later.

## Goals

- A sketch is a first-class node on any Notes board — personal (`/[id]/home`) or project
  (`/project/[projectId]`).
- The node renders a **live preview** of the drawing, rendered from the stored elements,
  without pulling Excalidraw into the board's first-paint bundle.
- Double-click opens a full Excalidraw editor at `?sketch=<id>`, which is shareable and
  survives refresh.
- Persistence mirrors the existing project/personal split and the ability-based RLS.

## Non-goals (later phases)

Element links (phase 2), image annotation (phase 3), selection-to-nodes (phase 4),
multiplayer (phase 5). No sketch list/grid screen — sketches are reached from boards.

## Data model

Scaffold with `npm run db:new -- sketches --template table --table sketches`. Never
hand-name the file. `MIGRATION_CONVENTIONS.md` governs; the schema is `notes`.

```sql
-- @up
create schema if not exists notes;

-- Self-contained: do not depend on an earlier migration having defined this.
create or replace function notes.set_updated_at()
returns trigger language plpgsql set search_path = notes as $$
begin new.updated_at = now(); return new; end;
$$;

create table if not exists notes.sketches (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references public.projects(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete cascade,
  name        text not null default 'Untitled Sketch',
  description text,
  elements    jsonb not null default '[]'::jsonb,
  app_state   jsonb not null default '{}'::jsonb,
  files       jsonb not null default '{}'::jsonb,
  metadata    jsonb not null default '{}'::jsonb,
  created_by  uuid references auth.users(id) on delete set null,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

grant all on notes.sketches to anon, authenticated, service_role;

create index if not exists sketches_project_idx on notes.sketches (project_id);
create index if not exists sketches_user_idx    on notes.sketches (user_id);
create index if not exists sketches_updated_idx on notes.sketches (updated_at desc);

drop trigger if exists sketches_set_updated_at on notes.sketches;
create trigger sketches_set_updated_at
  before update on notes.sketches
  for each row execute function notes.set_updated_at();

-- Member-open by default, exactly like 'boards'.
insert into notes.open_module (module) values ('sketches') on conflict (module) do nothing;

alter table notes.sketches enable row level security;

drop policy if exists sketches_select on notes.sketches;
create policy sketches_select on notes.sketches for select using (
  case when project_id is null then user_id = auth.uid()
       else notes.has_ability(project_id, 'sketches.view') end
);

drop policy if exists sketches_insert on notes.sketches;
create policy sketches_insert on notes.sketches for insert with check (
  case when project_id is null then user_id = auth.uid()
       else notes.has_ability(project_id, 'sketches.create') end
);

drop policy if exists sketches_update on notes.sketches;
create policy sketches_update on notes.sketches for update
  using (case when project_id is null then user_id = auth.uid()
              else notes.has_ability(project_id, 'sketches.update') end)
  with check (case when project_id is null then user_id = auth.uid()
                   else notes.has_ability(project_id, 'sketches.update') end);

drop policy if exists sketches_delete on notes.sketches;
create policy sketches_delete on notes.sketches for delete using (
  case when project_id is null then user_id = auth.uid()
       else notes.has_ability(project_id, 'sketches.delete') end
);

-- @down
drop table if exists notes.sketches cascade;
delete from notes.open_module where module = 'sketches';
```

### Two owner columns, deliberately

`user_id` is the **owner of a personal sketch** and is null for project sketches — this
mirrors `notes.boards`, which is keyed by `user_id`, and is what the RLS branches on.
`created_by` is **audit**: always stamped, including on project sketches, matching
`notes.project_boards`. They are not redundant; do not collapse them into one column.

### Soft delete

`deleted_at` is set; rows are never hard-deleted. Every read filters
`.is("deleted_at", null)`.

## API route

`app/api/sketches/route.js` — a direct structural mirror of `app/api/documents/route.js`.
Uses `createClient` from `@/utils/supabase/server`, which already defaults the data API to
the `notes` schema, so `.from("sketches")` resolves unqualified. Every handler starts with
`supabase.auth.getUser()` and 401s without a user.

| Method | Input | Behaviour |
|---|---|---|
| `POST` | `{ name?, description?, projectId? }` | Insert. `projectId` present → sets `project_id` + `created_by`. Absent → sets `user_id` + `created_by` to the caller. Returns `{ id, name }`. |
| `GET` | `?id=<uuid>` | One row where `deleted_at is null`. 404 when missing. |
| `GET` | `?ids=<uuid,uuid,...>` | **Batch.** `.in("id", ids)`, returns an array of `{ id, name, elements, files, updated_at }`. This is what the preview context calls — it exists so a board with twelve sketch nodes makes one request, not twelve. Cap at 50 ids per call. |
| `PUT` | `{ id, elements?, app_state?, files?, name? }` | Partial update; emit a column only when its key is present, so autosave and rename share one handler. |
| `DELETE` | `?id=<uuid>` | Soft delete — sets `deleted_at`, never `.delete()`. |

RLS performs the authorization; the route does not re-check abilities.

No Phase 1 UI calls `DELETE` — removing a sketch node leaves its row, exactly as removing a
document node does today. It is specified now so the soft-delete contract is established
with the table rather than retrofitted later.

## The preview

The design constraint: `exportToSvg` lives inside `@excalidraw/excalidraw`, and a static
import would pull the whole package into the board chunk — the exact thing
`app/project/[projectId]/page.js` splits its bundle to avoid (see its fast-first-paint
comment). Three mechanisms together solve it.

**1. Lazy chunk.** The preview renderer imports inside an effect, never at module scope:

```js
const { exportToSvg } = await import("@excalidraw/excalidraw");
```

Webpack emits a separate chunk fetched after first paint. A board with no sketch nodes
never downloads it at all.

**2. Batch fetch.** `components/internal/sketch/preview-context.jsx` exports
`SketchPreviewProvider` and `useSketchPreview(sketchId)`. The provider watches the board's
nodes, collects every `data.sketchId`, and fetches them in one `GET /api/sketches?ids=...`.
Nodes read from the resulting map. New sketch ids appearing on the board trigger one
incremental fetch for just the new ids.

**3. Memo cache.** A module-level `Map<sketchId, { updatedAt, theme, svg }>` inside the
provider module. An entry is reused unless `updated_at` or the resolved theme changed.
Board navigation and node remounts re-render nothing.

`exportToSvg` is called with
`{ elements, appState: { exportBackground: false, theme }, files }`. The returned `<svg>`
element is serialized once and injected with `dangerouslySetInnerHTML` — it is our own
generated markup, not user-supplied HTML.

### Preview states

| State | Render |
|---|---|
| Fetch in flight | `LogoLoading` at `size={32}`, no `name` prop (per `CLAUDE.md`) |
| Zero elements | Centered `PenTool` icon plus "Empty sketch" |
| Rendered | The SVG, `object-contain`, centered, `pointer-events-none` |
| Row missing / 404 | Muted "Sketch unavailable" |
| Export threw | Fall back to the empty-state treatment; `console.error`, no toast |

## Components

### `components/internal/nodes/SketchNode.jsx`

Modelled on `DocumentNode.jsx` — copy its structure so the node inherits the shared
behaviours rather than reinventing them: `NodeResizeControl` plus `ResizeHandle` from
`@geiger/ui`, the outline badge, `Reactions`, the full-bleed invisible target `Handle`
plus the left source `Handle`, and the `selected`/`dragging` border treatment.

Differs from `DocumentNode` in three ways:

- The body is the preview surface, not an icon-and-label row. The name sits in a compact
  footer bar.
- `data` shape: `{ label, sketchId, reactions?, outline? }`.
- Default `style`: `{ width: 320, height: 240 }` — a preview needs area; a document row
  does not.

Double-click calls `onOpenSketch(sketchId)` from context and stops propagation so the
React Flow pane does not also handle it.

### `components/internal/sketch/SketchEditor.jsx`

A port of `geiger-canvas/components/excalidraw/ExcalidrawEditor.jsx`, re-based on this
repo's conventions:

- **Keep:** `next/dynamic` with `ssr: false`, `import "@excalidraw/excalidraw/index.css"`,
  the 2.5s debounce constant, refs holding the latest elements/appState/files, the manual
  save button, inline rename, `scrollToContent: true`, and the string-or-object
  `parseField` guard.
- **Replace:** the bespoke spinner becomes `LogoLoading` from `@geiger/ui` at `size={72}`
  for the editor-body loader (a full-surface loader per `CLAUDE.md`); the silent
  `console.error` on save failure becomes a sonner `toast.error`; the hardcoded
  `#1e1e1e`/`#10b981`/`#f59e0b` become semantic tokens (`bg-background`,
  `text-emerald-400`, `text-amber-400`); direct Supabase writes become `PUT /api/sketches`.
- **Props:** `{ sketchId, projectId, canEdit, onBack }`.
- `canEdit === false` passes `viewModeEnabled` to Excalidraw and hides save and rename.
- Theme from `useTheme()`; `resolvedTheme === "dark" ? "dark" : "light"` feeds both the
  `theme` prop and `initialData.appState.theme`.
- Flush the pending save on unmount and on `beforeunload`, mirroring `saveOnUnload` in
  `lib/wrapers/homepage/HomePage.js:89`.

### `components/internal/sketch/preview-context.jsx`

As described under **The preview**. Also exposes `invalidateSketch(id)` so the editor can
drop the cached SVG on close, letting the node repaint with the new drawing immediately.

## Routing

`?sketch=<id>` on the current URL — the `?event=<id>` pattern from
`MODULE_CONVENTIONS.md`.

Both `app/project/[projectId]/page.js` and `app/[id]/home/page.js`:

1. Read the param with `useSearchParams()`.
2. When present, early-return `<SketchEditor ... />` instead of `<BoardCanvas>` — the same
   list-to-detail swap the conventions describe.
3. `onBack` calls `router.replace(pathname)` (no history entry per drawing session); the
   board remounts at its saved viewport.
4. Opening uses `router.push(pathname + "?sketch=" + id)`, so browser Back closes the
   editor.

`app/project/[projectId]/layout.js` is `force-static`; reading search params client-side
does not change that. **Do not** convert the route to dynamic.

Project sketches resolve `canEdit` from the existing project gate; personal sketches are
always editable by their owner.

## Palette and canvas wiring

`lib/settings/tools.js` — the existing draw entry gains a drag type. The id and label stay
the same, so no user's saved toolbar preferences break:

```js
{ id: "draw", label: "Draw", icon: PenTool, dragType: "sketch" },
```

`components/internal/canvas/BoardCanvas.jsx`:

- Register `sketch: SketchNode` in the `nodeTypes` memo (`:397`).
- Add a `type === "sketch"` branch to `onDrop`, copied from the `"document"` branch
  (`:210`): `POST /api/sketches` with
  `{ name: "Untitled Sketch", ...(projectId ? { projectId } : {}) }`, then append the node.
  `toast.error("Failed to create sketch")` on failure.
- Wrap the `ReactFlow` subtree in `SketchPreviewProvider`.
- Respect the existing `canEdit` guard — no sketch creation on a read-only board.

## Dependency

`npm i @excalidraw/excalidraw@^0.18.0`. Verified working against React 19.2.3 and Next 16 —
that is the exact pairing running in `geiger-canvas` today.

Import the CSS only inside `SketchEditor.jsx` (the lazily-loaded surface), never in a
shared layout, or every board pays for it.

## Error handling

- Missing Supabase env → the route's client construction fails; return a 500 and let the
  node fall through to "Sketch unavailable". Never crash the board.
- Save failure → the status flips to `unsaved`, `toast.error` fires, and the debounce
  retries on the next change. Never silently swallow.
- A sketch node whose row was deleted → "Sketch unavailable"; the node stays on the board
  (removing it is the user's choice, same as a broken document node today).
- `elements` arriving as a JSON string rather than an array (legacy or edge case) →
  `parseField` handles both, as in the original editor.

## Verification

No build (per `CLAUDE.md` — this is not a significant enough UI change to warrant one).

1. `npm run db:status`, then `npm run db:push -- --dry-run`, then `npm run db:push`, then
   `npm run db:status` clean.
2. `npx eslint` on every changed file, clean, no unused imports.
3. Manual: drag Draw onto a personal board → node appears → double-click → draw → back →
   the preview shows the drawing. Repeat inside a project. Refresh on `?sketch=<id>` → the
   editor loads cold. Browser Back returns to the board. Toggle theme → the preview
   re-renders in the new theme.
4. Open a board with several sketch nodes and confirm the Network tab shows **one**
   `/api/sketches?ids=` request.
5. Confirm in the Network tab that a board with **no** sketch nodes never downloads the
   Excalidraw chunk.

## Files

| File | Action |
|---|---|
| `supabase/migrations/<ts>_sketches.sql` | new (scaffolded) |
| `app/api/sketches/route.js` | new |
| `components/internal/nodes/SketchNode.jsx` | new |
| `components/internal/sketch/SketchEditor.jsx` | new |
| `components/internal/sketch/preview-context.jsx` | new |
| `lib/settings/tools.js` | edit — `dragType: "sketch"` |
| `components/internal/canvas/BoardCanvas.jsx` | edit — nodeTypes, onDrop, provider |
| `app/project/[projectId]/page.js` | edit — `?sketch=` |
| `app/[id]/home/page.js` | edit — `?sketch=` |
| `package.json` | edit — `@excalidraw/excalidraw` |
