import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Download, AlertTriangle, Loader2, Check } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/convex/_generated/api";
import { useAuth } from "../contexts/AuthContext";
import { getAuth, deleteUser as deleteFirebaseUser } from "firebase/auth";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";

export const DataManagementPage = () => {
    const { user } = useAuth();
    const [isExporting, setIsExporting] = useState(false);
    const [exportComplete, setExportComplete] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);

    // Get Convex user ID from Firebase UID
    const convexUser = useQuery(api.auth.getUserByFirebaseUid, user ? { firebaseUid: user.uid } : "skip");

    const exportData = useMutation(api.compliance.exportUserData);
    const deleteData = useMutation(api.compliance.deleteUserData);

    const handleExportData = async () => {
        if (!user || !convexUser) return;

        setIsExporting(true);
        setExportComplete(false);

        try {
            // Use Convex user ID, not Firebase UID
            const data = await exportData({ userId: convexUser._id });

            // Convert to JSON and download
            const dataStr = JSON.stringify(data, null, 2);
            const blob = new Blob([dataStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `nexus-data-export-${new Date().toISOString()}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            setExportComplete(true);
        } catch (error) {
            console.error("Export failed:", error);
            alert("Data export failed. Please try again.");
        } finally {
            setIsExporting(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!user || !convexUser) return;
        if (deleteConfirmation !== "DELETE MY ACCOUNT") {
            alert('Please type "DELETE MY ACCOUNT" to confirm.');
            return;
        }

        const finalConfirm = window.confirm(
            "This action is PERMANENT and IRREVERSIBLE. All your data will be deleted. Are you absolutely sure?"
        );

        if (!finalConfirm) return;

        setIsDeleting(true);

        try {
            // First delete from Convex
            await deleteData({
                userId: convexUser._id,
                confirmationText: deleteConfirmation
            });

            // Then delete Firebase user (this prevents re-login)
            const auth = getAuth();
            if (auth.currentUser) {
                try {
                    await deleteFirebaseUser(auth.currentUser);
                } catch (firebaseError) {
                    console.error('Firebase deletion error:', firebaseError);
                    // If user needs to re-authenticate, navigate and show error
                    if ((firebaseError as any).code === 'auth/requires-recent-login') {
                        alert('Please log out and log back in before deleting your account for security.');
                        return;
                    }
                }
            }

            alert("Your account has been permanently deleted.");
            window.location.href = "/";
        } catch (error) {
            console.error("Delete failed:", error);
            alert("Account deletion failed. Please try again or contact support.");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-12">
                <h1 className="text-4xl font-black text-white tracking-tighter italic">
                    Data Privacy & Control
                </h1>
                <p className="text-[10px] uppercase tracking-[0.4em] text-gray-500 font-bold mt-2 flex items-center gap2">
                    <Shield className="w-3 h-3 text-indigo-500" /> GDPR Compliance Center
                </p>
            </div>

            <div className="space-y-8">
                {/* Export Data Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Card variant="glass" className="p-8 border-indigo-500/10">
                        <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center">
                                    <Download className="w-6 h-6 text-indigo-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-white tracking-tight">Export Your Data</h2>
                                    <p className="text-xs text-gray-400 font-medium mt-1">
                                        GDPR Article 20 - Data Portability
                                    </p>
                                </div>
                            </div>
                            {exportComplete && (
                                <Badge variant="success" className="bg-emerald-500/10 text-emerald-400">
                                    <Check className="w-3 h-3 mr-1" /> Downloaded
                                </Badge>
                            )}
                        </div>

                        <p className="text-sm text-gray-300 font-medium mb-6 leading-relaxed">
                            Download a complete copy of all your personal data stored on Nexus. This includes your profile,
                            sessions, messages, ratings, and all activity logs. The export will be provided as a JSON file.
                        </p>

                        <Button
                            variant="primary"
                            disabled={isExporting}
                            onClick={handleExportData}
                            className="w-full sm:w-auto"
                        >
                            {isExporting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Compiling Data...
                                </>
                            ) : (
                                <>
                                    <Download className="w-4 h-4 mr-2" />
                                    Export My Data
                                </>
                            )}
                        </Button>
                    </Card>
                </motion.div>

                {/* Delete Account Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <Card variant="glass" className="p-8 border-red-500/20">
                        <div className="flex items-start gap-3 mb-6">
                            <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center">
                                <AlertTriangle className="w-6 h-6 text-red-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white tracking-tight">Delete Your Account</h2>
                                <p className="text-xs text-gray-400 font-medium mt-1">
                                    GDPR Article 17 - Right to Erasure
                                </p>
                            </div>
                        </div>

                        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4 mb-6">
                            <p className="text-xs font-black uppercase text-red-400 tracking-widest mb-2">
                                WARNING: PERMANENT ACTION
                            </p>
                            <p className="text-sm text-gray-300 font-medium leading-relaxed">
                                Deleting your account will permanently erase all your data from Nexus. This includes:
                            </p>
                            <ul className="mt-3 space-y-1 text-sm text-gray-400">
                                <li className="flex items-start gap-2">
                                    <span className="text-red-500 mt-0.5">•</span>
                                    <span>Your profile, skills, and preferences</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-red-500 mt-0.5">•</span>
                                    <span>All session history and ratings</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-red-500 mt-0.5">•</span>
                                    <span>Messages and conversations</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-red-500 mt-0.5">•</span>
                                    <span>Activity logs and analytics</span>
                                </li>
                            </ul>
                            <p className="text-xs text-red-400 font-black uppercase tracking-wider mt-4">
                                This action cannot be undone.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-black uppercase text-gray-400 tracking-widest mb-2">
                                    Type "DELETE MY ACCOUNT" to confirm
                                </label>
                                <input
                                    type="text"
                                    value={deleteConfirmation}
                                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                                    placeholder="DELETE MY ACCOUNT"
                                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-sm text-white font-medium focus:outline-none focus:border-red-500/50 transition-colors"
                                />
                            </div>

                            <Button
                                variant="danger"
                                disabled={deleteConfirmation !== "DELETE MY ACCOUNT" || isDeleting}
                                onClick={handleDeleteAccount}
                                className="w-full"
                            >
                                {isDeleting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Deleting Account...
                                    </>
                                ) : (
                                    <>
                                        <AlertTriangle className="w-4 h-4 mr-2" />
                                        Permanently Delete My Account
                                    </>
                                )}
                            </Button>
                        </div>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
};
