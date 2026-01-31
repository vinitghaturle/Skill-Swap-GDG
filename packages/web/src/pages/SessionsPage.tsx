import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useQuery } from "convex/react";
import { api } from "../../../convex/convex/_generated/api";
import { useNavigate } from "react-router-dom";
import { SessionCard } from "../components/SessionCard";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, CalendarDays, Sparkles } from "lucide-react";
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
        { key: "all", label: "All" },
        { key: "pending", label: "Pending" },
        { key: "accepted", label: "Upcoming" },
        { key: "completed", label: "Past" },
    ];

    if (!currentUser) {
        return (
            <div className="min-h-screen bg-secondary-950 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-warm-500/20 border-t-warm-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-secondary-950 pb-24">
            {/* Minimalist Header */}
            <header className="bg-secondary-950/50 border-b border-warm-500/5 px-6 py-10 backdrop-blur-3xl sticky top-0 z-50">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => navigate("/dashboard")}
                            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-gray-400 hover:text-warm-400 transition-all group"
                        >
                            <ChevronLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <CalendarDays className="w-4 h-4 text-warm-500" />
                                <h1 className="text-2xl font-black text-white tracking-tight">My Sessions</h1>
                            </div>
                            <p className="text-xs font-bold tracking-wide text-gray-500">Your learning sessions and meetings</p>
                        </div>
                    </div>

                    <div className="hidden md:flex bg-white/5 p-1.5 rounded-2xl border border-white/5">
                        {filters.map((filter) => (
                            <button
                                key={filter.key}
                                onClick={() => setActiveFilter(filter.key)}
                                className={cn(
                                    "px-6 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all relative",
                                    activeFilter === filter.key ? "text-white" : "text-gray-500 hover:text-gray-300"
                                )}
                            >
                                {activeFilter === filter.key && (
                                    <motion.div
                                        layoutId="activeFilter"
                                        className="absolute inset-0 bg-warm-600 rounded-xl shadow-lg shadow-warm-500/20 z-0"
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
                                "py-4 rounded-2xl text-xs font-bold tracking-wide border transition-all",
                                activeFilter === filter.key
                                    ? "bg-warm-600 border-warm-500 text-white shadow-lg shadow-warm-500/20"
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
                        <div className="w-20 h-20 bg-warm-500/10 border border-warm-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
                            <CalendarDays className="w-8 h-8 text-warm-500" />
                        </div>
                        <h3 className="text-3xl font-black text-white mb-3">
                            No {activeFilter === 'all' ? 'Sessions' : activeFilter} Sessions
                        </h3>
                        <p className="text-gray-500 max-w-sm mx-auto mb-10 font-medium">
                            {activeFilter === "all"
                                ? "You don't have any sessions yet. Find a match and schedule your first learning session!"
                                : `You don't have any ${activeFilter} sessions right now.`}
                        </p>
                        {activeFilter === "all" && (
                            <Button onClick={() => navigate("/matches")} variant="primary">
                                Find Matches <Sparkles className="w-4 h-4 ml-2" />
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
                                                ? session.receiver?.displayName || "Anonymous"
                                                : session.requester?.displayName || "Anonymous"
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
