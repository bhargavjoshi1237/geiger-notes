# Host controls — live sessions, meetings and sketches

**Date:** 2026-10-21
**Status:** Implemented (migration `20261021120129_collab_host_controls.sql` must be pushed for DB enforcement)

## Context

Research across Zoom, Teams, Meet, Webex, Miro, FigJam, Mural, Lucidspark, tldraw, Excalidraw, PowerPoint Live,
Mentimeter, Slido, Discord and Slack settled on a few rules this design follows:

- **Soft follow by default, hard lock as a separate step.** Any pan/zoom ends a follow; a host's view lock
  can't be escaped until released — and only binds while that host is present.
- **Take away instantly, turn on by request.** Hosts mute, stop video/share and pause editing at once; they only
  *ask* someone to unmute or start video.
- **Action and policy are separate.** "Mute all" vs "allow unmute"; a poll's close (lock) vs hide-results (eye).
- **One consolidated host panel**, per-person actions on avatars/rows, locks that end with the session.

## Shape

| Layer | Where | What |
|---|---|---|
| Durable session settings | `notes.collab.preference` | `ownerId, endedAt, editLock, locked, facilitation, laser, hideCursors, focus` (`lib/collab/session.js`) |
| Membership | `notes.collab.joiners[uid]` | `status: requested\|joined\|viewer\|kicked\|left`, `cohost` flag |
| Ephemeral session layer | `collab-live:<id>` | presence `{name,color,role,handRaisedAt,followingId}`; broadcast `cursor`, `laser`, `viewport` (only while followed), `command` (`useSessionLive`) |
| Durable board sync | `collab:<id>` | `postgres_changes` on `notes.collab` (schema fixed from `public`), own-echo skipped, locally selected nodes kept |
| Meeting room | `notes.meet_rooms.metadata` | `locked, allowUnmute, allowVideo, allowShare, spotlightId, removed` |
| Meeting commands | `meet:<roomId>` `control` | `mute, mute-all, ask-unmute, stop-video, ask-video, stop-share, lower-hand, lower-all, remove, end, room-state, reaction` — obeyed only from the room's host |
| Sketch | `sketch:<id>` | pointer carries `tool`/`button` (remote laser); presence `followingId`; `viewport` while followed |

High-frequency data (cursors, laser trails, leader viewports) lives in `lib/realtime/live-store.js` outside React state;
the canvas overlay (`SessionLiveLayer`) subscribes with `useSyncExternalStore` and draws laser trails on a canvas.

## Controls

**Everyone in a session:** follow a person (avatar → Follow), laser pointer (Esc to stop), raise hand, reactions.

**Hosts and co-hosts** (`HostControlsMenu`): bring everyone to me (4 s "Not now"), lock everyone's view to mine,
spotlight the selected node, announce; *Participants can* toggles for editing, asking to join, laser, polls/timers
and cursors; raised-hand queue; pause all / resume all. Per person: admit as editor/viewer, make view-only, let edit,
lower hand, remove. **Host only:** make co-host, make host (owner can reclaim), end for all (with confirm).

**Nodes:** host-only poll close/reset/reveal and timer controls when `facilitation = "hosts"`; poll *hide results until
reveal* (hosts still see them in a session); host locks (`data.lockedByHost`) only hosts can undo; voting and timers
pause with editing.

**Meetings:** per-tile host menu (mute / ask to unmute, stop / ask video, stop share, lower hand, spotlight for everyone,
make host, remove), host tools (mute all, lower all hands, allow unmute/video/share, lock), hands and reactions in
presence, real end-for-all. Removed people are refused by `/api/meet/*` and dropped by every honest peer.

## Enforcement

UI gating is advisory. The migration adds RLS on `notes.collab` plus `notes.collab_guard_update()` (host-only settings,
co-host limits, edit lock, locked joins, ended sessions, owner reclaim) and `notes.meet_rooms_guard_update()`.
`/api/collab/lookup` refuses ended (410) and locked (423) sessions; `/api/meet/*` refuse removed (403) and locked (423).
In a P2P mesh, mute is honoured by the target's own client; removal sticks because peers refuse the connection.

Realtime broadcast senders are not authenticated, so a client could forge a command "from" the host. Anything
destructive is therefore confirmed against the row before it takes effect (session end, meeting end/remove/settings);
summon, spotlight, announce, mute and stop commands are honour-system. Private channels with Realtime Authorization
would close that gap.

## Known limits / next

- Whole-board last-writer-wins sync remains; votes during an edit lock are paused rather than merged.
- Hide-results is presentation, not privacy: votes still reach every client. Private mode/hide-reveal of content needs
  server-side masking.
- A meeting host who leaves without handing over leaves the room unmoderated.
