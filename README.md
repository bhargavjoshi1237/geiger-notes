<div align="center">

# Geiger Notes

**Write and collaborate.**

A visual, free-form canvas for notes, diagrams, and thinking out loud — solo or with your team, live.

Part of the [Geiger](#the-geiger-suite) suite.

</div>

---

## Overview

Geiger Notes is the canvas and board application of the Geiger suite. Instead of a linear document, work lives on an infinite canvas: rich-text notes, shapes, media, and connectors you can drag, group, and rearrange until the structure of an idea becomes obvious.

Boards come in two flavours. **Personal boards** belong to a single user. **Project boards** belong to a project and inherit the suite's organisation membership and ability model, so a team shares one canvas without extra sharing setup. On top of both sits a **live collaboration mode**: a host opens a session, joiners enter with a code, and canvas state syncs between them.

## Highlights

| Area | What it does |
| --- | --- |
| **Infinite canvas** | Pan, zoom, drag, and arrange nodes freely; a node-and-edge model backed by React Flow. |
| **Rich nodes** | Text and document nodes powered by Tiptap, plus shapes, media, and connectors with custom edge styles. |
| **Personal boards** | Owner-gated boards for private notes and drafts. |
| **Project boards** | Project-owned canvases gated by organisation membership and per-project abilities, enforced in the database. |
| **Live collaboration** | Code-based collaboration sessions with shared canvas state, joiner tracking, and rollback. |
| **Documents** | Long-form documents stored alongside boards for notes that outgrow a canvas node. |
| **Autosave** | Debounced state persistence so the canvas saves itself as you work. |
| **Settings** | Per-user preferences and workspace settings carried in a JSON preference bag. |

## Tech stack

- **Framework** — Next.js 16 (App Router, SSR/SSG) and React 19
- **Styling** — Tailwind CSS v4 and shadcn/ui, with the shared [`@geiger/ui`](https://github.com/bhargavjoshi1237/geiger-ui) component library
- **Icons** — Lucide
- **Backend** — Supabase (Postgres, Auth, Storage) on a dedicated `notes` schema
- **Canvas** — React Flow (`@xyflow/react`)
- **Editor** — Tiptap
- **Forms & validation** — React Hook Form and Zod

## Getting started

### Prerequisites

- Node.js 20 or later
- A Supabase project with the `notes` schema exposed under **Settings → API → Exposed schemas**

### Installation

```bash
npm install
```

### Environment

Create a `.env` file in the project root:

```bash
# Runtime (browser)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_DASH_ORIGIN=https://geiger.studio       # suite hub origin
NEXT_PUBLIC_DEBOUNCE_TIME=1000                      # canvas autosave debounce (ms)

# Server-only
STRING_URI=your-direct-postgres-connection-string    # migrations only
```

### Database

Numbered, idempotent migrations live in `supabase/migrations/` and run in filename order:

```bash
npm run db:push
```

Use `npm run db:clean` to reset this app's own tables before re-running. The Supabase project is shared across the suite — never drop tables you do not own.

### Develop

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. In production the app is served under the `/notes` base path behind the suite hub.

## Project structure

```
app/
  [id]/home/             Personal board workspace
  project/[projectId]/   Project-owned board
  colab/[id]/            Live collaboration session
  api/                   Board, document, collaboration, and settings endpoints
components/
  internal/canvas/       Canvas surface and controls
  internal/nodes/        Node types
  internal/edges/        Edge types
  internal/colab/        Collaboration UI
  ui/                    shadcn primitives
lib/supabase/            Data-access layer (boards, project boards, access)
utils/supabase/          Schema-scoped browser and server clients
supabase/migrations/     Numbered, idempotent SQL migrations
database/init/           Original bootstrap SQL (boards, collab, documents, storage policies)
scripts/run-sqls.js      Migration runner (npm run db:push)
```

## Deployment

The suite repositories are linked to Vercel auto-deploy. Pushing to `main` triggers builds across linked projects, so land work on a branch and merge deliberately.

## Conventions

This codebase follows a consistent set of patterns. Read these before contributing:

- [`MODULE_CONVENTIONS.md`](MODULE_CONVENTIONS.md) — how to build a workspace screen
- [`SUPABASE_CONVENTIONS.md`](SUPABASE_CONVENTIONS.md) — the data-layer playbook
- [`PROJECT_ACCESS.md`](PROJECT_ACCESS.md) — the project-scoped RLS access model
- [`crafting.md`](crafting.md) — UI craft and quality bar

## The Geiger suite

Geiger Notes is one application in the broader Geiger suite, alongside Geiger Flow, Geiger Events, and Geiger Forms. Every product shares one Supabase project, a common design language, and the [`@geiger/ui`](https://github.com/bhargavjoshi1237/geiger-ui) component library, so each app feels native to the whole.

## License

Private and unpublished. All rights reserved.
