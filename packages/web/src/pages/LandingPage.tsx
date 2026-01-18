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
        <div className="min-h-screen bg-gray-950 selection:bg-indigo-500/30 overflow-hidden">
            {/* Cinematic Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-indigo-500/10 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-500/10 blur-[120px] rounded-full animate-pulse [animation-delay:2s]" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-50 contrast-150" />
            </div>

            <nav className="relative z-50 flex items-center justify-between px-8 py-8 max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2"
                >
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/40">
                        <Zap className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xl font-black text-white tracking-tighter uppercase">Nexus</span>
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
                        Initialize <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </motion.div>
            </nav>

            <main className="relative z-10 pt-20 pb-40 px-6">
                <div className="max-w-7xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-10"
                    >
                        <Sparkles className="w-3 h-3" /> The Future of Knowledge Exchange
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="text-7xl md:text-9xl font-black text-white tracking-tighter mb-8 leading-[0.9]"
                    >
                        Learn. Teach.<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 animate-gradient">Accelerate.</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.8 }}
                        className="text-xl md:text-2xl text-gray-500 font-medium max-w-3xl mx-auto mb-16 leading-relaxed"
                    >
                        Nexus is a specialized high-fidelity node for 1:1 intellectual transmission. Connect with peers, share expertise, and evolve together in the global digital ecosystem.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="flex flex-col sm:flex-row justify-center gap-6 items-center"
                    >
                        <Button onClick={handleGetStarted} size="lg" className="min-w-[240px] shadow-2xl shadow-indigo-600/20">
                            Launch Interface <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>
                        <button className="flex items-center gap-2 text-sm font-black text-gray-400 hover:text-white transition-all uppercase tracking-widest group">
                            Explore Protocols <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
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
                        <Card variant="glass" className="p-1.5 h-full group hover:bg-white/[0.04] transition-colors">
                            <div className="bg-gray-950/40 p-10 rounded-[2.5rem] h-full flex flex-col items-start text-left">
                                <div className="p-4 bg-indigo-500/10 rounded-2xl mb-8 group-hover:scale-110 transition-transform">
                                    <Laptop className="w-8 h-8 text-indigo-500" />
                                </div>
                                <h3 className="text-3xl font-black text-white tracking-tight uppercase mb-4">Precision Matching</h3>
                                <p className="text-gray-500 font-medium text-lg leading-relaxed">
                                    Our algorithmic engine aligns complementary skill vectors for maximum transmission efficiency.
                                </p>
                            </div>
                        </Card>
                    </motion.div>

                    <motion.div variants={item}>
                        <Card variant="glass" className="p-1.5 h-full group hover:bg-white/[0.04] transition-colors">
                            <div className="bg-gray-950/40 p-10 rounded-[2.5rem] h-full flex flex-col items-start text-left">
                                <div className="p-4 bg-purple-500/10 rounded-2xl mb-8 group-hover:scale-110 transition-transform">
                                    <Globe className="w-8 h-8 text-purple-500" />
                                </div>
                                <h3 className="text-3xl font-black text-white tracking-tight uppercase mb-4">Sync Real-time</h3>
                                <p className="text-gray-500 font-medium text-lg leading-relaxed">
                                    Coordinated session management and integrated chat protocols for seamless collaboration.
                                </p>
                            </div>
                        </Card>
                    </motion.div>

                    <motion.div variants={item}>
                        <Card variant="glass" className="p-1.5 h-full group hover:bg-white/[0.04] transition-colors">
                            <div className="bg-gray-950/40 p-10 rounded-[2.5rem] h-full flex flex-col items-start text-left">
                                <div className="p-4 bg-emerald-500/10 rounded-2xl mb-8 group-hover:scale-110 transition-transform">
                                    <Rocket className="w-8 h-8 text-emerald-500" />
                                </div>
                                <h3 className="text-3xl font-black text-white tracking-tight uppercase mb-4">Streamline Flows</h3>
                                <p className="text-gray-500 font-medium text-lg leading-relaxed">
                                    Conduct high-fidelity video transmissions directly within the Nexus environment.
                                </p>
                            </div>
                        </Card>
                    </motion.div>
                </motion.section>
            </main>

            <footer className="relative z-10 border-t border-white/5 py-12 px-8">
                <div className="max-w-7xl mx-auto flex flex-col md:row items-center justify-between gap-8">
                    <div className="flex items-center gap-2 opacity-50">
                        <Zap className="w-5 h-5 text-indigo-500" />
                        <span className="text-sm font-black text-white tracking-tighter uppercase">Nexus</span>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-700">
                        © 2026 Nexus Systems Protocol. All bits reserved.
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
