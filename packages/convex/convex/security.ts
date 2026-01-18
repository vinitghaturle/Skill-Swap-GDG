/**
 * Security Module
 * Cryptographic session tokens and replay attack prevention
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Generate a signed session token for WebRTC call validation
 * Called when a session is accepted and about to initiate a call
 */
export const generateSessionToken = mutation({
    args: {
        sessionId: v.id("sessions"),
        participantIds: v.array(v.id("users")),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session) {
            throw new Error("Session not found");
        }

        // Generate token payload
        const now = Date.now();
        const expiresAt = now + (24 * 60 * 60 * 1000); // 24 hours

        // Create HMAC-like token using session data
        // In production, use crypto.subtle.sign with a secret key
        const tokenPayload = `${args.sessionId}-${args.participantIds.join(",")}-${expiresAt}`;
        const token = btoa(tokenPayload);

        // Store token
        await ctx.db.insert("sessionTokens", {
            sessionId: args.sessionId,
            token,
            issuedAt: now,
            expiresAt,
            usedBy: [],
            isRevoked: false,
        });

        return { token, expiresAt };
    },
});

/**
 * Validate a session token
 */
export const validateSessionToken = query({
    args: {
        sessionId: v.id("sessions"),
        token: v.string(),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const tokenRecord = await ctx.db
            .query("sessionTokens")
            .withIndex("by_token", (q) => q.eq("token", args.token))
            .first();

        if (!tokenRecord) {
            return { valid: false, reason: "Token not found" };
        }

        if (tokenRecord.sessionId !== args.sessionId) {
            return { valid: false, reason: "Token does not match session" };
        }

        if (tokenRecord.isRevoked) {
            return { valid: false, reason: "Token has been revoked" };
        }

        if (tokenRecord.expiresAt < Date.now()) {
            return { valid: false, reason: "Token has expired" };
        }

        // Mark token as used by this user (query cannot patch)
        // This would need to be done via a separate mutation in production
        return { valid: true, expiresAt: tokenRecord.expiresAt };
    },
});

/**
 * Revoke a session token (for emergency termination)
 */
export const revokeSessionToken = mutation({
    args: {
        sessionId: v.id("sessions"),
        adminId: v.id("users"),
    },
    handler: async (ctx, args) => {
        // Verify admin access
        const adminProfile = await ctx.db
            .query("profiles")
            .withIndex("by_user", (q) => q.eq("userId", args.adminId))
            .unique();

        if (!adminProfile?.isAdmin) {
            throw new Error("Unauthorized");
        }

        const tokens = await ctx.db
            .query("sessionTokens")
            .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
            .collect();

        for (const token of tokens) {
            await ctx.db.patch(token._id, { isRevoked: true });
        }

        return { revoked: tokens.length };
    },
});

/**
 * Record a WebRTC signal for replay prevention
 */
export const recordSignal = mutation({
    args: {
        sessionId: v.id("sessions"),
        senderId: v.id("users"),
        signalType: v.string(),
        signalPayload: v.string(),
    },
    handler: async (ctx, args) => {
        // Create hash of signal payload
        // In production, use crypto.subtle.digest
        const signalHash = btoa(args.signalPayload).substring(0, 64);

        // Check if signal already exists (within last 60 seconds)
        const recentCutoff = Date.now() - (60 * 1000);
        const existing = await ctx.db
            .query("signalLog")
            .withIndex("by_hash", (q) => q.eq("signalHash", signalHash))
            .filter((q) => q.gt(q.field("timestamp"), recentCutoff))
            .first();

        if (existing) {
            throw new Error("Replay detected: Signal already processed");
        }

        // Log the signal
        await ctx.db.insert("signalLog", {
            sessionId: args.sessionId,
            senderId: args.senderId,
            signalType: args.signalType,
            signalHash,
            timestamp: Date.now(),
        });

        return { recorded: true };
    },
});

/**
 * Cleanup old signal logs (should be run as a scheduled function)
 */
export const cleanupOldSignals = mutation({
    handler: async (ctx) => {
        const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
        const oldSignals = await ctx.db
            .query("signalLog")
            .withIndex("by_timestamp")
            .filter((q) => q.lt(q.field("timestamp"), cutoff))
            .collect();

        for (const signal of oldSignals) {
            await ctx.db.delete(signal._id);
        }

        return { deleted: oldSignals.length };
    },
});
