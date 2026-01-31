import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star, CheckCircle2, AlertTriangle } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/convex/_generated/api";
import type { Id } from "../../../convex/convex/_generated/dataModel";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { cn } from "../lib/utils";

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    sessionId: Id<"sessions">;
    raterId: Id<"users">;
    rateeName: string;
}

export const FeedbackModal = ({ isOpen, onClose, sessionId, raterId, rateeName }: FeedbackModalProps) => {
    const [score, setScore] = useState(0);
    const [hoverScore, setHoverScore] = useState(0);
    const [comment, setComment] = useState("");
    const [dontMatchAgain, setDontMatchAgain] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const submitFeedback = useMutation(api.ratings.submitFeedback);

    const handleSubmit = async () => {
        if (score === 0) return;
        setIsSubmitting(true);
        try {
            await submitFeedback({
                sessionId,
                raterId,
                score,
                comment: comment || undefined,
                dontMatchAgain,
            });
            setIsSuccess(true);
            setTimeout(() => {
                onClose();
                setIsSuccess(false);
                setScore(0);
                setComment("");
                setDontMatchAgain(false);
            }, 2000);
        } catch (error) {
            console.error("Failed to submit feedback:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-950/90 backdrop-blur-xl">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="w-full max-w-md"
                    >
                        <Card variant="glass" className="overflow-hidden border-indigo-500/20 shadow-2xl shadow-indigo-500/10">
                            <div className="p-8">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h2 className="text-2xl font-black text-white tracking-tighter italic">Skill Swap</h2>
                                        <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mt-1">Rate your session with {rateeName}</p>
                                    </div>
                                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                                        <X className="w-5 h-5 text-gray-500" />
                                    </button>
                                </div>

                                {isSuccess ? (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.5 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="py-12 text-center"
                                    >
                                        <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                                        </div>
                                        <h3 className="text-2xl font-black text-white mb-2">Session Complete</h3>
                                        <p className="text-sm text-gray-400 font-medium">Session data updated in the database.</p>
                                    </motion.div>
                                ) : (
                                    <div className="space-y-8">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="flex gap-2">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <motion.button
                                                        key={star}
                                                        whileHover={{ scale: 1.2 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onMouseEnter={() => setHoverScore(star)}
                                                        onMouseLeave={() => setHoverScore(0)}
                                                        onClick={() => setScore(star)}
                                                        className="outline-none"
                                                    >
                                                        <Star
                                                            className={cn(
                                                                "w-10 h-10 transition-colors",
                                                                (hoverScore || score) >= star
                                                                    ? "fill-indigo-500 text-indigo-500"
                                                                    : "text-gray-700 hover:text-gray-600"
                                                            )}
                                                        />
                                                    </motion.button>
                                                ))}
                                            </div>
                                            <p className="text-xs font-black uppercase tracking-widest text-gray-500 h-4">
                                                {score === 1 && "Poor"}
                                                {score === 2 && "Ok"}
                                                {score === 3 && "Satisfactory"}
                                                {score === 4 && "Good"}
                                                {score === 5 && "Excellent"}
                                            </p>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Observations (Optional)</label>
                                            <textarea
                                                value={comment}
                                                onChange={(e) => setComment(e.target.value)}
                                                placeholder="Briefly describe the outcome of the exchange..."
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 min-h-[120px] resize-none"
                                            />
                                        </div>

                                        <label className="flex items-center gap-4 p-4 bg-white/5 border border-white/5 rounded-2xl cursor-pointer group hover:bg-white/10 transition-all">
                                            <div
                                                onClick={() => setDontMatchAgain(!dontMatchAgain)}
                                                className={cn(
                                                    "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                                                    dontMatchAgain ? "bg-red-500 border-red-500 shadow-lg shadow-red-500/20" : "border-gray-700"
                                                )}
                                            >
                                                {dontMatchAgain && <X className="w-4 h-4 text-white" strokeWidth={3} />}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs font-black text-white uppercase tracking-tight">Node Exclusion</p>
                                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Don't match with this person again</p>
                                            </div>
                                            <AlertTriangle className={cn("w-4 h-4 transition-colors", dontMatchAgain ? "text-red-500" : "text-gray-700")} />
                                        </label>

                                        <Button
                                            variant="primary"
                                            className="w-full py-4 text-base"
                                            disabled={score === 0 || isSubmitting}
                                            onClick={handleSubmit}
                                        >
                                            {isSubmitting ? "Syncing..." : "Transmit Intelligence"}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
