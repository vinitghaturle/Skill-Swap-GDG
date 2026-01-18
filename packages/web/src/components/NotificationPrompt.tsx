/**
 * NotificationPrompt - UI component to request notification permission
 */

import { useState } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import type { Id } from '../../../convex/convex/_generated/dataModel';

interface NotificationPromptProps {
    userId: Id<"users">;
    onDismiss?: () => void;
    className?: string;
}

export function NotificationPrompt({ userId, onDismiss, className = '' }: NotificationPromptProps) {
    const { permissionStatus, enablePush, isLoading } = useNotifications({ userId });
    const [dismissed, setDismissed] = useState(false);

    // Don't show if already granted, denied, or dismissed
    if (permissionStatus === 'granted' || permissionStatus === 'denied' || dismissed) {
        return null;
    }

    // Don't show if notifications not supported
    if (permissionStatus === 'unsupported') {
        return null;
    }

    const handleEnable = async () => {
        const success = await enablePush();
        if (success) {
            onDismiss?.();
        }
    };

    const handleDismiss = () => {
        setDismissed(true);
        localStorage.setItem('notification_prompt_dismissed', 'true');
        onDismiss?.();
    };

    return (
        <div className={`bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-6 ${className}`}>
            <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="p-3 bg-indigo-500/20 rounded-xl shrink-0">
                    <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-white mb-1">
                        Stay Updated
                    </h3>
                    <p className="text-sm text-gray-400 mb-4">
                        Enable notifications to know when you receive messages, session requests, or incoming calls — even when you're not in the app.
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleEnable}
                            disabled={isLoading}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Enabling...
                                </span>
                            ) : (
                                'Enable Notifications'
                            )}
                        </button>
                        <button
                            onClick={handleDismiss}
                            className="px-4 py-2 text-gray-400 hover:text-white text-sm font-medium transition-colors"
                        >
                            Maybe Later
                        </button>
                    </div>
                </div>

                {/* Close button */}
                <button
                    onClick={handleDismiss}
                    className="p-1 text-gray-500 hover:text-gray-300 transition-colors shrink-0"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
}

/**
 * Compact notification bell button with unread badge
 */
interface NotificationBellProps {
    userId: Id<"users">;
    onClick?: () => void;
    className?: string;
}

export function NotificationBell({ userId, onClick, className = '' }: NotificationBellProps) {
    const { unreadCount } = useNotifications({ userId });

    return (
        <button
            onClick={onClick}
            className={`relative p-2 rounded-xl hover:bg-white/5 transition-colors ${className}`}
        >
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>

            {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                </span>
            )}
        </button>
    );
}
