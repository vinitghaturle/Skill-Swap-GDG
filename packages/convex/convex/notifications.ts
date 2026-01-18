/**
 * Notification Management System
 * In-app notifications and FCM token management
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

/**
 * Internal helper to create notification and trigger push
 */
async function createNotificationInternal(
    ctx: any,
    args: {
        userId: Id<"users">;
        type: string;
        title: string;
        body: string;
        data?: {
            conversationId?: Id<"conversations">;
            sessionId?: Id<"sessions">;
            callId?: Id<"calls">;
            [key: string]: any;
        };
    }
) {
    const notificationId = await ctx.db.insert("notifications", {
        userId: args.userId,
        type: args.type,
        title: args.title,
        body: args.body,
        read: false,
        createdAt: Date.now(),
        data: args.data,
    });

    // Handle push notification
    const tokens = await ctx.db
        .query("notificationTokens")
        .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
        .collect();

    if (tokens.length > 0) {
        const tokenStrings = tokens.map((t: any) => t.token);
        await ctx.scheduler.runAfter(0, internal.fcm.sendPushNotification, {
            tokens: tokenStrings,
            title: args.title,
            body: args.body,
            data: {
                ...args.data,
                type: args.type,
            },
        });
    }

    return notificationId;
}

/**
 * Create a notification (Public Mutation)
 */
export const createNotification = mutation({
    args: {
        userId: v.id("users"),
        type: v.string(),
        title: v.string(),
        body: v.string(),
        data: v.optional(
            v.object({
                conversationId: v.optional(v.id("conversations")),
                sessionId: v.optional(v.id("sessions")),
                callId: v.optional(v.id("calls")),
            })
        ),
    },
    handler: async (ctx, args) => {
        return await createNotificationInternal(ctx, args);
    },
});

/**
 * Mark notification as read
 */
export const markAsRead = mutation({
    args: {
        notificationId: v.id("notifications"),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const notification = await ctx.db.get(args.notificationId);
        if (!notification) {
            throw new Error("Notification not found");
        }

        // Verify user owns this notification
        if (notification.userId !== args.userId) {
            throw new Error("Unauthorized");
        }

        await ctx.db.patch(args.notificationId, {
            read: true,
        });

        return args.notificationId;
    },
});

/**
 * Mark all notifications as read for a user
 */
export const markAllAsRead = mutation({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const unreadNotifications = await ctx.db
            .query("notifications")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .filter((q) => q.eq(q.field("read"), false))
            .collect();

        for (const notification of unreadNotifications) {
            await ctx.db.patch(notification._id, {
                read: true,
            });
        }

        return { marked: unreadNotifications.length };
    },
});

/**
 * Delete a notification
 */
export const deleteNotification = mutation({
    args: {
        notificationId: v.id("notifications"),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const notification = await ctx.db.get(args.notificationId);
        if (!notification) {
            throw new Error("Notification not found");
        }

        // Verify user owns this notification
        if (notification.userId !== args.userId) {
            throw new Error("Unauthorized");
        }

        await ctx.db.delete(args.notificationId);

        return args.notificationId;
    },
});

/**
 * Get notifications for a user
 */
export const getNotifications = query({
    args: {
        userId: v.id("users"),
        limit: v.optional(v.number()),
        unreadOnly: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const limit = args.limit || 50;

        let notifications = await ctx.db
            .query("notifications")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .order("desc")
            .take(limit);

        if (args.unreadOnly) {
            notifications = notifications.filter((n) => !n.read);
        }

        return notifications;
    },
});

/**
 * Get unread notification count
 */
export const getUnreadCount = query({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const unreadNotifications = await ctx.db
            .query("notifications")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .filter((q) => q.eq(q.field("read"), false))
            .collect();

        return unreadNotifications.length;
    },
});

/**
 * Register FCM token for push notifications
 */
export const registerFCMToken = mutation({
    args: {
        userId: v.id("users"),
        token: v.string(),
        deviceType: v.union(v.literal("web"), v.literal("mobile")),
    },
    handler: async (ctx, args) => {
        // Check if token already exists
        const existingToken = await ctx.db
            .query("notificationTokens")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .filter((q) => q.eq(q.field("token"), args.token))
            .first();

        if (existingToken) {
            return existingToken._id;
        }

        // Create new token
        const tokenId = await ctx.db.insert("notificationTokens", {
            userId: args.userId,
            token: args.token,
            deviceType: args.deviceType,
            createdAt: Date.now(),
        });

        return tokenId;
    },
});

/**
 * Unregister FCM token
 */
export const unregisterFCMToken = mutation({
    args: {
        userId: v.id("users"),
        token: v.string(),
    },
    handler: async (ctx, args) => {
        const tokenRecord = await ctx.db
            .query("notificationTokens")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .filter((q) => q.eq(q.field("token"), args.token))
            .first();

        if (tokenRecord) {
            await ctx.db.delete(tokenRecord._id);
        }

        return tokenRecord?._id;
    },
});

/**
 * Get FCM tokens for a user
 */
export const getFCMTokens = query({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const tokens = await ctx.db
            .query("notificationTokens")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();

        return tokens.map((t) => ({
            token: t.token,
            deviceType: t.deviceType,
        }));
    },
});

/**
 * Helper: Create notification for incoming call
 */
export const notifyIncomingCall = mutation({
    args: {
        callId: v.id("calls"),
    },
    handler: async (ctx, args) => {
        const call = await ctx.db.get(args.callId);
        if (!call) {
            throw new Error("Call not found");
        }

        const caller = await ctx.db.get(call.callerId);
        const session = await ctx.db.get(call.sessionId);

        if (!caller || !session) {
            throw new Error("Caller or session not found");
        }

        return await createNotificationInternal(ctx, {
            userId: call.receiverId,
            type: "call_incoming",
            title: "Incoming Call",
            body: `${caller.displayName} is calling you for ${session.skill}`,
            data: {
                callId: args.callId,
                sessionId: call.sessionId,
            },
        });
    },
});

/**
 * Helper: Create notification for session starting soon
 */
export const notifySessionStartingSoon = mutation({
    args: {
        sessionId: v.id("sessions"),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session) {
            throw new Error("Session not found");
        }

        const requester = await ctx.db.get(session.requesterId);
        const receiver = await ctx.db.get(session.receiverId);

        if (!requester || !receiver) {
            throw new Error("Users not found");
        }

        // Notify both participants
        const notifications = [];

        notifications.push(
            await createNotificationInternal(ctx, {
                userId: session.requesterId,
                type: "session_starting_soon",
                title: "Session Starting Soon",
                body: `Your session with ${receiver.displayName} for ${session.skill} starts in 15 minutes`,
                data: {
                    sessionId: args.sessionId,
                },
            })
        );

        notifications.push(
            await createNotificationInternal(ctx, {
                userId: session.receiverId,
                type: "session_starting_soon",
                title: "Session Starting Soon",
                body: `Your session with ${requester.displayName} for ${session.skill} starts in 15 minutes`,
                data: {
                    sessionId: args.sessionId,
                },
            })
        );

        return notifications;
    },
});
