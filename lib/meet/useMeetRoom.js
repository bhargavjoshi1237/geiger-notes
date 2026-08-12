"use client";

import { useCallback, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { useMediaTracks } from "./useMediaTracks";
import { usePeerMesh } from "./usePeerMesh";

// Composes the two halves of a meeting — the local devices and the peer mesh —
// into the single object the meeting UI consumes, and owns the room record's
// lifecycle (ending it).
//
// Everything about who is in the room comes from Realtime presence, not from the
// database: the row exists so a code can be resolved to a room, and so an ended
// meeting stops being joinable. It is not a participant list.

export function useMeetRoom({ roomId, me }) {
  const supabase = useMemo(() => createClient(), []);
  const media = useMediaTracks();

  // Presence payload. Remote tiles render from these flags rather than probing
  // the media itself — a muted remote track and a camera that was never on look
  // identical on the wire.
  const status = useMemo(
    () => ({ micOn: media.micOn, camOn: media.camOn, sharing: media.sharing }),
    [media.micOn, media.camOn, media.sharing],
  );

  const mesh = usePeerMesh({
    supabase,
    roomId,
    me,
    audioTrack: media.audioTrack,
    videoTrack: media.outgoingVideo,
    status,
  });

  // Leaving is just releasing the devices — unmounting the stage tears the mesh
  // and the presence entry down on its own.
  const leave = useCallback(() => {
    media.stopAll();
  }, [media]);

  // Ending closes the room for everyone: the code stops resolving, so nobody can
  // rejoin a call the host has finished.
  const endRoom = useCallback(async () => {
    media.stopAll();
    if (!roomId) return true;
    const { error } = await supabase
      .from("meet_rooms")
      .update({ ended_at: new Date().toISOString() })
      .eq("id", roomId);
    if (error) {
      console.error("[meet.end]", error.message);
      return false;
    }
    return true;
  }, [supabase, roomId, media]);

  const remoteParticipants = useMemo(
    () => mesh.participants.filter((p) => p.id !== me?.id),
    [mesh.participants, me?.id],
  );

  return { ...media, ...mesh, remoteParticipants, leave, endRoom };
}
