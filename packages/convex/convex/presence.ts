/**
 * Presence Tracking System
 * Track online/offline status of users
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Update user presence status
 */
export const updatePresence = mutation({
    args: {
        userId: v.id("users"),
        status: v.union(
            v.literal("online"),
            v.literal("away"),
            v.literal("offline")
        ),
    },
    handler: async (ctx, args) => {
        const presence = await ctx.db
            .query("presence")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .first();

        if (presence) {
            await ctx.db.patch(presence._id, {
                status: args.status,
                lastSeen: Date.now(),
            });
        } else {
            await ctx.db.insert("presence", {
                userId: args.userId,
                status: args.status,
                lastSeen: Date.now(),
            });
        }
    },
});

/**
 * Heartbeat - called periodically to maintain online status
 */
export const heartbeat = mutation({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const presence = await ctx.db
            .query("presence")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .first();

        if (presence) {
            await ctx.db.patch(presence._id, {
                status: "online",
                lastSeen: Date.now(),
            });
        } else {
            await ctx.db.insert("presence", {
                userId: args.userId,
                status: "online",
                lastSeen: Date.now(),
            });
        }
    },
});

/**
 * Get presence for a single user
 */
export const getUserPresence = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const presence = await ctx.db
            .query("presence")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .first();

        if (!presence) {
            return { status: "offline" as const, lastSeen: 0 };
        }

        // Auto-calculate status based on lastSeen
        const now = Date.now();
        const timeSinceLastSeen = now - presence.lastSeen;

        if (timeSinceLastSeen < 30000) {
            // 30 seconds
            return { status: "online" as const, lastSeen: presence.lastSeen };
        } else if (timeSinceLastSeen < 300000) {
            // 5 minutes
            return { status: "away" as const, lastSeen: presence.lastSeen };
        } else {
            return { status: "offline" as const, lastSeen: presence.lastSeen };
        }
    },
});

/**
 * Get presence for multiple users
 */
export const getMultiplePresences = query({
    args: { userIds: v.array(v.id("users")) },
    handler: async (ctx, args) => {
        const presences = await Promise.all(
            args.userIds.map(async (userId) => {
                const presence = await ctx.db
                    .query("presence")
                    .withIndex("by_user", (q) => q.eq("userId", userId))
                    .first();

                if (!presence) {
                    return { userId, status: "offline" as const, lastSeen: 0 };
                }

                const now = Date.now();
                const timeSinceLastSeen = now - presence.lastSeen;

                let status: "online" | "away" | "offline";
                if (timeSinceLastSeen < 30000) {
                    status = "online";
                } else if (timeSinceLastSeen < 300000) {
                    status = "away";
                } else {
                    status = "offline";
                }

                return { userId, status, lastSeen: presence.lastSeen };
            })
        );

        return presences;
    },
});
