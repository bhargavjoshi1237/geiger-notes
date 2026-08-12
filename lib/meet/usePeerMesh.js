"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { rtcConfig } from "./ice";

// A full-mesh WebRTC call: every participant holds one RTCPeerConnection to
// every other, so media goes peer-to-peer and never touches a server.
//
// Signalling rides the Supabase Realtime channel `meet:<roomId>` — the same
// transport collaboration already uses for its own broadcasts — so a meeting
// needs no signalling server of its own:
//
//   * presence  — who is in the room, and their mic/camera/sharing state
//   * broadcast — offers, answers, and ICE candidates, addressed to one peer
//
// Two design notes worth knowing before changing anything here:
//
//   * Glare is avoided by fiat rather than by rollback. For any pair, the peer
//     with the lower user id is the only one that ever sends an offer, so the
//     two sides can never collide mid-negotiation.
//   * Every connection is built with a fixed audio + video transceiver up front,
//     and tracks are attached with replaceTrack(). That means muting, turning the
//     camera off, and starting a screen share never renegotiate the session —
//     which is what keeps sharing instant instead of a two-second stall.
//
// A mesh is the right shape for the handful of people in a notes session; it is
// not the right shape for a webinar. Upstream bandwidth grows with each extra
// participant, so this stays comfortable to roughly 4-6 people.

const SIGNAL = "signal";

// Candidates can arrive before the description they belong to; hold them until
// the remote description exists, then flush.
async function flushCandidates(peer) {
  const queued = peer.pendingCandidates;
  peer.pendingCandidates = [];
  for (const candidate of queued) {
    try {
      await peer.pc.addIceCandidate(candidate);
    } catch (e) {
      console.error("[meet.mesh] addIceCandidate failed", e);
    }
  }
}

export function usePeerMesh({ supabase, roomId, me, audioTrack, videoTrack, status }) {
  const [participants, setParticipants] = useState([]);
  const [remoteStreams, setRemoteStreams] = useState(() => new Map());
  const [peerStates, setPeerStates] = useState(() => new Map());
  const [connected, setConnected] = useState(false);

  const peersRef = useRef(new Map());
  const channelRef = useRef(null);

  // Handlers below run outside React's render — inside RTCPeerConnection events
  // and Realtime callbacks — so the live values they need are mirrored into refs
  // rather than captured by a re-created effect, which would tear down and
  // rebuild every connection on a mute.
  //
  // These are written in effects, and the only reader that could race them is
  // presence sync, which is a network round-trip away. The track effects below
  // also seed the ref before the first peer can exist.
  const tracksRef = useRef({ audio: null, video: null });
  const meRef = useRef(null);
  useEffect(() => {
    meRef.current = me;
  }, [me]);

  const send = useCallback((payload) => {
    channelRef.current?.send({ type: "broadcast", event: SIGNAL, payload });
  }, []);

  // --- Peer lifecycle --------------------------------------------------------

  const dropPeer = useCallback((peerId) => {
    const peer = peersRef.current.get(peerId);
    if (!peer) return;
    try {
      peer.pc.close();
    } catch {
      // Already closed — nothing to do.
    }
    peersRef.current.delete(peerId);
    setRemoteStreams((prev) => {
      if (!prev.has(peerId)) return prev;
      const next = new Map(prev);
      next.delete(peerId);
      return next;
    });
    setPeerStates((prev) => {
      if (!prev.has(peerId)) return prev;
      const next = new Map(prev);
      next.delete(peerId);
      return next;
    });
  }, []);

  // Only ever called on the offering side of a pair.
  const negotiate = useCallback(
    async (peerId, options) => {
      const peer = peersRef.current.get(peerId);
      if (!peer || peer.negotiating) return;
      peer.negotiating = true;
      try {
        const offer = await peer.pc.createOffer(options);
        await peer.pc.setLocalDescription(offer);
        send({
          from: meRef.current?.id,
          to: peerId,
          kind: "offer",
          data: peer.pc.localDescription,
        });
      } catch (e) {
        console.error("[meet.mesh] offer failed", e);
      } finally {
        peer.negotiating = false;
      }
    },
    [send],
  );

  const ensurePeer = useCallback(
    (peerId) => {
      const existing = peersRef.current.get(peerId);
      if (existing) return existing;

      const myId = meRef.current?.id;
      const pc = new RTCPeerConnection(rtcConfig());

      // Fixed m-lines, so every later media change is a replaceTrack rather
      // than a renegotiation.
      const audioTx = pc.addTransceiver("audio", { direction: "sendrecv" });
      const videoTx = pc.addTransceiver("video", { direction: "sendrecv" });

      const peer = {
        pc,
        audioSender: audioTx.sender,
        videoSender: videoTx.sender,
        tracks: new Map(),
        pendingCandidates: [],
        // Only the lower id offers; the other side always answers.
        initiator: String(myId) < String(peerId),
        negotiating: false,
      };
      peersRef.current.set(peerId, peer);

      // Attach whatever we're currently sending.
      peer.audioSender.replaceTrack(tracksRef.current.audio || null).catch(() => {});
      peer.videoSender.replaceTrack(tracksRef.current.video || null).catch(() => {});

      pc.onicecandidate = (event) => {
        if (!event.candidate) return;
        send({ from: myId, to: peerId, kind: "candidate", data: event.candidate.toJSON() });
      };

      // replaceTrack() never associates a stream with the track, so the remote
      // stream is assembled here rather than read off event.streams.
      pc.ontrack = (event) => {
        peer.tracks.set(event.track.kind, event.track);
        const stream = new MediaStream([...peer.tracks.values()]);
        setRemoteStreams((prev) => new Map(prev).set(peerId, stream));
      };

      pc.onconnectionstatechange = () => {
        setPeerStates((prev) => new Map(prev).set(peerId, pc.connectionState));
        if (pc.connectionState === "failed") {
          // A failed mesh leg is almost always NAT traversal giving up. Restart
          // ICE once from the offering side; if that doesn't take, the tile
          // stays disconnected and the UI says so.
          if (peer.initiator) negotiate(peerId, { iceRestart: true });
        }
      };

      pc.onnegotiationneeded = () => {
        if (peer.initiator) negotiate(peerId);
      };

      if (peer.initiator) negotiate(peerId);
      return peer;
    },
    [send, negotiate],
  );

  // --- Signal handling -------------------------------------------------------

  const handleSignal = useCallback(
    async ({ from, to, kind, data }) => {
      const myId = meRef.current?.id;
      if (!from || from === myId || (to && to !== myId)) return;

      const peer = ensurePeer(from);

      try {
        if (kind === "offer") {
          await peer.pc.setRemoteDescription(new RTCSessionDescription(data));
          await flushCandidates(peer);
          const answer = await peer.pc.createAnswer();
          await peer.pc.setLocalDescription(answer);
          send({ from: myId, to: from, kind: "answer", data: peer.pc.localDescription });
        } else if (kind === "answer") {
          // A stale answer for a negotiation we've moved past is safe to drop.
          if (peer.pc.signalingState !== "have-local-offer") return;
          await peer.pc.setRemoteDescription(new RTCSessionDescription(data));
          await flushCandidates(peer);
        } else if (kind === "candidate") {
          const candidate = new RTCIceCandidate(data);
          if (peer.pc.remoteDescription) await peer.pc.addIceCandidate(candidate);
          else peer.pendingCandidates.push(candidate);
        }
      } catch (e) {
        console.error(`[meet.mesh] ${kind} failed`, e);
      }
    },
    [ensurePeer, send],
  );

  // --- Channel ---------------------------------------------------------------

  useEffect(() => {
    if (!supabase || !roomId || !me?.id) return undefined;

    const channel = supabase.channel(`meet:${roomId}`, {
      config: {
        presence: { key: me.id },
        // Our own signals would only ever be noise.
        broadcast: { self: false },
      },
    });
    channelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const list = Object.entries(state).map(([id, entries]) => ({
          id,
          ...(entries[0] || {}),
        }));
        setParticipants(list);

        // Reconcile the mesh against who is actually in the room.
        const present = new Set(list.map((p) => p.id).filter((id) => id !== me.id));
        for (const id of present) ensurePeer(id);
        for (const id of [...peersRef.current.keys()]) {
          if (!present.has(id)) dropPeer(id);
        }
      })
      .on("broadcast", { event: SIGNAL }, ({ payload }) => handleSignal(payload))
      .subscribe(async (state) => {
        if (state !== "SUBSCRIBED") return;
        setConnected(true);
        await channel.track({
          name: meRef.current?.name || "Guest",
          joinedAt: new Date().toISOString(),
          ...status,
        });
      });

    const peers = peersRef.current;
    return () => {
      setConnected(false);
      for (const id of [...peers.keys()]) dropPeer(id);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [supabase, roomId, me?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Republish presence whenever the local mic/camera/sharing state changes, so
  // every other tile can render the right thing without a media-level probe.
  const statusKey = JSON.stringify(status || {});
  useEffect(() => {
    if (!connected) return;
    channelRef.current?.track({
      name: meRef.current?.name || "Guest",
      ...status,
    });
  }, [statusKey, connected]); // eslint-disable-line react-hooks/exhaustive-deps

  // Push track swaps (camera off, screen share) onto every connection. This is
  // the whole of screen sharing on the wire: one replaceTrack per peer, no
  // renegotiation, so the switch is immediate.
  useEffect(() => {
    tracksRef.current = { ...tracksRef.current, audio: audioTrack };
    for (const peer of peersRef.current.values()) {
      peer.audioSender?.replaceTrack(audioTrack || null).catch(() => {});
    }
  }, [audioTrack]);

  useEffect(() => {
    tracksRef.current = { ...tracksRef.current, video: videoTrack };
    for (const peer of peersRef.current.values()) {
      peer.videoSender?.replaceTrack(videoTrack || null).catch(() => {});
    }
  }, [videoTrack]);

  return { participants, remoteStreams, peerStates, connected };
}
