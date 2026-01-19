import { mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

/**
 * Submit feedback for a completed session
 */
export const submitFeedback = mutation({
    args: {
        sessionId: v.id("sessions"),
        raterId: v.id("users"),
        score: v.number(),
        comment: v.optional(v.string()),
        dontMatchAgain: v.boolean(),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session) throw new Error("Session not found");

        const isRequester = session.requesterId === args.raterId;
        const rateeId = isRequester ? session.receiverId : session.requesterId;

        // 1. Save Rating
        await ctx.db.insert("ratings", {
            sessionId: args.sessionId,
            raterId: args.raterId,
            rateeId,
            score: args.score,
            comment: args.comment,
            createdAt: Date.now(),
        });

        // 2. Update Status to Completed (if not already)
        if (session.status !== "completed") {
            await ctx.db.patch(args.sessionId, {
                status: "completed",
                updatedAt: Date.now(),
            });
        }

        // 3. Update Reputation Score (-10 for 1-star, +5 for 5-star)
        const rateeProfile = await ctx.db
            .query("profiles")
            .withIndex("by_user", (q) => q.eq("userId", rateeId))
            .unique();

        if (rateeProfile) {
            let reputationChange = 0;
            if (args.score === 1) reputationChange = -10;
            if (args.score === 5) reputationChange = 5;

            await ctx.db.patch(rateeProfile._id, {
                reputationScore: Math.min(100, Math.max(0, (rateeProfile.reputationScore ?? 100) + reputationChange)),
            });

            // 4. Update Skill Stats
            const skillName = session.skill;
            const currentStats = rateeProfile.skillStats || [];
            const skillIndex = currentStats.findIndex(s => s.skill === skillName);

            if (skillIndex > -1) {
                const stat = currentStats[skillIndex];
                const newTotalSessions = stat.sessionsCompleted + 1;
                const newAvgRating = (stat.averageRating * stat.sessionsCompleted + args.score) / newTotalSessions;

                currentStats[skillIndex] = {
                    ...stat,
                    sessionsCompleted: newTotalSessions,
                    totalMinutes: stat.totalMinutes + session.duration,
                    averageRating: newAvgRating,
                };
            } else {
                currentStats.push({
                    skill: skillName,
                    sessionsCompleted: 1,
                    totalMinutes: session.duration,
                    averageRating: args.score,
                });
            }

            await ctx.db.patch(rateeProfile._id, { skillStats: currentStats });
        }

        // 5. Handle Soft Block
        if (args.dontMatchAgain) {
            const existingExclusion = await ctx.db
                .query("matchPreferences")
                .withIndex("by_user_exclusion", (q) =>
                    q.eq("userId", args.raterId).eq("excludedUserId", rateeId)
                )
                .unique();

            if (!existingExclusion) {
                await ctx.db.insert("matchPreferences", {
                    userId: args.raterId,
                    excludedUserId: rateeId,
                    reason: "dont_match_again",
                    createdAt: Date.now(),
                });
            }
        }

        return { success: true };
    },
});
