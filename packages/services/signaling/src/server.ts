/**
 * WebRTC Signaling Server
 * Express + Socket.IO server for WebRTC signaling
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { TurnService } from './turnService';
import { SignalingHandler } from './signaling';
import { RateLimiter } from './middleware/rateLimit';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);


// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:5173',
    'http://localhost:3000',
    '*', // Allow all for development
];

app.use(
    cors({
        origin: (origin, callback) => {
            // Allow all origins in development if not specified
            if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
    })
);

app.use(express.json());

// Socket.IO setup
const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins.includes('*') ? true : allowedOrigins,
        credentials: true,
    },
});

// Services
const turnService = new TurnService();
const signalingHandler = new SignalingHandler(io);
const rateLimiter = new RateLimiter(10, 1000); // 10 requests per second

// ============ HTTP ENDPOINTS ============

/**
 * Health check
 */
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Get TURN credentials
 */
app.post('/turn/credentials', async (req, res) => {
    try {
        const iceServers = await turnService.getIceServers();

        res.json({
            iceServers,
            timestamp: Date.now(),
        });
    } catch (error) {
        console.error('Error generating TURN credentials:', error);
        res.status(500).json({
            error: 'Failed to generate TURN credentials',
        });
    }
});

// ============ SOCKET.IO MIDDLEWARE ============

/**
 * Authentication middleware
 * In production, validate Firebase ID token here
 */
io.use((socket, next) => {
    const userId = socket.handshake.auth.userId;
    const sessionId = socket.handshake.auth.sessionId;

    if (!userId) {
        return next(new Error('Authentication required'));
    }

    if (!sessionId) {
        return next(new Error('Session ID required'));
    }

    // TODO: Validate Firebase ID token
    // const token = socket.handshake.auth.token;
    // const decodedToken = await admin.auth().verifyIdToken(token);
    // if (decodedToken.uid !== userId) {
    //     return next(new Error('Invalid token'));
    // }

    // TODO: Verify user is participant in session
    // const session = await convex.query(api.sessions.getSessionDetails, { sessionId });
    // if (!session || (session.requesterId !== userId && session.receiverId !== userId)) {
    //     return next(new Error('Unauthorized: Not a session participant'));
    // }

    // Attach userId to socket for later use
    (socket as any).userId = userId;
    (socket as any).sessionId = sessionId;

    next();
});

/**
 * Rate limiting middleware
 */
io.use((socket, next) => {
    const userId = (socket as any).userId;

    if (!rateLimiter.check(userId)) {
        return next(new Error('Rate limit exceeded'));
    }

    next();
});

// ============ SOCKET.IO CONNECTION HANDLER ============

io.on('connection', (socket) => {
    signalingHandler.handleConnection(socket);
});

// ============ START SERVER ============

const PORT = Number(process.env.SIGNALING_SERVER_PORT) || 3001;

httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Signaling server running on port ${PORT}`);

    // Log local IP addresses for mobile testing
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    console.log('📡 Available on your network:');
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                console.log(`   - http://${net.address}:${PORT}`);
            }
        }
    }

    console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}`);
    console.log(`🔧 HTTP endpoint: http://localhost:${PORT}`);
    console.log(`✅ CORS enabled for: ${allowedOrigins.join(', ')}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    httpServer.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
