/**
 * Rate Limiting Middleware
 * Prevents signaling spam
 */

import { Socket } from 'socket.io';

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

export class RateLimiter {
    private limits: Map<string, RateLimitEntry> = new Map();
    private maxRequests: number;
    private windowMs: number;

    constructor(maxRequests: number = 10, windowMs: number = 1000) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;

        // Clean up expired entries every minute
        setInterval(() => this.cleanup(), 60000);
    }

    /**
     * Check if request is allowed
     */
    check(userId: string): boolean {
        const now = Date.now();
        const entry = this.limits.get(userId);

        if (!entry || now > entry.resetAt) {
            // New window
            this.limits.set(userId, {
                count: 1,
                resetAt: now + this.windowMs,
            });
            return true;
        }

        if (entry.count >= this.maxRequests) {
            return false;
        }

        entry.count++;
        return true;
    }

    /**
     * Clean up expired entries
     */
    private cleanup() {
        const now = Date.now();
        for (const [userId, entry] of this.limits.entries()) {
            if (now > entry.resetAt) {
                this.limits.delete(userId);
            }
        }
    }
}

export function createRateLimitMiddleware(rateLimiter: RateLimiter) {
    return (socket: Socket, next: (err?: Error) => void) => {
        const userId = (socket as any).userId;

        if (!userId) {
            return next(new Error('Unauthorized'));
        }

        if (!rateLimiter.check(userId)) {
            return next(new Error('Rate limit exceeded'));
        }

        next();
    };
}
