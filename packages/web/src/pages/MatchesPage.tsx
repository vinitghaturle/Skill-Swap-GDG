import { useAuth } from "../contexts/AuthContext";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/convex/_generated/api";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, SlidersHorizontal, Sparkles, ArrowLeft, ArrowRight, BookOpen, GraduationCap } from "lucide-react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { cn } from "../lib/utils";

export const MatchesPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [minScore, setMinScore] = useState(0);

    const currentUser = useQuery(
        api.auth.getUserByFirebaseUid,
        user ? { firebaseUid: user.uid } : "skip"
    );

    const matches = useQuery(
        api.matching.getMatchesForUser,
        currentUser ? { userId: currentUser._id } : "skip"
    );

    const recordExposed = useMutation(api.matching.recordMatchesExposed);
    const [hasRecorded, setHasRecorded] = useState(false);

    useEffect(() => {
        if (matches && matches.length > 0 && !hasRecorded) {
            recordExposed({ userIds: matches.map(m => m.userId) });
            setHasRecorded(true);
        }
    }, [matches, hasRecorded, recordExposed]);

    const filteredMatches = matches?.filter((m) => m.score >= minScore) || [];

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.05
            }
        }
    };

    if (!currentUser) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <Loader />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 pb-20">
            {/* Header */}
            <div className="relative overflow-hidden bg-gray-900/50 border-b border-white/5 px-6 py-12 mb-12 backdrop-blur-3xl">
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-20">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/20 blur-[120px] rounded-full" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/20 blur-[120px] rounded-full" />
                </div>

                <div className="max-w-7xl mx-auto relative z-10">
                    <motion.button
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={() => navigate("/dashboard")}
                        className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-xs font-black uppercase tracking-widest mb-8"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Return to Command Center
                    </motion.button>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                        <div>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <Badge variant="info" className="mb-4">Intelligence Engine</Badge>
                                <h1 className="text-5xl font-black text-white tracking-tighter sm:text-6xl">
                                    Discover <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Potential</span>
                                </h1>
                                <p className="text-gray-400 mt-4 text-lg font-medium max-w-xl leading-relaxed">
                                    Our matching algorithm analyzed thousands of endpoints to find the perfect skill exchange nodes for you.
                                </p>
                            </motion.div>
                        </div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white/[0.03] border border-white/5 rounded-3xl p-6 backdrop-blur-xl md:w-80"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2 text-gray-400">
                                    <SlidersHorizontal className="w-4 h-4" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Match Threshold</span>
                                </div>
                                <span className="text-indigo-400 font-black">{minScore}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                step="10"
                                value={minScore}
                                onChange={(e) => setMinScore(Number(e.target.value))}
                                className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6">
                {matches === undefined ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-12">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <Card key={i} className="h-80 animate-pulse bg-white/5" variant="flat">
                                <div className="h-full w-full" />
                            </Card>
                        ))}
                    </div>
                ) : filteredMatches.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="py-24 text-center border-2 border-dashed border-white/5 rounded-[3rem]"
                    >
                        <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8 border border-white/5">
                            <Search className="w-10 h-10 text-gray-700" />
                        </div>
                        <h3 className="text-3xl font-black text-white mb-4 tracking-tight">
                            Scanning Result: Empty
                        </h3>
                        <p className="text-gray-500 max-w-md mx-auto mb-10 font-medium">
                            {matches.length === 0
                                ? "We need more data to generate matches. Enhance your profile with skills you can teach and skills you want to learn."
                                : "No entities found within this threshold. Try reducing the match requirements."}
                        </p>
                        {matches.length === 0 && (
                            <Button onClick={() => navigate("/profile/setup")}>
                                Enhance Profile Node
                            </Button>
                        )}
                    </motion.div>
                ) : (
                    <motion.div
                        variants={container}
                        initial="hidden"
                        animate="show"
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                    >
                        <AnimatePresence mode="popLayout">
                            {filteredMatches.map((match) => (
                                <MatchCard
                                    key={match.userId}
                                    match={match}
                                    onClick={() => navigate(`/matches/${match.userId}`)}
                                />
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}
            </main>
        </div>
    );
};

const Loader = () => (
    <div className="relative">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping" />
        </div>
    </div>
);

const MatchCard = ({ match, onClick }: { match: any; onClick: () => void }) => {
    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 },
        exit: { opacity: 0, scale: 0.9 }
    };

    return (
        <motion.div variants={item} layout>
            <Card variant="glass" className="h-full flex flex-col group p-2">
                <div className="p-6 flex-1">
                    {/* Score Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400 font-black">
                                {match.score}%
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Match Probability</h4>
                                <p className="text-xs text-gray-500 font-bold">
                                    {match.score >= 80 ? "Critical Connection" : "Stable Link"}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {match.profile._creationTime > Date.now() - 7 * 24 * 60 * 60 * 1000 && (
                                <Badge variant="info" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20">New</Badge>
                            )}
                            <Sparkles className={cn("w-5 h-5 transition-colors", match.score >= 80 ? "text-amber-400" : "text-gray-700")} />
                        </div>
                    </div>

                    {/* Content */}
                    <div className="mb-8">
                        <h3 className="text-2xl font-black text-white mb-2 leading-tight group-hover:text-indigo-400 transition-colors">
                            {match.user?.displayName || "Node_Unknown"}
                        </h3>
                        <p className="text-sm text-gray-400 font-medium line-clamp-2 leading-relaxed h-10">
                            {match.profile.bio || "No biometric data transmitted for this entity."}
                        </p>
                    </div>

                    {/* Skill Clusters */}
                    <div className="space-y-6">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                                <GraduationCap className="w-3.5 h-3.5" />
                                Masters Of
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {match.profile.teachSkills.slice(0, 3).map((skill: string) => (
                                    <Badge key={skill} variant="success" className="bg-emerald-500/5 hover:bg-emerald-500/10">
                                        {skill}
                                    </Badge>
                                ))}
                                {match.profile.teachSkills.length > 3 && (
                                    <span className="text-[10px] text-gray-600 font-black">+{match.profile.teachSkills.length - 3} MORE</span>
                                )}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                                <BookOpen className="w-3.5 h-3.5" />
                                Seeking Insight
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {match.profile.learnSkills.slice(0, 3).map((skill: string) => (
                                    <Badge key={skill} className="bg-white/5 border-white/5 hover:bg-white/10 text-gray-400">
                                        {skill}
                                    </Badge>
                                ))}
                                {match.profile.learnSkills.length > 3 && (
                                    <span className="text-[10px] text-gray-600 font-black">+{match.profile.learnSkills.length - 3} MORE</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-white/[0.02] border-t border-white/5 rounded-b-[1.75rem] mt-4">
                    <Button onClick={onClick} className="w-full" variant="secondary">
                        Establish Connection <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            </Card>
        </motion.div>
    );
};
