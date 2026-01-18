/**
 * WebRTC Types and Constants
 */

export interface IceServerConfig {
    iceServers: RTCIceServer[];
    timestamp: number;
}

export interface CallQualityMetrics {
    bitrate: number; // kbps
    packetLoss: number; // percentage
    latency: number; // ms
    resolution: string;
    lastUpdated: number;
}

export interface ConnectionStats {
    connectionType: 'direct' | 'relay' | 'unknown';
    iceConnectionState: RTCIceConnectionState;
    connectionState: RTCPeerConnectionState;
    turnCredentialsUsed: boolean;
}

export type WebRTCEventType =
    | 'localStream'
    | 'remoteStream'
    | 'connectionStateChange'
    | 'iceConnectionStateChange'
    | 'qualityUpdate'
    | 'callFailed'
    | 'callEnded';

export interface WebRTCEvent {
    type: WebRTCEventType;
    data: any;
}

// WebRTC Configuration
export const WEBRTC_CONFIG = {
    iceTransportPolicy: 'all' as RTCIceTransportPolicy,
    bundlePolicy: 'max-bundle' as RTCBundlePolicy,
    rtcpMuxPolicy: 'require' as RTCRtcpMuxPolicy,
    iceCandidatePoolSize: 10,
};

// Media Constraints
export const MEDIA_CONSTRAINTS: MediaStreamConstraints = {
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
};

// Relay (TURN) Media Constraints - Lower quality for bandwidth optimization
export const RELAY_MEDIA_CONSTRAINTS: MediaStreamConstraints = {
    audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
    },
    video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 24 },
    },
};
