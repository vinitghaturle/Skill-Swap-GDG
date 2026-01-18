/**
 * Trust & Safety Module
 * Handle reporting, blocking, and reciprocal safety checks
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Report a user for misconduct
 */
export const reportUser = mutation({
    args: {
        reporterId: v.id("users"),
        reportedId: v.id("users"),
        reason: v.string(),
        details: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("reports", {
            reporterId: args.reporterId,
            reportedId: args.reportedId,
            reason: args.reason,
            details: args.details,
            status: "pending",
            createdAt: Date.now(),
        });
    },
});

/**
 * Block a user to prevent all interactions
 */
export const blockUser = mutation({
    args: {
        blockerId: v.id("users"),
        blockedId: v.id("users"),
    },
    handler: async (ctx, args) => {
        // Check if already blocked
        const existing = await ctx.db
            .query("blocks")
            .withIndex("by_pair", (q) =>
                q.eq("blockerId", args.blockerId).eq("blockedId", args.blockedId)
            )
            .first();

        if (existing) return existing._id;

        const blockId = await ctx.db.insert("blocks", {
            blockerId: args.blockerId,
            blockedId: args.blockedId,
            createdAt: Date.now(),
        });

        return blockId;
    },
});

/**
 * Unblock a user
 */
export const unblockUser = mutation({
    args: {
        blockerId: v.id("users"),
        blockedId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const block = await ctx.db
            .query("blocks")
            .withIndex("by_pair", (q) =>
                q.eq("blockerId", args.blockerId).eq("blockedId", args.blockedId)
            )
            .first();

        if (block) {
            await ctx.db.delete(block._id);
        }
    },
});

/**
 * Get block list for a user
 */
export const getBlockedUsers = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const blocks = await ctx.db
            .query("blocks")
            .withIndex("by_blocker", (q) => q.eq("blockerId", args.userId))
            .collect();

        const enrichedBlocks = await Promise.all(
            blocks.map(async (b) => {
                const user = await ctx.db.get(b.blockedId);
                return { ...b, user };
            })
        );

        return enrichedBlocks;
    },
});

/**
 * Internal helper to check if an interaction is blocked (reciprocal)
 */
export async function isBlocked(ctx: any, user1Id: any, user2Id: any): Promise<boolean> {
    const block1 = await ctx.db
        .query("blocks")
        .withIndex("by_pair", (q: any) =>
            q.eq("blockerId", user1Id).eq("blockedId", user2Id)
        )
        .first();

    if (block1) return true;

    const block2 = await ctx.db
        .query("blocks")
        .withIndex("by_pair", (q: any) =>
            q.eq("blockerId", user2Id).eq("blockedId", user1Id)
        )
        .first();

    return !!block2;
}
