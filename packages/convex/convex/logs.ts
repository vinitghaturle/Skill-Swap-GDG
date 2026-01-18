import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Log a system event
 */
export const logEvent = mutation({
    args: {
        userId: v.optional(v.id("users")),
        category: v.union(
            v.literal("auth"),
            v.literal("matching"),
            v.literal("chat"),
            v.literal("call"),
            v.literal("system")
        ),
        level: v.union(v.literal("info"), v.literal("warn"), v.literal("error")),
        message: v.string(),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        const logId = await ctx.db.insert("logs", {
            ...args,
            timestamp: Date.now(),
        });
        return logId;
    },
});

/**
 * Get logs (Admin tool)
 */
export const getLogs = query({
    args: {
        limit: v.optional(v.number()),
        category: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const q = args.category
            ? ctx.db.query("logs").withIndex("by_category", (q) => q.eq("category", args.category as any))
            : ctx.db.query("logs");

        return await q.order("desc").take(args.limit || 50);
    },
});
