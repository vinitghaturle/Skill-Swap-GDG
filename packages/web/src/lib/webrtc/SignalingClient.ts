/**
 * SignalingClient - Socket.IO client for WebRTC signaling
 * Handles connection to signaling server and message relay
 */

import { io, Socket } from 'socket.io-client';

interface SignalingMessage {
    type: 'offer' | 'answer' | 'ice-candidate' | 'connection-state';
    sessionId: string;
    from: string;
    to: string;
    payload: any;
}

interface SignalingCallbacks {
    onOffer?: (offer: RTCSessionDescriptionInit, from: string) => void;
    onAnswer?: (answer: RTCSessionDescriptionInit, from: string) => void;
    onIceCandidate?: (candidate: RTCIceCandidateInit, from: string) => void;
    onUserJoined?: (userId: string) => void;
    onUserLeft?: (userId: string) => void;
    onConnectionStateChange?: (state: string, from: string) => void;
    onError?: (error: Error) => void;
}

export class SignalingClient {
    private socket: Socket | null = null;
    private callbacks: SignalingCallbacks = {};
    private currentSessionId: string | null = null;
    private currentUserId: string | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;

    private signalingServerUrl: string;

    constructor(signalingServerUrl: string) {
        this.signalingServerUrl = signalingServerUrl;
    }

    /**
     * Connect to signaling server
     */
    async connect(userId: string, sessionId: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.currentUserId = userId;
            this.currentSessionId = sessionId;

            this.socket = io(this.signalingServerUrl, {
                auth: {
                    userId,
                    sessionId,
                },
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                reconnectionAttempts: this.maxReconnectAttempts,
            });

            this.setupEventHandlers();

            this.socket.on('connect', () => {
                console.log('[SignalingClient] Connected to signaling server');
                this.reconnectAttempts = 0;

                // Join session room
                this.socket?.emit('join-session', { sessionId });
                resolve();
            });

            this.socket.on('connect_error', (error) => {
                console.error('[SignalingClient] Connection error:', error);
                this.reconnectAttempts++;

                if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                    reject(new Error('Failed to connect to signaling server'));
                }
            });
        });
    }

    /**
     * Setup Socket.IO event handlers
     */
    private setupEventHandlers(): void {
        if (!this.socket) return;

        // User joined session
        this.socket.on('user-joined', (data: { userId: string }) => {
            console.log('[SignalingClient] User joined:', data.userId);
            this.callbacks.onUserJoined?.(data.userId);
        });

        // User left session
        this.socket.on('user-left', (data: { userId: string }) => {
            console.log('[SignalingClient] User left:', data.userId);
            this.callbacks.onUserLeft?.(data.userId);
        });

        // Received offer
        this.socket.on('offer', (data: SignalingMessage) => {
            console.log('[SignalingClient] Received offer from:', data.from);
            this.callbacks.onOffer?.(data.payload, data.from);
        });

        // Received answer
        this.socket.on('answer', (data: SignalingMessage) => {
            console.log('[SignalingClient] Received answer from:', data.from);
            this.callbacks.onAnswer?.(data.payload, data.from);
        });

        // Received ICE candidate
        this.socket.on('ice-candidate', (data: SignalingMessage) => {
            console.log('[SignalingClient] Received ICE candidate from:', data.from);
            this.callbacks.onIceCandidate?.(data.payload, data.from);
        });

        // Connection state change
        this.socket.on('connection-state', (data: SignalingMessage) => {
            console.log('[SignalingClient] Connection state from:', data.from, data.payload.state);
            this.callbacks.onConnectionStateChange?.(data.payload.state, data.from);
        });

        // Disconnect
        this.socket.on('disconnect', (reason) => {
            console.warn('[SignalingClient] Disconnected:', reason);

            if (reason === 'io server disconnect') {
                // Server disconnected, try to reconnect
                this.socket?.connect();
            }
        });

        // Error
        this.socket.on('error', (error: any) => {
            console.error('[SignalingClient] Socket error:', error);
            this.callbacks.onError?.(new Error(error.message || 'Socket error'));
        });
    }

    /**
     * Send offer to peer
     */
    sendOffer(offer: RTCSessionDescriptionInit, to: string): void {
        if (!this.socket || !this.currentSessionId || !this.currentUserId) {
            console.error('[SignalingClient] Cannot send offer: not connected');
            return;
        }

        const message: SignalingMessage = {
            type: 'offer',
            sessionId: this.currentSessionId,
            from: this.currentUserId,
            to,
            payload: offer,
        };

        console.log('[SignalingClient] Sending offer to:', to);
        this.socket.emit('offer', message);
    }

    /**
     * Send answer to peer
     */
    sendAnswer(answer: RTCSessionDescriptionInit, to: string): void {
        if (!this.socket || !this.currentSessionId || !this.currentUserId) {
            console.error('[SignalingClient] Cannot send answer: not connected');
            return;
        }

        const message: SignalingMessage = {
            type: 'answer',
            sessionId: this.currentSessionId,
            from: this.currentUserId,
            to,
            payload: answer,
        };

        console.log('[SignalingClient] Sending answer to:', to);
        this.socket.emit('answer', message);
    }

    /**
     * Send ICE candidate to peer
     */
    sendIceCandidate(candidate: RTCIceCandidateInit, to: string): void {
        if (!this.socket || !this.currentSessionId || !this.currentUserId) {
            console.error('[SignalingClient] Cannot send ICE candidate: not connected');
            return;
        }

        const message: SignalingMessage = {
            type: 'ice-candidate',
            sessionId: this.currentSessionId,
            from: this.currentUserId,
            to,
            payload: candidate,
        };

        console.log('[SignalingClient] Sending ICE candidate to:', to);
        this.socket.emit('ice-candidate', message);
    }

    /**
     * Send connection state update
     */
    sendConnectionState(state: string, to: string): void {
        if (!this.socket || !this.currentSessionId || !this.currentUserId) {
            console.error('[SignalingClient] Cannot send connection state: not connected');
            return;
        }

        const message: SignalingMessage = {
            type: 'connection-state',
            sessionId: this.currentSessionId,
            from: this.currentUserId,
            to,
            payload: { state },
        };

        this.socket.emit('connection-state', message);
    }

    /**
     * Set event callbacks
     */
    setCallbacks(callbacks: SignalingCallbacks): void {
        this.callbacks = callbacks;
    }

    /**
     * Disconnect from signaling server
     */
    disconnect(): void {
        if (this.socket) {
            console.log('[SignalingClient] Disconnecting from signaling server');
            this.socket.disconnect();
            this.socket = null;
        }

        this.currentSessionId = null;
        this.currentUserId = null;
        this.callbacks = {};
    }

    /**
     * Check if connected
     */
    isConnected(): boolean {
        return this.socket?.connected ?? false;
    }
}
