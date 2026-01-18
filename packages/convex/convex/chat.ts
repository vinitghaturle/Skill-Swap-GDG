/**
 * Chat and Messaging System
 * Real-time messaging between matched users
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { isBlocked } from "./safety";

/**
 * Send a message in a conversation
 */
export const sendMessage = mutation({
    args: {
        conversationId: v.id("conversations"),
        senderId: v.id("users"),
        text: v.string(),
    },
    handler: async (ctx, args) => {
        // Verify sender is part of the conversation
        const conversation = await ctx.db.get(args.conversationId);
        if (!conversation) {
            throw new Error("Conversation not found");
        }

        if (!conversation.participants.includes(args.senderId)) {
            throw new Error("User not part of this conversation");
        }

        // 1. Reciprocal Block Check
        const otherUserId = conversation.participants.find(p => p !== args.senderId);
        if (otherUserId && await isBlocked(ctx, args.senderId, otherUserId)) {
            throw new Error("Communication blocked by one of the participants");
        }

        // 2. Simple Rate Limiting (5 messages per 10 seconds)
        const now = Date.now();
        const tenSecondsAgo = now - 10000;
        const recentMessages = await ctx.db
            .query("messages")
            .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
            .filter((q) => q.gt(q.field("timestamp"), tenSecondsAgo))
            .collect();

        const myRecentMessages = recentMessages.filter(m => m.senderId === args.senderId);
        if (myRecentMessages.length >= 5) {
            throw new Error("Rate limit exceeded. Please slow down.");
        }

        // Verify there is an accepted session for this conversation
        const sessions = await ctx.db
            .query("sessions")
            .withIndex("by_conversation", (q) =>
                q.eq("conversationId", args.conversationId)
            )
            .collect();

        const hasAcceptedSession = sessions.some(
            (s) => s.status === "accepted" || s.status === "completed"
        );

        if (!hasAcceptedSession) {
            throw new Error("You can only chat after a session request is accepted");
        }

        const timestamp = Date.now();

        // Insert message
        const messageId = await ctx.db.insert("messages", {
            conversationId: args.conversationId,
            senderId: args.senderId,
            text: args.text,
            timestamp,
            readBy: [args.senderId], // Sender has read their own message
        });

        // Update conversation's last message
        await ctx.db.patch(args.conversationId, {
            lastMessageAt: timestamp,
            lastMessage: {
                text: args.text.substring(0, 100),
                senderId: args.senderId,
                timestamp,
            },
        });

        return messageId;
    },
});

/**
 * Get messages for a conversation with pagination
 */
export const getConversationMessages = query({
    args: {
        conversationId: v.id("conversations"),
        limit: v.optional(v.number()),
        cursor: v.optional(v.number()), // _creationTime of oldest loaded message
    },
    handler: async (ctx, args) => {
        const limit = args.limit || 20;

        let messagesQuery = ctx.db
            .query("messages")
            .withIndex("by_conversation", (q) =>
                q.eq("conversationId", args.conversationId)
            )
            .order("desc");

        // Apply cursor for pagination
        if (args.cursor) {
            messagesQuery = messagesQuery.filter((q) =>
                q.lt(q.field("_creationTime"), args.cursor!)
            );
        }

        const messages = await messagesQuery.take(limit);

        return {
            messages: messages.reverse(), // Show oldest first
            hasMore: messages.length === limit,
            nextCursor: messages.length > 0 ? messages[0]._creationTime : null,
        };
    },
});

/**
 * Get or create a conversation between two users
 */
export const getOrCreateConversation = mutation({
    args: {
        userId1: v.id("users"),
        userId2: v.id("users"),
    },
    handler: async (ctx, args) => {
        // Check if conversation exists (participants can be in any order)
        const allConversations = await ctx.db.query("conversations").collect();

        const existingConversation = allConversations.find(
            (conv) =>
            (conv.participants.includes(args.userId1) &&
                conv.participants.includes(args.userId2) &&
                conv.participants.length === 2)
        );

        if (existingConversation) {
            return existingConversation._id;
        }

        // Create new conversation
        const conversationId = await ctx.db.insert("conversations", {
            participants: [args.userId1, args.userId2],
            createdAt: Date.now(),
            lastMessageAt: Date.now(),
        });

        return conversationId;
    },
});

/**
 * Get all conversations for a user
 */
export const getUserConversations = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        // Get conversations where user is participant
        const allConversations = await ctx.db.query("conversations").collect();

        const userConversations = allConversations.filter((conv) =>
            conv.participants.includes(args.userId)
        );

        // Enrich and filter by accepted session
        const enriched = (await Promise.all(
            userConversations.map(async (conv) => {
                // Check for accepted session
                const sessions = await ctx.db
                    .query("sessions")
                    .withIndex("by_conversation", (q) =>
                        q.eq("conversationId", conv._id)
                    )
                    .collect();

                const hasAcceptedSession = sessions.some(
                    (s) => s.status === "accepted" || s.status === "completed"
                );

                if (!hasAcceptedSession) return null;

                const otherUserId = conv.participants.find((id) => id !== args.userId)!;
                const otherUser = await ctx.db.get(otherUserId);

                // Get unread count
                const unreadMessages = await ctx.db
                    .query("messages")
                    .withIndex("by_conversation", (q) =>
                        q.eq("conversationId", conv._id)
                    )
                    .collect();

                const unreadCount = unreadMessages.filter(
                    (msg) =>
                        msg.senderId !== args.userId &&
                        !msg.readBy.includes(args.userId)
                ).length;

                return {
                    ...conv,
                    otherUser,
                    unreadCount,
                };
            })
        )).filter((c): c is NonNullable<typeof c> => c !== null);

        // Sort by last message time
        return enriched.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
    },
});

/**
 * Mark messages as read
 */
export const markMessagesAsRead = mutation({
    args: {
        conversationId: v.id("conversations"),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const messages = await ctx.db
            .query("messages")
            .withIndex("by_conversation", (q) =>
                q.eq("conversationId", args.conversationId)
            )
            .collect();

        const unreadMessages = messages.filter(
            (msg) => msg.senderId !== args.userId && !msg.readBy.includes(args.userId)
        );

        await Promise.all(
            unreadMessages.map((msg) =>
                ctx.db.patch(msg._id, {
                    readBy: [...msg.readBy, args.userId],
                })
            )
        );

        return unreadMessages.length;
    },
});

/**
 * Get total unread message count for a user
 */
export const getUnreadCount = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const allMessages = await ctx.db.query("messages").collect();

        const unreadMessages = allMessages.filter(
            (msg) => msg.senderId !== args.userId && !msg.readBy.includes(args.userId)
        );

        return unreadMessages.length;
    },
});
