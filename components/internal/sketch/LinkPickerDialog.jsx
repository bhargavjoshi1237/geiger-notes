"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, LayoutDashboard, PenTool, Link2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Button,
  LogoLoading,
  EmptyState,
} from "@geiger/ui";

const GROUPS = [
  { key: "boards", label: "Boards", icon: LayoutDashboard },
  { key: "sketches", label: "Sketches", icon: PenTool },
  { key: "documents", label: "Documents", icon: FileText },
];

const EMPTY_TARGETS = { boards: [], sketches: [], documents: [] };

// Mounted only while the dialog is open, so the fetch and the search box start
// fresh on every open without resetting state from an effect.
function LinkPickerBody({ sketchId, projectId, currentLink, onPick }) {
  const [targets, setTargets] = useState(EMPTY_TARGETS);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;

    const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
    const params = new URLSearchParams();
    if (projectId) params.set("projectId", projectId);
    if (sketchId) params.set("exclude", sketchId);

    fetch(`${base}/api/sketches/link-targets?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load link targets");
        return res.json();
      })
      .then((data) => {
        if (!active) return;
        setTargets({
          boards: data.boards ?? [],
          sketches: data.sketches ?? [],
          documents: data.documents ?? [],
        });
      })
      .catch((err) => {
        console.error("[Sketch] Link targets error:", err);
        if (!active) return;
        setTargets(EMPTY_TARGETS);
        toast.error("Couldn't load link targets");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [projectId, sketchId]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return targets;
    const match = (list) =>
      list.filter((item) => (item.name || "").toLowerCase().includes(query));
    return {
      boards: match(targets.boards),
      sketches: match(targets.sketches),
      documents: match(targets.documents),
    };
  }, [targets, search]);

  const hasResults = GROUPS.some((group) => filtered[group.key].length > 0);

  return (
    <>
      <Input
        autoFocus
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search boards, sketches and documents"
        className="bg-surface-card"
      />

      <div className="max-h-72 min-h-40 overflow-y-auto pr-1">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <LogoLoading size={40} />
          </div>
        ) : !hasResults ? (
          <EmptyState
            icon={Link2}
            className="py-8"
            title="Nothing to link to"
            description={
              search
                ? "No target matches that search."
                : "Create a board, sketch or document first."
            }
          />
        ) : (
          GROUPS.map(({ key, label, icon: Icon }) => {
            const items = filtered[key];
            if (!items.length) return null;
            return (
              <div key={key} className="mb-3 last:mb-0">
                <p className="px-1 pb-1 text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
                  {label}
                </p>
                {items.map((item) => (
                  <button
                    key={`${key}-${item.id}`}
                    onClick={() => onPick(item)}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-surface-hover ${
                      item.url === currentLink
                        ? "bg-surface-active text-foreground"
                        : "text-text-secondary"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{item.name}</span>
                  </button>
                ))}
              </div>
            );
          })
        )}
      </div>
    </>
  );
}

export default function LinkPickerDialog({
  open,
  onOpenChange,
  sketchId,
  projectId,
  currentLink,
  onPick,
  onRemove,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{currentLink ? "Edit link" : "Link to Notes"}</DialogTitle>
          <DialogDescription>
            Point the selected shape at a board, sketch or document.
          </DialogDescription>
        </DialogHeader>

        {open && (
          <LinkPickerBody
            sketchId={sketchId}
            projectId={projectId}
            currentLink={currentLink}
            onPick={onPick}
          />
        )}

        {currentLink && (
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={onRemove}
              className="text-red-400 hover:bg-red-500/10 hover:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove link
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
