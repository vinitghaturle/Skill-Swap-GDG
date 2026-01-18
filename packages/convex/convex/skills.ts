/**
 * Skills management
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Search skills by name (for autocomplete)
 */
export const searchSkills = query({
    args: { searchTerm: v.string() },
    handler: async (ctx, args) => {
        const skills = await ctx.db
            .query("skills")
            .filter((q) =>
                q.or(
                    q.eq(q.field("verified"), true),
                    q.eq(q.field("verified"), false)
                )
            )
            .collect();

        // Filter by search term (case-insensitive)
        const filtered = skills.filter((skill) =>
            skill.name.toLowerCase().includes(args.searchTerm.toLowerCase())
        );

        // Return top 10 matches
        return filtered.slice(0, 10);
    },
});

/**
 * Create a new skill
 */
export const createSkill = mutation({
    args: {
        name: v.string(),
        category: v.string(),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        // Check if skill already exists
        const existing = await ctx.db
            .query("skills")
            .withIndex("by_name", (q) => q.eq("name", args.name))
            .first();

        if (existing) {
            return existing._id;
        }

        // Create new skill (unverified initially)
        const skillId = await ctx.db.insert("skills", {
            name: args.name,
            category: args.category,
            createdBy: args.userId,
            verified: false,
            createdAt: Date.now(),
        });

        return skillId;
    },
});

/**
 * Get all skills
 */
export const getAllSkills = query({
    args: {},
    handler: async (ctx) => {
        const skills = await ctx.db
            .query("skills")
            .filter((q) => q.eq(q.field("verified"), true))
            .collect();

        return skills;
    },
});

/**
 * Get skills by category
 */
export const getSkillsByCategory = query({
    args: { category: v.string() },
    handler: async (ctx, args) => {
        const skills = await ctx.db
            .query("skills")
            .withIndex("by_category", (q) => q.eq("category", args.category))
            .filter((q) => q.eq(q.field("verified"), true))
            .collect();

        return skills;
    },
});
