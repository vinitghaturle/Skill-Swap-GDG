import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/convex/_generated/api";
import type { Id } from "../../../convex/convex/_generated/dataModel";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, Clock, BookOpen, Target, Info, ArrowRight, Zap } from "lucide-react";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { cn } from "../lib/utils";

interface SessionRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUserId: Id<"users">;
    matchUserId: Id<"users">;
    matchUserName: string;
    availableSkills: string[];
    conversationId?: Id<"conversations">;
}

export const SessionRequestModal: React.FC<SessionRequestModalProps> = ({
    isOpen,
    onClose,
    currentUserId,
    matchUserId,
    matchUserName,
    availableSkills,
    conversationId,
}) => {
    const [selectedSkill, setSelectedSkill] = useState(availableSkills[0] || "");
    const [scheduledDate, setScheduledDate] = useState("");
    const [scheduledTime, setScheduledTime] = useState("");
    const [duration, setDuration] = useState<30 | 60 | 120>(60);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    const createSessionRequest = useMutation(api.sessions.createSessionRequest);
    const getOrCreateConversation = useMutation(api.chat.getOrCreateConversation);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!selectedSkill || !scheduledDate || !scheduledTime) {
            setError("Please fill in all diagnostic fields");
            return;
        }

        const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
        const scheduledAt = scheduledDateTime.getTime();

        if (scheduledAt < Date.now()) {
            setError("Temporal coordinates must be in the future");
            return;
        }

        setIsSubmitting(true);

        try {
            let convId = conversationId;
            if (!convId) {
                convId = await getOrCreateConversation({
                    userId1: currentUserId,
                    userId2: matchUserId,
                });
            }

            await createSessionRequest({
                requesterId: currentUserId,
                receiverId: matchUserId,
                skill: selectedSkill,
                scheduledAt,
                duration,
                conversationId: convId,
            });

            onClose();
            setSelectedSkill(availableSkills[0] || "");
            setScheduledDate("");
            setScheduledTime("");
            setDuration(60);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to initialize session uplink");
        } finally {
            setIsSubmitting(false);
        }
    };

    const today = new Date().toISOString().split("T")[0];

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-gray-950/80 backdrop-blur-md"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 40 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 40 }}
                        className="relative w-full max-w-lg"
                    >
                        <Card variant="glass" className="overflow-hidden border-white/5 shadow-2xl">
                            <div className="p-8">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <Calendar className="w-4 h-4 text-indigo-500" />
                                            <h2 className="text-2xl font-black text-white tracking-tight uppercase">Session Uplink</h2>
                                        </div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Node interaction with {matchUserName}</p>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-gray-400 hover:text-white transition-all border border-white/5"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-8">
                                    {/* Skill Matrix */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <BookOpen className="w-4 h-4" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Skill Vector</span>
                                        </div>
                                        <div className="relative group">
                                            <select
                                                value={selectedSkill}
                                                onChange={(e) => setSelectedSkill(e.target.value)}
                                                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none group-hover:bg-white/[0.05] transition-all"
                                                required
                                            >
                                                {availableSkills.map((skill) => (
                                                    <option key={skill} value={skill} className="bg-gray-900">
                                                        {skill}
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                                                <Target className="w-4 h-4" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Temporal Alignment */}
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 text-gray-400">
                                                <Calendar className="w-4 h-4" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Calendar Date</span>
                                            </div>
                                            <input
                                                type="date"
                                                value={scheduledDate}
                                                onChange={(e) => setScheduledDate(e.target.value)}
                                                min={today}
                                                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 group-hover:bg-white/[0.05] transition-all [color-scheme:dark]"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 text-gray-400">
                                                <Clock className="w-4 h-4" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Time Sync</span>
                                            </div>
                                            <input
                                                type="time"
                                                value={scheduledTime}
                                                onChange={(e) => setScheduledTime(e.target.value)}
                                                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 group-hover:bg-white/[0.05] transition-all [color-scheme:dark]"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Duration Selection */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <Zap className="w-4 h-4" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Temporal Span</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3">
                                            {[30, 60, 120].map((mins) => (
                                                <motion.button
                                                    key={mins}
                                                    type="button"
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={() => setDuration(mins as 30 | 60 | 120)}
                                                    className={cn(
                                                        "px-4 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border",
                                                        duration === mins
                                                            ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20"
                                                            : "bg-white/[0.03] border-white/5 text-gray-500 hover:text-gray-300 hover:bg-white/[0.05]"
                                                    )}
                                                >
                                                    {mins}m
                                                </motion.button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Error Feed */}
                                    <AnimatePresence>
                                        {error && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3"
                                            >
                                                <Info className="w-4 h-4 text-red-500 shrink-0" />
                                                <p className="text-xs font-bold text-red-500">{error}</p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Action Threshold */}
                                    <div className="flex gap-4 pt-4">
                                        <Button
                                            type="button"
                                            onClick={onClose}
                                            variant="secondary"
                                            className="flex-1"
                                        >
                                            Abort
                                        </Button>
                                        <Button
                                            type="submit"
                                            isLoading={isSubmitting}
                                            variant="primary"
                                            className="flex-[2]"
                                        >
                                            Initialize Uplink <ArrowRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </Card>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
