/**
 * Chat Room Page
 * Real-time messaging interface
 */

import { useAuth } from "../contexts/AuthContext";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/convex/_generated/api";
import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import type { Id } from "../../../convex/convex/_generated/dataModel";
import { PresenceIndicator } from "../components/PresenceIndicator";

export const ChatRoomPage = () => {
    const { conversationId: conversationIdParam } = useParams<{ conversationId: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [messageInput, setMessageInput] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const conversationId = conversationIdParam as Id<"conversations">;

    const currentUser = useQuery(
        api.auth.getUserByFirebaseUid,
        user ? { firebaseUid: user.uid } : "skip"
    );

    const messagesData = useQuery(
        api.chat.getConversationMessages,
        conversationId ? { conversationId } : "skip"
    );

    const sendMessage = useMutation(api.chat.sendMessage);
    const markAsRead = useMutation(api.chat.markMessagesAsRead);

    // Get conversation to find other user
    const conversations = useQuery(
        api.chat.getUserConversations,
        currentUser ? { userId: currentUser._id } : "skip"
    );

    const conversation = conversations?.find((c) => c._id === conversationId);

    // Mark messages as read when entering room
    useEffect(() => {
        if (currentUser && conversationId) {
            markAsRead({ conversationId, userId: currentUser._id });
        }
    }, [currentUser, conversationId, markAsRead]);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messagesData?.messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageInput.trim() || !currentUser || !conversationId) return;

        try {
            await sendMessage({
                conversationId,
                senderId: currentUser._id,
                text: messageInput.trim(),
            });
            setMessageInput("");
        } catch (error) {
            console.error("Failed to send message:", error);
        }
    };

    const formatMessageTime = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    if (!currentUser || conversations === undefined) {
        return (
            <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-warm-600"></div>
            </div>
        );
    }

    if (!conversation || !conversation.otherUser) {
        return (
            <div className="min-h-screen bg-secondary-50 flex flex-col items-center justify-center p-4">
                <div className="text-6xl mb-4">🔒</div>
                <h2 className="text-2xl font-bold text-secondary-900 mb-2">Chat Locked</h2>
                <p className="text-gray-600 text-center mb-6">
                    You can only chat with this user after a session request has been accepted.
                </p>
                <button
                    onClick={() => navigate("/sessions")}
                    className="px-6 py-2 bg-warm-600 text-white rounded-lg hover:bg-warm-700 font-medium"
                >
                    Go to Sessions
                </button>
            </div>
        );
    }

    const otherUser = conversation.otherUser;

    return (
        <div className="flex flex-col h-screen bg-secondary-50">
            {/* Header */}
            <header className="bg-white shadow-sm flex-shrink-0">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                            <button
                                onClick={() => navigate("/chat")}
                                className="text-gray-700 hover:text-secondary-900 hover:-translate-x-1 transition-all flex-shrink-0"
                            >
                                ←
                            </button>
                            <PresenceIndicator userId={otherUser._id} />
                            <h1 className="text-lg sm:text-xl font-bold text-secondary-900 truncate">
                                {otherUser.displayName || "Anonymous"}
                            </h1>
                        </div>
                        <button
                            onClick={() => navigate(`/matches/${otherUser._id}`)}
                            className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-warm-600 hover:text-warm-700 flex-shrink-0"
                        >
                            View Profile
                        </button>
                    </div>
                </div>
            </header>

            {/* Messages */}
            <main className="flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    {!messagesData || !messagesData.messages ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-warm-600"></div>
                        </div>
                    ) : messagesData.messages.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">👋</div>
                            <p className="text-gray-600">
                                No messages yet. Start the conversation!
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {messagesData.messages.map((message) => {
                                const isOwnMessage = message.senderId === currentUser._id;

                                return (
                                    <div
                                        key={message._id}
                                        className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                                    >
                                        <div
                                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${isOwnMessage
                                                ? "bg-warm-600 text-white"
                                                : "bg-white text-secondary-900 shadow-sm"
                                                }`}
                                        >
                                            <p className="text-sm break-words">{message.text}</p>
                                            <p
                                                className={`text-xs mt-1 ${isOwnMessage ? "text-warm-100" : "text-gray-500"
                                                    }`}
                                            >
                                                {formatMessageTime(message.timestamp)}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>
            </main>

            {/* Message Input */}
            <footer className="bg-white border-t flex-shrink-0">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <form onSubmit={handleSendMessage} className="flex gap-3">
                        <input
                            type="text"
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-1 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-warm-500 focus:border-warm-500 text-sm sm:text-base"
                        />
                        <button
                            type="submit"
                            disabled={!messageInput.trim()}
                            className="px-4 sm:px-6 py-2 bg-warm-600 text-white rounded-lg hover:bg-warm-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition"
                        >
                            Send
                        </button>
                    </form>
                </div>
            </footer>
        </div>
    );
};
