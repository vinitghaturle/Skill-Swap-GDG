/**
 * TURN Service
 * Generates short-lived TURN credentials from Cloudflare
 */

import { TurnCredentials } from './types/signaling';

// ICE Server configuration type (avoiding RTCIceServer to keep service independent)
interface ICEServer {
    urls: string | string[];
    username?: string;
    credential?: string;
}

export class TurnService {
    private cloudflareAccountId: string;
    private cloudflareApiToken: string;
    private cloudflareKeyId: string;

    constructor() {
        this.cloudflareAccountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
        this.cloudflareApiToken = process.env.CLOUDFLARE_API_TOKEN || '';
        this.cloudflareKeyId = process.env.CLOUDFLARE_TURN_KEY_ID || '';

        if (!this.cloudflareAccountId || !this.cloudflareApiToken || !this.cloudflareKeyId) {
            console.warn('Cloudflare TURN credentials not configured. TURN relay will not be available.');
        }
    }

    /**
     * Generate TURN credentials from Cloudflare
     * Returns credentials valid for 1 hour
     */
    async generateCredentials(): Promise<TurnCredentials | null> {
        if (!this.cloudflareAccountId || !this.cloudflareApiToken) {
            console.warn('Cannot generate TURN credentials: Cloudflare not configured');
            return null;
        }

        try {
            const response = await fetch(
                `https://rtc.live.cloudflare.com/v1/turn/keys/${this.cloudflareAccountId}/credentials/generate`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.cloudflareApiToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        ttl: 3600, // 1 hour
                    }),
                }
            );

            if (!response.ok) {
                throw new Error(`Cloudflare API error: ${response.statusText}`);
            }

            const data = await response.json() as any;

            return {
                username: data.iceServers?.username || '',
                credential: data.iceServers?.credential || '',
                expiresAt: Date.now() + 3600000, // 1 hour from now
            };
        } catch (error) {
            console.error('Failed to generate TURN credentials:', error);
            return null;
        }
    }

    /**
     * Get ICE server configuration including STUN and TURN
     */
    async getIceServers(): Promise<ICEServer[]> {
        // Google STUN servers (primary - always available)
        const stunServers: ICEServer[] = [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
        ];

        // Try to get TURN credentials
        const turnCreds = await this.generateCredentials();

        if (!turnCreds) {
            // Return STUN only if TURN is not available
            console.warn('Returning STUN servers only (TURN not available)');
            return stunServers;
        }

        // Cloudflare TURN servers (fallback)
        const turnServers: ICEServer[] = [
            {
                urls: [
                    'turn:turn.cloudflare.com:3478?transport=udp',
                    'turn:turn.cloudflare.com:3478?transport=tcp',
                    'turns:turn.cloudflare.com:5349?transport=tcp',
                ],
                username: turnCreds.username,
                credential: turnCreds.credential,
            },
        ];

        // STUN servers first, TURN as fallback
        return [...stunServers, ...turnServers];
    }
}
