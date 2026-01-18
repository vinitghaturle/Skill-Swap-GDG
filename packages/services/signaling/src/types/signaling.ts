/**
 * WebRTC Signaling Types
 */

export interface SignalingMessage {
    type: 'offer' | 'answer' | 'ice-candidate' | 'connection-state';
    from: string;
    to: string;
    sessionId: string;
    data: any;
}

export interface OfferMessage extends SignalingMessage {
    type: 'offer';
    data: {
        sdp: RTCSessionDescriptionInit;
    };
}

export interface AnswerMessage extends SignalingMessage {
    type: 'answer';
    data: {
        sdp: RTCSessionDescriptionInit;
    };
}

export interface IceCandidateMessage extends SignalingMessage {
    type: 'ice-candidate';
    data: {
        candidate: RTCIceCandidateInit;
    };
}

export interface ConnectionStateMessage extends SignalingMessage {
    type: 'connection-state';
    data: {
        state: string;
    };
}

export interface TurnCredentials {
    username: string;
    credential: string;
    expiresAt: number;
}
