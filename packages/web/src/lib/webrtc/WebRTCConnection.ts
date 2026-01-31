/**
 * WebRTCConnection - Pure WebRTC wrapper
 * No external dependencies, just native WebRTC API
 */

import { io, Socket } from 'socket.io-client';

export interface WebRTCConfig {
    signalingUrl: string;
    userId: string;
    sessionId: string;
    isInitiator: boolean;
}

export interface WebRTCStats {
    bitrate: number;
    packetLoss: number;
    latency: number;
    resolution?: string;
}

export type ConnectionPhase = 'idle' | 'gathering-media' | 'ready' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export interface WebRTCCallbacks {
    onLocalStream: (stream: MediaStream) => void;
    onRemoteStream: (stream: MediaStream) => void;
    onConnectionState: (state: RTCPeerConnectionState) => void;
    onConnectionPhase?: (phase: ConnectionPhase) => void;
    onError: (error: Error) => void;
    onStats?: (stats: WebRTCStats) => void;
}

const getIceServers = (): RTCIceServer[] => {
    const forceTurn = import.meta.env.VITE_FORCE_TURN === 'true';

    const servers: RTCIceServer[] = [];

    // ❌ If forceTurn = true, DO NOT add STUN
    if (!forceTurn) {
        const stunUrls =
            import.meta.env.VITE_ICE_SERVER_URLS?.split(',') ||
            ['stun:stun.l.google.com:19302'];

        stunUrls.forEach((url: string) => {
            servers.push({ urls: url });
        });
    }

    const turnUrl = import.meta.env.VITE_TURN_SERVER_URL;
    const turnUser = import.meta.env.VITE_TURN_USERNAME;
    const turnPass = import.meta.env.VITE_TURN_PASSWORD;

    if (turnUrl && turnUser && turnPass) {
        servers.push({
            urls: turnUrl.includes(',') ? turnUrl.split(',') : turnUrl,
            username: turnUser,
            credential: turnPass,
        });
        console.log('[WebRTC] TURN server configured');
    } else {
        console.warn('[WebRTC] TURN NOT configured');
    }

    return servers;
};

export class WebRTCConnection {
    private pc: RTCPeerConnection | null = null;
    private socket: Socket | null = null;
    private localStream: MediaStream | null = null;
    private config: WebRTCConfig;
    private callbacks: WebRTCCallbacks;
    private pendingCandidates: RTCIceCandidateInit[] = [];
    private reconnectTimeout: any = null;
    private reconnectAttempts = 0;
    private statsInterval: any = null;
    private connectionPhase: ConnectionPhase = 'idle';
    private candidateFlushTimeout: any = null;

    constructor(config: WebRTCConfig, callbacks: WebRTCCallbacks) {
        this.config = config;
        this.callbacks = callbacks;
    }

    async start(): Promise<void> {
        try {
            // 1. Get media
            this.setPhase('gathering-media');
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720, facingMode: 'user' },
                audio: { echoCancellation: true, noiseSuppression: true }
            });
            this.callbacks.onLocalStream(this.localStream);

            // 2. Connect signaling
            await this.connectSignaling();

            // 3. Create peer connection
            this.createPeerConnection();

            // 4. Add tracks
            this.localStream.getTracks().forEach(track => {
                this.pc!.addTrack(track, this.localStream!);
            });

            // 5. Mark as ready (NOW safe to create offers)
            this.setPhase('ready');
            console.log('[WebRTC] Ready for peer connection');

            // 6. Start stats reporting
            this.startStatsReporting();

            // 7. If we're initiator and peer already joined, create offer now
            if (this.config.isInitiator) {
                // Peer may have joined before we were ready
                this.tryCreateOffer();
            }

        } catch (err) {
            this.setPhase('disconnected');
            this.callbacks.onError(err instanceof Error ? err : new Error(String(err)));
        }
    }

    private startStatsReporting() {
        if (this.statsInterval) clearInterval(this.statsInterval);

        this.statsInterval = setInterval(async () => {
            if (!this.pc || this.pc.connectionState !== 'connected') return;

            try {
                const stats = await this.pc.getStats();
                let bitrate = 0;
                let packetLoss = 0;
                let latency = 0;
                let resolution = '';

                stats.forEach(report => {
                    if (report.type === 'inbound-rtp' && report.kind === 'video') {
                        // Calculate bitrate (very roughly here, normally needs previous value)
                        bitrate = Math.round((report.bytesReceived * 8) / 1000);
                        packetLoss = report.packetsLost || 0;
                        if (report.framesWidth) {
                            resolution = `${report.framesWidth}x${report.framesHeight}`;
                        }
                    }
                    if (report.type === 'remote-candidate' && report.candidateType === 'relay') {
                        // Latency detection usually via Round Trip Time on local-candidate
                    }
                });

                if (this.callbacks.onStats) {
                    this.callbacks.onStats({ bitrate, packetLoss, latency, resolution });
                }
            } catch (err) {
                console.warn('[WebRTC] Failed to fetch stats:', err);
            }
        }, 10000); // Every 10 seconds
    }

    private connectSignaling(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.socket = io(this.config.signalingUrl, {
                auth: { userId: this.config.userId, sessionId: this.config.sessionId },
                transports: ['websocket'],
                timeout: 100 * 10,
                reconnection: true,
                reconnectionAttempts: 10,
            });

            this.socket.on('connect', () => {
                console.log('[WebRTC] Signaling connected');
                resolve();
            });

            this.socket.on('connect_error', () => {
                reject(new Error('Failed to connect to signaling server'));
            });

            // When peer joins, initiator creates offer (ONLY if ready)
            this.socket.on('peer:joined', async () => {
                console.log('[WebRTC] Peer joined');
                if (this.config.isInitiator) {
                    // FIX RANK #1: Only create offer if we're ready (tracks added)
                    this.tryCreateOffer();
                }
            });

            this.socket.on('signal', async (data: { type: string; sdp?: string; candidate?: RTCIceCandidateInit; from: string }) => {
                try {
                    if (data.type === 'offer' && !this.config.isInitiator) {
                        await this.handleOffer(data.sdp!);
                    } else if (data.type === 'answer' && this.config.isInitiator) {
                        await this.handleAnswer(data.sdp!);
                    } else if (data.type === 'candidate') {
                        await this.handleCandidate(data.candidate!);
                    }
                } catch (err) {
                    console.error('[WebRTC] Signal handling error:', err);
                }
            });

            this.socket.on('peer:left', () => {
                console.log('[WebRTC] Peer left', { currentPhase: this.connectionPhase });
                // Ignore peer:left if we haven't even started connecting yet
                if (this.connectionPhase === 'idle' || this.connectionPhase === 'gathering-media' || this.connectionPhase === 'ready') {
                    console.log('[WebRTC] Ignoring peer:left, connection not established yet');
                    return;
                }
                // FIX RANK #4: Clean up connection before error
                this.stop();
                this.callbacks.onError(new Error('Remote peer disconnected'));
            });
        });
    }

    private createPeerConnection(): void {
        // FIX RANK #6: Add missing RTCPeerConnection config
        this.pc = new RTCPeerConnection({
            iceServers: getIceServers(),
            iceTransportPolicy: import.meta.env.VITE_FORCE_TURN === 'true' ? 'relay' : 'all',
            iceCandidatePoolSize: 10,
            bundlePolicy: 'max-bundle',
            rtcpMuxPolicy: 'require'
        });

        this.pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.socket?.emit('signal', { type: 'candidate', candidate: event.candidate.toJSON() });
            }
        };

        this.pc.ontrack = (event) => {
            console.log('[WebRTC] ontrack event', { streams: event.streams?.length, kind: event.track.kind });
            if (event.streams?.[0]) {
                console.log('[WebRTC] Calling onRemoteStream callback');
                this.callbacks.onRemoteStream(event.streams[0]);
            }
        };

        this.pc.onconnectionstatechange = () => {
            const state = this.pc?.connectionState;
            if (state) this.callbacks.onConnectionState(state);

            if (state === 'failed') {
                this.setPhase('reconnecting');
                this.handleIceFailure();
            } else if (state === 'connected') {
                this.setPhase('connected');
                this.reconnectAttempts = 0;
            } else if (state === 'connecting') {
                this.setPhase('connecting');
            } else if (state === 'disconnected') {
                this.setPhase('disconnected');
            }
        };

        this.pc.oniceconnectionstatechange = () => {
            const state = this.pc?.iceConnectionState;
            if (state === 'failed') {
                this.handleIceFailure();
            }
        };
    }

    private handleIceFailure(): void {
        // FIX RANK #5: Increase max retries for mobile networks
        const maxRetries = 8;
        if (this.reconnectTimeout || this.reconnectAttempts > maxRetries) {
            this.setPhase('disconnected');
            return;
        }

        this.reconnectAttempts++;
        const backoff = Math.pow(2, this.reconnectAttempts) * 1000;

        console.log(`[WebRTC] ICE Failure (Attempt ${this.reconnectAttempts}), restarting in ${backoff}ms...`);

        this.reconnectTimeout = setTimeout(async () => {
            this.reconnectTimeout = null;
            if (this.pc && (this.pc.iceConnectionState === 'failed' || this.pc.connectionState === 'failed')) {
                try {
                    console.log('[WebRTC] Restarting ICE...');
                    this.setPhase('reconnecting');
                    const offer = await this.pc.createOffer({ iceRestart: true });
                    await this.pc.setLocalDescription(offer);
                    this.socket?.emit('signal', { type: 'offer', sdp: offer.sdp });
                } catch (err) {
                    console.error('[WebRTC] Ice restart failed:', err);
                    if (this.reconnectAttempts >= 8) {
                        this.setPhase('disconnected');
                        this.callbacks.onError(new Error('Persistent connection failure. Please check your network.'));
                    }
                }
            }
        }, backoff);
    }

    private async handleOffer(sdp: string): Promise<void> {
        console.log('[WebRTC] Received offer, creating answer...');

        if (!this.pc) {
            console.error('[WebRTC] No peer connection!');
            return;
        }

        try {
            // FIX RANK #3: Add error handling for setRemoteDescription
            await this.pc.setRemoteDescription({ type: 'offer', sdp });
            console.log('[WebRTC] Set remote description (offer)');

            // Process pending candidates
            await this.processPendingCandidates();

            const answer = await this.pc.createAnswer();
            await this.pc.setLocalDescription(answer);
            console.log('[WebRTC] Created and set answer, sending...');

            this.socket!.emit('signal', { type: 'answer', sdp: answer.sdp });
            console.log('[WebRTC] Answer sent');
        } catch (err) {
            console.error('[WebRTC] handleOffer error:', err);
            this.callbacks.onError(err instanceof Error ? err : new Error('Failed to process offer'));
        }
    }

    private async handleAnswer(sdp: string): Promise<void> {
        try {
            // FIX RANK #3: Add error handling for setRemoteDescription
            await this.pc!.setRemoteDescription({ type: 'answer', sdp });
            console.log('[WebRTC] Set remote description (answer)');

            // Process pending candidates
            await this.processPendingCandidates();
        } catch (err) {
            console.error('[WebRTC] handleAnswer error:', err);
            this.callbacks.onError(err instanceof Error ? err : new Error('Failed to process answer'));
        }
    }

    private async handleCandidate(candidate: RTCIceCandidateInit): Promise<void> {
        if (this.pc?.remoteDescription) {
            try {
                await this.pc.addIceCandidate(candidate);
                console.log('[WebRTC] Added ICE candidate');
            } catch (err) {
                console.error('[WebRTC] Failed to add ICE candidate:', err);
            }
        } else {
            console.log('[WebRTC] Queueing ICE candidate (no remote description yet)');
            this.pendingCandidates.push(candidate);

            // FIX RANK #3: Set timeout to flush candidates if remote description never arrives
            if (this.candidateFlushTimeout) clearTimeout(this.candidateFlushTimeout);
            this.candidateFlushTimeout = setTimeout(() => {
                if (this.pendingCandidates.length > 0 && !this.pc?.remoteDescription) {
                    console.warn(`[WebRTC] ${this.pendingCandidates.length} candidates queued but no remote description after 10s`);
                }
            }, 10000);
        }
    }

    toggleMute(): boolean {
        const track = this.localStream?.getAudioTracks()[0];
        if (track) {
            track.enabled = !track.enabled;
            return track.enabled;
        }
        return false;
    }

    toggleCamera(): boolean {
        const track = this.localStream?.getVideoTracks()[0];
        if (track) {
            track.enabled = !track.enabled;
            return track.enabled;
        }
        return false;
    }

    stop(): void {
        console.log('[WebRTC] Stopping connection');

        // Clear all timers
        if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
        if (this.statsInterval) clearInterval(this.statsInterval);
        if (this.candidateFlushTimeout) clearTimeout(this.candidateFlushTimeout);

        // Stop media
        this.localStream?.getTracks().forEach(t => t.stop());

        // Close peer connection
        this.pc?.close();

        // Disconnect socket
        this.socket?.disconnect();

        // Clear state
        this.pc = null;
        this.socket = null;
        this.localStream = null;
        this.pendingCandidates = [];
        this.reconnectAttempts = 0;
        this.setPhase('disconnected');
    }

    /**
     * Helper: Try to create offer (only if ready)
     */
    private async tryCreateOffer(): Promise<void> {
        if (this.connectionPhase !== 'ready' || !this.pc) {
            console.log('[WebRTC] Not ready to create offer yet (phase:', this.connectionPhase, ')');
            return;
        }

        try {
            console.log('[WebRTC] Creating offer...');
            this.setPhase('connecting');
            const offer = await this.pc.createOffer();
            await this.pc.setLocalDescription(offer);
            this.socket!.emit('signal', { type: 'offer', sdp: offer.sdp });
            console.log('[WebRTC] Offer sent');
        } catch (err) {
            console.error('[WebRTC] Failed to create offer:', err);
            this.callbacks.onError(err instanceof Error ? err : new Error('Failed to create offer'));
        }
    }

    /**
     * Helper: Process pending ICE candidates
     */
    private async processPendingCandidates(): Promise<void> {
        if (this.pendingCandidates.length === 0) return;

        console.log(`[WebRTC] Processing ${this.pendingCandidates.length} pending candidates`);

        for (const candidate of this.pendingCandidates) {
            try {
                await this.pc!.addIceCandidate(candidate);
            } catch (err) {
                console.error('[WebRTC] Failed to add queued candidate:', err);
            }
        }

        this.pendingCandidates = [];
        if (this.candidateFlushTimeout) clearTimeout(this.candidateFlushTimeout);
    }

    /**
     * Helper: Update connection phase and notify
     */
    private setPhase(phase: ConnectionPhase): void {
        if (this.connectionPhase !== phase) {
            console.log(`[WebRTC] Phase: ${this.connectionPhase} -> ${phase}`);
            this.connectionPhase = phase;
            this.callbacks.onConnectionPhase?.(phase);
        }
    }
}
