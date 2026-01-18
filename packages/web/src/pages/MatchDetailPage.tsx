import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/convex/_generated/api";
import { useNavigate, useParams } from "react-router-dom";
import type { Id } from "../../../convex/convex/_generated/dataModel";
import { SessionRequestModal } from "../components/SessionRequestModal";
import { ReportModal } from "../components/ReportModal";
import { motion } from "framer-motion";
import { ChevronLeft, Brain, Zap, Target, Shield, Info, Calendar, MessageSquare, BookOpen, GraduationCap, Languages, Check, UserMinus } from "lucide-react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { cn } from "../lib/utils";

export const MatchDetailPage = () => {
    const { userId: matchUserIdParam } = useParams<{ userId: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [conversationId, setConversationId] = useState<Id<"conversations"> | undefined>();

    const currentUser = useQuery(
        api.auth.getUserByFirebaseUid,
        user ? { firebaseUid: user.uid } : "skip"
    );

    const matchUserId = matchUserIdParam as Id<"users">;

    const matchUser = useQuery(
        api.auth.getUserById,
        matchUserId ? { userId: matchUserId } : "skip"
    );

    const matchProfile = useQuery(
        api.profiles.getProfile,
        matchUser ? { userId: matchUser._id } : "skip"
    );

    const explanation = useQuery(
        api.matching.getMatchExplanation,
        currentUser && matchUser
            ? { userId1: currentUser._id, userId2: matchUser._id }
            : "skip"
    );

    const getOrCreateConversation = useMutation(api.chat.getOrCreateConversation);
    const blockUser = useMutation(api.safety.blockUser);

    const isLoading =
        currentUser === undefined ||
        matchUser === undefined ||
        matchProfile === undefined ||
        explanation === undefined;

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (!currentUser || !matchUser || !matchProfile || !explanation) {
        return (
            <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-8">
                <Card variant="glass" className="max-w-md w-full text-center p-12">
                    <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-8">
                        <Info className="w-10 h-10 text-red-500" />
                    </div>
                    <h2 className="text-3xl font-black text-white mb-4 tracking-tight">Entity Not Found</h2>
                    <p className="text-gray-500 mb-10 font-medium">
                        The requested match node could not be retrieved from the network.
                    </p>
                    <Button onClick={() => navigate("/matches")} variant="secondary">
                        Return to Discovery
                    </Button>
                </Card>
            </div>
        );
    }

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <div className="min-h-screen bg-gray-950 pb-24">
            {/* Header */}
            <header className="bg-gray-950/50 border-b border-white/5 px-6 py-10 backdrop-blur-3xl sticky top-0 z-50">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => navigate("/matches")}
                            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-gray-400 hover:text-white transition-all border border-white/5"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Brain className="w-4 h-4 text-indigo-500" />
                                <h1 className="text-2xl font-black text-white tracking-tight">Match Optimization</h1>
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Node analysis for {matchUser.displayName}</p>
                        </div>
                    </div>

                    <Button
                        onClick={async () => {
                            if (currentUser && matchUser) {
                                const convId = await getOrCreateConversation({
                                    userId1: currentUser._id,
                                    userId2: matchUser._id,
                                });
                                setConversationId(convId);
                                setIsSessionModalOpen(true);
                            }
                        }}
                        variant="primary"
                    >
                        <Calendar className="w-4 h-4 mr-2" /> Request Session
                    </Button>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-12">
                <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 lg:grid-cols-3 gap-8"
                >
                    {/* Left Column: Overview & Breakdown */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Hero Score Card */}
                        <motion.div variants={item}>
                            <Card variant="glass" className="relative overflow-hidden p-12 text-center border-indigo-500/20 bg-indigo-500/[0.02]">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
                                <div className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full" />
                                <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-purple-500/10 blur-[100px] rounded-full" />

                                <div className="relative z-10">
                                    <Badge variant="info" className="mb-6">Global Match Index</Badge>
                                    <div className="flex items-baseline justify-center gap-2 mb-4">
                                        <motion.span
                                            initial={{ scale: 0.5, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ type: "spring", stiffness: 200, damping: 10 }}
                                            className="text-9xl font-black text-white tracking-tighter"
                                        >
                                            {explanation.score}
                                        </motion.span>
                                        <span className="text-4xl font-black text-indigo-500/50">%</span>
                                    </div>
                                    <p className="text-gray-400 font-medium text-lg max-w-sm mx-auto">
                                        Exceptional synergy detected across all primary and secondary skill clusters.
                                    </p>
                                </div>
                            </Card>
                        </motion.div>

                        {/* Breakdown */}
                        <motion.div variants={item}>
                            <Card variant="glass" className="p-8">
                                <div className="flex items-center gap-3 mb-8">
                                    <Zap className="w-5 h-5 text-indigo-500" />
                                    <h2 className="text-xl font-black text-white uppercase tracking-tighter">Diagnostic Breakdown</h2>
                                </div>
                                <div className="space-y-8">
                                    <ScoreBar
                                        icon={<Target className="w-4 h-4" />}
                                        label="Skill Matrix Overlap"
                                        score={explanation.breakdown.skillMatch}
                                        max={40}
                                        color="indigo"
                                    />
                                    <ScoreBar
                                        icon={<Calendar className="w-4 h-4" />}
                                        label="Temporal Alignment"
                                        score={explanation.breakdown.availabilityMatch}
                                        max={30}
                                        color="purple"
                                    />
                                    <ScoreBar
                                        icon={<Languages className="w-4 h-4" />}
                                        label="Linguistic Translation"
                                        score={explanation.breakdown.languageMatch}
                                        max={20}
                                        color="emerald"
                                    />
                                    <ScoreBar
                                        icon={<Shield className="w-4 h-4" />}
                                        label="Network Reputation"
                                        score={explanation.breakdown.trustScore}
                                        max={10}
                                        color="amber"
                                    />
                                    {explanation.breakdown.fairnessAdjustment !== 0 && (
                                        <ScoreBar
                                            icon={<Brain className="w-4 h-4" />}
                                            label="Equitable Distribution"
                                            score={explanation.breakdown.fairnessAdjustment + 10}
                                            max={20}
                                            color="indigo"
                                        />
                                    )}
                                </div>
                            </Card>
                        </motion.div>

                        {/* Analysis Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <motion.div variants={item}>
                                <Card className="p-8 h-full bg-emerald-500/[0.02] border-emerald-500/20">
                                    <h3 className="text-lg font-black text-emerald-400 uppercase tracking-tighter mb-6 flex items-center gap-2">
                                        <Check className="w-4 h-4" /> Optimizations
                                    </h3>
                                    <ul className="space-y-4">
                                        {explanation.strengths.map((strength: string, i: number) => (
                                            <li key={i} className="flex gap-3 text-sm text-gray-400 font-medium">
                                                <span className="text-emerald-500 font-black">•</span>
                                                {strength}
                                            </li>
                                        ))}
                                    </ul>
                                </Card>
                            </motion.div>
                            <motion.div variants={item}>
                                <Card className="p-8 h-full bg-amber-500/[0.02] border-amber-500/20">
                                    <h3 className="text-lg font-black text-amber-400 uppercase tracking-tighter mb-6 flex items-center gap-2">
                                        <Info className="w-4 h-4" /> Constraints
                                    </h3>
                                    <ul className="space-y-4">
                                        {explanation.considerations.map((consideration: string, i: number) => (
                                            <li key={i} className="flex gap-3 text-sm text-gray-400 font-medium">
                                                <span className="text-amber-500 font-black">•</span>
                                                {consideration}
                                            </li>
                                        ))}
                                    </ul>
                                </Card>
                            </motion.div>
                        </div>
                    </div>

                    {/* Right Column: Profile Specs */}
                    <div className="space-y-8">
                        <motion.div variants={item}>
                            <Card variant="glass" className="p-8 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-5">
                                    <Brain className="w-32 h-32" />
                                </div>
                                <h2 className="text-xl font-black text-white uppercase tracking-tighter mb-8 flex items-center gap-3">
                                    <Shield className="w-5 h-5 text-indigo-500" /> Entity Profile
                                </h2>

                                <div className="space-y-8">
                                    <div>
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">Biometric Intel</h4>
                                        <p className="text-sm text-gray-300 font-medium leading-relaxed italic">
                                            "{matchProfile.bio}"
                                        </p>
                                    </div>

                                    <div>
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
                                            <GraduationCap className="w-3 h-3" /> Masters Of
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            {matchProfile.teachSkills.map((skill: string) => (
                                                <Badge key={skill} variant="success" className="bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors">
                                                    {skill}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
                                            <BookOpen className="w-3 h-3" /> Seeking Insights
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            {matchProfile.learnSkills.map((skill: string) => (
                                                <Badge key={skill} variant="info" className="bg-indigo-500/5 hover:bg-indigo-500/10 transition-colors">
                                                    {skill}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="pt-8 border-t border-white/5 space-y-3">
                                        <Button
                                            onClick={async () => {
                                                if (currentUser && matchUser) {
                                                    const convId = await getOrCreateConversation({
                                                        userId1: currentUser._id,
                                                        userId2: matchUser._id,
                                                    });
                                                    navigate(`/chat/${convId}`);
                                                }
                                            }}
                                            className="w-full"
                                            variant="secondary"
                                        >
                                            <MessageSquare className="w-4 h-4 mr-2" /> Direct Transmission
                                        </Button>

                                        <Button
                                            onClick={async () => {
                                                if (window.confirm(`Are you sure you want to block ${matchUser.displayName}? This will permanently restrict all future communication.`)) {
                                                    await blockUser({
                                                        blockerId: currentUser._id,
                                                        blockedId: matchUser._id,
                                                    });
                                                    navigate("/matches");
                                                }
                                            }}
                                            className="w-full border-red-500/20 text-red-500 hover:bg-red-500/10"
                                            variant="secondary"
                                        >
                                            <UserMinus className="w-4 h-4 mr-2" /> Block Interface
                                        </Button>

                                        <button
                                            onClick={() => setIsReportModalOpen(true)}
                                            className="w-full text-center py-2 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-red-400 transition-colors"
                                        >
                                            Submit Protocol Report
                                        </button>
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    </div>
                </motion.div>
            </main>

            {/* Session Request Modal */}
            {currentUser && matchUser && matchProfile && (
                <SessionRequestModal
                    isOpen={isSessionModalOpen}
                    onClose={() => setIsSessionModalOpen(false)}
                    currentUserId={currentUser._id}
                    matchUserId={matchUser._id}
                    matchUserName={matchUser.displayName}
                    availableSkills={matchProfile.teachSkills}
                    conversationId={conversationId}
                />
            )}

            {/* Report Modal */}
            {currentUser && matchUser && (
                <ReportModal
                    isOpen={isReportModalOpen}
                    onClose={() => setIsReportModalOpen(false)}
                    reporterId={currentUser._id}
                    reportedId={matchUser._id}
                    reportedName={matchUser.displayName}
                />
            )}
        </div>
    );
};

const ScoreBar = ({
    icon,
    label,
    score,
    max,
    color,
}: {
    icon: React.ReactNode;
    label: string;
    score: number;
    max: number;
    color: string;
}) => {
    const percentage = (score / max) * 100;

    const colors = {
        indigo: "bg-indigo-500 shadow-[0_0_15px_-3px_rgba(99,102,241,0.5)]",
        purple: "bg-purple-500 shadow-[0_0_15px_-3px_rgba(168,85,247,0.5)]",
        emerald: "bg-emerald-500 shadow-[0_0_15px_-3px_rgba(16,185,129,0.5)]",
        amber: "bg-amber-500 shadow-[0_0_15px_-3px_rgba(245,158,11,0.5)]",
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 group">
                    <div className="text-gray-500 group-hover:text-white transition-colors">
                        {icon}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 group-hover:text-gray-300 transition-colors">{label}</span>
                </div>
                <div className="flex items-baseline gap-1">
                    <span className="text-lg font-black text-white">{score}</span>
                    <span className="text-[10px] font-black text-gray-600">/ {max}</span>
                </div>
            </div>
            <div className="w-full bg-white/[0.03] rounded-full h-1.5 overflow-hidden border border-white/5">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
                    className={cn("h-full rounded-full transition-all", colors[color as keyof typeof colors])}
                />
            </div>
        </div>
    );
};
