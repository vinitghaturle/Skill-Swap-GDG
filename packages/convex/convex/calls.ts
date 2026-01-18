/**
 * Call Management System
 * WebRTC call state machine and quality monitoring
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/**
 * Initiate a video call
 * Creates call record and prepares for WebRTC connection
 */
export const initiateCall = mutation({
    args: {
        sessionId: v.id("sessions"),
        callerId: v.id("users"),
        receiverId: v.id("users"),
    },
    handler: async (ctx, args) => {
        // Verify session exists and is accepted
        const session = await ctx.db.get(args.sessionId);
        if (!session) {
            throw new Error("Session not found");
        }

        if (session.status !== "accepted") {
            throw new Error("Session must be accepted before calling");
        }

        // Verify caller is part of the session
        if (
            session.requesterId !== args.callerId &&
            session.receiverId !== args.callerId
        ) {
            throw new Error("Caller not part of this session");
        }

        // Check if there's already an active call for this session
        const existingCall = await ctx.db
            .query("calls")
            .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
            .filter((q) =>
                q.or(
                    q.eq(q.field("status"), "ringing"),
                    q.eq(q.field("status"), "connecting"),
                    q.eq(q.field("status"), "connected")
                )
            )
            .first();

        if (existingCall) {
            throw new Error("Call already in progress for this session");
        }

        // Create call record
        const callId = await ctx.db.insert("calls", {
            sessionId: args.sessionId,
            callerId: args.callerId,
            receiverId: args.receiverId,
            status: "ringing",
            iceConnectionState: "new",
            connectionType: "unknown",
            turnCredentialsUsed: false,
        });

        // Generate session token for secure WebRTC validation
        const now = Date.now();
        const expiresAt = now + (24 * 60 * 60 * 1000); // 24 hours
        const tokenPayload = `${args.sessionId}-${args.callerId},${args.receiverId}-${expiresAt}`;
        const token = btoa(tokenPayload);

        await ctx.db.insert("sessionTokens", {
            sessionId: args.sessionId,
            token,
            issuedAt: now,
            expiresAt,
            usedBy: [],
            isRevoked: false,
        });

        return { callId, token, expiresAt };
    },
});

/**
 * Accept an incoming call
 */
export const acceptCall = mutation({
    args: {
        callId: v.id("calls"),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const call = await ctx.db.get(args.callId);
        if (!call) {
            throw new Error("Call not found");
        }

        // Verify user is the receiver
        if (call.receiverId !== args.userId) {
            throw new Error("Only the receiver can accept this call");
        }

        // Verify call is ringing
        if (call.status !== "ringing") {
            throw new Error("Call is not ringing");
        }

        // Update call status
        await ctx.db.patch(args.callId, {
            status: "connecting",
            iceConnectionState: "checking",
        });

        return args.callId;
    },
});

/**
 * Reject an incoming call
 */
export const rejectCall = mutation({
    args: {
        callId: v.id("calls"),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const call = await ctx.db.get(args.callId);
        if (!call) {
            throw new Error("Call not found");
        }

        // Verify user is the receiver
        if (call.receiverId !== args.userId) {
            throw new Error("Only the receiver can reject this call");
        }

        // Verify call is ringing
        if (call.status !== "ringing") {
            throw new Error("Call is not ringing");
        }

        // Update call status
        await ctx.db.patch(args.callId, {
            status: "ended",
            endedAt: Date.now(),
            failureReason: "Rejected by receiver",
        });

        return args.callId;
    },
});

/**
 * Update call connection state
 * Called when ICE connection state changes
 */
export const updateCallState = mutation({
    args: {
        callId: v.id("calls"),
        iceConnectionState: v.optional(
            v.union(
                v.literal("new"),
                v.literal("checking"),
                v.literal("connected"),
                v.literal("completed"),
                v.literal("failed"),
                v.literal("disconnected"),
                v.literal("closed")
            )
        ),
        connectionType: v.optional(
            v.union(
                v.literal("direct"),
                v.literal("relay"),
                v.literal("unknown")
            )
        ),
        turnCredentialsUsed: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const call = await ctx.db.get(args.callId);
        if (!call) {
            throw new Error("Call not found");
        }

        const updates: any = {};

        if (args.iceConnectionState) {
            updates.iceConnectionState = args.iceConnectionState;

            // Update call status based on ICE state
            if (args.iceConnectionState === "connected" || args.iceConnectionState === "completed") {
                updates.status = "connected";
                if (!call.startedAt) {
                    updates.startedAt = Date.now();
                }
            } else if (args.iceConnectionState === "failed") {
                updates.status = "failed";
                updates.endedAt = Date.now();
                updates.failureReason = "ICE connection failed";
            } else if (args.iceConnectionState === "closed") {
                if (call.status !== "ended") {
                    updates.status = "ended";
                    updates.endedAt = Date.now();
                }
            }
        }

        if (args.connectionType !== undefined) {
            updates.connectionType = args.connectionType;
        }

        if (args.turnCredentialsUsed !== undefined) {
            updates.turnCredentialsUsed = args.turnCredentialsUsed;
        }

        await ctx.db.patch(args.callId, updates);

        return args.callId;
    },
});

/**
 * Update call quality metrics
 * Called periodically during active call
 */
export const updateCallQuality = mutation({
    args: {
        callId: v.id("calls"),
        metrics: v.object({
            bitrate: v.number(),
            packetLoss: v.number(),
            latency: v.number(),
            resolution: v.string(),
        }),
    },
    handler: async (ctx, args) => {
        const call = await ctx.db.get(args.callId);
        if (!call) {
            throw new Error("Call not found");
        }

        await ctx.db.patch(args.callId, {
            qualityMetrics: {
                ...args.metrics,
                lastUpdated: Date.now(),
            },
        });

        return args.callId;
    },
});

/**
 * End a call
 * Called when either party hangs up
 */
export const endCall = mutation({
    args: {
        callId: v.id("calls"),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const call = await ctx.db.get(args.callId);
        if (!call) {
            throw new Error("Call not found");
        }

        // Verify user is part of the call
        if (call.callerId !== args.userId && call.receiverId !== args.userId) {
            throw new Error("User not part of this call");
        }

        const now = Date.now();
        const duration = call.startedAt ? Math.floor((now - call.startedAt) / 1000) : 0;

        await ctx.db.patch(args.callId, {
            status: "ended",
            endedAt: now,
            duration,
            iceConnectionState: "closed",
        });

        return args.callId;
    },
});

/**
 * Report call failure
 * Called when call fails to establish
 */
export const reportCallFailure = mutation({
    args: {
        callId: v.id("calls"),
        reason: v.string(),
        iceConnectionState: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const call = await ctx.db.get(args.callId);
        if (!call) {
            throw new Error("Call not found");
        }

        await ctx.db.patch(args.callId, {
            status: "failed",
            endedAt: Date.now(),
            failureReason: args.reason,
            ...(args.iceConnectionState && {
                iceConnectionState: args.iceConnectionState as any,
            }),
        });

        return args.callId;
    },
});

/**
 * Get active call for a session
 */
export const getActiveCall = query({
    args: {
        sessionId: v.id("sessions"),
    },
    handler: async (ctx, args) => {
        const call = await ctx.db
            .query("calls")
            .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
            .filter((q) =>
                q.or(
                    q.eq(q.field("status"), "ringing"),
                    q.eq(q.field("status"), "connecting"),
                    q.eq(q.field("status"), "connected")
                )
            )
            .first();

        if (!call) {
            return null;
        }

        // Enrich with user data
        const caller = await ctx.db.get(call.callerId);
        const receiver = await ctx.db.get(call.receiverId);

        return {
            ...call,
            caller,
            receiver,
        };
    },
});

/**
 * Get call history for a user
 */
export const getCallHistory = query({
    args: {
        userId: v.id("users"),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const limit = args.limit || 20;

        // Get calls where user is caller
        const callerCalls = await ctx.db
            .query("calls")
            .withIndex("by_caller", (q) => q.eq("callerId", args.userId))
            .filter((q) => q.eq(q.field("status"), "ended"))
            .take(limit);

        // Get calls where user is receiver
        const receiverCalls = await ctx.db
            .query("calls")
            .withIndex("by_receiver", (q) => q.eq("receiverId", args.userId))
            .filter((q) => q.eq(q.field("status"), "ended"))
            .take(limit);

        // Combine and sort by endedAt
        const allCalls = [...callerCalls, ...receiverCalls];
        allCalls.sort((a, b) => (b.endedAt || 0) - (a.endedAt || 0));

        // Enrich with user and session data
        const enriched = await Promise.all(
            allCalls.slice(0, limit).map(async (call) => {
                const caller = await ctx.db.get(call.callerId);
                const receiver = await ctx.db.get(call.receiverId);
                const session = await ctx.db.get(call.sessionId);

                return {
                    ...call,
                    caller,
                    receiver,
                    session,
                };
            })
        );

        return enriched;
    },
});

/**
 * Cache ICE server configuration (TURN credentials)
 */
export const cacheIceServers = mutation({
    args: {
        userId: v.id("users"),
        turnUsername: v.string(),
        turnCredential: v.string(),
        expiresAt: v.number(),
    },
    handler: async (ctx, args) => {
        // Delete existing expired configs
        const existingConfigs = await ctx.db
            .query("iceServerConfigs")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();

        for (const config of existingConfigs) {
            await ctx.db.delete(config._id);
        }

        // Create new config
        const configId = await ctx.db.insert("iceServerConfigs", {
            userId: args.userId,
            turnUsername: args.turnUsername,
            turnCredential: args.turnCredential,
            expiresAt: args.expiresAt,
            createdAt: Date.now(),
        });

        return configId;
    },
});

/**
 * Get cached ICE server configuration
 */
export const getIceServers = query({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const config = await ctx.db
            .query("iceServerConfigs")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .first();

        // Check if config exists and is not expired
        if (!config || config.expiresAt < Date.now()) {
            return null;
        }

        return {
            turnUsername: config.turnUsername,
            turnCredential: config.turnCredential,
            expiresAt: config.expiresAt,
        };
    },
});

/**
 * Clean up stale calls (stuck in ringing/connecting)
 * Should be called periodically
 */
export const cleanupStaleCalls = mutation({
    args: {},
    handler: async (ctx) => {
        const now = Date.now();
        const tenMinutesAgo = now - 10 * 60 * 1000;

        const staleCalls = await ctx.db
            .query("calls")
            .filter((q) =>
                q.and(
                    q.or(
                        q.eq(q.field("status"), "ringing"),
                        q.eq(q.field("status"), "connecting")
                    ),
                    q.lt(q.field("_creationTime"), tenMinutesAgo)
                )
            )
            .collect();

        for (const call of staleCalls) {
            await ctx.db.patch(call._id, {
                status: "failed",
                endedAt: now,
                failureReason: "Call timed out (stale)",
            });
        }

        return { cleanedUp: staleCalls.length };
    },
});

/**
 * Clean up expired ICE server configs
 * Should be called periodically (e.g., via cron)
 */
export const cleanupExpiredIceConfigs = mutation({
    args: {},
    handler: async (ctx) => {
        const now = Date.now();
        const expiredConfigs = await ctx.db
            .query("iceServerConfigs")
            .withIndex("by_expiry")
            .filter((q) => q.lt(q.field("expiresAt"), now))
            .collect();

        for (const config of expiredConfigs) {
            await ctx.db.delete(config._id);
        }

        return { deleted: expiredConfigs.length };
    },
});
