/**
 * Coturn Server Configuration
 * 
 * TURN is OPTIONAL - the app works fine with STUN-only (direct P2P).
 * Only configure TURN if you need it for strict NAT/firewall scenarios.
 * 
 * To enable TURN: Replace the {{PLACEHOLDERS}} below with real values
 */

// Detect if TURN credentials are actual values (not placeholders)
const turnUrl = '{{TURN_SERVER_URL}}';
const turnUsername = '{{TURN_USERNAME}}';
const turnPassword = '{{TURN_PASSWORD}}';

const isTurnConfigured =
    turnUrl && !turnUrl.includes('{{') &&
    turnUsername && !turnUsername.includes('{{') &&
    turnPassword && !turnPassword.includes('{{');

export const turnConfig = {
    iceServers: isTurnConfigured ? [
        // Both STUN and TURN
        { urls: 'stun:stun1.l.google.com:3478' },
        { urls: turnUrl, username: turnUsername, credential: turnPassword }
    ] : [
        // STUN only (works for most networks)
        { urls: 'stun:stun1.l.google.com:3478' },
        { urls: 'stun:stun1.l.google.com:3478' }
    ]
};

console.log('[turnConfig] TURN server configured:', isTurnConfigured);
