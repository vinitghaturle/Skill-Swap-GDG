import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useQuery } from "convex/react";
import { api } from "../../../convex/convex/_generated/api";
import { useNavigate } from "react-router-dom";
import { SessionCard } from "../components/SessionCard";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, CalendarDays, Sparkles, LayoutGrid } from "lucide-react";
import { cn } from "../lib/utils";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";

type SessionFilter = "all" | "pending" | "accepted" | "completed";

export const SessionsPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [activeFilter, setActiveFilter] = useState<SessionFilter>("all");

    const currentUser = useQuery(
        api.auth.getUserByFirebaseUid,
        user ? { firebaseUid: user.uid } : "skip"
    );

    const allSessions = useQuery(
        api.sessions.getUserSessions,
        currentUser ? { userId: currentUser._id } : "skip"
    );

    const filteredSessions =
        activeFilter === "all"
            ? allSessions
            : allSessions?.filter((session) => session.status === activeFilter);

    const filters: { key: SessionFilter; label: string }[] = [
        { key: "all", label: "Registry" },
        { key: "pending", label: "Queued" },
        { key: "accepted", label: "Active" },
        { key: "completed", label: "Archived" },
    ];

    if (!currentUser) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 pb-24">
            {/* Minimalist Header */}
            <header className="bg-gray-950/50 border-b border-white/5 px-6 py-10 backdrop-blur-3xl sticky top-0 z-50">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => navigate("/dashboard")}
                            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-gray-400 hover:text-white transition-all"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <LayoutGrid className="w-4 h-4 text-indigo-500" />
                                <h1 className="text-2xl font-black text-white tracking-tight">Timeline</h1>
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Node interaction history</p>
                        </div>
                    </div>

                    <div className="hidden md:flex bg-white/5 p-1.5 rounded-2xl border border-white/5">
                        {filters.map((filter) => (
                            <button
                                key={filter.key}
                                onClick={() => setActiveFilter(filter.key)}
                                className={cn(
                                    "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative",
                                    activeFilter === filter.key ? "text-white" : "text-gray-500 hover:text-gray-300"
                                )}
                            >
                                {activeFilter === filter.key && (
                                    <motion.div
                                        layoutId="activeFilter"
                                        className="absolute inset-0 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/20 z-0"
                                    />
                                )}
                                <span className="relative z-10">{filter.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-12">
                {/* Mobile Filter Grid */}
                <div className="md:hidden grid grid-cols-2 gap-3 mb-10">
                    {filters.map((filter) => (
                        <button
                            key={filter.key}
                            onClick={() => setActiveFilter(filter.key)}
                            className={cn(
                                "py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all",
                                activeFilter === filter.key
                                    ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                                    : "bg-white/5 border-white/5 text-gray-500"
                            )}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>

                {!filteredSessions ? (
                    <div className="space-y-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-40 bg-white/5 rounded-[2rem] animate-pulse" />
                        ))}
                    </div>
                ) : filteredSessions.length === 0 ? (
                    <Card variant="glass" className="py-24 text-center border-dashed">
                        <div className="w-20 h-20 bg-indigo-500/10 border border-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
                            <CalendarDays className="w-8 h-8 text-indigo-500" />
                        </div>
                        <h3 className="text-3xl font-black text-white mb-3">
                            No {activeFilter === 'all' ? '' : activeFilter} events found
                        </h3>
                        <p className="text-gray-500 max-w-sm mx-auto mb-10 font-medium">
                            {activeFilter === "all"
                                ? "Your timeline is currently empty. Initiate a connection with your matches to start learning."
                                : `Entities with ${activeFilter} status are currently not registered in your node.`}
                        </p>
                        {activeFilter === "all" && (
                            <Button onClick={() => navigate("/matches")} variant="primary">
                                Launch Discovery <Sparkles className="w-4 h-4 ml-2" />
                            </Button>
                        )}
                    </Card>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-6"
                    >
                        <AnimatePresence mode="popLayout">
                            {filteredSessions.map((session, i) => (
                                <motion.div
                                    key={session._id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ delay: i * 0.05 }}
                                >
                                    <SessionCard
                                        sessionId={session._id}
                                        skill={session.skill}
                                        scheduledAt={session.scheduledAt}
                                        duration={session.duration}
                                        status={session.status}
                                        isRequester={session.isRequester}
                                        otherUserName={
                                            session.isRequester
                                                ? session.receiver?.displayName || "Unknown Node"
                                                : session.requester?.displayName || "Unknown Node"
                                        }
                                        otherUserPhoto={
                                            session.isRequester
                                                ? session.receiver?.photoURL
                                                : session.requester?.photoURL
                                        }
                                        otherUserId={
                                            session.isRequester
                                                ? session.receiverId
                                                : session.requesterId
                                        }
                                        currentUserId={currentUser._id}
                                        conversationId={session.conversationId}
                                    />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}
            </main>
        </div>
    );
};
