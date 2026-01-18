/**
 * Matching Engine
 * Deterministic matching algorithm with score calculation
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";


/**
 * Get matches for a user
 * Returns all potential matches sorted by score (high to low)
 */
export const getMatchesForUser = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        // Get current user's profile
        const userProfile = await ctx.db
            .query("profiles")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .first();

        // 0. Check Feature Flag
        const matchingEnabled = await ctx.db
            .query("systemConfig")
            .withIndex("by_key", (q) => q.eq("key", "matchingEnabled"))
            .unique();

        if (matchingEnabled && matchingEnabled.value === false) {
            return [];
        }

        if (!userProfile || !userProfile.profileCompleted) {
            return [];
        }

        // Get all sessions with current user in last 24h for cooldowns
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const recentSessions = await ctx.db
            .query("sessions")
            .filter((q) =>
                q.and(
                    q.or(
                        q.eq(q.field("requesterId"), args.userId),
                        q.eq(q.field("receiverId"), args.userId)
                    ),
                    q.gt(q.field("createdAt"), oneDayAgo)
                )
            )
            .collect();

        const cooldownUserIds = new Set(
            recentSessions.map(s => s.requesterId === args.userId ? s.receiverId : s.requesterId)
        );

        // Get blocked users (reciprocal)
        const blocksByMe = await ctx.db
            .query("blocks")
            .withIndex("by_blocker", (q) => q.eq("blockerId", args.userId))
            .collect();
        const blocksOnMe = await ctx.db
            .query("blocks")
            .withIndex("by_blocked", (q) => q.eq("blockedId", args.userId))
            .collect();

        const blockedUserIds = new Set([
            ...blocksByMe.map(b => b.blockedId),
            ...blocksOnMe.map(b => b.blockerId)
        ]);

        // Get soft blocks (one-way exclusions)
        const exclusions = await ctx.db
            .query("matchPreferences")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();
        const excludedUserIds = new Set(exclusions.map(e => e.excludedUserId));

        // Get all other completed profiles
        const allProfiles = await ctx.db
            .query("profiles")
            .filter((q) => q.neq(q.field("userId"), args.userId))
            .collect();

        const completedProfiles = allProfiles.filter((p) =>
            p.profileCompleted &&
            !p.isShadowBanned &&
            !cooldownUserIds.has(p.userId) &&
            !blockedUserIds.has(p.userId) &&
            !excludedUserIds.has(p.userId)
        );

        // Calculate match scores
        const matches = await Promise.all(
            completedProfiles.map(async (otherProfile) => {
                const baseScore = calculateMatchScore(userProfile, otherProfile);
                const fairnessBonus = calculateFairnessAdjustments(otherProfile);

                // Deterministic score for stability (no randomness)
                const score = Math.round(baseScore + fairnessBonus);

                const otherUser = await ctx.db.get(otherProfile.userId);

                return {
                    userId: otherProfile.userId,
                    profile: otherProfile,
                    user: otherUser,
                    score,
                };
            })
        );

        // Sort by score (high to low) and return top 20
        return matches
            .filter((m) => m.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 20);
    },
});

/**
 * Bulk record match impressions
 */
export const recordMatchesExposed = mutation({
    args: {
        userIds: v.array(v.id("users")),
    },
    handler: async (ctx, args) => {
        for (const userId of args.userIds) {
            const profile = await ctx.db
                .query("profiles")
                .withIndex("by_user", (q) => q.eq("userId", userId))
                .first();

            if (profile) {
                await ctx.db.patch(profile._id, {
                    impressions: (profile.impressions || 0) + 1,
                });
            }
        }
    },
});

/**
 * Get detailed match explanation between two users
 */
export const getMatchExplanation = query({
    args: {
        userId1: v.id("users"),
        userId2: v.id("users"),
    },
    handler: async (ctx, args) => {
        const profile1 = await ctx.db
            .query("profiles")
            .withIndex("by_user", (q) => q.eq("userId", args.userId1))
            .first();

        const profile2 = await ctx.db
            .query("profiles")
            .withIndex("by_user", (q) => q.eq("userId", args.userId2))
            .first();

        if (!profile1 || !profile2) {
            return null;
        }

        const score = calculateMatchScore(profile1, profile2);
        const breakdown = calculateScoreBreakdown(profile1, profile2);
        const reasons = generateMatchReasons(profile1, profile2, breakdown);

        return {
            score,
            breakdown,
            reasons,
            strengths: generateStrengths(breakdown),
            considerations: generateConsiderations(profile1, profile2),
        };
    },
});

/**
 * Calculate match score between two profiles
 * Returns a score from 0-100
 */
function calculateMatchScore(profile1: any, profile2: any): number {
    let score = 0;

    // 1. Skill Overlap (40 points max)
    const commonTeachable = intersection(
        profile1.teachSkills,
        profile2.learnSkills
    );

    const commonLearnable = intersection(
        profile1.learnSkills,
        profile2.teachSkills
    );

    const skillMatchScore = commonTeachable.length * 20 + commonLearnable.length * 15;
    score += skillMatchScore;

    // 1.1 Mastery Bonus (Boost nodes with high ratings/sessions in common skills)
    commonTeachable.forEach(skill => {
        const stat = (profile2.skillStats as any[])?.find(s => s.skill === skill);
        if (stat) {
            // Add up to 10 points bonus for mastery
            const masteryBonus = (stat.averageRating / 5) * Math.min(stat.sessionsCompleted, 5);
            score += masteryBonus;
        }
    });

    // 2. Availability Alignment (30 points)
    const availabilityHours = calculateAvailabilityOverlap(
        profile1.availability,
        profile2.availability
    );
    const availabilityScore = Math.min(availabilityHours * 3, 30);
    score += availabilityScore;

    // 3. Language Match (20 points)
    const hasCommonLanguage =
        intersection(profile1.languages, profile2.languages).length > 0;
    score += hasCommonLanguage ? 20 : 0;

    // 4. Reputation Score (10 points)
    const reputation = profile2.reputationScore ?? 100;
    score += (reputation / 100) * 10;

    return Math.round(score);
}

/**
 * Calculate fairness adjustments
 */
function calculateFairnessAdjustments(profile: any): number {
    let adjustment = 0;

    // 1. Exposure Decay (-1 per 50 impressions, max -10)
    const exposurePenalty = Math.min((profile.impressions || 0) / 50, 10);
    adjustment -= exposurePenalty;

    // 2. Cold-Start Boost (+10 if profile is < 7 days old)
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    if (profile._creationTime > sevenDaysAgo) {
        adjustment += 10;
    }

    // 3. Outcome Bonus (based on acceptance ratio)
    const totalSessions = (profile.sessionsAccepted || 0) + (profile.sessionsDeclined || 0);
    if (totalSessions > 0) {
        const ratio = (profile.sessionsAccepted || 0) / totalSessions;
        adjustment += ratio * 10;
    }

    return adjustment;
}

/**
 * Calculate detailed score breakdown
 */
function calculateScoreBreakdown(profile1: any, profile2: any) {
    const teachLearnMatch = intersection(
        profile1.teachSkills,
        profile2.learnSkills
    ).length;

    const learnTeachMatch = intersection(
        profile1.learnSkills,
        profile2.teachSkills
    ).length;

    const skillScore = Math.min((teachLearnMatch + learnTeachMatch) * 10, 40);

    const availabilityHours = calculateAvailabilityOverlap(
        profile1.availability,
        profile2.availability
    );
    const availabilityScore = Math.min(availabilityHours * 3, 30);

    const hasCommonLanguage =
        intersection(profile1.languages, profile2.languages).length > 0;
    const languageScore = hasCommonLanguage ? 20 : 0;

    const reputation = profile2.reputationScore ?? 100;
    const trustScore = Math.round((reputation / 100) * 10);

    const fairnessBonus = calculateFairnessAdjustments(profile2);

    return {
        skillMatch: skillScore,
        availabilityMatch: availabilityScore,
        languageMatch: languageScore,
        trustScore: trustScore,
        fairnessAdjustment: Math.round(fairnessBonus),
        details: {
            teachLearnSkills: intersection(profile1.teachSkills, profile2.learnSkills),
            learnTeachSkills: intersection(profile1.learnSkills, profile2.teachSkills),
            commonLanguages: intersection(profile1.languages, profile2.languages),
            availabilityHours,
        },
    };
}

/**
 * Generate human-readable match reasons
 */
function generateMatchReasons(profile1: any, profile2: any, breakdown: any): string[] {
    const reasons: string[] = [];

    if (breakdown.details.teachLearnSkills.length > 0) {
        reasons.push(
            `You can teach ${breakdown.details.teachLearnSkills.join(", ")} and they want to learn it`
        );
    }

    if (breakdown.details.learnTeachSkills.length > 0) {
        reasons.push(
            `They can teach ${breakdown.details.learnTeachSkills.join(", ")} and you want to learn it`
        );
    }

    if (breakdown.details.availabilityHours > 0) {
        reasons.push(
            `You have ${breakdown.details.availabilityHours} hours of overlapping availability`
        );
    }

    if (breakdown.details.commonLanguages.length > 0) {
        reasons.push(
            `You both speak ${breakdown.details.commonLanguages.join(", ")}`
        );
    }

    if (breakdown.fairnessAdjustment > 0) {
        reasons.push("Rising Star: This member is new and highly active");
    } else if (breakdown.fairnessAdjustment < -5) {
        reasons.push("High Demand: This member has high visibility");
    }

    return reasons;
}

/**
 * Generate match strengths
 */
function generateStrengths(breakdown: any): string[] {
    const strengths: string[] = [];

    if (breakdown.skillMatch >= 30) {
        strengths.push("Strong skill match");
    }

    if (breakdown.availabilityMatch >= 20) {
        strengths.push("Good availability overlap");
    }

    if (breakdown.languageMatch === 20) {
        strengths.push("Common language");
    }

    return strengths;
}

/**
 * Generate considerations
 */
function generateConsiderations(profile1: any, profile2: any): string[] {
    const considerations: string[] = [];

    if (profile1.timezone !== profile2.timezone) {
        considerations.push("Different timezones - coordinate carefully");
    }

    if (profile1.trustScore < 50 || profile2.trustScore < 50) {
        considerations.push("Build trust through successful sessions");
    }

    return considerations;
}

/**
 * Calculate availability overlap in hours
 */
function calculateAvailabilityOverlap(avail1: any, avail2: any): number {
    if (!avail1 || !avail2) return 0;

    const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    let totalOverlapMinutes = 0;

    for (const day of days) {
        const slots1 = avail1[day] || [];
        const slots2 = avail2[day] || [];

        for (const slot1 of slots1) {
            for (const slot2 of slots2) {
                const overlap = calculateTimeSlotOverlap(slot1, slot2);
                totalOverlapMinutes += overlap;
            }
        }
    }

    return Math.round(totalOverlapMinutes / 60);
}

/**
 * Calculate overlap between two time slots in minutes
 */
function calculateTimeSlotOverlap(slot1: any, slot2: any): number {
    const start1 = timeToMinutes(slot1.start);
    const end1 = timeToMinutes(slot1.end);
    const start2 = timeToMinutes(slot2.start);
    const end2 = timeToMinutes(slot2.end);

    const overlapStart = Math.max(start1, start2);
    const overlapEnd = Math.min(end1, end2);

    return Math.max(0, overlapEnd - overlapStart);
}

/**
 * Convert time string (HH:MM) to minutes since midnight
 */
function timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
}

/**
 * Array intersection helper
 */
function intersection<T>(arr1: T[], arr2: T[]): T[] {
    return arr1.filter((item) => arr2.includes(item));
}
