/**
 * WebRTCService - Main WebRTC orchestrator
 * Manages peer connections, ICE servers, quality monitoring, and adaptive bitrate
 */

import { SignalingClient } from './SignalingClient';
import { QualityMonitor } from './QualityMonitor';
import type { IceServerConfig, CallQualityMetrics } from './types';
import {
    WEBRTC_CONFIG,
    MEDIA_CONSTRAINTS,
    RELAY_MEDIA_CONSTRAINTS,
} from './types';

interface WebRTCServiceConfig {
    signalingServerUrl: string;
    userId: string;
    sessionId: string;
    remotePeerId: string;
    onRemoteStream?: (stream: MediaStream) => void;
    onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
    onIceConnectionStateChange?: (state: RTCIceConnectionState) => void;
    onQualityMetrics?: (metrics: CallQualityMetrics) => void;
    onError?: (error: Error) => void;
}

export class WebRTCService {
    private peerConnection: RTCPeerConnection | null = null;
    private signalingClient: SignalingClient;
    private qualityMonitor: QualityMonitor;
    private localStream: MediaStream | null = null;
    private remoteStream: MediaStream | null = null;
    private config: WebRTCServiceConfig;
    private iceServers: RTCIceServer[] = [];
    private isUsingRelay = false;
    private iceCandidateQueue: RTCIceCandidateInit[] = [];
    private isRemoteDescriptionSet = false;

    constructor(config: WebRTCServiceConfig) {
        this.config = config;
        this.signalingClient = new SignalingClient(config.signalingServerUrl);
        this.qualityMonitor = new QualityMonitor(
            this.handleQualityUpdate.bind(this),
            5000 // Update every 5 seconds
        );
    }

    /**
     * Initialize WebRTC service
     */
    async initialize(): Promise<void> {
        try {
            console.log('[WebRTCService] Initializing...');

            // 1. Fetch ICE servers from signaling server
            await this.fetchIceServers();

            // 2. Connect to signaling server
            await this.signalingClient.connect(this.config.userId, this.config.sessionId);

            // 3. Setup signaling callbacks
            this.setupSignalingCallbacks();

            // 4. Get local media stream
            await this.getUserMedia();

            console.log('[WebRTCService] Initialized successfully');
        } catch (error) {
            console.error('[WebRTCService] Initialization error:', error);
            this.config.onError?.(error as Error);
            throw error;
        }
    }

    /**
     * Fetch ICE servers from signaling server
     */
    private async fetchIceServers(): Promise<void> {
        try {
            const response = await fetch(`${this.config.signalingServerUrl}/turn/credentials`, {
                method: 'POST',
            });

            if (!response.ok) {
                throw new Error('Failed to fetch ICE servers');
            }

            const data: IceServerConfig = await response.json();
            this.iceServers = data.iceServers;

            console.log('[WebRTCService] ICE servers fetched:', this.iceServers.length);
        } catch (error) {
            console.error('[WebRTCService] Error fetching ICE servers:', error);
            // Fallback to Google STUN only
            this.iceServers = [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
            ];
        }
    }

    /**
     * Setup signaling callbacks
     */
    private setupSignalingCallbacks(): void {
        this.signalingClient.setCallbacks({
            onOffer: this.handleRemoteOffer.bind(this),
            onAnswer: this.handleRemoteAnswer.bind(this),
            onIceCandidate: this.handleRemoteIceCandidate.bind(this),
            onUserJoined: this.handleUserJoined.bind(this),
            onUserLeft: this.handleUserLeft.bind(this),
            onError: this.config.onError,
        });
    }

    /**
     * Get user media (camera and microphone)
     */
    private async getUserMedia(): Promise<void> {
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia(MEDIA_CONSTRAINTS);
            console.log('[WebRTCService] Local stream acquired');
        } catch (error) {
            console.error('[WebRTCService] Error getting local stream:', error);
            throw new Error('Failed to access camera/microphone');
        }
    }

    /**
     * Create peer connection
     */
    private createPeerConnection(): void {
        if (this.peerConnection) {
            console.warn('[WebRTCService] Peer connection already exists');
            return;
        }

        const config: RTCConfiguration = {
            ...WEBRTC_CONFIG,
            iceServers: this.iceServers,
        };

        this.peerConnection = new RTCPeerConnection(config);

        // Add local stream tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach((track) => {
                this.peerConnection!.addTrack(track, this.localStream!);
            });
        }

        // Handle remote stream
        this.peerConnection.ontrack = (event) => {
            console.log('[WebRTCService] Received remote track:', event.track.kind);

            if (!this.remoteStream) {
                this.remoteStream = new MediaStream();
                this.config.onRemoteStream?.(this.remoteStream);
            }

            this.remoteStream.addTrack(event.track);
        };

        // Handle ICE candidates
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('[WebRTCService] New ICE candidate:', event.candidate.type);
                this.signalingClient.sendIceCandidate(
                    event.candidate.toJSON(),
                    this.config.remotePeerId
                );
            }
        };

        // Handle connection state changes
        this.peerConnection.onconnectionstatechange = () => {
            const state = this.peerConnection!.connectionState;
            console.log('[WebRTCService] Connection state:', state);
            this.config.onConnectionStateChange?.(state);

            if (state === 'connected') {
                this.qualityMonitor.start(this.peerConnection!);
                this.checkRelayUsage();
            } else if (state === 'failed') {
                this.handleConnectionFailure();
            } else if (state === 'disconnected') {
                this.qualityMonitor.stop();
            }
        };

        // Handle ICE connection state changes
        this.peerConnection.oniceconnectionstatechange = () => {
            const state = this.peerConnection!.iceConnectionState;
            console.log('[WebRTCService] ICE connection state:', state);
            this.config.onIceConnectionStateChange?.(state);

            if (state === 'failed') {
                this.handleIceFailure();
            }
        };

        // Handle ICE gathering state
        this.peerConnection.onicegatheringstatechange = () => {
            console.log('[WebRTCService] ICE gathering state:', this.peerConnection!.iceGatheringState);
        };

        console.log('[WebRTCService] Peer connection created');
    }

    /**
     * Start call as initiator (create offer)
     */
    async startCall(): Promise<void> {
        try {
            console.log('[WebRTCService] Starting call...');

            this.createPeerConnection();

            const offer = await this.peerConnection!.createOffer();
            await this.peerConnection!.setLocalDescription(offer);

            this.signalingClient.sendOffer(offer, this.config.remotePeerId);

            console.log('[WebRTCService] Offer sent');
        } catch (error) {
            console.error('[WebRTCService] Error starting call:', error);
            this.config.onError?.(error as Error);
            throw error;
        }
    }

    /**
     * Handle remote offer (answer as callee)
     */
    private async handleRemoteOffer(offer: RTCSessionDescriptionInit, from: string): Promise<void> {
        try {
            console.log('[WebRTCService] Handling remote offer from:', from);

            this.createPeerConnection();

            await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(offer));
            this.isRemoteDescriptionSet = true;

            // Process queued ICE candidates
            await this.processIceCandidateQueue();

            const answer = await this.peerConnection!.createAnswer();
            await this.peerConnection!.setLocalDescription(answer);

            this.signalingClient.sendAnswer(answer, from);

            console.log('[WebRTCService] Answer sent');
        } catch (error) {
            console.error('[WebRTCService] Error handling offer:', error);
            this.config.onError?.(error as Error);
        }
    }

    /**
     * Handle remote answer
     */
    private async handleRemoteAnswer(answer: RTCSessionDescriptionInit, from: string): Promise<void> {
        try {
            console.log('[WebRTCService] Handling remote answer from:', from);

            await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(answer));
            this.isRemoteDescriptionSet = true;

            // Process queued ICE candidates
            await this.processIceCandidateQueue();

            console.log('[WebRTCService] Remote description set');
        } catch (error) {
            console.error('[WebRTCService] Error handling answer:', error);
            this.config.onError?.(error as Error);
        }
    }

    /**
     * Handle remote ICE candidate
     */
    private async handleRemoteIceCandidate(candidate: RTCIceCandidateInit, from: string): Promise<void> {
        try {
            console.log('[WebRTCService] Received ICE candidate from:', from);

            if (!this.peerConnection) {
                console.warn('[WebRTCService] No peer connection, ignoring candidate');
                return;
            }

            // Queue candidate if remote description not set yet
            if (!this.isRemoteDescriptionSet) {
                console.log('[WebRTCService] Queueing ICE candidate');
                this.iceCandidateQueue.push(candidate);
                return;
            }

            await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            console.log('[WebRTCService] ICE candidate added');
        } catch (error) {
            console.error('[WebRTCService] Error adding ICE candidate:', error);
        }
    }

    /**
     * Process queued ICE candidates
     */
    private async processIceCandidateQueue(): Promise<void> {
        if (this.iceCandidateQueue.length === 0) return;

        console.log('[WebRTCService] Processing', this.iceCandidateQueue.length, 'queued ICE candidates');

        for (const candidate of this.iceCandidateQueue) {
            try {
                await this.peerConnection!.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (error) {
                console.error('[WebRTCService] Error adding queued candidate:', error);
            }
        }

        this.iceCandidateQueue = [];
    }

    /**
     * Handle user joined session
     */
    private handleUserJoined(userId: string): void {
        console.log('[WebRTCService] User joined:', userId);
        // Could auto-start call here if desired
    }

    /**
     * Handle user left session
     */
    private handleUserLeft(userId: string): void {
        console.log('[WebRTCService] User left:', userId);
        this.endCall();
    }

    /**
     * Check if using TURN relay
     */
    private async checkRelayUsage(): Promise<void> {
        const usingRelay = await this.qualityMonitor.isUsingRelay();

        if (usingRelay && !this.isUsingRelay) {
            console.warn('[WebRTCService] Using TURN relay - adapting quality');
            this.isUsingRelay = true;
            await this.adaptBitrateForRelay();
        }
    }

    /**
     * Adapt bitrate and resolution for relay connection
     */
    private async adaptBitrateForRelay(): Promise<void> {
        if (!this.peerConnection || !this.localStream) return;

        try {
            console.log('[WebRTCService] Adapting bitrate for relay');

            // Get video sender
            const senders = this.peerConnection.getSenders();
            const videoSender = senders.find((s) => s.track?.kind === 'video');

            if (videoSender) {
                const parameters = videoSender.getParameters();

                if (!parameters.encodings) {
                    parameters.encodings = [{}];
                }

                // Reduce bitrate for relay (max 500 kbps)
                parameters.encodings[0].maxBitrate = 500000;

                await videoSender.setParameters(parameters);
                console.log('[WebRTCService] Bitrate adapted for relay');
            }

            // Apply relay constraints to video track
            const videoTrack = this.localStream.getVideoTracks()[0];
            if (videoTrack) {
                await videoTrack.applyConstraints(RELAY_MEDIA_CONSTRAINTS.video as MediaTrackConstraints);
                console.log('[WebRTCService] Video constraints adapted for relay');
            }
        } catch (error) {
            console.error('[WebRTCService] Error adapting bitrate:', error);
        }
    }

    /**
     * Handle connection failure
     */
    private handleConnectionFailure(): void {
        console.error('[WebRTCService] Connection failed');
        this.config.onError?.(new Error('WebRTC connection failed'));
    }

    /**
     * Handle ICE failure (attempt restart)
     */
    private async handleIceFailure(): Promise<void> {
        console.warn('[WebRTCService] ICE connection failed, attempting restart');

        if (!this.peerConnection) return;

        try {
            // Create new offer with ICE restart
            const offer = await this.peerConnection.createOffer({ iceRestart: true });
            await this.peerConnection.setLocalDescription(offer);

            this.signalingClient.sendOffer(offer, this.config.remotePeerId);

            console.log('[WebRTCService] ICE restart initiated');
        } catch (error) {
            console.error('[WebRTCService] ICE restart failed:', error);
            this.config.onError?.(error as Error);
        }
    }

    /**
     * Handle quality metrics update
     */
    private handleQualityUpdate(metrics: CallQualityMetrics): void {
        console.log('[WebRTCService] Quality metrics:', metrics);
        this.config.onQualityMetrics?.(metrics);

        // Could send to Convex here for tracking
    }

    /**
     * Toggle microphone
     */
    toggleMicrophone(): boolean {
        if (!this.localStream) return false;

        const audioTrack = this.localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            console.log('[WebRTCService] Microphone:', audioTrack.enabled ? 'ON' : 'OFF');
            return audioTrack.enabled;
        }

        return false;
    }

    /**
     * Toggle camera
     */
    toggleCamera(): boolean {
        if (!this.localStream) return false;

        const videoTrack = this.localStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            console.log('[WebRTCService] Camera:', videoTrack.enabled ? 'ON' : 'OFF');
            return videoTrack.enabled;
        }

        return false;
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
        console.log('[WebRTCService] Ending call');

        // Stop quality monitoring
        this.qualityMonitor.stop();

        // Close peer connection
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }

        // Stop local stream
        if (this.localStream) {
            this.localStream.getTracks().forEach((track) => track.stop());
            this.localStream = null;
        }

        // Clear remote stream
        this.remoteStream = null;

        // Disconnect signaling
        this.signalingClient.disconnect();

        // Reset state
        this.isRemoteDescriptionSet = false;
        this.iceCandidateQueue = [];
        this.isUsingRelay = false;

        console.log('[WebRTCService] Call ended, resources cleaned up');
    }
}
