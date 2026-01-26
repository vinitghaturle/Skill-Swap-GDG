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

export interface WebRTCCallbacks {
    onLocalStream: (stream: MediaStream) => void;
    onRemoteStream: (stream: MediaStream) => void;
    onConnectionState: (state: RTCPeerConnectionState) => void;
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

    constructor(config: WebRTCConfig, callbacks: WebRTCCallbacks) {
        this.config = config;
        this.callbacks = callbacks;
    }

    async start(): Promise<void> {
        try {
            // 1. Get media
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

            // 5. Start stats reporting
            this.startStatsReporting();

        } catch (err) {
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

            // When peer joins, initiator creates offer
            this.socket.on('peer:joined', async () => {
                console.log('[WebRTC] Peer joined, creating offer...');
                if (this.config.isInitiator && this.pc) {
                    try {
                        const offer = await this.pc.createOffer();
                        await this.pc.setLocalDescription(offer);
                        this.socket!.emit('signal', { type: 'offer', sdp: offer.sdp });
                    } catch (err) {
                        console.error('[WebRTC] Failed to create offer:', err);
                    }
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
                this.callbacks.onError(new Error('Remote peer disconnected'));
            });
        });
    }

    private createPeerConnection(): void {
        this.pc = new RTCPeerConnection({ iceServers: getIceServers(), 
            iceTransportPolicy: import.meta.env.VITE_FORCE_TURN === 'true' ? 'relay' : 'all' });

        this.pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.socket?.emit('signal', { type: 'candidate', candidate: event.candidate.toJSON() });
            }
        };

        this.pc.ontrack = (event) => {
            this.callbacks.onRemoteStream(event.streams[0]);
        };

        this.pc.onconnectionstatechange = () => {
            const state = this.pc?.connectionState;
            if (state) this.callbacks.onConnectionState(state);

            if (state === 'failed') {
                this.handleIceFailure();
            } else if (state === 'connected') {
                this.reconnectAttempts = 0;
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
        if (this.reconnectTimeout || this.reconnectAttempts > 5) return;

        this.reconnectAttempts++;
        const backoff = Math.pow(2, this.reconnectAttempts) * 1000;

        console.log(`[WebRTC] ICE Failure (Attempt ${this.reconnectAttempts}), restarting in ${backoff}ms...`);

        this.reconnectTimeout = setTimeout(async () => {
            this.reconnectTimeout = null;
            if (this.pc && (this.pc.iceConnectionState === 'failed' || this.pc.connectionState === 'failed')) {
                try {
                    console.log('[WebRTC] Restarting ICE...');
                    const offer = await this.pc.createOffer({ iceRestart: true });
                    await this.pc.setLocalDescription(offer);
                    this.socket?.emit('signal', { type: 'offer', sdp: offer.sdp });
                } catch (err) {
                    console.error('[WebRTC] Ice restart failed:', err);
                    if (this.reconnectAttempts >= 5) {
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
            await this.pc.setRemoteDescription({ type: 'offer', sdp });
            console.log('[WebRTC] Set remote description (offer)');

            // Process pending candidates
            for (const candidate of this.pendingCandidates) {
                await this.pc.addIceCandidate(candidate);
            }
            this.pendingCandidates = [];

            const answer = await this.pc.createAnswer();
            await this.pc.setLocalDescription(answer);
            console.log('[WebRTC] Created and set answer, sending...');

            this.socket!.emit('signal', { type: 'answer', sdp: answer.sdp });
            console.log('[WebRTC] Answer sent');
        } catch (err) {
            console.error('[WebRTC] handleOffer error:', err);
        }
    }

    private async handleAnswer(sdp: string): Promise<void> {
        await this.pc!.setRemoteDescription({ type: 'answer', sdp });

        // Process pending candidates
        for (const candidate of this.pendingCandidates) {
            await this.pc!.addIceCandidate(candidate);
        }
        this.pendingCandidates = [];
    }

    private async handleCandidate(candidate: RTCIceCandidateInit): Promise<void> {
        if (this.pc?.remoteDescription) {
            await this.pc.addIceCandidate(candidate);
        } else {
            this.pendingCandidates.push(candidate);
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
        this.localStream?.getTracks().forEach(t => t.stop());
        this.pc?.close();
        this.socket?.disconnect();
        this.pc = null;
        this.socket = null;
        this.localStream = null;
    }
}
