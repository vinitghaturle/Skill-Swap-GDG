import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, Loader2 } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/convex/_generated/api";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import type { Id } from "../../../convex/convex/_generated/dataModel";

interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentProfile: any;
    userId: Id<"users">;
}

export const EditProfileModal = ({ isOpen, onClose, currentProfile, userId }: EditProfileModalProps) => {
    const [bio, setBio] = useState(currentProfile?.bio || "");
    const [teachSkills, setTeachSkills] = useState<string[]>(currentProfile?.teachSkills || []);
    const [learnSkills, setLearnSkills] = useState<string[]>(currentProfile?.learnSkills || []);
    const [languages, setLanguages] = useState<string[]>(currentProfile?.languages || []);
    const [isSaving, setIsSaving] = useState(false);

    const updateProfile = useMutation(api.profiles.updateProfile);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Pass flat fields, not nested updates object
            await updateProfile({
                userId,
                bio,
                teachSkills,
                learnSkills,
                languages,
            });
            onClose();
        } catch (error) {
            console.error("Failed to update profile:", error);
            alert("Failed to save profile. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-2xl"
                    >
                        <Card variant="glass" className="p-8 border-indigo-500/20">
                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <h2 className="text-3xl font-black text-white tracking-tight">Edit Profile</h2>
                                    <p className="text-xs text-gray-400 font-medium mt-1">Update your skills and bio</p>
                                </div>
                                <Button variant="ghost" size="icon" onClick={onClose}>
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>

                            <div className="space-y-6">
                                {/* Bio */}
                                <div>
                                    <label className="block text-sm font-black uppercase text-gray-300 tracking-wider mb-2">
                                        Bio
                                    </label>
                                    <textarea
                                        value={bio}
                                        onChange={(e) => setBio(e.target.value)}
                                        placeholder="Tell us about yourself..."
                                        rows={4}
                                        className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-sm text-white font-medium focus:outline-none focus:border-indigo-500/50 transition-colors resize-none"
                                    />
                                </div>

                                {/* Teach Skills */}
                                <div>
                                    <label className="block text-sm font-black uppercase text-gray-300 tracking-wider mb-2">
                                        Skills I Can Teach
                                    </label>
                                    <input
                                        type="text"
                                        value={teachSkills.join(", ")}
                                        onChange={(e) => setTeachSkills(e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                                        placeholder="JavaScript, React, Node.js"
                                        className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-sm text-white font-medium focus:outline-none focus:border-indigo-500/50 transition-colors"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Separate with commas</p>
                                </div>

                                {/* Learn Skills */}
                                <div>
                                    <label className="block text-sm font-black uppercase text-gray-300 tracking-wider mb-2">
                                        Skills I Want to Learn
                                    </label>
                                    <input
                                        type="text"
                                        value={learnSkills.join(", ")}
                                        onChange={(e) => setLearnSkills(e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                                        placeholder="Python, ML, DevOps"
                                        className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-sm text-white font-medium focus:outline-none focus:border-indigo-500/50 transition-colors"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Separate with commas</p>
                                </div>

                                {/* Languages */}
                                <div>
                                    <label className="block text-sm font-black uppercase text-gray-300 tracking-wider mb-2">
                                        Languages
                                    </label>
                                    <input
                                        type="text"
                                        value={languages.join(", ")}
                                        onChange={(e) => setLanguages(e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                                        placeholder="English, Spanish, French"
                                        className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-sm text-white font-medium focus:outline-none focus:border-indigo-500/50 transition-colors"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Separate with commas</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 mt-8">
                                <Button
                                    variant="primary"
                                    className="flex-1"
                                    onClick={handleSave}
                                    disabled={isSaving}
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4 mr-2" />
                                            Save Changes
                                        </>
                                    )}
                                </Button>
                                <Button variant="ghost" onClick={onClose} disabled={isSaving}>
                                    Cancel
                                </Button>
                            </div>
                        </Card>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
