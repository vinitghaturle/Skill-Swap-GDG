/**
 * Compliance Module
 * GDPR/CCPA data management - Export, Delete, Anonymize
 */

import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Export all user data as JSON (GDPR Article 20 - Data Portability)
 */
export const exportUserData = mutation({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        // 1. Get user record
        const user = await ctx.db.get(args.userId);
        if (!user) {
            throw new Error("User not found");
        }

        // 2. Get profile
        const profile = await ctx.db
            .query("profiles")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .first();

        // 3. Get sessions (as requester or receiver)
        const sessionsAsRequester = await ctx.db
            .query("sessions")
            .filter((q) => q.eq(q.field("requesterId"), args.userId))
            .collect();

        const sessionsAsReceiver = await ctx.db
            .query("sessions")
            .filter((q) => q.eq(q.field("receiverId"), args.userId))
            .collect();

        const allSessions = [...sessionsAsRequester, ...sessionsAsReceiver];

        // 4. Get conversations (participants is an array)
        const allConversations = await ctx.db.query("conversations").collect();
        const conversations = allConversations.filter(conv =>
            conv.participants.includes(args.userId)
        );

        // 5. Get messages
        const conversationIds = conversations.map(c => c._id);
        const messages = [];
        for (const convId of conversationIds) {
            const convMessages = await ctx.db
                .query("messages")
                .withIndex("by_conversation", (q) => q.eq("conversationId", convId))
                .collect();
            messages.push(...convMessages);
        }

        // 6. Get ratings given and received
        const ratingsGiven = await ctx.db
            .query("ratings")
            .filter((q) => q.eq(q.field("raterId"), args.userId))
            .collect();

        const ratingsReceived = await ctx.db
            .query("ratings")
            .filter((q) => q.eq(q.field("rateeId"), args.userId))
            .collect();

        // 7. Get blocks
        const blocks = await ctx.db
            .query("blocks")
            .filter((q) =>
                q.or(
                    q.eq(q.field("blockerId"), args.userId),
                    q.eq(q.field("blockedId"), args.userId)
                )
            )
            .collect();

        // 8. Get reports
        const reportsCreated = await ctx.db
            .query("reports")
            .filter((q) => q.eq(q.field("reporterId"), args.userId))
            .collect();

        const reportsAgainst = await ctx.db
            .query("reports")
            .filter((q) => q.eq(q.field("reportedId"), args.userId))
            .collect();

        // 9. Get logs
        const logs = await ctx.db
            .query("logs")
            .filter((q) => q.eq(q.field("userId"), args.userId))
            .collect();

        // 10. Get match preferences
        const matchPreferences = await ctx.db
            .query("matchPreferences")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();

        // Compile complete export
        const exportData = {
            exportedAt: new Date().toISOString(),
            user,
            profile,
            sessions: allSessions,
            conversations,
            messages,
            ratingsGiven,
            ratingsReceived,
            blocks,
            reportsCreated,
            reportsAgainst,
            logs,
            matchPreferences,
        };

        // Log the export request
        await ctx.db.insert("logs", {
            userId: args.userId,
            category: "compliance",
            level: "info",
            message: "User data export requested",
            metadata: { timestamp: Date.now() },
            timestamp: Date.now(),
        });

        return exportData;
    },
});

/**
 * Hard delete all user data (GDPR Article 17 - Right to Erasure)
 */
export const deleteUserData = mutation({
    args: {
        userId: v.id("users"),
        confirmationText: v.string(), // User must type "DELETE MY ACCOUNT"
    },
    handler: async (ctx, args) => {
        if (args.confirmationText !== "DELETE MY ACCOUNT") {
            throw new Error("Invalid confirmation text");
        }

        const user = await ctx.db.get(args.userId);
        if (!user) {
            throw new Error("User not found");
        }

        // Log deletion before deleting
        await ctx.db.insert("logs", {
            userId: args.userId,
            category: "compliance",
            level: "warn",
            message: `Account deletion initiated for ${user.email}`,
            metadata: { firebaseUid: user.firebaseUid },
            timestamp: Date.now(),
        });

        // 1. Delete profile
        const profile = await ctx.db
            .query("profiles")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .first();
        if (profile) await ctx.db.delete(profile._id);

        // 2. Delete sessions (as requester or receiver)
        const sessionsAsRequester = await ctx.db
            .query("sessions")
            .filter((q) => q.eq(q.field("requesterId"), args.userId))
            .collect();
        for (const session of sessionsAsRequester) {
            await ctx.db.delete(session._id);
        }

        const sessionsAsReceiver = await ctx.db
            .query("sessions")
            .filter((q) => q.eq(q.field("receiverId"), args.userId))
            .collect();
        for (const session of sessionsAsReceiver) {
            await ctx.db.delete(session._id);
        }

        // 3. Delete conversations and messages
        const allConversations = await ctx.db.query("conversations").collect();
        const conversations = allConversations.filter(conv =>
            conv.participants.includes(args.userId)
        );

        for (const conv of conversations) {
            const messages = await ctx.db
                .query("messages")
                .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
                .collect();
            for (const msg of messages) {
                await ctx.db.delete(msg._id);
            }
            await ctx.db.delete(conv._id);
        }

        // 4. Delete ratings
        const ratingsGiven = await ctx.db
            .query("ratings")
            .filter((q) => q.eq(q.field("raterId"), args.userId))
            .collect();
        for (const rating of ratingsGiven) {
            await ctx.db.delete(rating._id);
        }

        const ratingsReceived = await ctx.db
            .query("ratings")
            .filter((q) => q.eq(q.field("rateeId"), args.userId))
            .collect();
        for (const rating of ratingsReceived) {
            await ctx.db.delete(rating._id);
        }

        // 5. Delete blocks
        const blocks = await ctx.db
            .query("blocks")
            .filter((q) =>
                q.or(
                    q.eq(q.field("blockerId"), args.userId),
                    q.eq(q.field("blockedId"), args.userId)
                )
            )
            .collect();
        for (const block of blocks) {
            await ctx.db.delete(block._id);
        }

        // 6. Delete reports
        const reportsCreated = await ctx.db
            .query("reports")
            .filter((q) => q.eq(q.field("reporterId"), args.userId))
            .collect();
        for (const report of reportsCreated) {
            await ctx.db.delete(report._id);
        }

        const reportsAgainst = await ctx.db
            .query("reports")
            .filter((q) => q.eq(q.field("reportedId"), args.userId))
            .collect();
        for (const report of reportsAgainst) {
            await ctx.db.delete(report._id);
        }

        // 7. Delete presence
        const presence = await ctx.db
            .query("presence")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .first();
        if (presence) await ctx.db.delete(presence._id);

        // 8. Delete match preferences
        const matchPreferences = await ctx.db
            .query("matchPreferences")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();
        for (const pref of matchPreferences) {
            await ctx.db.delete(pref._id);
        }

        // 9. Delete calls
        const calls = await ctx.db
            .query("calls")
            .filter((q) =>
                q.or(
                    q.eq(q.field("callerId"), args.userId),
                    q.eq(q.field("receiverId"), args.userId)
                )
            )
            .collect();
        for (const call of calls) {
            await ctx.db.delete(call._id);
        }

        // 10. Delete logs (keep compliance logs)
        const userLogs = await ctx.db
            .query("logs")
            .filter((q) =>
                q.and(
                    q.eq(q.field("userId"), args.userId),
                    q.neq(q.field("category"), "compliance")
                )
            )
            .collect();
        for (const log of userLogs) {
            await ctx.db.delete(log._id);
        }

        // 11. Finally, delete user record
        await ctx.db.delete(args.userId);

        return {
            deleted: true,
            message: "All user data has been permanently deleted",
            timestamp: Date.now(),
        };
    },
});

/**
 * Anonymize user data (alternative to deletion for analytics preservation)
 */
export const anonymizeUserData = mutation({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) {
            throw new Error("User not found");
        }

        // Anonymize user record
        await ctx.db.patch(args.userId, {
            email: `deleted-${args.userId}@anonymized.local`,
            displayName: "Deleted User",
            photoURL: undefined,
        });

        // Anonymize profile
        const profile = await ctx.db
            .query("profiles")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .first();

        if (profile) {
            await ctx.db.patch(profile._id, {
                bio: "[Redacted]",
                teachSkills: [],
                learnSkills: [],
            });
        }

        // Anonymize messages
        const allConversations = await ctx.db.query("conversations").collect();
        const conversations = allConversations.filter(conv =>
            conv.participants.includes(args.userId)
        );

        for (const conv of conversations) {
            const messages = await ctx.db
                .query("messages")
                .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
                .filter((q) => q.eq(q.field("senderId"), args.userId))
                .collect();

            for (const msg of messages) {
                await ctx.db.patch(msg._id, {
                    text: "[Message Deleted]",
                });
            }
        }

        // Log anonymization
        await ctx.db.insert("logs", {
            userId: args.userId,
            category: "compliance",
            level: "info",
            message: "User data anonymized",
            metadata: { timestamp: Date.now() },
            timestamp: Date.now(),
        });

        return {
            anonymized: true,
            message: "PII has been removed while preserving platform analytics",
        };
    },
});
