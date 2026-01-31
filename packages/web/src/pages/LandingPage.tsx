import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { motion } from "framer-motion";
import { ArrowRight, Zap, Laptop, Rocket, Globe, Sparkles } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";

export const LandingPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const handleGetStarted = () => {
        if (user) {
            navigate("/dashboard");
        } else {
            navigate("/login");
        }
    };

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2
            }
        }
    };

    const item = {
        hidden: { y: 20, opacity: 0 },
        show: { y: 0, opacity: 1 }
    };

    return (
        <div className="min-h-screen bg-secondary-950 selection:bg-warm-500/30 overflow-hidden">
            {/* Cinematic Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-warm-500/10 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-warm-700/10 blur-[120px] rounded-full animate-pulse [animation-delay:2s]" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-50 contrast-150" />
            </div>

            <nav className="relative z-50 flex items-center justify-between px-4 sm:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2"
                >
                    <div className="w-10 h-10 bg-warm-500 rounded-xl flex items-center justify-center shadow-lg shadow-warm-500/40">
                        <Zap className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xl font-black text-white tracking-tighter">SkillSwap</span>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-6"
                >
                    <button
                        onClick={() => navigate("/login")}
                        className="text-sm font-black text-gray-400 hover:text-white transition-colors uppercase tracking-widest"
                    >
                        Sign In
                    </button>
                    <Button onClick={handleGetStarted} size="sm">
                        Get Started <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </motion.div>
            </nav>

            <main className="relative z-10 pt-20 pb-40 px-6">
                <div className="max-w-7xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-warm-500/10 border border-warm-500/20 text-warm-400 text-xs font-bold tracking-wide mb-10"
                    >
                        <Sparkles className="w-4 h-4 animate-pulse" /> Your skills have value. Share them!
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="text-5xl sm:text-7xl md:text-9xl font-black text-white tracking-tighter mb-8 leading-[0.9]"
                    >
                        Learn Anything.<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-warm-400 via-warm-500 to-warm-600 animate-gradient">Teach Everything.</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.8 }}
                        className="text-lg sm:text-xl md:text-2xl text-gray-400 font-medium max-w-3xl mx-auto mb-16 leading-relaxed px-4"
                    >
                        We believe everyone has something valuable to teach. Connect with real people, exchange knowledge in live 1-on-1 sessions, and grow together.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="flex flex-col sm:flex-row justify-center gap-6 items-center"
                    >
                        <Button
                            onClick={handleGetStarted}
                            size="lg"
                            className="min-w-[240px] shadow-2xl shadow-warm-500/20 group hover:scale-105 transition-transform duration-300"
                        >
                            Get Started Free <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                        </Button>
                        <button className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-warm-400 transition-all tracking-wide group px-6 py-3">
                            How it works <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </motion.div>
                </div>

                {/* Feature Grid */}
                <motion.section
                    variants={container}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-48 max-w-7xl mx-auto"
                >
                    <motion.div variants={item}>
                        <Card
                            variant="glass"
                            className="p-1.5 h-full group hover:bg-white/[0.06] hover:border-warm-500/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-warm-500/10"
                        >
                            <div className="bg-secondary-900/40 p-10 rounded-[2.5rem] h-full flex flex-col items-start text-left">
                                <div className="p-4 bg-warm-500/10 rounded-2xl mb-8 group-hover:scale-110 group-hover:bg-warm-500/20 transition-all duration-300">
                                    <Laptop className="w-8 h-8 text-warm-500" />
                                </div>
                                <h3 className="text-3xl font-black text-white tracking-tight mb-4">Find Your Match</h3>
                                <p className="text-gray-400 font-medium text-lg leading-relaxed">
                                    Tell us what you want to learn and teach. We'll connect you with people who have the perfect skills to exchange.
                                </p>
                            </div>
                        </Card>
                    </motion.div>

                    <motion.div variants={item}>
                        <Card
                            variant="glass"
                            className="p-1.5 h-full group hover:bg-white/[0.06] hover:border-warm-400/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-warm-400/10"
                        >
                            <div className="bg-secondary-900/40 p-10 rounded-[2.5rem] h-full flex flex-col items-start text-left">
                                <div className="p-4 bg-warm-400/10 rounded-2xl mb-8 group-hover:scale-110 group-hover:bg-warm-400/20 transition-all duration-300">
                                    <Globe className="w-8 h-8 text-warm-400" />
                                </div>
                                <h3 className="text-3xl font-black text-white tracking-tight mb-4">Meet & Learn Live</h3>
                                <p className="text-gray-400 font-medium text-lg leading-relaxed">
                                    Schedule video calls at times that work for both of you. No travel, no hassle—just great conversations and learning.
                                </p>
                            </div>
                        </Card>
                    </motion.div>

                    <motion.div variants={item}>
                        <Card
                            variant="glass"
                            className="p-1.5 h-full group hover:bg-white/[0.06] hover:border-amber-500/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-amber-500/10"
                        >
                            <div className="bg-secondary-900/40 p-10 rounded-[2.5rem] h-full flex flex-col items-start text-left">
                                <div className="p-4 bg-amber-500/10 rounded-2xl mb-8 group-hover:scale-110 group-hover:bg-amber-500/20 transition-all duration-300">
                                    <Rocket className="w-8 h-8 text-amber-500" />
                                </div>
                                <h3 className="text-3xl font-black text-white tracking-tight mb-4">Build Your Reputation</h3>
                                <p className="text-gray-400 font-medium text-lg leading-relaxed">
                                    Every session makes you better. Track what you've learned, earn trust from the community, and watch your skills grow.
                                </p>
                            </div>
                        </Card>
                    </motion.div>
                </motion.section>
            </main>

            <footer className="relative z-10 border-t border-warm-400/5 py-12 px-4 sm:px-8">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-2 opacity-50">
                        <Zap className="w-5 h-5 text-warm-500" />
                        <span className="text-sm font-black text-white tracking-tighter">SkillSwap</span>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-700">
                        © 2026 SkillSwap. Learn, Teach, Grow.
                    </p>
                </div>
            </footer>
        </div>
    );
};

const ChevronRight = ({ className }: { className?: string }) => (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);
