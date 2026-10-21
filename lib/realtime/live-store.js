// High-frequency presence data (cursors, laser trails, leader viewports) kept outside React state; listeners are batched to one call per animation frame.

export const LASER_FADE_MS = 1100;
const CURSOR_STALE_MS = 10_000;

export function createLiveStore() {
  const cursors = new Map(); // userId -> { x, y, at }
  const trails = new Map(); // userId -> [{ x, y, t }]
  const viewports = new Map(); // userId -> { x, y, zoom, width, height, at }
  const listeners = new Set();
  let version = 0;
  let frame = 0;

  const emit = () => {
    if (frame) return;
    const schedule = typeof requestAnimationFrame === "function" ? requestAnimationFrame : (fn) => setTimeout(fn, 16);
    frame = schedule(() => {
      frame = 0;
      version += 1;
      listeners.forEach((listener) => listener());
    });
  };

  return {
    cursors,
    trails,
    viewports,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getVersion: () => version,
    setCursor(userId, x, y) {
      cursors.set(userId, { x, y, at: Date.now() });
      emit();
    },
    dropCursor(userId) {
      if (cursors.delete(userId)) emit();
    },
    addLaser(userId, points) {
      const now = Date.now();
      const trail = (trails.get(userId) || []).filter((p) => now - p.t < LASER_FADE_MS);
      for (const [x, y] of points) trail.push({ x, y, t: now });
      trails.set(userId, trail);
      emit();
    },
    // Drops faded laser points and stale cursors; returns whether any trail is still visible.
    prune() {
      const now = Date.now();
      let alive = false;
      for (const [userId, trail] of trails) {
        const kept = trail.filter((p) => now - p.t < LASER_FADE_MS);
        if (kept.length) {
          trails.set(userId, kept);
          alive = true;
        } else trails.delete(userId);
      }
      for (const [userId, cursor] of cursors) if (now - cursor.at > CURSOR_STALE_MS) cursors.delete(userId);
      return alive;
    },
    setViewport(userId, viewport) {
      viewports.set(userId, { ...viewport, at: Date.now() });
      emit();
    },
    drop(userId) {
      cursors.delete(userId);
      trails.delete(userId);
      viewports.delete(userId);
      emit();
    },
    clear() {
      cursors.clear();
      trails.clear();
      viewports.clear();
      emit();
    },
  };
}
