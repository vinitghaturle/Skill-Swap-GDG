import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Mail, Lock, User as UserIcon, AlertCircle, ArrowRight } from "lucide-react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";

export const LoginPage = () => {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
    const navigate = useNavigate();

    const handleGoogleSignIn = async () => {
        setLoading(true);
        setError("");
        try {
            await signInWithGoogle();
            navigate("/dashboard");
        } catch (error: any) {
            setError(error.message || "Failed to sign in with Google");
        } finally {
            setLoading(false);
        }
    };

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            if (isSignUp) {
                await signUpWithEmail(email.trim(), password.trim(), displayName.trim());
            } else {
                await signInWithEmail(email.trim(), password.trim());
            }
            navigate("/dashboard");
        } catch (error: any) {
            setError(error.message || `Failed to ${isSignUp ? "sign up" : "sign in"}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Cinematic Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 blur-[120px] rounded-full" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-50 contrast-150" />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-lg relative z-10"
            >
                <div className="text-center mb-10">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-6"
                    >
                        <Zap className="w-3 h-3" /> Secure Node Access
                    </motion.div>
                    <h1 className="text-5xl font-black text-white tracking-tighter mb-2 uppercase italic">Nexus</h1>
                    <p className="text-gray-500 font-medium tracking-tight">Access the global transmission network.</p>
                </div>

                <Card variant="glass" className="p-1 border-white/5 shadow-2xl overflow-hidden">
                    <div className="bg-gray-950/40 p-10 rounded-[2.5rem]">
                        <AnimatePresence mode="wait">
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mb-8 p-4 bg-red-500/5 border border-red-500/10 rounded-2xl flex items-center gap-3"
                                >
                                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                                    <p className="text-xs font-bold text-red-500 uppercase tracking-widest">{error}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <form onSubmit={handleEmailAuth} className="space-y-6">
                            <AnimatePresence mode="wait">
                                {isSignUp && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="space-y-2"
                                    >
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Node Name</label>
                                        <div className="relative group">
                                            <input
                                                type="text"
                                                required
                                                value={displayName}
                                                onChange={(e) => setDisplayName(e.target.value)}
                                                className="w-full bg-white/[0.02] border border-white/10 rounded-2xl px-6 py-4 text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 group-hover:bg-white/[0.04] transition-all"
                                                placeholder="Enter full name..."
                                            />
                                            <UserIcon className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Email Address</label>
                                <div className="relative group">
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-white/[0.02] border border-white/10 rounded-2xl px-6 py-4 text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 group-hover:bg-white/[0.04] transition-all"
                                        placeholder="node@nexus.network"
                                    />
                                    <Mail className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Encryption Key</label>
                                <div className="relative group">
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-white/[0.02] border border-white/10 rounded-2xl px-6 py-4 text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 group-hover:bg-white/[0.04] transition-all font-mono"
                                        placeholder="**********"
                                    />
                                    <Lock className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                isLoading={loading}
                                size="lg"
                                className="w-full shadow-2xl shadow-indigo-600/10"
                            >
                                {isSignUp ? "Initialize Access" : "Establish Link"} <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </form>

                        <div className="mt-10">
                            <div className="relative flex items-center justify-center mb-10">
                                <div className="w-full h-px bg-white/5" />
                                <span className="absolute px-4 bg-gray-950/40 text-[9px] font-black uppercase tracking-widest text-gray-600">Secondary Protocols</span>
                            </div>

                            <button
                                onClick={handleGoogleSignIn}
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-3 py-4 border border-white/10 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] text-white text-sm font-black uppercase tracking-[0.2em] transition-all disabled:opacity-30"
                            >
                                <svg viewBox="0 0 24 24" className="w-5 h-5 grayscale group-hover:grayscale-0 transition-all">
                                    <path
                                        fill="#4285F4"
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    />
                                    <path
                                        fill="#34A853"
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    />
                                    <path
                                        fill="#FBBC05"
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    />
                                    <path
                                        fill="#EA4335"
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    />
                                </svg>
                                Authenticate with Google
                            </button>
                        </div>

                        <div className="mt-12 text-center">
                            <button
                                onClick={() => setIsSignUp(!isSignUp)}
                                className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
                            >
                                {isSignUp ? "Already linked? Establish Connection" : "New Node? Join the network"}
                            </button>
                        </div>
                    </div>
                </Card>
            </motion.div>
        </div>
    );
};
