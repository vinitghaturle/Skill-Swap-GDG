import { useAuth } from "../contexts/AuthContext";
import { useQuery } from "convex/react";
import { api } from "../../../convex/convex/_generated/api";
import { useNavigate } from "react-router-dom";
import { NotificationPrompt } from "../components/NotificationPrompt";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { motion } from "framer-motion";
import { Users, Calendar, MessageSquare, Rocket, Sparkles, Shield, Pencil } from "lucide-react";

export const DashboardPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const currentUser = useQuery(
        api.auth.getUserByFirebaseUid,
        user ? { firebaseUid: user.uid } : "skip"
    );

    const profile = useQuery(
        api.profiles.getProfile,
        currentUser ? { userId: currentUser._id } : "skip"
    );

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
        hidden: { y: 20, opacity: 0 },
        show: { y: 0, opacity: 1 }
    };

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-8 pb-12"
        >
            {/* Notification Permission Prompt */}
            {currentUser && (
                <motion.div variants={item}>
                    <NotificationPrompt userId={currentUser._id} />
                </motion.div>
            )}

            {/* Premium Hero Card */}
            <motion.div variants={item}>
                <Card className="relative overflow-hidden border-indigo-500/10 p-10">
                    <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-indigo-600/10 blur-[100px] rounded-full" />
                    <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-purple-600/10 blur-[100px] rounded-full" />

                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <Badge variant="info" className="bg-indigo-500/20">Welcome Back</Badge>
                                <motion.div
                                    animate={{ rotate: [0, 20, 0] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                >
                                    <Sparkles className="w-4 h-4 text-amber-400" />
                                </motion.div>
                            </div>
                            <h2 className="text-5xl font-black text-white mb-3 tracking-tighter">
                                Hello, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">{currentUser?.displayName?.split(' ')[0] || 'Explorer'}</span>!
                            </h2>
                            <p className="text-gray-400 text-lg max-w-xl leading-relaxed font-medium">
                                Ready to level up today? Your next breakthrough is just one session away.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <Button size="lg" onClick={() => navigate("/matches")} className="group">
                                Start Swapping
                                <Rocket className="w-4 h-4 ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                            </Button>
                        </div>
                    </div>
                </Card>
            </motion.div>

            {/* Profile Insights Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {profile === undefined ? (
                    [1, 2, 3].map((i) => (
                        <Card key={i} className="h-40 animate-pulse bg-white/5" variant="flat">
                            <div className="h-full w-full" />
                        </Card>
                    ))
                ) : profile ? (
                    <>
                        {/* Profile Status */}
                        <div>
                            <Card variant="glass" className="h-full hover:border-indigo-500/30 transition-all duration-500 group">
                                <div className="flex items-center justify-between mb-6">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Identity</p>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={profile.profileCompleted ? 'success' : 'warning'}>
                                            {profile.profileCompleted ? 'Verified' : 'Incomplete'}
                                        </Badge>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => navigate("/profile/setup")}
                                            className="hover:bg-indigo-500/10"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </div>
                                <h3 className="text-2xl font-black text-white mb-2 italic">
                                    {profile.profileCompleted ? 'Master' : 'Initiate'}
                                </h3>
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">
                                    {profile.profileCompleted ? 'Your profile is optimized for matching' : 'Complete your details to build trust'}
                                </p>
                            </Card>
                        </div>

                        {/* Reputation Score */}
                        <div>
                            <Card variant="glass" className="h-full hover:border-purple-500/30 transition-all duration-500">
                                <div className="flex items-center justify-between mb-6">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Reputation</p>
                                    <Shield className="w-4 h-4 text-purple-400" />
                                </div>
                                <div className="flex items-baseline gap-2 mb-4">
                                    <span className="text-4xl font-black text-white tracking-tight">{profile.reputationScore ?? 100}</span>
                                    <span className="text-gray-600 font-black">/ 100</span>
                                </div>
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                                        style={{ width: `${profile.reputationScore ?? 100}%` }}
                                    />
                                </div>
                            </Card>
                        </div>

                        {/* Skills Mastery */}
                        <div>
                            <Card variant="glass" className="h-full hover:border-emerald-500/30 transition-all duration-500">
                                <div className="flex items-center justify-between mb-6">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Mastery</p>
                                    <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-400">
                                        <Sparkles className="w-3.5 h-3.5" />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-2xl font-black text-white mb-1">
                                        {(profile.teachSkills?.length ?? 0) + (profile.learnSkills?.length ?? 0)} Skills
                                    </h3>
                                    <div className="flex gap-3 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                        <span className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                            {profile.teachSkills?.length ?? 0} Teaching
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                            {profile.learnSkills?.length ?? 0} Learning
                                        </span>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </>
                ) : (
                    <div className="lg:col-span-3">
                        <Card variant="outline" className="text-center py-16 border-dashed border-white/10 bg-white/[0.01]">
                            <p className="text-gray-500 font-bold mb-6">You haven't initialized your profile yet.</p>
                            <Button onClick={() => navigate("/profile/setup")}>Initialize Profile</Button>
                        </Card>
                    </div>
                )}
            </div>

            {/* Quick Actions Grid */}
            <motion.div variants={item} className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-gray-600 ml-1">Quick Access</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        {
                            title: 'Discovery',
                            desc: 'Find your perfect skill match',
                            icon: Users,
                            path: '/matches',
                            color: 'from-indigo-500 to-blue-500'
                        },
                        {
                            title: 'Schedule',
                            desc: 'Manage your learning sessions',
                            icon: Calendar,
                            path: '/sessions',
                            color: 'from-purple-500 to-pink-500'
                        },
                        {
                            title: 'Lounge',
                            desc: 'Connect with your community',
                            icon: MessageSquare,
                            path: '/chat',
                            color: 'from-emerald-500 to-teal-500'
                        }
                    ].map((action) => (
                        <motion.button
                            key={action.title}
                            whileHover={{ y: -5 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => navigate(action.path)}
                            className="text-left group outline-none"
                        >
                            <Card variant="glass" className="p-1 px-1 group-hover:border-white/20 transition-all duration-300">
                                <div className="bg-gray-900/40 backdrop-blur-3xl rounded-[22px] p-6 flex items-center gap-5">
                                    <div className={`p-4 rounded-2xl bg-gradient-to-br ${action.color} shadow-lg shadow-indigo-500/10`}>
                                        <action.icon className="w-6 h-6 text-white" strokeWidth={2.5} />
                                    </div>
                                    <div>
                                        <h4 className="text-white font-black text-xl tracking-tighter group-hover:text-indigo-400 transition-colors">
                                            {action.title}
                                        </h4>
                                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">
                                            {action.desc}
                                        </p>
                                    </div>
                                </div>
                            </Card>
                        </motion.button>
                    ))}
                </div>
            </motion.div>
        </motion.div>
    );
};
