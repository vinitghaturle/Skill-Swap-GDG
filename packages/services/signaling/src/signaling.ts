/**
 * SimplePeer Signaling Logic
 * Simple signal forwarding for SimplePeer library
 */

import { Server, Socket } from 'socket.io';
import winston from 'winston';

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.simple(),
        }),
    ],
});

export class SignalingHandler {
    private io: Server;
    private sessions: Map<string, Set<string>> = new Map(); // sessionId -> Set of socketIds

    constructor(io: Server) {
        this.io = io;
    }

    /**
     * Handle new socket connection
     */
    handleConnection(socket: Socket) {
        const userId = (socket as any).userId;
        const sessionId = (socket as any).sessionId;

        logger.info(`User connected: ${userId} (socket: ${socket.id})`);

        // Auto-join session room
        socket.join(sessionId);

        // Track session participants
        if (!this.sessions.has(sessionId)) {
            this.sessions.set(sessionId, new Set());
        }
        this.sessions.get(sessionId)!.add(socket.id);

        logger.info(`User ${userId} joined session ${sessionId}`);

        // Notify other participants that a peer joined
        socket.to(sessionId).emit('peer:joined', {
            userId,
            socketId: socket.id,
        });

        /**
         * Signal Forwarding for native WebRTC
         * Forward type, sdp, and candidate directly
         */
        socket.on('signal', (data: { type: string; sdp?: string; candidate?: any }) => {
            logger.info(`[Signal] From ${userId} in session ${sessionId} - type: ${data.type}`);

            // Forward signal to all other peers in the session
            socket.to(sessionId).emit('signal', {
                ...data,
                from: userId,
            });
        });

        /**
         * Handle disconnect
         */
        socket.on('disconnect', () => {
            logger.info(`User disconnected: ${userId} (socket: ${socket.id})`);

            // Remove from session
            const participants = this.sessions.get(sessionId);
            if (participants) {
                participants.delete(socket.id);

                // Notify other participants
                socket.to(sessionId).emit('peer:left', {
                    userId,
                    socketId: socket.id,
                });

                // Clean up empty sessions
                if (participants.size === 0) {
                    this.sessions.delete(sessionId);
                    logger.info(`Session ${sessionId} cleaned up (no participants)`);
                }
            }
        });
    }
}
