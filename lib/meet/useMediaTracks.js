"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Owns the local half of a meeting: the camera, the microphone, and the screen
// share. Nothing here knows about peers — it just exposes the tracks that are
// currently outgoing, and usePeerMesh pushes them onto every connection.
//
// Two deliberate choices:
//
//   * Muting flips `track.enabled`, which is instant and needs no renegotiation.
//   * Turning the camera OFF stops the track outright, so the hardware light
//     goes out. That's what people expect "camera off" to mean, and the mesh
//     handles it because every peer keeps a stable video sender it can
//     replaceTrack(null) on.
//
// The outgoing video track is the screen when sharing, otherwise the camera —
// that single swap is the whole of screen sharing as far as the network is
// concerned.

export function useMediaTracks({ initialMic = true, initialCam = true } = {}) {
  const [audioTrack, setAudioTrack] = useState(null);
  const [cameraTrack, setCameraTrack] = useState(null);
  const [screenTrack, setScreenTrack] = useState(null);
  const [micOn, setMicOn] = useState(initialMic);
  const [camOn, setCamOn] = useState(initialCam);
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);

  // Cleanup and the toggles need the live tracks without re-running the mount
  // effect, so state is mirrored here. Mutating a track's `enabled` flag goes
  // through this ref rather than the state binding — same object either way, but
  // it keeps the mutation off a value React hands back from useState.
  const tracksRef = useRef({ audio: null, camera: null, screen: null });
  useEffect(() => {
    tracksRef.current = { audio: audioTrack, camera: cameraTrack, screen: screenTrack };
  }, [audioTrack, cameraTrack, screenTrack]);

  // Acquire once on mount. A refusal or a machine with no camera is not fatal —
  // you can still join and listen, so we record the reason and carry on.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: initialCam,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const audio = stream.getAudioTracks()[0] || null;
        const video = stream.getVideoTracks()[0] || null;
        if (audio) audio.enabled = initialMic;
        setAudioTrack(audio);
        setCameraTrack(video);
        setCamOn(Boolean(video));
      } catch (e) {
        if (cancelled) return;
        console.error("[meet.media] getUserMedia failed", e);
        setError(
          e?.name === "NotAllowedError"
            ? "Camera and microphone are blocked for this site."
            : "No camera or microphone available.",
        );
        setCamOn(false);
        setMicOn(false);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
      const { audio, camera, screen } = tracksRef.current;
      [audio, camera, screen].forEach((t) => t?.stop());
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleMic = useCallback(async () => {
    const track = tracksRef.current.audio;
    if (track) {
      track.enabled = !track.enabled;
      setMicOn(track.enabled);
      return;
    }
    // No mic yet (initial acquisition failed or was denied) — try again.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const track = stream.getAudioTracks()[0] || null;
      setAudioTrack(track);
      setMicOn(Boolean(track));
      setError(null);
    } catch (e) {
      console.error("[meet.media] microphone unavailable", e);
      setError("Microphone is unavailable.");
    }
  }, []);

  const toggleCam = useCallback(async () => {
    if (cameraTrack) {
      cameraTrack.stop();
      setCameraTrack(null);
      setCamOn(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraTrack(stream.getVideoTracks()[0] || null);
      setCamOn(true);
      setError(null);
    } catch (e) {
      console.error("[meet.media] camera unavailable", e);
      setError("Camera is unavailable.");
    }
  }, [cameraTrack]);

  const stopSharing = useCallback(() => {
    setScreenTrack((current) => {
      current?.stop();
      return null;
    });
  }, []);

  const startSharing = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 15 },
        audio: false,
      });
      const track = stream.getVideoTracks()[0] || null;
      if (!track) return;
      // The browser's own "Stop sharing" bar ends the track directly, so the
      // app has to follow it rather than the other way round.
      track.addEventListener("ended", () => {
        setScreenTrack((current) => (current === track ? null : current));
      });
      setScreenTrack(track);
    } catch (e) {
      // A cancelled picker is a normal outcome, not an error worth surfacing.
      if (e?.name !== "NotAllowedError" && e?.name !== "AbortError") {
        console.error("[meet.media] getDisplayMedia failed", e);
        setError("Screen sharing isn't available in this browser.");
      }
    }
  }, []);

  const toggleShare = useCallback(() => {
    if (screenTrack) stopSharing();
    else startSharing();
  }, [screenTrack, startSharing, stopSharing]);

  const stopAll = useCallback(() => {
    const { audio, camera, screen } = tracksRef.current;
    [audio, camera, screen].forEach((t) => t?.stop());
    setAudioTrack(null);
    setCameraTrack(null);
    setScreenTrack(null);
    setMicOn(false);
    setCamOn(false);
  }, []);

  // What actually goes out on the wire: the screen when sharing, else the camera.
  const outgoingVideo = screenTrack || cameraTrack;

  return {
    ready,
    error,
    audioTrack,
    cameraTrack,
    screenTrack,
    outgoingVideo,
    micOn,
    camOn,
    sharing: Boolean(screenTrack),
    toggleMic,
    toggleCam,
    toggleShare,
    stopSharing,
    stopAll,
  };
}

// Wrap a track in a MediaStream for a <video> element. Memoised by the caller so
// the element isn't handed a new object every render.
export function trackToStream(track) {
  if (!track) return null;
  const stream = new MediaStream();
  stream.addTrack(track);
  return stream;
}
