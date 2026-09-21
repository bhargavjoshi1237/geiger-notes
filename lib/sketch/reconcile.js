// Element convergence for collaborative sketching.
//
// Every Excalidraw element carries `version`, `versionNonce` and `updated`.
// Excalidraw's own protocol reconciles with them, and so do we:
//
//   keep the local element unless the remote `version` is higher;
//   on a version tie, keep the one with the lower `versionNonce`.
//
// The nonce tiebreak is what makes the rule deterministic — both sides
// independently reach the same answer, so the scene cannot diverge. Deletions
// travel as elements with `isDeleted: true`, never as omissions: an absent
// element is indistinguishable from one the sender had not yet received.
//
// Pure — no Supabase, no React — because this is the piece most likely to
// harbour a subtle bug and it must be readable in isolation.

// True when `remote` should replace `local`.
export function remoteWins(local, remote) {
  if (!local) return true;
  if (!remote) return false;

  const localVersion = local.version ?? 0;
  const remoteVersion = remote.version ?? 0;
  if (remoteVersion !== localVersion) return remoteVersion > localVersion;

  const localNonce = local.versionNonce ?? 0;
  const remoteNonce = remote.versionNonce ?? 0;
  if (remoteNonce !== localNonce) return remoteNonce < localNonce;

  // Identical version and nonce means the same element; keep what we have.
  return false;
}

/**
 * Merge an incoming batch of elements into the local scene.
 *
 * Local order is preserved; elements only the remote has are appended in the
 * order they arrived, so two clients that have seen the same messages end up
 * with the same scene.
 *
 * @param {Array} local   the current scene elements
 * @param {Array} remote  the elements that just arrived (a diff, not the scene)
 * @returns {Array} the merged elements
 */
export function reconcileElements(local, remote) {
  const localList = Array.isArray(local) ? local : [];
  const remoteList = Array.isArray(remote) ? remote : [];
  if (!remoteList.length) return localList;

  const incoming = new Map();
  for (const element of remoteList) {
    if (element?.id) incoming.set(element.id, element);
  }

  const merged = localList.map((element) => {
    const candidate = incoming.get(element?.id);
    if (!candidate) return element;
    incoming.delete(element.id);
    return remoteWins(element, candidate) ? candidate : element;
  });

  // Whatever the remote has that we have never seen.
  for (const element of incoming.values()) merged.push(element);

  return merged;
}

/**
 * The elements to broadcast: those whose version changed since the last send.
 * A full-scene broadcast on every stroke is what makes naive implementations
 * unusable on a large drawing.
 *
 * @param {Array} elements  the current scene
 * @param {Map<string, number>} sent  element id -> last broadcast version
 * @returns {{ changed: Array, next: Map<string, number> }}
 */
export function diffForBroadcast(elements, sent) {
  const list = Array.isArray(elements) ? elements : [];
  const next = new Map();
  const changed = [];

  for (const element of list) {
    if (!element?.id) continue;
    const version = element.version ?? 0;
    next.set(element.id, version);
    if (sent.get(element.id) !== version) changed.push(element);
  }

  // An element that vanished from the local scene without a tombstone cannot be
  // communicated, so nothing is emitted for it — the remote keeps its copy
  // until a real isDeleted element arrives.
  return { changed, next };
}
