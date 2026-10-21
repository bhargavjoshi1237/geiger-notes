// Excalidraw follow-mode math: fit the leader's visible scene rect inside our own viewport ("contain").
// Excalidraw maps scene → viewport as (scene + scroll) * zoom, so the visible rect starts at -scroll.

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 30;

export function viewportOf(appState) {
  if (!appState) return null;
  const zoom = appState.zoom?.value ?? appState.zoom;
  if (!zoom || !appState.width || !appState.height) return null;
  return { scrollX: appState.scrollX, scrollY: appState.scrollY, zoom, width: appState.width, height: appState.height };
}

export function followScroll(leader, width, height) {
  if (!leader?.zoom || !leader.width || !leader.height || !width || !height) return null;
  const rectW = leader.width / leader.zoom;
  const rectH = leader.height / leader.zoom;
  const cx = -leader.scrollX + rectW / 2;
  const cy = -leader.scrollY + rectH / 2;
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.min(width / rectW, height / rectH)));
  return { scrollX: -cx + width / (2 * zoom), scrollY: -cy + height / (2 * zoom), zoom };
}

// True when a scroll/zoom report differs from what we just applied, i.e. the user moved on their own.
export function movedByUser(applied, scrollX, scrollY, zoom) {
  if (!applied) return true;
  return Math.abs(applied.scrollX - scrollX) > 1 || Math.abs(applied.scrollY - scrollY) > 1 || Math.abs(applied.zoom - zoom) > 0.001;
}
