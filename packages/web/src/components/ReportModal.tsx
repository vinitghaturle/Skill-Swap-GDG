import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShieldAlert, CheckCircle2 } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/convex/_generated/api";
import type { Id } from "../../../convex/convex/_generated/dataModel";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";

interface ReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    reporterId: Id<"users">;
    reportedId: Id<"users">;
    reportedName: string;
}

const REPORT_REASONS = [
    "Harassment or Hate Speech",
    "Spam or Malicious Behavior",
    "Inappropriate Content",
    "Identity Theft / Fake Profile",
    "Other"
];

export const ReportModal = ({ isOpen, onClose, reporterId, reportedId, reportedName }: ReportModalProps) => {
    const [reason, setReason] = useState("");
    const [details, setDetails] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const reportUser = useMutation(api.safety.reportUser);

    const handleSubmit = async () => {
        if (!reason) return;
        setIsSubmitting(true);
        try {
            await reportUser({
                reporterId,
                reportedId,
                reason,
                details: details || undefined,
            });
            setIsSuccess(true);
            setTimeout(() => {
                onClose();
                setIsSuccess(false);
                setReason("");
                setDetails("");
            }, 2000);
        } catch (error) {
            console.error("Failed to report user:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-md">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="w-full max-w-md"
                    >
                        <Card variant="glass" className="overflow-hidden border-red-500/20">
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-red-500/10 rounded-xl">
                                            <ShieldAlert className="w-6 h-6 text-red-500" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-white">Security Report</h2>
                                            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Node: {reportedName}</p>
                                        </div>
                                    </div>
                                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                                        <X className="w-5 h-5 text-gray-500" />
                                    </button>
                                </div>

                                {isSuccess ? (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="py-12 text-center"
                                    >
                                        <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <CheckCircle2 className="w-8 h-8 text-green-500" />
                                        </div>
                                        <h3 className="text-xl font-bold text-white mb-2">Report Submitted</h3>
                                        <p className="text-sm text-gray-400">Our safety team will review this node interaction.</p>
                                    </motion.div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Primary Violation</label>
                                            <div className="grid grid-cols-1 gap-2">
                                                {REPORT_REASONS.map((r) => (
                                                    <button
                                                        key={r}
                                                        onClick={() => setReason(r)}
                                                        className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all border ${reason === r
                                                            ? "bg-red-500/10 border-red-500/50 text-white"
                                                            : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10"
                                                            }`}
                                                    >
                                                        {r}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Additional Context (Optional)</label>
                                            <textarea
                                                value={details}
                                                onChange={(e) => setDetails(e.target.value)}
                                                placeholder="Provide specific details about the incident..."
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 min-h-[100px] resize-none"
                                            />
                                        </div>

                                        <div className="flex gap-3 pt-4">
                                            <Button
                                                variant="secondary"
                                                className="flex-1"
                                                onClick={onClose}
                                            >
                                                Discard
                                            </Button>
                                            <Button
                                                variant="primary"
                                                className="flex-1 bg-red-600 hover:bg-red-700 border-red-500 shadow-red-500/20 shadow-lg"
                                                disabled={!reason || isSubmitting}
                                                onClick={handleSubmit}
                                            >
                                                {isSubmitting ? "Processing..." : "Submit Intelligence"}
                                            </Button>
                                        </div>
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
