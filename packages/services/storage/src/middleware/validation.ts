/**
 * File Validation Middleware
 * Validates file size, type, and content
 */

import { Request, Response, NextFunction } from 'express';
import multer from 'multer';

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    // Archives
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
];

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Multer file filter
 */
export const fileFilter = (
    req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
) => {
    // Check MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return cb(new Error(`File type not allowed: ${file.mimetype}`));
    }

    cb(null, true);
};

/**
 * Multer configuration
 */
export const upload = multer({
    storage: multer.memoryStorage(), // Store in memory for Firebase upload
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 1, // One file at a time
    },
    fileFilter,
});

/**
 * Validate file size
 */
export function validateFileSize(
    req: Request,
    res: Response,
    next: NextFunction
) {
    if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
    }

    if (req.file.size > MAX_FILE_SIZE) {
        return res.status(400).json({
            error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        });
    }

    next();
}

/**
 * Validate file type
 */
export function validateFileType(
    req: Request,
    res: Response,
    next: NextFunction
) {
    if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
    }

    if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype)) {
        return res.status(400).json({
            error: `File type not allowed: ${req.file.mimetype}`,
        });
    }

    next();
}
