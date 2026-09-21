"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTheme } from "next-themes";
import { LogoLoading } from "@geiger/ui";
import { PenTool } from "lucide-react";

const SketchPreviewContext = createContext({
  rows: new Map(),
  pending: false,
  invalidateSketch: () => {},
  onOpenSketch: null,
});

// Memo cache: sketchId -> { updatedAt, theme, svg }. Reused unless the row's
// updated_at or the resolved theme changed, so board navigation and node
// remounts re-render nothing.
const svgCache = new Map();

// Module-level cache drop for surfaces rendered outside the provider (the
// editor replaces the board, so the provider is unmounted while it is open).
export function invalidateSketchCache(id) {
  if (!id) return;
  svgCache.delete(id);
  svgCache.delete(`${id}:filtered`);
}

function parseElements(value) {
  if (!value) return [];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return Array.isArray(value) ? value : [];
}

function parseFiles(value) {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof value === "object" ? value : {};
}

export function SketchPreviewProvider({ nodes = [], onOpenSketch = null, children }) {
  const [rows, setRows] = useState(() => new Map());
  const [pendingIds, setPendingIds] = useState(() => new Set());
  const fetchedRef = useRef(new Set());

  // Sketch nodes and annotated image nodes share one batch fetch, so an
  // annotated image costs no extra request.
  const sketchIds = useMemo(() => {
    const ids = new Set();
    for (const node of nodes) {
      if (node?.type === "sketch" && node?.data?.sketchId) ids.add(node.data.sketchId);
      if (node?.type === "image" && node?.data?.annotationSketchId) {
        ids.add(node.data.annotationSketchId);
      }
    }
    return [...ids];
  }, [nodes]);

  useEffect(() => {
    const fresh = sketchIds.filter((id) => !fetchedRef.current.has(id));
    if (!fresh.length) return;
    for (const id of fresh) fetchedRef.current.add(id);
    setPendingIds((prev) => new Set([...prev, ...fresh]));

    const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
    fetch(`${base}/api/sketches?ids=${fresh.join(",")}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((list) => {
        setRows((prev) => {
          const next = new Map(prev);
          for (const row of Array.isArray(list) ? list : []) {
            next.set(row.id, row);
          }
          return next;
        });
      })
      .catch((err) => console.error("[Sketch] Preview fetch error:", err))
      .finally(() => {
        setPendingIds((prev) => {
          const next = new Set(prev);
          for (const id of fresh) next.delete(id);
          return next;
        });
      });
  }, [sketchIds]);

  const invalidateSketch = useCallback((id) => {
    if (!id) return;
    svgCache.delete(id);
    svgCache.delete(`${id}:filtered`);
    fetchedRef.current.delete(id);
    setRows((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ rows, pendingIds, invalidateSketch, onOpenSketch }),
    [rows, pendingIds, invalidateSketch, onOpenSketch]
  );

  return (
    <SketchPreviewContext.Provider value={value}>
      {children}
    </SketchPreviewContext.Provider>
  );
}

// filterElements drops elements from the rendered SVG without touching the
// stored scene — image annotation uses it to leave the locked photo out of the
// overlay so the photo is not drawn twice.
export function useSketchPreview(sketchId, filterElements = null) {
  const { rows, pendingIds, invalidateSketch, onOpenSketch } = useContext(SketchPreviewContext);
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "dark" ? "dark" : "light";
  const [rendered, setRendered] = useState(null);
  const [failed, setFailed] = useState(false);

  const row = sketchId ? rows.get(sketchId) : undefined;
  const loading = sketchId ? pendingIds.has(sketchId) : false;
  const allElements = useMemo(() => parseElements(row?.elements), [row?.elements]);
  const elements = useMemo(
    () => (filterElements ? allElements.filter(filterElements) : allElements),
    [allElements, filterElements]
  );
  const files = useMemo(() => parseFiles(row?.files), [row?.files]);
  const updatedAt = row?.updated_at ?? null;
  const cacheKey = sketchId ? `${sketchId}${filterElements ? ":filtered" : ""}` : null;

  const cached = cacheKey ? svgCache.get(cacheKey) : undefined;
  const cacheValid =
    cached && cached.updatedAt === updatedAt && cached.theme === theme;
  const renderedValid =
    rendered &&
    rendered.cacheKey === cacheKey &&
    rendered.updatedAt === updatedAt &&
    rendered.theme === theme;
  const displaySvg = cacheValid ? cached.svg : renderedValid ? rendered.svg : null;

  useEffect(() => {
    if (!sketchId || !row || !elements.length || cacheValid) return;
    let cancelled = false;
    (async () => {
      try {
        const { exportToSvg } = await import("@excalidraw/excalidraw");
        if (cancelled) return;
        const el = await exportToSvg({
          elements,
          appState: { exportBackground: false, theme },
          files,
        });
        const markup = new XMLSerializer().serializeToString(el);
        svgCache.set(cacheKey, { updatedAt, theme, svg: markup });
        setRendered({ cacheKey, updatedAt, theme, svg: markup });
        setFailed(false);
      } catch (err) {
        console.error("[Sketch] Preview render error:", err);
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sketchId, cacheKey, row, elements, files, theme, updatedAt, cacheValid]);

  if (!sketchId || (!row && loading)) return { status: "loading", svg: null, row: null, invalidateSketch, onOpenSketch };
  if (!row) return { status: "missing", svg: null, row: null, invalidateSketch, onOpenSketch };
  if (!elements.length || failed) return { status: "empty", svg: null, row, invalidateSketch, onOpenSketch };
  if (!displaySvg) {
    return { status: "loading", svg: null, row, invalidateSketch, onOpenSketch };
  }
  return { status: "ready", svg: displaySvg, row, invalidateSketch, onOpenSketch };
}

export function SketchPreviewSurface({ sketchId, filterElements = null }) {
  const { status, svg } = useSketchPreview(sketchId, filterElements);

  if (status === "loading") {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <LogoLoading size={32} />
      </div>
    );
  }

  if (status === "missing") {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <span className="text-xs text-muted-foreground">Sketch unavailable</span>
      </div>
    );
  }

  if (status === "empty") {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
        <PenTool className="h-6 w-6" />
        <span className="text-xs">Empty sketch</span>
      </div>
    );
  }

  return (
    <div
      className="pointer-events-none flex h-full w-full items-center justify-center overflow-hidden [&>svg]:max-h-full [&>svg]:max-w-full [&>svg]:object-contain"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
