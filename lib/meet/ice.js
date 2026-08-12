// ICE configuration for the meeting mesh.
//
// STUN alone is enough for most home and office networks: it tells each peer its
// public address so the two can connect directly. It is NOT enough behind
// symmetric NAT or a firewall that blocks UDP — those connections need a TURN
// relay, which is a paid credential rather than something the app can conjure.
//
// So: ship with public STUN, and pick up TURN from the environment when it's
// configured. Adding a TURN provider later is three env vars and a redeploy, not
// a code change.
//
//   NEXT_PUBLIC_TURN_URL=turn:turn.example.com:3478
//   NEXT_PUBLIC_TURN_USERNAME=...
//   NEXT_PUBLIC_TURN_CREDENTIAL=...

const STUN_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
];

export function iceServers() {
    const servers = [...STUN_SERVERS];
    const url = process.env.NEXT_PUBLIC_TURN_URL;
    if (url) {
        servers.push({
            urls: url,
            username: process.env.NEXT_PUBLIC_TURN_USERNAME || undefined,
            credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL || undefined,
        });
    }
    return servers;
}

// True when a relay is configured. The meeting UI uses this to be honest about
// why a peer might fail to connect rather than leaving a tile spinning.
export function hasTurn() {
    return Boolean(process.env.NEXT_PUBLIC_TURN_URL);
}

export function rtcConfig() {
    return { iceServers: iceServers(), iceCandidatePoolSize: 4 };
}
