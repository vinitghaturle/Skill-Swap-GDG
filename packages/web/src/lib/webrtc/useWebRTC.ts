import { useState, useRef, useCallback, useEffect } from 'react';
import { WebRTCConnection, type WebRTCStats, type ConnectionPhase } from './WebRTCConnection';

interface UseWebRTCOptions {
    signalingUrl: string;
    userId: string;
    sessionId: string;
    isInitiator: boolean;
}

interface UseWebRTCReturn {
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    connectionState: RTCPeerConnectionState;
    connectionPhase: ConnectionPhase;
    stats: WebRTCStats | null;
    error: string | null;
    isConnecting: boolean;
    startCall: () => Promise<void>;
    endCall: () => void;
    toggleMute: () => boolean;
    toggleCamera: () => boolean;
}

export function useWebRTC(options: UseWebRTCOptions): UseWebRTCReturn {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
    const [connectionPhase, setConnectionPhase] = useState<ConnectionPhase>('idle');
    const [stats, setStats] = useState<WebRTCStats | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);

    const connectionRef = useRef<WebRTCConnection | null>(null);

    const startCall = useCallback(async () => {
        if (connectionRef.current) {
            console.warn('[useWebRTC] Connection already exists, ignoring duplicate startCall()');
            return;
        }

        setIsConnecting(true);
        setError(null);

        const connection = new WebRTCConnection(
            {
                signalingUrl: options.signalingUrl,
                userId: options.userId,
                sessionId: options.sessionId,
                isInitiator: options.isInitiator,
            },
            {
                onLocalStream: (stream) => setLocalStream(stream),
                onRemoteStream: (stream) => {
                    setRemoteStream(stream);
                    setIsConnecting(false);
                },
                onConnectionState: (state) => {
                    setConnectionState(state);
                    if (state === 'connected') setIsConnecting(false);
                    if (state === 'failed') setStats(null);
                },
                onConnectionPhase: (phase) => {
                    setConnectionPhase(phase);
                    if (phase === 'connected') setIsConnecting(false);
                    if (phase === 'reconnecting') setIsConnecting(true);
                },
                onStats: (s) => setStats(s),
                onError: (err) => {
                    setError(err.message);
                    setIsConnecting(false);
                },
            }
        );

        connectionRef.current = connection;
        await connection.start();
    }, [options.signalingUrl, options.userId, options.sessionId, options.isInitiator]);

    const endCall = useCallback(() => {
        connectionRef.current?.stop();
        connectionRef.current = null;
        setLocalStream(null);
        setRemoteStream(null);
        setConnectionState('closed');
        setStats(null);
    }, []);

    const toggleMute = useCallback(() => {
        return connectionRef.current?.toggleMute() ?? false;
    }, []);

    const toggleCamera = useCallback(() => {
        return connectionRef.current?.toggleCamera() ?? false;
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            connectionRef.current?.stop();
        };
    }, []);

    return {
        localStream,
        remoteStream,
        connectionState,
        connectionPhase,
        stats,
        error,
        isConnecting,
        startCall,
        endCall,
        toggleMute,
        toggleCamera,
    };
}
