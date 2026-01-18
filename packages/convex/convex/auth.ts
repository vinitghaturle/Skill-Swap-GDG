/**
 * Authentication utilities for Firebase Auth integration with Convex
 * 
 * Convex validates Firebase-issued ID tokens but does NOT handle authentication itself.
 * Firebase Auth is the ONLY identity provider.
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get or create user from Firebase Auth token
 * Called automatically on first login
 */
export const getOrCreateUser = mutation({
    args: {
        firebaseUid: v.string(),
        email: v.string(),
        displayName: v.string(),
        photoURL: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Check if user exists
        const existingUser = await ctx.db
            .query("users")
            .withIndex("by_firebase_uid", (q) => q.eq("firebaseUid", args.firebaseUid))
            .first();

        if (existingUser) {
            // Update last seen
            await ctx.db.patch(existingUser._id, {
                lastSeen: Date.now(),
            });
            return existingUser._id;
        }

        // Create new user
        const userId = await ctx.db.insert("users", {
            firebaseUid: args.firebaseUid,
            email: args.email,
            displayName: args.displayName,
            photoURL: args.photoURL,
            createdAt: Date.now(),
            lastSeen: Date.now(),
        });

        // Create default profile
        await ctx.db.insert("profiles", {
            userId,
            bio: "",
            teachSkills: [],
            learnSkills: [],
            languages: [],
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
            availability: {},
            trustScore: 50,  // Start at neutral
            profileCompleted: false,
            impressions: 0,
            sessionsAccepted: 0,
            sessionsDeclined: 0,
            isShadowBanned: false,
            reputationScore: 100,
            isAdmin: false,
        });

        // Initialize presence
        await ctx.db.insert("presence", {
            userId,
            status: "online",
            lastSeen: Date.now(),
        });

        return userId;
    },
});

/**
 * Get current user by Firebase UID
 */
export const getUserByFirebaseUid = query({
    args: { firebaseUid: v.string() },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_firebase_uid", (q) => q.eq("firebaseUid", args.firebaseUid))
            .first();

        return user;
    },
});

/**
 * Get current user's profile
 */
export const getCurrentUserProfile = query({
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
 * Get user by ID
 */
export const getUserById = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.userId);
    },
});
