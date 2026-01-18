/**
 * Firebase Storage Service
 * Handles file uploads and downloads
 */

import admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';

export class FirebaseStorageService {
    private bucket: admin.storage.Bucket;
    private initialized: boolean = false;

    constructor() {
        this.initializeFirebase();
        this.bucket = admin.storage().bucket();
    }

    /**
     * Initialize Firebase Admin SDK
     */
    private initializeFirebase() {
        if (this.initialized) {
            return;
        }

        try {
            // Check if already initialized
            if (admin.apps.length === 0) {
                const serviceAccountPath = process.env.FIREBASE_ADMIN_SDK_JSON;

                if (!serviceAccountPath) {
                    throw new Error('FIREBASE_ADMIN_SDK_JSON environment variable not set');
                }

                const serviceAccount = require(serviceAccountPath);

                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
                });

                console.log('✅ Firebase Admin SDK initialized');
            }

            this.initialized = true;
        } catch (error) {
            console.error('❌ Failed to initialize Firebase Admin SDK:', error);
            throw error;
        }
    }

    /**
     * Upload file to Firebase Storage
     */
    async uploadFile(
        file: Express.Multer.File,
        userId: string,
        metadata?: { [key: string]: string }
    ): Promise<{
        fileId: string;
        fileName: string;
        downloadUrl: string;
        fileSize: number;
        mimeType: string;
    }> {
        try {
            const fileId = uuidv4();
            const fileName = `${userId}/${fileId}_${file.originalname}`;
            const fileUpload = this.bucket.file(fileName);

            // Upload file
            await fileUpload.save(file.buffer, {
                metadata: {
                    contentType: file.mimetype,
                    metadata: {
                        uploadedBy: userId,
                        originalName: file.originalname,
                        ...metadata,
                    },
                },
            });

            // Make file publicly accessible (with signed URL)
            const [downloadUrl] = await fileUpload.getSignedUrl({
                action: 'read',
                expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
            });

            console.log(`✅ File uploaded: ${fileName}`);

            return {
                fileId,
                fileName: file.originalname,
                downloadUrl,
                fileSize: file.size,
                mimeType: file.mimetype,
            };
        } catch (error) {
            console.error('❌ File upload failed:', error);
            throw new Error('Failed to upload file');
        }
    }

    /**
     * Get signed download URL for a file
     */
    async getDownloadUrl(
        fileId: string,
        userId: string,
        expiresInDays: number = 7
    ): Promise<string> {
        try {
            // Find file by pattern
            const [files] = await this.bucket.getFiles({
                prefix: `${userId}/${fileId}`,
            });

            if (files.length === 0) {
                throw new Error('File not found');
            }

            const file = files[0];
            const [downloadUrl] = await file.getSignedUrl({
                action: 'read',
                expires: Date.now() + expiresInDays * 24 * 60 * 60 * 1000,
            });

            return downloadUrl;
        } catch (error) {
            console.error('❌ Failed to get download URL:', error);
            throw new Error('Failed to get download URL');
        }
    }

    /**
     * Delete file from Firebase Storage
     */
    async deleteFile(fileId: string, userId: string): Promise<void> {
        try {
            // Find file by pattern
            const [files] = await this.bucket.getFiles({
                prefix: `${userId}/${fileId}`,
            });

            if (files.length === 0) {
                throw new Error('File not found');
            }

            const file = files[0];
            await file.delete();

            console.log(`✅ File deleted: ${file.name}`);
        } catch (error) {
            console.error('❌ File deletion failed:', error);
            throw new Error('Failed to delete file');
        }
    }

    /**
     * Get file metadata
     */
    async getFileMetadata(
        fileId: string,
        userId: string
    ): Promise<{
        name: string;
        size: number;
        contentType: string;
        created: Date;
    }> {
        try {
            const [files] = await this.bucket.getFiles({
                prefix: `${userId}/${fileId}`,
            });

            if (files.length === 0) {
                throw new Error('File not found');
            }

            const file = files[0];
            const [metadata] = await file.getMetadata();

            return {
                name: metadata.name,
                size: parseInt(metadata.size),
                contentType: metadata.contentType,
                created: new Date(metadata.timeCreated),
            };
        } catch (error) {
            console.error('❌ Failed to get file metadata:', error);
            throw new Error('Failed to get file metadata');
        }
    }
}
