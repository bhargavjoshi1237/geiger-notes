"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_SETTINGS, mergeSettings } from "./defaults";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

/**
 * Loads the signed-in user's settings, exposes optimistic local edits, and
 * persists them on demand. Designed to be a drop-in replacement for the old
 * `useState({ doubleClickToInsert })` plumbing in the canvas components.
 *
 * Returns:
 *  - settings      current (possibly unsaved) settings object
 *  - setSetting    (key, value) => void   optimistic local update
 *  - save          () => Promise<boolean> persist current settings
 *  - discard       () => void             revert to last saved state
 *  - reset         () => void             load factory defaults (still needs save)
 *  - isDirty       boolean                unsaved changes pending
 *  - isLoading     boolean                initial fetch in flight
 *  - isSaving      boolean                a save request is in flight
 */
export function useUserSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      try {
        const res = await fetch(`${BASE_PATH}/api/settings`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          const merged = mergeSettings(data?.settings);
          if (mountedRef.current) {
            setSettings(merged);
            setSaved(merged);
          }
        }
      } catch {
        // Network/auth issue — keep defaults so the UI still works.
      } finally {
        if (mountedRef.current) setIsLoading(false);
      }
    })();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const setSetting = useCallback((key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const isDirty = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(saved),
    [settings, saved]
  );

  const save = useCallback(async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`${BASE_PATH}/api/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      if (!res.ok) throw new Error("save failed");
      if (mountedRef.current) setSaved(settings);
      return true;
    } catch {
      return false;
    } finally {
      if (mountedRef.current) setIsSaving(false);
    }
  }, [settings]);

  const discard = useCallback(() => setSettings(saved), [saved]);
  const reset = useCallback(() => setSettings(DEFAULT_SETTINGS), []);

  return {
    settings,
    setSetting,
    save,
    discard,
    reset,
    isDirty,
    isLoading,
    isSaving,
  };
}
