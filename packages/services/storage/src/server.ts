/**
 * Storage Server
 * Express server for file uploads and downloads
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import winston from 'winston';
import multer from 'multer';
import { FirebaseStorageService } from './firebaseStorage';
import { upload, validateFileSize, validateFileType } from './middleware/validation';

// Load environment variables
dotenv.config();

const app = express();

// Logger
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

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:5173',
    'http://localhost:3000',
];

app.use(
    cors({
        origin: allowedOrigins,
        credentials: true,
    })
);

app.use(express.json());

// Initialize Firebase Storage Service
const storageService = new FirebaseStorageService();

// ============ MIDDLEWARE ============

/**
 * Simple authentication middleware
 * TODO: Validate Firebase ID token in production
 */
function authenticate(req: express.Request, res: express.Response, next: express.NextFunction) {
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    // TODO: Validate Firebase ID token
    // const token = req.headers.authorization?.split('Bearer ')[1];
    // const decodedToken = await admin.auth().verifyIdToken(token);
    // if (decodedToken.uid !== userId) {
    //     return res.status(401).json({ error: 'Invalid token' });
    // }

    (req as any).userId = userId;
    next();
}

// ============ ENDPOINTS ============

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
 * Upload file
 */
app.post(
    '/upload',
    authenticate,
    upload.single('file'),
    validateFileSize,
    validateFileType,
    async (req, res) => {
        try {
            const userId = (req as any).userId;
            const file = req.file!;
            const metadata = req.body.metadata ? JSON.parse(req.body.metadata) : {};

            logger.info(`[Upload] User ${userId} uploading file: ${file.originalname}`);

            const result = await storageService.uploadFile(file, userId, metadata);

            logger.info(`[Upload] Success: ${result.fileId}`);

            res.json({
                success: true,
                file: result,
            });
        } catch (error: any) {
            logger.error(`[Upload] Error: ${error.message}`);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to upload file',
            });
        }
    }
);

/**
 * Get download URL
 */
app.get('/download/:fileId', authenticate, async (req, res) => {
    try {
        const userId = (req as any).userId;
        const { fileId } = req.params;
        const expiresInDays = parseInt(req.query.expiresInDays as string) || 7;

        logger.info(`[Download] User ${userId} requesting download URL for: ${fileId}`);

        const downloadUrl = await storageService.getDownloadUrl(
            fileId,
            userId,
            expiresInDays
        );

        res.json({
            success: true,
            downloadUrl,
            expiresInDays,
        });
    } catch (error: any) {
        logger.error(`[Download] Error: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get download URL',
        });
    }
});

/**
 * Delete file
 */
app.delete('/files/:fileId', authenticate, async (req, res) => {
    try {
        const userId = (req as any).userId;
        const { fileId } = req.params;

        logger.info(`[Delete] User ${userId} deleting file: ${fileId}`);

        await storageService.deleteFile(fileId, userId);

        logger.info(`[Delete] Success: ${fileId}`);

        res.json({
            success: true,
            message: 'File deleted successfully',
        });
    } catch (error: any) {
        logger.error(`[Delete] Error: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to delete file',
        });
    }
});

/**
 * Get file metadata
 */
app.get('/files/:fileId/metadata', authenticate, async (req, res) => {
    try {
        const userId = (req as any).userId;
        const { fileId } = req.params;

        logger.info(`[Metadata] User ${userId} requesting metadata for: ${fileId}`);

        const metadata = await storageService.getFileMetadata(fileId, userId);

        res.json({
            success: true,
            metadata,
        });
    } catch (error: any) {
        logger.error(`[Metadata] Error: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get file metadata',
        });
    }
});

// ============ ERROR HANDLING ============

/**
 * Multer error handler
 */
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'File too large. Maximum size is 10MB',
            });
        }
        return res.status(400).json({
            success: false,
            error: err.message,
        });
    }

    if (err) {
        logger.error(`[Error] ${err.message}`);
        return res.status(500).json({
            success: false,
            error: err.message || 'Internal server error',
        });
    }

    next();
});

// ============ START SERVER ============

const PORT = process.env.STORAGE_SERVER_PORT || 3002;

app.listen(PORT, () => {
    console.log(`🚀 Storage server running on port ${PORT}`);
    console.log(`🔧 HTTP endpoint: http://localhost:${PORT}`);
    console.log(`✅ CORS enabled for: ${allowedOrigins.join(', ')}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    process.exit(0);
});
