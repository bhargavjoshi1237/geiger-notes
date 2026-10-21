// Read-modify-write on one notes.collab row: re-reads the columns first, so a stale local copy
// can't clobber a newer write (or trip the guard trigger by dropping someone else's entry).
export async function updateCollabRow(supabase, sessionId, columns, buildPatch) {
  const { data: row, error: readError } = await supabase.from("collab").select(columns).eq("id", sessionId).single();
  if (readError || !row) return { error: readError || { message: "Session not found" } };
  const patch = buildPatch(row);
  if (!patch) return { skipped: true, row };
  const { error } = await supabase.from("collab").update(patch).eq("id", sessionId);
  return { error, patch, row };
}
