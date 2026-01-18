/**
 * Admin Control Module
 * Elevated mutations for platform safety and moderation
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Handle user reports
 */
export const resolveReport = mutation({
    args: {
        reportId: v.id("reports"),
        status: v.union(v.literal("resolved"), v.literal("dismissed")),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.reportId, { status: args.status });
    },
});

/**
 * Toggle shadow ban status for a user
 */
export const setShadowBan = mutation({
    args: {
        userId: v.id("users"),
        isShadowBanned: v.boolean(),
    },
    handler: async (ctx, args) => {
        const profile = await ctx.db
            .query("profiles")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .first();

        if (profile) {
            await ctx.db.patch(profile._id, { isShadowBanned: args.isShadowBanned });
        }
    },
});

/**
 * Manually update user reputation
 */
export const updateReputation = mutation({
    args: {
        userId: v.id("users"),
        score: v.number(),
    },
    handler: async (ctx, args) => {
        const profile = await ctx.db
            .query("profiles")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .first();

        if (profile) {
            await ctx.db.patch(profile._id, { reputationScore: args.score });
        }
    },
});

/**
 * Get all pending reports
 */
export const getPendingReports = query({
    handler: async (ctx) => {
        const reports = await ctx.db
            .query("reports")
            .withIndex("by_status", (q) => q.eq("status", "pending"))
            .collect();

        const enrichedReports = await Promise.all(
            reports.map(async (r) => {
                const reporter = await ctx.db.get(r.reporterId);
                const reported = await ctx.db.get(r.reportedId);
                return { ...r, reporter, reported };
            })
        );

        return enrichedReports;
    },
});

/**
 * Get live monitoring data for the admin dashboard
 */
export const getLiveMonitorData = query({
    args: { adminId: v.id("users") },
    handler: async (ctx, args) => {
        const adminProfile = await ctx.db
            .query("profiles")
            .withIndex("by_user", (q) => q.eq("userId", args.adminId))
            .unique();

        if (!adminProfile?.isAdmin) {
            throw new Error("Unauthorized: Admin access required.");
        }

        const activeCalls = await ctx.db
            .query("calls")
            .withIndex("by_status", (q) => q.eq("status", "connected"))
            .collect();

        const pendingReports = await ctx.db
            .query("reports")
            .withIndex("by_status", (q) => q.eq("status", "pending"))
            .collect();

        const recentErrors = await ctx.db
            .query("logs")
            .withIndex("by_category", (q) => q.eq("category", "system"))
            .collect();

        const sessions = await ctx.db.query("sessions").collect();
        const activeSessions = sessions.filter(s => s.status === "accepted");

        return {
            activeCalls: activeCalls.length,
            pendingReports: pendingReports.length,
            activeSessions: activeSessions.length,
            recentErrors: recentErrors.slice(-10),
            timestamp: Date.now(),
        };
    },
});

/**
 * Update system configuration (feature flags)
 */
export const updateSystemConfig = mutation({
    args: {
        adminId: v.id("users"),
        key: v.string(),
        value: v.any(),
    },
    handler: async (ctx, args) => {
        const adminProfile = await ctx.db
            .query("profiles")
            .withIndex("by_user", (q) => q.eq("userId", args.adminId))
            .unique();

        if (!adminProfile?.isAdmin) {
            throw new Error("Unauthorized: Admin access required.");
        }

        const existing = await ctx.db
            .query("systemConfig")
            .withIndex("by_key", (q) => q.eq("key", args.key))
            .unique();

        if (existing) {
            await ctx.db.patch(existing._id, {
                value: args.value,
                updatedAt: Date.now(),
                updatedBy: args.adminId,
            });
        } else {
            await ctx.db.insert("systemConfig", {
                key: args.key,
                value: args.value,
                updatedAt: Date.now(),
                updatedBy: args.adminId,
            });
        }
    },
});

/**
 * Emergency manually terminate a session and associated calls
 */
export const emergencyTerminate = mutation({
    args: {
        adminId: v.id("users"),
        sessionId: v.id("sessions"),
        reason: v.string(),
    },
    handler: async (ctx, args) => {
        const adminProfile = await ctx.db
            .query("profiles")
            .withIndex("by_user", (q) => q.eq("userId", args.adminId))
            .unique();

        if (!adminProfile?.isAdmin) {
            throw new Error("Unauthorized: Admin access required.");
        }

        // 1. Terminate Session
        await ctx.db.patch(args.sessionId, {
            status: "cancelled",
            updatedAt: Date.now(),
        });

        // 2. End any associated calls
        const calls = await ctx.db
            .query("calls")
            .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
            .collect();

        for (const call of calls) {
            if (call.status !== "ended") {
                await ctx.db.patch(call._id, {
                    status: "ended",
                    endedAt: Date.now(),
                    failureReason: `Admin termination: ${args.reason}`,
                });
            }
        }

        // 3. Log the intervention
        await ctx.db.insert("logs", {
            userId: args.adminId,
            category: "system",
            level: "warn",
            message: `Emergency session termination: ${args.sessionId}`,
            metadata: { reason: args.reason },
            timestamp: Date.now(),
        });
    },
});

/**
 * Get system config value
 */
export const getSystemConfig = query({
    args: { key: v.string() },
    handler: async (ctx, args) => {
        const config = await ctx.db
            .query("systemConfig")
            .withIndex("by_key", (q) => q.eq("key", args.key))
            .unique();
        return config?.value ?? null;
    },
});

/**
 * Get detailed list of active (non-terminal) sessions
 */
export const getActiveSessions = query({
    args: { adminId: v.id("users") },
    handler: async (ctx, args) => {
        const adminProfile = await ctx.db
            .query("profiles")
            .withIndex("by_user", (q) => q.eq("userId", args.adminId))
            .unique();

        if (!adminProfile?.isAdmin) {
            throw new Error("Unauthorized");
        }

        const sessions = await ctx.db
            .query("sessions")
            .filter((q) =>
                q.or(
                    q.eq(q.field("status"), "pending"),
                    q.eq(q.field("status"), "accepted")
                )
            )
            .collect();

        return await Promise.all(
            sessions.map(async (s) => {
                const requester = await ctx.db.get(s.requesterId);
                const receiver = await ctx.db.get(s.receiverId);
                return { ...s, requesterName: requester?.displayName, receiverName: receiver?.displayName };
            })
        );
    },
});
