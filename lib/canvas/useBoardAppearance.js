"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { mergeAppearance } from "./appearance";

const apiUrl = () => `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/api/board-appearance`;

// Load + optimistically edit the open board's appearance; saves are debounced and keyed to the board they were made on.
export function useBoardAppearance(boardId, projectId, enabled = true) {
  const key = `${projectId || ""}:${boardId || ""}`;
  const [state, setState] = useState({ key: null, appearance: mergeAppearance(null) });
  const timer = useRef(null);

  useEffect(() => {
    if (!enabled) return undefined;
    let active = true;
    const params = new URLSearchParams();
    if (boardId) params.set("boardId", boardId);
    if (projectId) params.set("projectId", projectId);
    fetch(`${apiUrl()}?${params}`)
      .then((r) => (r.ok ? r.json() : { appearance: null }))
      .catch(() => ({ appearance: null }))
      .then(({ appearance }) => {
        if (active) setState({ key, appearance: mergeAppearance(appearance) });
      });
    return () => {
      active = false;
    };
  }, [key, boardId, projectId, enabled]);

  const persist = useCallback(
    (appearance) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        try {
          const res = await fetch(apiUrl(), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ boardId: boardId || null, projectId: projectId || null, appearance }),
          });
          if (!res.ok) throw new Error((await res.json().catch(() => ({}))).details || res.statusText);
        } catch (err) {
          console.error("[board-appearance]", err);
          toast.error("Couldn't save the board background", { id: "appearance-save" });
        }
      }, 600);
    },
    [boardId, projectId],
  );

  useEffect(() => () => clearTimeout(timer.current), [key]);

  const update = useCallback(
    (producer) =>
      setState((s) => {
        const next = mergeAppearance(typeof producer === "function" ? producer(s.appearance) : producer);
        persist(next);
        return { ...s, appearance: next };
      }),
    [persist],
  );

  // Until this board's row arrives, render defaults rather than the previous board's look.
  const appearance = state.key === key ? state.appearance : mergeAppearance(null);
  return { appearance, update, loaded: state.key === key };
}
