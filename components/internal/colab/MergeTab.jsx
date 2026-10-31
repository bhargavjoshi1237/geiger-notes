import React, { useMemo, useState } from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
  Button,
  Input,
  LogoLoading,
} from "@geiger/ui";
import { AlertTriangle, ArrowLeft, ChevronRight, History, Loader2, Pencil, Plus, Search, Undo2 } from "lucide-react";
import { computeMergeDiff, mergeStatus, nodeLabel, nodeTypeLabel } from "@/lib/collab/merge";
import { sessionMembers } from "@/lib/collab/session";

// Newest first inside each group; empty groups aren't shown.
const GROUPS = [
  { id: "ready", label: "Ready to merge" },
  { id: "merged", label: "Merged" },
  { id: "other", label: "From other boards" },
  { id: "none", label: "Nothing to merge" },
];

const SEARCH_THRESHOLD = 5;
const MAX_AVATARS = 3;

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function changeSummary(diff) {
  if (!diff) return "Couldn't be read";
  if (diff.total === 0) return "No changes";
  const parts = [];
  if (diff.newNodes.length) parts.push(`${diff.newNodes.length} new`);
  if (diff.changedNodes.length) parts.push(`${diff.changedNodes.length} changed`);
  if (diff.edgeChanges) parts.push(`${diff.edgeChanges} ${diff.edgeChanges === 1 ? "link" : "links"}`);
  return parts.join(", ");
}

function Centered({ children }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-muted-foreground">
      {children}
    </div>
  );
}

function SessionPeople({ people }) {
  if (!people.length) return null;
  return (
    <AvatarGroup className="shrink-0">
      {people.slice(0, MAX_AVATARS).map((person) => (
        <Avatar key={person.id} size="sm" className="border-2 border-surface-dialog">
          <AvatarImage src={person.avatarUrl} alt={person.name} />
          <AvatarFallback>{person.name.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
      ))}
      {people.length > MAX_AVATARS ? <AvatarGroupCount>+{people.length - MAX_AVATARS}</AvatarGroupCount> : null}
    </AvatarGroup>
  );
}

function SessionRow({ row, onSelect }) {
  const { session, diff, status, people } = row;
  const detail = status === "merged" ? `Merged ${formatDate(session.rollback.merged_at)}` : changeSummary(diff);
  return (
    <button
      type="button"
      onClick={() => onSelect(session)}
      className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-surface-hover/50 focus-visible:bg-surface-hover/50 focus-visible:outline-none"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate font-mono text-xs font-medium text-foreground">
          {session.code || "Untitled session"}
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {formatDate(session.created_at)} · {detail}
        </span>
      </span>
      <SessionPeople people={people} />
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    </button>
  );
}

function SessionList({ sessions, loadError, onRetry, onSelect, nodes, edges, currentUser }) {
  const [query, setQuery] = useState("");

  const rows = useMemo(
    () =>
      (sessions || []).map((session) => {
        const diff = computeMergeDiff(session, nodes, edges);
        return {
          session,
          diff,
          status: mergeStatus(session, diff),
          people: sessionMembers(session, currentUser?.id)
            .filter((m) => m.role !== "host" && m.role !== "pending")
            .map((m) => ({ id: m.id, name: m.name, avatarUrl: session.joiners?.[m.id]?.avatar_url })),
        };
      }),
    [sessions, nodes, edges, currentUser],
  );

  const groups = useMemo(() => {
    const term = query.trim().toLowerCase();
    const matches = term
      ? rows.filter(
          (row) =>
            row.session.code?.toLowerCase().includes(term) ||
            row.people.some((person) => person.name.toLowerCase().includes(term)),
        )
      : rows;
    return GROUPS.map((group) => ({ ...group, rows: matches.filter((row) => row.status === group.id) })).filter(
      (group) => group.rows.length,
    );
  }, [rows, query]);

  if (loadError && !sessions) {
    return (
      <Centered>
        <p className="text-sm text-foreground">Couldn&apos;t load your sessions</p>
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-2">
          Try again
        </Button>
      </Centered>
    );
  }

  if (!sessions) {
    return (
      <Centered>
        <LogoLoading size={40} />
      </Centered>
    );
  }

  if (!sessions.length) {
    return (
      <Centered>
        <History className="h-8 w-8 opacity-20" />
        <p className="text-sm">No past sessions</p>
        <p className="text-xs">Sessions you host show up here, so you can bring their work back to your board.</p>
      </Centered>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {sessions.length > SEARCH_THRESHOLD ? (
        <div className="relative shrink-0 border-b border-border p-3">
          <Search className="pointer-events-none absolute left-5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by code or person"
            aria-label="Search sessions"
            className="h-8 pl-8 text-sm"
          />
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {groups.length ? (
          groups.map((group) => (
            <section key={group.id}>
              <h4 className="sticky top-0 z-10 flex items-center justify-between bg-surface-dialog px-2 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
                <span className="font-normal tabular-nums">{group.rows.length}</span>
              </h4>
              {group.rows.map((row) => (
                <SessionRow key={row.session.id} row={row} onSelect={onSelect} />
              ))}
            </section>
          ))
        ) : (
          <Centered>
            <p className="text-sm">No sessions match &ldquo;{query.trim()}&rdquo;</p>
            <Button variant="ghost" size="sm" onClick={() => setQuery("")}>
              Clear search
            </Button>
          </Centered>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div className="px-3 py-2.5 text-center">
      <div className={`text-lg font-semibold tabular-nums ${value ? tone || "text-foreground" : "text-muted-foreground"}`}>
        {value}
      </div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function ChangeRow({ node, icon: Icon, iconClassName }) {
  return (
    <li className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs">
      <Icon className={`h-3.5 w-3.5 shrink-0 ${iconClassName}`} />
      <span className="min-w-0 flex-1 truncate text-foreground">{nodeLabel(node)}</span>
      <span className="shrink-0 text-muted-foreground">{nodeTypeLabel(node)}</span>
    </li>
  );
}

function Notice({ children }) {
  return (
    <div className="flex gap-2 rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <p>{children}</p>
    </div>
  );
}

function MergeDetail({ diff }) {
  if (!diff) return <Notice>This session&apos;s saved board couldn&apos;t be read, so there&apos;s nothing to merge.</Notice>;
  return (
    <>
      <div className="grid grid-cols-3 divide-x divide-border rounded-lg border border-border bg-surface-hover/30">
        <Stat label="New nodes" value={diff.newNodes.length} tone="text-emerald-600 dark:text-emerald-400" />
        <Stat label="Changed" value={diff.changedNodes.length} />
        <Stat label="Links" value={diff.edgeChanges} />
      </div>

      {diff.fromOtherBoard ? (
        <Notice>None of these nodes are on this board, so this session probably came from another one. Merging adds them all here.</Notice>
      ) : null}

      {diff.newNodes.length || diff.changedNodes.length ? (
        <ul>
          {diff.newNodes.map((node) => (
            <ChangeRow key={node.id} node={node} icon={Plus} iconClassName="text-emerald-600 dark:text-emerald-400" />
          ))}
          {diff.changedNodes.map((node) => (
            <ChangeRow key={node.id} node={node} icon={Pencil} iconClassName="text-muted-foreground" />
          ))}
        </ul>
      ) : null}

      <p className="text-xs leading-relaxed text-muted-foreground">{mergeFootnote(diff)}</p>
    </>
  );
}

function mergeFootnote(diff) {
  if (diff.total === 0) return "Your board already matches this session.";
  const parts = [];
  if (diff.changedNodes.length) parts.push("Changed nodes take the session's version.");
  const local = diff.localNodes.length;
  if (local === 1) parts.push("1 node that's only on your board stays as it is.");
  else if (local > 1) parts.push(`${local} nodes that are only on your board stay as they are.`);
  return parts.join(" ");
}

export default function MergeTab({
  mergeSessions,
  mergeLoadError,
  retryMergeSessions,
  selectedMergeSession,
  handleMergeSessionSelect,
  setSelectedMergeSession,
  mergeDiff,
  confirmMerge,
  handleRollback,
  isMergeBusy,
  nodes,
  edges,
  boardId,
  currentUser,
}) {
  if (!selectedMergeSession) {
    return (
      <SessionList
        sessions={mergeSessions}
        loadError={mergeLoadError}
        onRetry={retryMergeSessions}
        onSelect={handleMergeSessionSelect}
        nodes={nodes}
        edges={edges}
        currentUser={currentUser}
      />
    );
  }

  const rollback = selectedMergeSession.rollback;
  const changes = mergeDiff?.total || 0;
  // Undo replaces the whole board, so it only runs where the merge happened. Older merges didn't record a board.
  const undoElsewhere = !!rollback?.board_id && rollback.board_id !== boardId;

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-2 py-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSelectedMergeSession(null)}
          aria-label="Back to sessions"
          className="h-7 w-7"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-0 flex-1 truncate font-mono text-xs font-medium text-foreground">
          {selectedMergeSession.code || "Untitled session"}
        </span>
        <span className="shrink-0 pr-2 text-xs text-muted-foreground">{formatDate(selectedMergeSession.created_at)}</span>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {rollback ? (
          <>
            <p className="text-sm text-muted-foreground">
              Merged on <span className="text-foreground">{formatDate(rollback.merged_at)}</span>.
            </p>
            <Notice>
              {undoElsewhere
                ? "This session was merged into a different board. Open that board to undo it."
                : "Undoing replaces this board with how it looked before the merge. Anything you've changed since then will be lost."}
            </Notice>
          </>
        ) : (
          <MergeDetail diff={mergeDiff} />
        )}
      </div>

      <div className="shrink-0 border-t border-border p-3">
        {rollback ? (
          <Button variant="outline" onClick={handleRollback} disabled={isMergeBusy || undoElsewhere} className="w-full">
            {isMergeBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}
            Undo merge
          </Button>
        ) : (
          <Button onClick={confirmMerge} disabled={isMergeBusy || !changes} className="w-full">
            {isMergeBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {changes ? `Merge ${changes} ${changes === 1 ? "change" : "changes"}` : "Nothing to merge"}
          </Button>
        )}
      </div>
    </div>
  );
}
