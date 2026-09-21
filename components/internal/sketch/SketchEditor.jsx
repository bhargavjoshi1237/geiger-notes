"use client";

import "@excalidraw/excalidraw/index.css";

import { useCallback, useEffect, useRef, useState } from "react";
import nextDynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Check, Link2, Workflow } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { LogoLoading } from "@geiger/ui";
import { invalidateSketchCache } from "./preview-context";
import LinkPickerDialog from "./LinkPickerDialog";
import { backdropFileId, loadBackdropImage } from "./backdrop";
import { describeSkipped } from "@/lib/sketch/to-board-nodes";

// Lazy-load Excalidraw (browser-only, no SSR) so the board bundle never pays
// for it; the CSS import above only executes inside this lazily-loaded surface.
const ExcalidrawComponent = nextDynamic(
  async () => (await import("@excalidraw/excalidraw")).Excalidraw,
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-1 items-center justify-center bg-background">
        <LogoLoading size={72} />
      </div>
    ),
  }
);

// Excalidraw's own UI slot, pulled from the same lazily-loaded chunk.
const ExcalidrawFooter = nextDynamic(
  async () => (await import("@excalidraw/excalidraw")).Footer,
  { ssr: false }
);

// Autosave debounce in ms — saves 2.5s after the last change.
const SAVE_DEBOUNCE_MS = 2500;

function SaveStatus({ status }) {
  if (status === "saving")
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
        Saving…
      </span>
    );
  if (status === "saved")
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Check className="h-3 w-3 text-emerald-400" />
        Saved
      </span>
    );
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
      Unsaved changes
    </span>
  );
}

function parseField(field, fallback) {
  if (!field) return fallback;
  if (typeof field === "string") {
    try {
      return JSON.parse(field);
    } catch {
      return fallback;
    }
  }
  return field;
}

export default function SketchEditor({
  sketchId,
  projectId,
  canEdit = true,
  onBack,
  backdrop: backdropProp,
}) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const colorMode = resolvedTheme === "dark" ? "dark" : "light";
  const [saveStatus, setSaveStatus] = useState("saved");
  const [sketch, setSketch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [sketchName, setSketchName] = useState("Untitled Sketch");
  const [editingName, setEditingName] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [pushing, setPushing] = useState(false);
  // Every selected element id, for the push-to-board action (the link action
  // needs exactly one; this one takes any number).
  const [selectedIds, setSelectedIds] = useState([]);
  // The single selected element, tracked for the link action. Null whenever the
  // selection is empty or covers more than one element.
  const [selection, setSelection] = useState({ id: null, link: null });

  const excalidrawApiRef = useRef(null);
  const backdropSeededRef = useRef(false);

  const saveTimer = useRef(null);
  // Latest canvas state in refs so the debounced callback always has fresh data.
  const elementsRef = useRef([]);
  const appStateRef = useRef({});
  const filesRef = useRef({});
  const saveStatusRef = useRef("saved");

  useEffect(() => {
    saveStatusRef.current = saveStatus;
  }, [saveStatus]);

  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";

  // Load the sketch row. The parent keys this component by sketchId, so the
  // initial loading state covers each open and the effect only resolves it.
  useEffect(() => {
    let active = true;
    fetch(`${base}/api/sketches?id=${sketchId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Sketch not found");
        return res.json();
      })
      .then((row) => {
        if (!active) return;
        setSketch(row);
        setSketchName(row.name || "Untitled Sketch");
        elementsRef.current = parseField(row.elements, []);
        appStateRef.current = parseField(row.app_state, {});
        filesRef.current = parseField(row.files, {});
        setLoading(false);
      })
      .catch((err) => {
        console.error("[Sketch] Load error:", err);
        if (active) {
          setLoadError(true);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [sketchId, base]);

  const persist = useCallback(
    async (elements, appState, files) => {
      setSaveStatus("saving");
      try {
        const res = await fetch(`${base}/api/sketches`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: sketchId, elements, app_state: appState, files }),
        });
        if (!res.ok) throw new Error("Save failed");
        setSaveStatus("saved");
      } catch (err) {
        console.error("[Sketch] Save error:", err);
        setSaveStatus("unsaved");
        toast.error("Failed to save sketch");
      }
    },
    [sketchId, base]
  );

  const persistRef = useRef(persist);

  useEffect(() => {
    persistRef.current = persist;
  }, [persist]);

  // Debounced autosave.
  const handleChange = useCallback((elements, appState, files) => {
    elementsRef.current = elements;
    appStateRef.current = appState;
    filesRef.current = files;
    setSaveStatus("unsaved");

    const liveSelection = Object.keys(appState?.selectedElementIds || {}).filter(
      (key) => appState.selectedElementIds[key]
    );
    setSelectedIds((prev) =>
      prev.length === liveSelection.length &&
      prev.every((id, i) => id === liveSelection[i])
        ? prev
        : liveSelection
    );
    const single =
      liveSelection.length === 1
        ? elements.find((el) => el.id === liveSelection[0] && !el.isDeleted)
        : null;
    setSelection((prev) =>
      prev.id === (single?.id ?? null) && prev.link === (single?.link ?? null)
        ? prev
        : { id: single?.id ?? null, link: single?.link ?? null }
    );

    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      persistRef.current(elements, appState, files);
    }, SAVE_DEBOUNCE_MS);
  }, []);

  // Manual save.
  const handleManualSave = useCallback(() => {
    clearTimeout(saveTimer.current);
    persist(elementsRef.current, appStateRef.current, filesRef.current);
  }, [persist]);

  // Flush the pending save on unmount.
  useEffect(() => {
    return () => {
      clearTimeout(saveTimer.current);
      if (saveStatusRef.current === "unsaved") {
        const payload = JSON.stringify({
          id: sketchId,
          elements: elementsRef.current,
          app_state: appStateRef.current,
          files: filesRef.current,
        });
        fetch(`${base}/api/sketches`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
      invalidateSketchCache(sketchId);
    };
  }, [sketchId, base]);

  // Flush on tab close, mirroring saveOnUnload in HomePage.
  useEffect(() => {
    const saveOnUnload = () => {
      if (saveStatusRef.current !== "unsaved") return;
      const payload = JSON.stringify({
        id: sketchId,
        elements: elementsRef.current,
        app_state: appStateRef.current,
        files: filesRef.current,
      });
      try {
        if (
          navigator.sendBeacon(
            `${base}/api/sketches`,
            new Blob([payload], { type: "application/json" })
          )
        ) {
          return;
        }
      } catch {
        // Fall through to keepalive fetch.
      }
      fetch(`${base}/api/sketches`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    };
    window.addEventListener("beforeunload", saveOnUnload);
    return () => window.removeEventListener("beforeunload", saveOnUnload);
  }, [sketchId, base]);

  // Seed the image backdrop once, on the first open of an empty annotation
  // sketch. After the first autosave the photo lives in the row's files and
  // this does nothing.
  useEffect(() => {
    if (!sketch || !canEdit || backdropSeededRef.current) return;
    const backdrop = backdropProp || sketch.metadata?.backdrop;
    if (!backdrop?.url) return;
    if (parseField(sketch.elements, []).length) return;

    backdropSeededRef.current = true;
    let cancelled = false;

    (async () => {
      const api = excalidrawApiRef.current;
      if (!api) return;

      // The photo first, then any legacy annotation on top at the same size;
      // both locked so neither can be dragged or deleted by accident.
      const layers = [{ url: backdrop.url, prefix: "backdrop" }];
      if (sketch.metadata?.legacyDrawing) {
        layers.push({ url: sketch.metadata.legacyDrawing, prefix: "legacy" });
      }

      const loaded = [];
      for (const layer of layers) {
        try {
          const image = await loadBackdropImage(layer.url);
          loaded.push({ ...image, id: backdropFileId(layer.url, layer.prefix) });
        } catch (err) {
          console.error("[Sketch] Backdrop load error:", err);
          // The photo failing is worth saying; a legacy layer failing is not
          // worth a toast — data.drawing on the node stays the original copy.
          if (layer.prefix === "backdrop") {
            toast.error("Couldn't load the image into the annotation");
            return;
          }
        }
      }
      if (cancelled || !loaded.length) return;

      const { width, height } = loaded[0];
      api.addFiles(
        loaded.map((image) => ({
          id: image.id,
          dataURL: image.dataURL,
          mimeType: image.mimeType,
          created: Date.now(),
        }))
      );
      api.updateScene({
        elements: loaded.map((image, index) => ({
          type: "image",
          id: image.id,
          fileId: image.id,
          x: 0,
          y: 0,
          width,
          height,
          angle: 0,
          locked: true,
          seed: Math.floor(Math.random() * 2 ** 31),
          version: 1,
          versionNonce: Math.floor(Math.random() * 2 ** 31),
          index: `a${index}`,
          strokeColor: "transparent",
          backgroundColor: "transparent",
          fillStyle: "solid",
          strokeWidth: 1,
          strokeStyle: "solid",
          roughness: 0,
          opacity: 100,
          groupIds: [],
          frameId: null,
          roundness: null,
          boundElements: [],
          updated: Date.now(),
          link: null,
          isDeleted: false,
          status: "saved",
          scale: [1, 1],
        })),
      });
      api.scrollToContent(undefined, { fitToContent: true });

      // The photo is in the scene's files now; drop the duplicate copy of the
      // legacy dataURL from metadata so it isn't stored twice.
      if (sketch.metadata?.legacyDrawing) {
        const { legacyDrawing: _dropped, ...rest } = sketch.metadata;
        fetch(`${base}/api/sketches`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: sketchId, metadata: rest }),
        }).catch(() => {});
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sketch, canEdit, backdropProp, sketchId, base]);

  // Inline rename.
  const handleNameSave = async () => {
    setEditingName(false);
    const trimmed = sketchName.trim() || "Untitled Sketch";
    setSketchName(trimmed);
    if (!sketch || trimmed === sketch.name) return;
    try {
      const res = await fetch(`${base}/api/sketches`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sketchId, name: trimmed }),
      });
      if (!res.ok) throw new Error("Rename failed");
      setSketch((prev) => (prev ? { ...prev, name: trimmed } : prev));
    } catch (err) {
      console.error("[Sketch] Rename error:", err);
      toast.error("Failed to rename sketch");
    }
  };

  // Same-origin links navigate in-app; anything else falls through to
  // Excalidraw's default new-tab behaviour.
  const handleLinkOpen = useCallback(
    (element, event) => {
      const url = element?.link;
      if (!url) return;
      let target;
      try {
        target = new URL(url, window.location.origin);
      } catch {
        return;
      }
      if (target.origin !== window.location.origin) return;

      // Excalidraw checks the synthetic and the native event separately;
      // missing either opens a stray tab alongside the in-app navigation.
      event.preventDefault();
      event.detail?.nativeEvent?.preventDefault();
      router.push(target.pathname + target.search);
    },
    [router]
  );

  const setSelectedElementLink = useCallback(
    (url) => {
      const api = excalidrawApiRef.current;
      if (!api || !selection.id) return;
      // Bumping version keeps the element ordered correctly against realtime
      // reconciliation and costs nothing now.
      api.updateScene({
        elements: api
          .getSceneElements()
          .map((el) =>
            el.id === selection.id
              ? { ...el, link: url, version: (el.version ?? 0) + 1 }
              : el
          ),
      });
      setSelection((prev) => ({ ...prev, link: url }));
      setLinkDialogOpen(false);
    },
    [selection.id]
  );

  // The push is a copy, not a move: the sketch is untouched by it, and the
  // board is appended to server-side while it is unmounted.
  const parentBoardKnown = Boolean(sketch?.metadata?.parentScope);
  const handlePushToBoard = useCallback(async () => {
    if (pushing || !selectedIds.length) return;
    setPushing(true);
    try {
      // The route reads the row, so land any pending edits first.
      clearTimeout(saveTimer.current);
      if (saveStatusRef.current === "unsaved") {
        await persistRef.current(
          elementsRef.current,
          appStateRef.current,
          filesRef.current
        );
      }

      const res = await fetch(`${base}/api/sketches/push-to-board`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sketchId, elementIds: selectedIds }),
      });
      const result = await res.json().catch(() => ({}));

      if (res.status === 404) {
        toast.error("That board no longer exists");
        return;
      }
      if (!res.ok) throw new Error(result.error || "Push failed");

      if (!result.nodes && !result.edges) {
        toast.error("Nothing in the selection could be converted");
      } else {
        toast.success(
          `Added ${result.nodes} node${result.nodes === 1 ? "" : "s"} and ` +
            `${result.edges} edge${result.edges === 1 ? "" : "s"} to ${result.boardName}`
        );
      }

      // One extra toast for the whole batch, never one per skipped element.
      const summary = describeSkipped(result.skipped ?? []);
      if (summary) toast.info(summary);
    } catch (err) {
      console.error("[Sketch] Push error:", err);
      toast.error("Couldn't push to the board");
    } finally {
      setPushing(false);
    }
  }, [pushing, selectedIds, sketchId, base]);

  const handleBack = useCallback(() => {
    clearTimeout(saveTimer.current);
    if (saveStatusRef.current === "unsaved") {
      persistRef.current(
        elementsRef.current,
        appStateRef.current,
        filesRef.current
      );
    }
    invalidateSketchCache(sketchId);
    onBack?.();
  }, [sketchId, onBack]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <LogoLoading size={72} />
      </div>
    );
  }

  if (loadError || !sketch) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-background">
        <p className="text-sm text-muted-foreground">Sketch unavailable</p>
        <button
          onClick={() => onBack?.()}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to board
        </button>
      </div>
    );
  }

  const initialData = {
    elements: parseField(sketch.elements, []),
    appState: {
      ...parseField(sketch.app_state, {}),
      theme: colorMode,
    },
    files: parseField(sketch.files, {}),
    scrollToContent: true,
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
      <div className="z-20 flex h-12 shrink-0 items-center gap-3 border-b border-border bg-background px-4">
        <button
          onClick={handleBack}
          className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Board
        </button>

        <div className="h-4 w-px shrink-0 bg-border" />

        {editingName && canEdit ? (
          <input
            autoFocus
            value={sketchName}
            onChange={(e) => setSketchName(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleNameSave();
              if (e.key === "Escape") {
                setSketchName(sketch.name || "Untitled Sketch");
                setEditingName(false);
              }
            }}
            className="w-52 min-w-0 rounded-md border border-border bg-surface-hover px-2 py-0.5 text-sm font-medium text-foreground focus:outline-none"
          />
        ) : (
          <button
            onClick={() => canEdit && setEditingName(true)}
            title={canEdit ? "Click to rename" : undefined}
            className="max-w-xs min-w-0 truncate text-sm font-medium text-foreground transition-colors hover:text-foreground"
          >
            {sketchName}
          </button>
        )}

        <div className="flex-1" />

        <div className="flex shrink-0 items-center gap-3">
          <SaveStatus status={saveStatus} />
          {canEdit && (
            <button
              onClick={handleManualSave}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-subtle px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
            >
              <Save className="h-3 w-3" />
              Save
            </button>
          )}
        </div>
      </div>

      <div className="relative flex-1">
        <ExcalidrawComponent
          initialData={initialData}
          theme={colorMode}
          onChange={handleChange}
          onLinkOpen={handleLinkOpen}
          excalidrawAPI={(api) => {
            excalidrawApiRef.current = api;
          }}
          viewModeEnabled={!canEdit}
        >
          {canEdit && (
            <ExcalidrawFooter>
              <button
                onClick={() => setLinkDialogOpen(true)}
                disabled={!selection.id}
                title={
                  selection.id
                    ? "Link the selected shape to a board, sketch or document"
                    : "Select a single shape to link it"
                }
                className="ml-2 flex items-center gap-1.5 rounded-lg border border-border bg-surface-subtle px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Link2 className="h-3 w-3" />
                {selection.link ? "Edit link" : "Link to Notes"}
              </button>
              <button
                onClick={handlePushToBoard}
                disabled={!selectedIds.length || !parentBoardKnown || pushing}
                title={
                  !parentBoardKnown
                    ? "No host board"
                    : "Turn the selected shapes into nodes on the host board"
                }
                className="ml-2 flex items-center gap-1.5 rounded-lg border border-border bg-surface-subtle px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Workflow className="h-3 w-3" />
                {pushing ? "Pushing…" : "Push to board"}
              </button>
            </ExcalidrawFooter>
          )}
        </ExcalidrawComponent>
      </div>

      <LinkPickerDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        sketchId={sketchId}
        projectId={projectId}
        currentLink={selection.link}
        onPick={(target) => setSelectedElementLink(target.url)}
        onRemove={() => setSelectedElementLink(null)}
      />
    </div>
  );
}
