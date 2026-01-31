/**
 * PeerJSService - PeerJS-based P2P Video Calling
 * 
 * This service provides a simplified WebRTC implementation using PeerJS
 * with Coturn server integration for reliable P2P connections.
 */

import Peer from 'peerjs';
import type { MediaConnection } from 'peerjs';
import type { CallQualityMetrics } from './types';

// @ts-ignore - turnConfig.js is a plain JS file with placeholders
import { turnConfig } from './turnConfig.js';

interface PeerJSServiceConfig {
    userId: string;
    sessionId: string;
    onRemoteStream?: (stream: MediaStream) => void;
    onConnectionStateChange?: (state: 'new' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'closed') => void;
    onError?: (error: Error) => void;
    onQualityMetrics?: (metrics: CallQualityMetrics) => void;
}

export class PeerJSService {
    private peer: Peer | null = null;
    private currentCall: MediaConnection | null = null;
    private localStream: MediaStream | null = null;
    private remoteStream: MediaStream | null = null;
    private config: PeerJSServiceConfig;
    private isInitialized = false;
    private qualityCheckInterval: NodeJS.Timeout | null = null;

    constructor(config: PeerJSServiceConfig) {
        this.config = config;
    }

    /**
     * Initialize PeerJS with Coturn ICE servers
     */
    async initialize(): Promise<void> {
        try {
            console.log('[PeerJSService] Initializing...');

            // Create Peer instance with custom configuration
            this.peer = new Peer(this.config.userId, {
                config: {
                    iceServers: turnConfig.iceServers,
                    iceTransportPolicy: 'all', // Try all connection types
                },
                debug: 2, // Log level: 0=none, 1=errors, 2=warnings, 3=all
            });

            // Setup event listeners
            this.setupPeerEventListeners();

            // Wait for peer to be ready
            await new Promise<void>((resolve, reject) => {
                this.peer!.on('open', (id: string) => {
                    console.log('[PeerJSService] Peer ID:', id);
                    this.isInitialized = true;
                    resolve();
                });

                this.peer!.on('error', (error: Error) => {
                    console.error('[PeerJSService] Peer error:', error);
                    reject(error);
                });
            });

            console.log('[PeerJSService] Initialized successfully');
        } catch (error) {
            console.error('[PeerJSService] Initialization error:', error);
            this.config.onError?.(error as Error);
            throw error;
        }
    }

    /**
     * Setup PeerJS event listeners
     */
    private setupPeerEventListeners(): void {
        if (!this.peer) return;

        // Handle incoming calls
        this.peer.on('call', (call: MediaConnection) => {
            console.log('[PeerJSService] Incoming call from:', call.peer);
            this.handleIncomingCall(call);
        });

        // Handle connection events
        this.peer.on('disconnected', () => {
            console.warn('[PeerJSService] Peer disconnected');
            this.config.onConnectionStateChange?.('disconnected');
        });

        this.peer.on('close', () => {
            console.log('[PeerJSService] Peer closed');
            this.config.onConnectionStateChange?.('closed');
        });

        this.peer.on('error', (error: Error) => {
            console.error('[PeerJSService] Peer error:', error);
            this.config.onError?.(error as Error);
            this.config.onConnectionStateChange?.('failed');
        });
    }

    /**
     * Get user media (camera and microphone)
     */
    async getUserMedia(): Promise<void> {
        try {
            console.log('[PeerJSService] Requesting user media...');

            this.localStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 30 },
                },
            });

            console.log('[PeerJSService] Local stream acquired');
        } catch (error) {
            console.error('[PeerJSService] Error getting user media:', error);
            this.config.onError?.(error as Error);
            throw error;
        }
    }

    /**
     * Start a call to a remote peer (initiator)
     */
    async startCall(remotePeerId: string): Promise<void> {
        try {
            if (!this.peer || !this.isInitialized) {
                throw new Error('Peer not initialized');
            }

            if (!this.localStream) {
                await this.getUserMedia();
            }

            console.log('[PeerJSService] Starting call to:', remotePeerId);
            this.config.onConnectionStateChange?.('connecting');

            // Initiate call with local stream
            this.currentCall = this.peer.call(remotePeerId, this.localStream!);

            // Setup call event listeners
            this.setupCallEventListeners(this.currentCall);

            console.log('[PeerJSService] Call initiated');
        } catch (error) {
            console.error('[PeerJSService] Error starting call:', error);
            this.config.onError?.(error as Error);
            throw error;
        }
    }

    /**
     * Handle incoming call (receiver)
     */
    private async handleIncomingCall(call: MediaConnection): Promise<void> {
        try {
            if (!this.localStream) {
                await this.getUserMedia();
            }

            console.log('[PeerJSService] Answering call from:', call.peer);
            this.config.onConnectionStateChange?.('connecting');

            // Answer the call with local stream
            call.answer(this.localStream!);

            // Save the call reference
            this.currentCall = call;

            // Setup call event listeners
            this.setupCallEventListeners(call);

            console.log('[PeerJSService] Call answered');
        } catch (error) {
            console.error('[PeerJSService] Error handling incoming call:', error);
            this.config.onError?.(error as Error);
        }
    }

    /**
     * Setup call event listeners
     */
    private setupCallEventListeners(call: MediaConnection): void {
        // Receive remote stream
        call.on('stream', (remoteStream: MediaStream) => {
            console.log('[PeerJSService] Received remote stream');
            this.remoteStream = remoteStream;
            this.config.onRemoteStream?.(remoteStream);
            this.config.onConnectionStateChange?.('connected');

            // Start quality monitoring
            this.startQualityMonitoring();
        });

        // Handle call close
        call.on('close', () => {
            console.log('[PeerJSService] Call closed');
            this.stopQualityMonitoring();
            this.config.onConnectionStateChange?.('closed');
        });

        // Handle call errors
        call.on('error', (error: Error) => {
            console.error('[PeerJSService] Call error:', error);
            this.config.onError?.(error as Error);
            this.config.onConnectionStateChange?.('failed');
        });
    }

    /**
     * Start monitoring connection quality
     */
    private startQualityMonitoring(): void {
        if (this.qualityCheckInterval) {
            clearInterval(this.qualityCheckInterval);
        }

        this.qualityCheckInterval = setInterval(async () => {
            if (!this.currentCall || !this.currentCall.peerConnection) {
                return;
            }

            try {
                const stats = await this.currentCall.peerConnection.getStats();
                const metrics = this.parseStats(stats);

                if (metrics) {
                    this.config.onQualityMetrics?.(metrics);
                }
            } catch (error) {
                console.error('[PeerJSService] Error getting stats:', error);
            }
        }, 1000); // Check every second
    }

    /**
     * Parse WebRTC stats into quality metrics
     */
    private parseStats(stats: RTCStatsReport): CallQualityMetrics | null {
        let bitrate = 0;
        let packetLoss = 0;
        let latency = 0;
        let resolution = 'unknown';

        stats.forEach((report) => {
            // Parse inbound RTP stats for video
            if (report.type === 'inbound-rtp' && report.kind === 'video') {
                if (report.bytesReceived && report.timestamp) {
                    // Calculate bitrate (kbps)
                    bitrate = Math.round((report.bytesReceived * 8) / 1000);
                }

                if (report.packetsLost !== undefined && report.packetsReceived !== undefined) {
                    const totalPackets = report.packetsLost + report.packetsReceived;
                    if (totalPackets > 0) {
                        packetLoss = Math.round((report.packetsLost / totalPackets) * 100);
                    }
                }

                if (report.frameWidth && report.frameHeight) {
                    resolution = `${report.frameWidth}x${report.frameHeight}`;
                }
            }

            // Parse candidate pair stats for latency
            if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                if (report.currentRoundTripTime !== undefined) {
                    latency = Math.round(report.currentRoundTripTime * 1000); // Convert to ms
                }
            }
        });

        return {
            bitrate,
            packetLoss,
            latency,
            resolution,
            lastUpdated: Date.now(),
        };
    }

    /**
     * Stop quality monitoring
     */
    private stopQualityMonitoring(): void {
        if (this.qualityCheckInterval) {
            clearInterval(this.qualityCheckInterval);
            this.qualityCheckInterval = null;
        }
    }

    /**
     * Toggle microphone on/off
     */
    toggleMicrophone(): boolean {
        if (!this.localStream) return false;

        const audioTracks = this.localStream.getAudioTracks();
        if (audioTracks.length === 0) return false;

        const track = audioTracks[0];
        track.enabled = !track.enabled;

        console.log('[PeerJSService] Microphone:', track.enabled ? 'enabled' : 'disabled');
        return track.enabled;
    }

    /**
     * Toggle camera on/off
     */
    toggleCamera(): boolean {
        if (!this.localStream) return false;

        const videoTracks = this.localStream.getVideoTracks();
        if (videoTracks.length === 0) return false;

        const track = videoTracks[0];
        track.enabled = !track.enabled;

        console.log('[PeerJSService] Camera:', track.enabled ? 'enabled' : 'disabled');
        return track.enabled;
    }

    /**
     * Get local stream
     */
    getLocalStream(): MediaStream | null {
        return this.localStream;
    }

    /**
     * Get remote stream
     */
    getRemoteStream(): MediaStream | null {
        return this.remoteStream;
    }

    /**
     * End call and cleanup
     */
    endCall(): void {
        console.log('[PeerJSService] Ending call...');

        // Stop quality monitoring
        this.stopQualityMonitoring();

        // Close the current call
        if (this.currentCall) {
            this.currentCall.close();
            this.currentCall = null;
        }

        // Stop local stream tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach((track) => track.stop());
            this.localStream = null;
        }

        // Clear remote stream
        this.remoteStream = null;

        console.log('[PeerJSService] Call ended');
    }

    /**
     * Destroy the peer connection
     */
    destroy(): void {
        console.log('[PeerJSService] Destroying peer...');

        this.endCall();

        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }

        this.isInitialized = false;

        console.log('[PeerJSService] Peer destroyed');
    }
}
