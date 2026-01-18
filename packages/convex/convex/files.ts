/**
 * File Metadata Management
 * Handles file metadata storage and access control
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Create file metadata after upload
 */
export const createFileMetadata = mutation({
    args: {
        ownerId: v.id("users"),
        fileName: v.string(),
        fileSize: v.number(),
        mimeType: v.string(),
        storageProvider: v.string(),
        externalFileId: v.string(),
        downloadUrl: v.optional(v.string()),
        conversationId: v.optional(v.id("conversations")),
        sessionId: v.optional(v.id("sessions")),
    },
    handler: async (ctx, args) => {
        // Validate file size (10MB max)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (args.fileSize > maxSize) {
            throw new Error("File size exceeds 10MB limit");
        }

        // Determine who to share with
        const sharedWith: string[] = [args.ownerId];

        // If file is for a conversation, share with all participants
        if (args.conversationId) {
            const conversation = await ctx.db.get(args.conversationId);
            if (conversation) {
                for (const participantId of conversation.participants) {
                    if (!sharedWith.includes(participantId)) {
                        sharedWith.push(participantId);
                    }
                }
            }
        }

        // If file is for a session, share with both participants
        if (args.sessionId) {
            const session = await ctx.db.get(args.sessionId);
            if (session) {
                if (!sharedWith.includes(session.requesterId)) {
                    sharedWith.push(session.requesterId);
                }
                if (!sharedWith.includes(session.receiverId)) {
                    sharedWith.push(session.receiverId);
                }
            }
        }

        const fileId = await ctx.db.insert("files", {
            ownerId: args.ownerId,
            fileName: args.fileName,
            fileSize: args.fileSize,
            mimeType: args.mimeType,
            storageProvider: args.storageProvider,
            externalFileId: args.externalFileId,
            downloadUrl: args.downloadUrl,
            uploadedAt: Date.now(),
            sharedWith: sharedWith as any,
            conversationId: args.conversationId,
            sessionId: args.sessionId,
        });

        return fileId;
    },
});

/**
 * Get file metadata
 */
export const getFile = query({
    args: {
        fileId: v.id("files"),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const file = await ctx.db.get(args.fileId);
        if (!file) {
            return null;
        }

        // Check if user has access
        if (!file.sharedWith.includes(args.userId)) {
            throw new Error("Unauthorized: You don't have access to this file");
        }

        return file;
    },
});

/**
 * Get files for a conversation
 */
export const getConversationFiles = query({
    args: {
        conversationId: v.id("conversations"),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        // Verify user is part of conversation
        const conversation = await ctx.db.get(args.conversationId);
        if (!conversation) {
            throw new Error("Conversation not found");
        }

        if (!conversation.participants.includes(args.userId)) {
            throw new Error("Unauthorized: You are not part of this conversation");
        }

        const files = await ctx.db
            .query("files")
            .withIndex("by_conversation", (q) =>
                q.eq("conversationId", args.conversationId)
            )
            .collect();

        // Enrich with owner data
        const enriched = await Promise.all(
            files.map(async (file) => {
                const owner = await ctx.db.get(file.ownerId);
                return {
                    ...file,
                    owner,
                };
            })
        );

        return enriched.sort((a, b) => b.uploadedAt - a.uploadedAt);
    },
});

/**
 * Get files for a session
 */
export const getSessionFiles = query({
    args: {
        sessionId: v.id("sessions"),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        // Verify user is part of session
        const session = await ctx.db.get(args.sessionId);
        if (!session) {
            throw new Error("Session not found");
        }

        if (
            session.requesterId !== args.userId &&
            session.receiverId !== args.userId
        ) {
            throw new Error("Unauthorized: You are not part of this session");
        }

        const files = await ctx.db
            .query("files")
            .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
            .collect();

        // Enrich with owner data
        const enriched = await Promise.all(
            files.map(async (file) => {
                const owner = await ctx.db.get(file.ownerId);
                return {
                    ...file,
                    owner,
                };
            })
        );

        return enriched.sort((a, b) => b.uploadedAt - a.uploadedAt);
    },
});

/**
 * Get all files for a user
 */
export const getUserFiles = query({
    args: {
        userId: v.id("users"),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const limit = args.limit || 50;

        const files = await ctx.db
            .query("files")
            .withIndex("by_owner", (q) => q.eq("ownerId", args.userId))
            .order("desc")
            .take(limit);

        return files;
    },
});

/**
 * Delete a file
 */
export const deleteFile = mutation({
    args: {
        fileId: v.id("files"),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const file = await ctx.db.get(args.fileId);
        if (!file) {
            throw new Error("File not found");
        }

        // Only owner can delete
        if (file.ownerId !== args.userId) {
            throw new Error("Unauthorized: Only the file owner can delete");
        }

        await ctx.db.delete(args.fileId);

        return {
            fileId: args.fileId,
            externalFileId: file.externalFileId,
            storageProvider: file.storageProvider,
        };
    },
});

/**
 * Share file with additional users
 */
export const shareFile = mutation({
    args: {
        fileId: v.id("files"),
        userId: v.id("users"),
        shareWithUserIds: v.array(v.id("users")),
    },
    handler: async (ctx, args) => {
        const file = await ctx.db.get(args.fileId);
        if (!file) {
            throw new Error("File not found");
        }

        // Only owner can share
        if (file.ownerId !== args.userId) {
            throw new Error("Unauthorized: Only the file owner can share");
        }

        // Add new users to sharedWith list
        const updatedSharedWith = [...file.sharedWith];
        for (const shareWithUserId of args.shareWithUserIds) {
            if (!updatedSharedWith.includes(shareWithUserId)) {
                updatedSharedWith.push(shareWithUserId);
            }
        }

        await ctx.db.patch(args.fileId, {
            sharedWith: updatedSharedWith as any,
        });

        return args.fileId;
    },
});

/**
 * Update download URL (for signed URLs that expire)
 */
export const updateDownloadUrl = mutation({
    args: {
        fileId: v.id("files"),
        downloadUrl: v.string(),
    },
    handler: async (ctx, args) => {
        const file = await ctx.db.get(args.fileId);
        if (!file) {
            throw new Error("File not found");
        }

        await ctx.db.patch(args.fileId, {
            downloadUrl: args.downloadUrl,
        });

        return args.fileId;
    },
});
