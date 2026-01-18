import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * SkillSwap Hub Database Schema
 * 
 * Ownership: Convex owns all application state
 * External services (Firebase, Dropbox) are adapters only
 */

export default defineSchema({
  // ============ USERS ============
  users: defineTable({
    firebaseUid: v.string(),          // From Firebase Auth - unique identity
    email: v.string(),
    displayName: v.string(),
    photoURL: v.optional(v.string()),
    createdAt: v.number(),
    lastSeen: v.number(),
  })
    .index("by_firebase_uid", ["firebaseUid"])
    .index("by_email", ["email"]),

  // ============ PROFILES ============
  profiles: defineTable({
    userId: v.id("users"),
    bio: v.string(),
    teachSkills: v.array(v.string()),    // Skills user can teach
    learnSkills: v.array(v.string()),    // Skills user wants to learn
    languages: v.array(v.string()),      // Spoken languages
    timezone: v.string(),
    availability: v.object({             // Weekly schedule
      monday: v.optional(v.array(v.object({ start: v.string(), end: v.string() }))),
      tuesday: v.optional(v.array(v.object({ start: v.string(), end: v.string() }))),
      wednesday: v.optional(v.array(v.object({ start: v.string(), end: v.string() }))),
      thursday: v.optional(v.array(v.object({ start: v.string(), end: v.string() }))),
      friday: v.optional(v.array(v.object({ start: v.string(), end: v.string() }))),
      saturday: v.optional(v.array(v.object({ start: v.string(), end: v.string() }))),
      sunday: v.optional(v.array(v.object({ start: v.string(), end: v.string() }))),
    }),
    trustScore: v.number(),              // 0-100, starts at 50
    profileCompleted: v.boolean(),       // Has user finished onboarding?
    // Fairness & Anti-Dominance Metrics
    impressions: v.optional(v.number()),             // Total times shown in match lists
    lastMatchAt: v.optional(v.number()), // Last time matched/requested
    sessionsAccepted: v.optional(v.number()),        // Positive outcome counter
    sessionsDeclined: v.optional(v.number()),        // Negative outcome counter
    // Trust & Safety
    isShadowBanned: v.optional(v.boolean()),         // Is user isolated from discovery?
    reputationScore: v.optional(v.number()),         // Dynamic safety score, starts at 100
    skillStats: v.optional(v.array(v.object({
      skill: v.string(),
      sessionsCompleted: v.number(),
      totalMinutes: v.number(),
      averageRating: v.number(),
    }))),
    isAdmin: v.optional(v.boolean()),     // Platform administration rights
  })
    .index("by_user", ["userId"])
    .index("by_completed", ["profileCompleted"]),

  // ============ SKILLS ============
  skills: defineTable({
    name: v.string(),
    category: v.string(),                // "Programming", "Design", "Music", etc.
    createdBy: v.id("users"),
    verified: v.boolean(),               // Admin-verified to prevent spam
    createdAt: v.number(),
  })
    .index("by_name", ["name"])
    .index("by_category", ["category"]),

  // ============ CONVERSATIONS ============
  conversations: defineTable({
    participants: v.array(v.id("users")),  // Always 2 for 1:1
    createdAt: v.number(),
    lastMessageAt: v.number(),
    lastMessage: v.optional(v.object({
      text: v.string(),
      senderId: v.id("users"),
      timestamp: v.number(),
    })),
  })
    .index("by_participant", ["participants"])
    .index("by_last_message", ["lastMessageAt"]),

  // ============ MESSAGES ============
  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    text: v.string(),
    timestamp: v.number(),
    readBy: v.array(v.id("users")),      // Track read status
    fileId: v.optional(v.id("files")),   // Optional file attachment
  })
    .index("by_conversation", ["conversationId"])
    .index("by_timestamp", ["timestamp"]),

  // ============ PRESENCE ============
  presence: defineTable({
    userId: v.id("users"),
    status: v.union(v.literal("online"), v.literal("away"), v.literal("offline")),
    lastSeen: v.number(),
    currentActivity: v.optional(v.string()),  // "In a call", "Typing..."
  })
    .index("by_user", ["userId"]),

  // ============ SESSIONS ============
  sessions: defineTable({
    requesterId: v.id("users"),
    receiverId: v.id("users"),
    skill: v.string(),                   // What they'll work on
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("declined"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    scheduledAt: v.number(),             // Unix timestamp
    duration: v.number(),                // Minutes
    conversationId: v.id("conversations"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_requester", ["requesterId"])
    .index("by_receiver", ["receiverId"])
    .index("by_status", ["status"])
    .index("by_scheduled", ["scheduledAt"])
    .index("by_conversation", ["conversationId"]),

  // ============ CALLS ============
  calls: defineTable({
    sessionId: v.id("sessions"),
    callerId: v.id("users"),
    receiverId: v.id("users"),
    status: v.union(
      v.literal("idle"),
      v.literal("ringing"),
      v.literal("connecting"),
      v.literal("connected"),
      v.literal("ended"),
      v.literal("failed")
    ),
    startedAt: v.optional(v.number()),
    endedAt: v.optional(v.number()),
    duration: v.optional(v.number()),    // Seconds
    failureReason: v.optional(v.string()),
    // WebRTC-specific fields
    iceConnectionState: v.optional(v.union(
      v.literal("new"),
      v.literal("checking"),
      v.literal("connected"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("disconnected"),
      v.literal("closed")
    )),
    connectionType: v.optional(v.union(
      v.literal("direct"),   // STUN - peer-to-peer
      v.literal("relay"),    // TURN - relayed
      v.literal("unknown")
    )),
    turnCredentialsUsed: v.optional(v.boolean()),
    qualityMetrics: v.optional(v.object({
      bitrate: v.number(),        // kbps
      packetLoss: v.number(),     // percentage
      latency: v.number(),        // ms
      resolution: v.string(),     // e.g., "1280x720"
      lastUpdated: v.number(),
    })),
  })
    .index("by_session", ["sessionId"])
    .index("by_status", ["status"])
    .index("by_caller", ["callerId"])
    .index("by_receiver", ["receiverId"]),

  // ============ FILES ============
  files: defineTable({
    ownerId: v.id("users"),
    fileName: v.string(),
    fileSize: v.number(),
    mimeType: v.string(),
    storageProvider: v.string(),         // "firebase" | "dropbox" | "s3"
    externalFileId: v.string(),          // Firebase/Dropbox/S3 file ID
    downloadUrl: v.optional(v.string()), // Signed download URL (expires)
    uploadedAt: v.number(),
    sharedWith: v.array(v.id("users")), // Access control
    conversationId: v.optional(v.id("conversations")),
    sessionId: v.optional(v.id("sessions")),
  })
    .index("by_owner", ["ownerId"])
    .index("by_conversation", ["conversationId"])
    .index("by_session", ["sessionId"]),

  // ============ NOTIFICATIONS ============
  notifications: defineTable({
    userId: v.id("users"),
    type: v.string(),                    // "message", "session_request", "session_accepted", "call_incoming"
    title: v.string(),
    body: v.string(),
    read: v.boolean(),
    createdAt: v.number(),
    data: v.optional(v.object({          // Custom data for different notification types
      conversationId: v.optional(v.id("conversations")),
      sessionId: v.optional(v.id("sessions")),
      callId: v.optional(v.id("calls")),
    })),
  })
    .index("by_user", ["userId"])
    .index("by_read", ["read"])
    .index("by_created", ["createdAt"]),

  // ============ RATINGS ============
  ratings: defineTable({
    sessionId: v.id("sessions"),
    raterId: v.id("users"),              // Who gave the rating
    rateeId: v.id("users"),              // Who was rated
    score: v.number(),                   // 1-5
    comment: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_ratee", ["rateeId"]),

  // ============ NOTIFICATION TOKENS ============
  notificationTokens: defineTable({
    userId: v.id("users"),
    token: v.string(),                   // FCM token
    deviceType: v.union(v.literal("web"), v.literal("mobile")),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"]),

  // ============ ICE SERVER CONFIGS ============
  iceServerConfigs: defineTable({
    userId: v.id("users"),
    turnUsername: v.string(),
    turnCredential: v.string(),
    expiresAt: v.number(),               // Unix timestamp
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_expiry", ["expiresAt"]),

  // ============ LOGS ============
  logs: defineTable({
    userId: v.optional(v.id("users")),
    category: v.union(
      v.literal("auth"),
      v.literal("matching"),
      v.literal("chat"),
      v.literal("call"),
      v.literal("system"),
      v.literal("compliance")
    ),
    level: v.union(v.literal("info"), v.literal("warn"), v.literal("error")),
    message: v.string(),
    metadata: v.optional(v.any()),
    timestamp: v.number(),
  })
    .index("by_category", ["category"])
    .index("by_timestamp", ["timestamp"])
    .index("by_user_timestamp", ["userId", "timestamp"]),

  // ============ REPORTS ============
  reports: defineTable({
    reporterId: v.id("users"),
    reportedId: v.id("users"),
    reason: v.string(),
    details: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("resolved"), v.literal("dismissed")),
    createdAt: v.number(),
  })
    .index("by_reported", ["reportedId"])
    .index("by_status", ["status"]),

  // ============ BLOCKS ============
  blocks: defineTable({
    blockerId: v.id("users"),
    blockedId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_blocker", ["blockerId"])
    .index("by_blocked", ["blockedId"])
    .index("by_pair", ["blockerId", "blockedId"]),

  // ============ RATE LIMITS ============
  rateLimits: defineTable({
    userId: v.id("users"),
    key: v.string(),                     // e.g., "chat:sendMessage", "sessions:request"
    count: v.number(),
    lastActionAt: v.number(),
  })
    .index("by_user_key", ["userId", "key"]),

  // ============ MATCH PREFERENCES ============
  matchPreferences: defineTable({
    userId: v.id("users"),
    excludedUserId: v.id("users"),
    reason: v.optional(v.literal("dont_match_again")),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_exclusion", ["userId", "excludedUserId"]),

  // ============ SYSTEM CONFIG ============
  systemConfig: defineTable({
    key: v.string(),                     // e.g., "matchingEnabled", "maintenanceMode"
    value: v.any(),                      // Boolean, string, or complex config
    description: v.optional(v.string()),
    updatedAt: v.number(),
    updatedBy: v.id("users"),
  })
    .index("by_key", ["key"]),

  // ============ SECURITY ============
  sessionTokens: defineTable({
    sessionId: v.id("sessions"),         // Associated session
    token: v.string(),                   // HMAC-SHA256 signed token (hashed)
    issuedAt: v.number(),
    expiresAt: v.number(),
    usedBy: v.array(v.id("users")),      // Users who have validated this token
    isRevoked: v.boolean(),
  })
    .index("by_session", ["sessionId"])
    .index("by_token", ["token"]),

  signalLog: defineTable({
    sessionId: v.id("sessions"),         // Associated session
    senderId: v.id("users"),
    signalType: v.string(),              // "offer", "answer", "candidate"
    signalHash: v.string(),              // SHA256 hash of signal payload
    timestamp: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_hash", ["signalHash"])
    .index("by_timestamp", ["timestamp"]),
});
