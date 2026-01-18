/**
 * useNotifications - React hook for push notification management
 */

import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/convex/_generated/api';
import type { Id } from '../../../convex/convex/_generated/dataModel';
import { requestFCMToken, onForegroundMessage } from '../lib/firebase';

export type NotificationPermissionStatus = 'default' | 'granted' | 'denied' | 'unsupported';

interface UseNotificationsOptions {
    userId: Id<"users"> | null;
}

interface UseNotificationsReturn {
    // Permission
    permissionStatus: NotificationPermissionStatus;
    requestPermission: () => Promise<boolean>;

    // In-app notifications
    notifications: any[];
    unreadCount: number;
    markAsRead: (notificationId: Id<"notifications">) => Promise<void>;
    markAllAsRead: () => Promise<void>;

    // Push notifications
    isPushEnabled: boolean;
    enablePush: () => Promise<boolean>;
    disablePush: () => Promise<void>;

    // Loading state
    isLoading: boolean;
}

export function useNotifications({ userId }: UseNotificationsOptions): UseNotificationsReturn {
    const [permissionStatus, setPermissionStatus] = useState<NotificationPermissionStatus>('default');
    const [isPushEnabled, setIsPushEnabled] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [fcmToken, setFcmToken] = useState<string | null>(null);

    // Convex queries
    const notifications = useQuery(
        api.notifications.getNotifications,
        userId ? { userId, limit: 50 } : 'skip'
    ) ?? [];

    const unreadCount = useQuery(
        api.notifications.getUnreadCount,
        userId ? { userId } : 'skip'
    ) ?? 0;

    // Convex mutations
    const registerToken = useMutation(api.notifications.registerFCMToken);
    const unregisterToken = useMutation(api.notifications.unregisterFCMToken);
    const markNotificationAsRead = useMutation(api.notifications.markAsRead);
    const markAllNotificationsAsRead = useMutation(api.notifications.markAllAsRead);

    // Check initial permission status
    useEffect(() => {
        if (!('Notification' in window)) {
            setPermissionStatus('unsupported');
            return;
        }
        setPermissionStatus(Notification.permission as NotificationPermissionStatus);
    }, []);

    // Set up foreground message listener
    useEffect(() => {
        const cleanup = onForegroundMessage((payload) => {
            console.log('[Notifications] Foreground message:', payload);

            // Show browser notification even when app is focused (optional)
            if (Notification.permission === 'granted' && payload.notification) {
                new Notification(payload.notification.title || 'SkillSwap', {
                    body: payload.notification.body,
                    icon: '/favicon.ico',
                });
            }
        });

        return () => {
            if (cleanup) cleanup();
        };
    }, []);

    // Request notification permission
    const requestPermission = useCallback(async (): Promise<boolean> => {
        if (!('Notification' in window)) {
            setPermissionStatus('unsupported');
            return false;
        }

        try {
            const result = await Notification.requestPermission();
            setPermissionStatus(result as NotificationPermissionStatus);
            return result === 'granted';
        } catch (error) {
            console.error('[Notifications] Permission request failed:', error);
            return false;
        }
    }, []);

    // Enable push notifications (request permission + register token)
    const enablePush = useCallback(async (): Promise<boolean> => {
        if (!userId) {
            console.warn('[Notifications] No user ID provided');
            return false;
        }

        setIsLoading(true);

        try {
            // Request permission first
            const granted = await requestPermission();
            if (!granted) {
                setIsLoading(false);
                return false;
            }

            // Get FCM token
            const token = await requestFCMToken();
            if (!token) {
                console.error('[Notifications] Failed to get FCM token');
                setIsLoading(false);
                return false;
            }

            // Register token with Convex
            await registerToken({
                userId,
                token,
                deviceType: 'web',
            });

            setFcmToken(token);
            setIsPushEnabled(true);
            setIsLoading(false);
            console.log('[Notifications] Push notifications enabled');
            return true;
        } catch (error) {
            console.error('[Notifications] Failed to enable push:', error);
            setIsLoading(false);
            return false;
        }
    }, [userId, requestPermission, registerToken]);

    // Disable push notifications
    const disablePush = useCallback(async (): Promise<void> => {
        if (!userId || !fcmToken) return;

        setIsLoading(true);

        try {
            await unregisterToken({
                userId,
                token: fcmToken,
            });

            setFcmToken(null);
            setIsPushEnabled(false);
            console.log('[Notifications] Push notifications disabled');
        } catch (error) {
            console.error('[Notifications] Failed to disable push:', error);
        }

        setIsLoading(false);
    }, [userId, fcmToken, unregisterToken]);

    // Mark notification as read
    const markAsRead = useCallback(async (notificationId: Id<"notifications">): Promise<void> => {
        if (!userId) return;
        await markNotificationAsRead({ notificationId, userId });
    }, [userId, markNotificationAsRead]);

    // Mark all as read
    const markAllAsRead = useCallback(async (): Promise<void> => {
        if (!userId) return;
        await markAllNotificationsAsRead({ userId });
    }, [userId, markAllNotificationsAsRead]);

    return {
        permissionStatus,
        requestPermission,
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        isPushEnabled,
        enablePush,
        disablePush,
        isLoading,
    };
}
