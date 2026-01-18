/**
 * User profile management
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Update user profile
 */
export const updateProfile = mutation({
    args: {
        userId: v.id("users"),
        bio: v.optional(v.string()),
        teachSkills: v.optional(v.array(v.string())),
        learnSkills: v.optional(v.array(v.string())),
        languages: v.optional(v.array(v.string())),
        timezone: v.optional(v.string()),
        availability: v.optional(v.any()),  // Complex object, validated in frontend
    },
    handler: async (ctx, args) => {
        const { userId, ...updates } = args;

        const profile = await ctx.db
            .query("profiles")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .first();

        if (!profile) {
            throw new Error("Profile not found");
        }

        // Check if profile is complete
        const isComplete =
            (updates.bio || profile.bio).length > 0 &&
            (updates.teachSkills || profile.teachSkills).length > 0 &&
            (updates.learnSkills || profile.learnSkills).length > 0 &&
            (updates.languages || profile.languages).length > 0;

        await ctx.db.patch(profile._id, {
            ...updates,
            profileCompleted: isComplete,
        });

        return profile._id;
    },
});

/**
 * Get user profile by user ID
 */
export const getProfile = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const profile = await ctx.db
            .query("profiles")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .first();

        return profile;
    },
});

/**
 * Get user with profile
 */
export const getUserWithProfile = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) return null;

        const profile = await ctx.db
            .query("profiles")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .first();

        return {
            ...user,
            profile,
        };
    },
});
