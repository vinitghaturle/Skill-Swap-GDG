/**
 * Session Management System
 * Handle skill exchange session requests and lifecycle
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { isBlocked } from "./safety";

/**
 * Create a new session request
 */
export const createSessionRequest = mutation({
    args: {
        requesterId: v.id("users"),
        receiverId: v.id("users"),
        skill: v.string(),
        scheduledAt: v.number(), // Unix timestamp
        duration: v.number(), // Minutes (30, 60, 120)
        conversationId: v.id("conversations"),
    },
    handler: async (ctx, args) => {
        // 1. Reciprocal Block Check
        if (await isBlocked(ctx, args.requesterId, args.receiverId)) {
            throw new Error("Interaction blocked between these users");
        }

        // 2. Rate Limiting (3 requests per hour)
        const oneHourAgo = Date.now() - 3600000;
        const recentRequests = await ctx.db
            .query("sessions")
            .withIndex("by_requester", (q) => q.eq("requesterId", args.requesterId))
            .filter((q) => q.gt(q.field("createdAt"), oneHourAgo))
            .collect();

        if (recentRequests.length >= 3) {
            throw new Error("Request limit exceeded. You can only send 3 session requests per hour.");
        }

        // Validate scheduled time is in the future
        if (args.scheduledAt < Date.now()) {
            throw new Error("Scheduled time must be in the future");
        }

        // Validate duration
        if (![30, 60, 120].includes(args.duration)) {
            throw new Error("Duration must be 30, 60, or 120 minutes");
        }

        const now = Date.now();

        // Create session
        const sessionId = await ctx.db.insert("sessions", {
            requesterId: args.requesterId,
            receiverId: args.receiverId,
            skill: args.skill,
            status: "pending",
            scheduledAt: args.scheduledAt,
            duration: args.duration,
            conversationId: args.conversationId,
            createdAt: now,
            updatedAt: now,
        });

        return sessionId;
    },
});

/**
 * Accept a session request
 */
export const acceptSessionRequest = mutation({
    args: {
        sessionId: v.id("sessions"),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session) {
            throw new Error("Session not found");
        }

        // Verify user is the receiver
        if (session.receiverId !== args.userId) {
            throw new Error("Only the receiver can accept this session");
        }

        // Verify session is pending
        if (session.status !== "pending") {
            throw new Error("Session is not pending");
        }

        // Update session status
        await ctx.db.patch(args.sessionId, {
            status: "accepted",
            updatedAt: Date.now(),
        });

        // Update receiver metrics
        const receiverProfile = await ctx.db
            .query("profiles")
            .withIndex("by_user", (q) => q.eq("userId", session.receiverId))
            .first();
        if (receiverProfile) {
            await ctx.db.patch(receiverProfile._id, {
                sessionsAccepted: (receiverProfile.sessionsAccepted || 0) + 1,
            });
        }

        return args.sessionId;
    },
});

/**
 * Decline a session request
 */
export const declineSessionRequest = mutation({
    args: {
        sessionId: v.id("sessions"),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session) {
            throw new Error("Session not found");
        }

        // Verify user is the receiver
        if (session.receiverId !== args.userId) {
            throw new Error("Only the receiver can decline this session");
        }

        // Verify session is pending
        if (session.status !== "pending") {
            throw new Error("Session is not pending");
        }

        // Update session status
        await ctx.db.patch(args.sessionId, {
            status: "declined",
            updatedAt: Date.now(),
        });

        // Update receiver metrics
        const receiverProfile = await ctx.db
            .query("profiles")
            .withIndex("by_user", (q) => q.eq("userId", session.receiverId))
            .first();
        if (receiverProfile) {
            await ctx.db.patch(receiverProfile._id, {
                sessionsDeclined: (receiverProfile.sessionsDeclined || 0) + 1,
            });
        }

        return args.sessionId;
    },
});

/**
 * Get sessions for a user (as requester or receiver)
 */
export const getUserSessions = query({
    args: {
        userId: v.id("users"),
        status: v.optional(
            v.union(
                v.literal("pending"),
                v.literal("accepted"),
                v.literal("declined"),
                v.literal("completed"),
                v.literal("cancelled")
            )
        ),
    },
    handler: async (ctx, args) => {
        const allSessions = await ctx.db.query("sessions").collect();

        let userSessions = allSessions.filter(
            (session) =>
                session.requesterId === args.userId ||
                session.receiverId === args.userId
        );

        // Filter by status if provided
        if (args.status) {
            userSessions = userSessions.filter(
                (session) => session.status === args.status
            );
        }

        // Enrich with user data
        const enriched = await Promise.all(
            userSessions.map(async (session) => {
                const requester = await ctx.db.get(session.requesterId);
                const receiver = await ctx.db.get(session.receiverId);

                return {
                    ...session,
                    requester,
                    receiver,
                    isRequester: session.requesterId === args.userId,
                };
            })
        );

        // Sort by scheduled time (upcoming first)
        return enriched.sort((a, b) => a.scheduledAt - b.scheduledAt);
    },
});

/**
 * Get session details
 */
export const getSessionDetails = query({
    args: { sessionId: v.id("sessions") },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session) {
            return null;
        }

        const requester = await ctx.db.get(session.requesterId);
        const receiver = await ctx.db.get(session.receiverId);

        return {
            ...session,
            requester,
            receiver,
        };
    },
});

/**
 * Complete a session (called after session ends)
 */
export const completeSession = mutation({
    args: {
        sessionId: v.id("sessions"),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session) {
            throw new Error("Session not found");
        }

        // Verify user is part of the session
        if (
            session.requesterId !== args.userId &&
            session.receiverId !== args.userId
        ) {
            throw new Error("User not part of this session");
        }

        // Verify session is accepted
        if (session.status !== "accepted") {
            throw new Error("Session must be accepted to complete");
        }

        // Update session status
        await ctx.db.patch(args.sessionId, {
            status: "completed",
            updatedAt: Date.now(),
        });

        return args.sessionId;
    },
});

/**
 * Cancel a session (only if pending)
 */
export const cancelSession = mutation({
    args: {
        sessionId: v.id("sessions"),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session) {
            throw new Error("Session not found");
        }

        // Verify user is part of the session
        if (
            session.requesterId !== args.userId &&
            session.receiverId !== args.userId
        ) {
            throw new Error("User not part of this session");
        }

        // Only pending sessions can be cancelled
        if (session.status !== "pending") {
            throw new Error("Only pending sessions can be cancelled");
        }

        // Update session status
        await ctx.db.patch(args.sessionId, {
            status: "cancelled",
            updatedAt: Date.now(),
        });

        return args.sessionId;
    },
});
