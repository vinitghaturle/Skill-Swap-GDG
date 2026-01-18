/**
 * SessionChat - Compact chat component for use in video call sidebar
 * Features real-time messaging and automatic scroll
 */

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/convex/_generated/api';
import type { Id } from '../../../convex/convex/_generated/dataModel';

interface SessionChatProps {
    conversationId: Id<"conversations">;
    currentUserId: Id<"users">;
    sessionStatus?: string; // Add session status
}

export function SessionChat({ conversationId, currentUserId, sessionStatus }: SessionChatProps) {
    const [messageInput, setMessageInput] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const messagesData = useQuery(
        api.chat.getConversationMessages,
        { conversationId }
    );

    const sendMessage = useMutation(api.chat.sendMessage);
    const markAsRead = useMutation(api.chat.markMessagesAsRead);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messagesData?.messages]);

    // Mark as read
    useEffect(() => {
        markAsRead({ conversationId, userId: currentUserId });
    }, [conversationId, currentUserId, markAsRead, messagesData?.messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageInput.trim()) return;

        try {
            await sendMessage({
                conversationId,
                senderId: currentUserId,
                text: messageInput.trim(),
            });
            setMessageInput("");
        } catch (error) {
            console.error("Failed to send message:", error);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-900/50">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
                {messagesData?.messages.map((msg) => {
                    const isOwn = msg.senderId === currentUserId;
                    return (
                        <div key={msg._id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                            <div className={`
                                max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-lg
                                ${isOwn
                                    ? 'bg-indigo-600 text-white rounded-br-none'
                                    : 'bg-gray-800 text-gray-100 rounded-bl-none border border-white/5'
                                }
                            `}>
                                <p className="leading-relaxed break-words">{msg.text}</p>
                                <p className={`text-[10px] mt-1 ${isOwn ? 'text-indigo-200' : 'text-gray-500'} font-mono`}>
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-gray-900/80 border-t border-white/5">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                        type="text"
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                    />
                    <button
                        type="submit"
                        disabled={!messageInput.trim() || sessionStatus !== 'accepted'}
                        className="w-10 h-10 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shadow-lg shadow-indigo-600/20"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9-7-9-7V19z" />
                        </svg>
                    </button>
                </form>
            </div>
        </div>
    );
}
