import type { ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/convex/_generated/api";
import { useAuth } from "../contexts/AuthContext";
import { ShieldAlert, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface AdminGuardProps {
    children: ReactNode;
}

export const AdminGuard = ({ children }: AdminGuardProps) => {
    const { user } = useAuth();
    const currentUser = useQuery(api.auth.getUserByFirebaseUid, user ? { firebaseUid: user.uid } : "skip");
    const profile = useQuery(api.auth.getCurrentUserProfile, currentUser ? { userId: currentUser._id } : "skip");

    if (!user || profile === undefined) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        );
    }

    if (!profile?.isAdmin) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center p-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-md w-full bg-red-500/5 border border-red-500/20 rounded-3xl p-8 text-center"
                >
                    <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <ShieldAlert className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-black text-white tracking-tighter mb-2 italic">Access Revoked</h2>
                    <p className="text-sm text-gray-400 font-medium mb-6">
                        Neural handshake failed. Your credentials lack the required clearance level for this sector.
                    </p>
                    <div className="text-[10px] uppercase tracking-[0.3em] text-red-500/50 font-black">
                        Secured by Nexus Central Intelligence
                    </div>
                </motion.div>
            </div>
        );
    }

    return <>{children}</>;
};
