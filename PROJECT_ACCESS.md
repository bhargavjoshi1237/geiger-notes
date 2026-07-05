# Project-based access (ported from geiger-flow)

Geiger Notes now owns a dedicated **`notes`** Postgres schema and enforces
project access the same way geiger-flow does: **entirely in the database via
RLS**, keyed on the signed-in user's membership and abilities within a project.

## What moved / what's new

- **Relocated (unchanged, still per-user):** `boards`, `base`, `collab`,
  `documents`, `user_settings` now live under `notes.*` instead of `public.*`.
  The existing whiteboard app keeps working — its Supabase clients default to the
  `notes` schema (`utils/supabase/{client,server}.js`, `db: { schema: 'notes' }`),
  so every existing `.from('boards')` etc. resolves transparently. Personal
  boards stay reached via `/u/<userId>` semantics (owner-gated: `auth.uid() =
  user_id`).
- **New (project-scoped, ability-gated):** `notes.project_boards` — the
  project-owned counterpart to personal boards, reached via `/project/<projectId>`.
  A project owns a board the same way a user does, but access is gated by the
  flow ability model.

## The scoping chain (flow-identical)

```
notes.project_boards.project_id
  -> public.projects.id -> organization_id
  -> public.organization_users membership -> auth.uid()
```

- `notes.project_role(project)` → `'owner'` (project/org creator) or the caller's
  `organization_users` role.
- `notes.has_ability(project, 'boards.<action>')` → owner can do anything; the
  `boards` module is seeded into `notes.open_module` so every project member can
  view/create/update/delete; otherwise an explicit `notes.role_ability` grant is
  required.
- RLS on `notes.project_boards` has one policy per action
  (`boards.view/create/update/delete`). The data layer
  (`lib/supabase/project-boards.js`) filters only by `project_id` + `deleted_at`;
  RLS does the authorization.

The shared `public.projects` / `public.organizations` /
`public.organization_users` tables are **owned by the suite hub (geiger-dash)** —
this repo only references them.

## Files

| Concern | File |
|---|---|
| Migrations | `supabase/migrations/0001_relocate_personal.sql`, `0002_project_boards.sql`, `0003_abilities.sql` |
| Migration runner | `scripts/run-sqls.js` (`npm run db:push` / `db:clean`) |
| Browser client | `lib/supabase/client.js` |
| Current user | `lib/supabase/user.js` |
| Schema-scoped client + config guard | `supabase/components/notes-client.js` (`notesClient()`, `isSupabaseConfigured()`) |
| Project boards data layer | `lib/supabase/project-boards.js` |
| Project context (from URL) | `context/project-context.js`, `app/project/[projectId]/*` |

## Manual steps to bring it live

1. **Add `STRING_URI` to `.env`** — a *direct* Postgres connection string
   (server-only; never `NEXT_PUBLIC_`). Same shared Supabase project as the rest
   of the suite.
2. **Expose the `notes` schema** in Supabase → Settings → API → Exposed schemas,
   so PostgREST serves `notes.*`.
3. **Run the migrations:** `npm run db:push` (idempotent; re-runnable).
   - `npm run db:clean` drops only the project/ability objects
     (`project_boards`, `role_ability`, `open_module` + the resolver functions) —
     it never touches the relocated personal tables or the shared `public.*`
     tables.

> Note on the launch URL: this build scopes by `public.projects.id` (flow's
> model). geiger-dash deep-links notes as `/notes/project/<notes_project_id>`
> using the per-product `notes_project_id` column — if you want dash launches to
> resolve directly, either pass `projects.id` in that link or add a
> `notes_project_id`-based resolver alongside the `id` one.
