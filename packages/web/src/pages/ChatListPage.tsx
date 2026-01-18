/**
 * Chat List Page
 * Browse all conversations
 */

import { useAuth } from "../contexts/AuthContext";
import { useQuery } from "convex/react";
import { api } from "../../../convex/convex/_generated/api";
import { useNavigate } from "react-router-dom";
import { PresenceIndicator } from "../components/PresenceIndicator";

export const ChatListPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const currentUser = useQuery(
        api.auth.getUserByFirebaseUid,
        user ? { firebaseUid: user.uid } : "skip"
    );

    const conversations = useQuery(
        api.chat.getUserConversations,
        currentUser ? { userId: currentUser._id } : "skip"
    );

    const formatTimestamp = (timestamp: number) => {
        const now = Date.now();
        const diff = now - timestamp;

        if (diff < 60000) return "Just now";
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
        return new Date(timestamp).toLocaleDateString();
    };

    if (!currentUser) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
                        <button
                            onClick={() => navigate("/dashboard")}
                            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                        >
                            ← Back
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {!conversations ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                    </div>
                ) : conversations.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                        <div className="text-6xl mb-4">💬</div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            No conversations yet
                        </h3>
                        <p className="text-gray-600 mb-6">
                            Start chatting with your matches to begin!
                        </p>
                        <button
                            onClick={() => navigate("/matches")}
                            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
                        >
                            Find Matches
                        </button>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow-sm divide-y">
                        {conversations.map((conv) => (
                            <div
                                key={conv._id}
                                onClick={() => navigate(`/chat/${conv._id}`)}
                                className="p-4 hover:bg-gray-50 cursor-pointer transition"
                            >
                                <div className="flex items-start gap-4">
                                    {/* Presence Indicator */}
                                    <div className="flex-shrink-0 mt-1">
                                        {conv.otherUser && <PresenceIndicator userId={conv.otherUser._id} />}
                                    </div>

                                    {/* Conversation Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className="text-base font-semibold text-gray-900 truncate">
                                                {conv.otherUser?.displayName || "Unknown User"}
                                            </h3>
                                            <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                                                {formatTimestamp(conv.lastMessageAt)}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 truncate">
                                            {conv.lastMessage?.text || "No messages yet"}
                                        </p>
                                    </div>

                                    {/* Unread Badge */}
                                    {conv.unreadCount > 0 && (
                                        <div className="flex-shrink-0">
                                            <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-primary-600 rounded-full">
                                                {conv.unreadCount}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};
