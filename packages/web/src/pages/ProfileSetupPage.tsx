import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/convex/_generated/api";
import { SkillAutocomplete } from "../components/SkillAutocomplete";
import { AvailabilityCalendar } from "../components/AvailabilityCalendar";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, User, Sparkles, Target, Shield, Info, Rocket, Languages, Clock } from "lucide-react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { cn } from "../lib/utils";

type WizardStep = "bio" | "teach" | "learn" | "availability" | "preferences";

export const ProfileSetupPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState<WizardStep>("bio");

    const currentUser = useQuery(
        api.auth.getUserByFirebaseUid,
        user ? { firebaseUid: user.uid } : "skip"
    );

    const profile = useQuery(
        api.profiles.getProfile,
        currentUser ? { userId: currentUser._id } : "skip"
    );

    const updateProfile = useMutation(api.profiles.updateProfile);

    const [formData, setFormData] = useState({
        bio: "",
        teachSkills: [] as string[],
        learnSkills: [] as string[],
        availability: {},
        languages: [] as string[],
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });

    useEffect(() => {
        if (profile) {
            setFormData({
                bio: profile.bio || "",
                teachSkills: profile.teachSkills || [],
                learnSkills: profile.learnSkills || [],
                availability: profile.availability || {},
                languages: profile.languages || [],
                timezone: profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
            });
        }
    }, [profile]);

    const steps: WizardStep[] = ["bio", "teach", "learn", "availability", "preferences"];
    const stepIndex = steps.indexOf(currentStep);

    const handleNext = async () => {
        if (currentUser) {
            await updateProfile({
                userId: currentUser._id,
                ...formData,
            });
        }

        if (stepIndex < steps.length - 1) {
            setCurrentStep(steps[stepIndex + 1]);
        } else {
            navigate("/matches");
        }
    };

    const handleBack = () => {
        if (stepIndex > 0) {
            setCurrentStep(steps[stepIndex - 1]);
        }
    };

    const canProceed = () => {
        switch (currentStep) {
            case "bio":
                return formData.bio.length >= 20;
            case "teach":
                return formData.teachSkills.length > 0;
            case "learn":
                return formData.learnSkills.length > 0;
            case "availability":
                return Object.keys(formData.availability).length > 0;
            case "preferences":
                return formData.languages.length > 0;
            default:
                return false;
        }
    };

    return (
        <div className="min-h-screen bg-gray-950 py-20 px-6 relative overflow-hidden">
            {/* Background Atmosphere */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none opacity-20">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/20 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/20 blur-[120px] rounded-full" />
            </div>

            <div className="max-w-4xl mx-auto relative z-10">
                {/* Header Section */}
                <div className="text-center mb-16">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-6"
                    >
                        <Rocket className="w-3 h-3" /> Initializing Node Identity
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-5xl font-black text-white tracking-tighter mb-4"
                    >
                        Configure Your Nexus
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-gray-500 font-medium max-w-xl mx-auto text-lg"
                    >
                        Complete the initialization sequence to activate your profile on the global exchange network.
                    </motion.p>
                </div>

                {/* Progress Grid */}
                <div className="grid grid-cols-5 gap-4 mb-12">
                    {steps.map((step, index) => {
                        const isActive = index === stepIndex;
                        const isCompleted = index < stepIndex;
                        return (
                            <div key={step} className="relative">
                                <div className={cn(
                                    "h-1.5 rounded-full transition-all duration-500",
                                    isActive ? "bg-indigo-500 shadow-[0_0_15px_-3px_rgba(99,102,241,0.8)]" :
                                        isCompleted ? "bg-indigo-500/40" : "bg-white/5"
                                )} />
                                <div className="mt-3 text-center">
                                    <span className={cn(
                                        "text-[9px] font-black uppercase tracking-widest transition-colors duration-300",
                                        isActive ? "text-white" : isCompleted ? "text-indigo-400/60" : "text-gray-700"
                                    )}>
                                        {step}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Wizard Container */}
                <Card variant="glass" className="p-1 lg:p-1.5 border-white/5 shadow-2xl overflow-hidden">
                    <div className="bg-gray-950/40 p-8 lg:p-12 rounded-[2.5rem]">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentStep}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3, ease: "easeOut" }}
                            >
                                {currentStep === "bio" && (
                                    <StepBio
                                        bio={formData.bio}
                                        onChange={(bio) => setFormData({ ...formData, bio })}
                                    />
                                )}

                                {currentStep === "teach" && (
                                    <StepTeachSkills
                                        skills={formData.teachSkills}
                                        onChange={(teachSkills) => setFormData({ ...formData, teachSkills })}
                                    />
                                )}

                                {currentStep === "learn" && (
                                    <StepLearnSkills
                                        skills={formData.learnSkills}
                                        onChange={(learnSkills) => setFormData({ ...formData, learnSkills })}
                                    />
                                )}

                                {currentStep === "availability" && (
                                    <StepAvailability
                                        availability={formData.availability}
                                        onChange={(availability) => setFormData({ ...formData, availability })}
                                    />
                                )}

                                {currentStep === "preferences" && (
                                    <StepPreferences
                                        languages={formData.languages}
                                        timezone={formData.timezone}
                                        onChange={(languages, timezone) =>
                                            setFormData({ ...formData, languages, timezone })
                                        }
                                    />
                                )}
                            </motion.div>
                        </AnimatePresence>

                        {/* Navigation Threshold */}
                        <div className="flex items-center justify-between mt-16 pt-8 border-t border-white/5">
                            <button
                                onClick={handleBack}
                                disabled={stepIndex === 0}
                                className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors disabled:opacity-0 disabled:pointer-events-none"
                            >
                                <ChevronLeft className="w-4 h-4" /> Go Back
                            </button>

                            <Button
                                onClick={handleNext}
                                disabled={!canProceed()}
                                size="lg"
                                className="min-w-[200px]"
                            >
                                {stepIndex === steps.length - 1 ? (
                                    <>Activate Node <Rocket className="ml-2 w-4 h-4" /></>
                                ) : (
                                    <>Continue Sequence <ChevronRight className="ml-2 w-4 h-4" /></>
                                )}
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

// --- Step Components ---

const StepBio = ({ bio, onChange }: { bio: string; onChange: (bio: string) => void }) => (
    <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20">
                <User className="w-6 h-6 text-indigo-500" />
            </div>
            <div>
                <h2 className="text-3xl font-black text-white tracking-tight uppercase">Identity Protocol</h2>
                <p className="text-gray-500 font-medium">Define your specialized background and mission.</p>
            </div>
        </div>

        <div className="relative group">
            <textarea
                value={bio}
                onChange={(e) => onChange(e.target.value)}
                placeholder="I'm a senior architect specializing in distributed systems and high-throughput databases..."
                className="w-full h-56 bg-white/[0.02] border border-white/10 rounded-[2rem] px-8 py-8 text-white text-lg font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 group-hover:bg-white/[0.04] transition-all resize-none shadow-inner"
                maxLength={500}
            />
            <div className="absolute bottom-6 right-8 flex items-center gap-4">
                <span className={cn(
                    "text-[10px] font-black uppercase tracking-widest",
                    bio.length < 20 ? "text-amber-500" : "text-emerald-500"
                )}>
                    {bio.length < 20 ? `${20 - bio.length} chars needed` : "Protocol Valid"}
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">
                    {bio.length} / 500
                </span>
            </div>
        </div>
    </div>
);

const StepTeachSkills = ({
    skills,
    onChange,
}: {
    skills: string[];
    onChange: (skills: string[]) => void;
}) => (
    <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
                <Target className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
                <h2 className="text-3xl font-black text-white tracking-tight uppercase">Knowledge Export</h2>
                <p className="text-gray-500 font-medium">Select components you can transmit to other nodes.</p>
            </div>
        </div>

        <div className="p-2 bg-white/[0.02] border border-white/5 rounded-[2.5rem]">
            <SkillAutocomplete
                selectedSkills={skills}
                onChange={onChange}
                placeholder="Search for transmission vectors (Node.js, Rust, Strategy...)"
            />
        </div>

        <AnimatePresence>
            {skills.length === 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 mt-8 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl"
                >
                    <Info className="w-4 h-4 text-amber-500" />
                    <p className="text-xs font-bold text-amber-500 uppercase tracking-widest">At least one export vector is required</p>
                </motion.div>
            )}
        </AnimatePresence>
    </div>
);

const StepLearnSkills = ({
    skills,
    onChange,
}: {
    skills: string[];
    onChange: (skills: string[]) => void;
}) => (
    <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20">
                <Sparkles className="w-6 h-6 text-indigo-500" />
            </div>
            <div>
                <h2 className="text-3xl font-black text-white tracking-tight uppercase">Insight Acquisition</h2>
                <p className="text-gray-500 font-medium">Define the signals you wish to absorb from the network.</p>
            </div>
        </div>

        <div className="p-2 bg-white/[0.02] border border-white/5 rounded-[2.5rem]">
            <SkillAutocomplete
                selectedSkills={skills}
                onChange={onChange}
                placeholder="Search for new insights to capture..."
            />
        </div>

        <AnimatePresence>
            {skills.length === 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 mt-8 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl"
                >
                    <Info className="w-4 h-4 text-amber-500" />
                    <p className="text-xs font-bold text-amber-500 uppercase tracking-widest">At least one acquisition vector is required</p>
                </motion.div>
            )}
        </AnimatePresence>
    </div>
);

const StepAvailability = ({
    availability,
    onChange,
}: {
    availability: any;
    onChange: (availability: any) => void;
}) => (
    <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-10">
            <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center border border-purple-500/20">
                <Clock className="w-6 h-6 text-purple-500" />
            </div>
            <div>
                <h2 className="text-3xl font-black text-white tracking-tight uppercase">Temporal Window</h2>
                <p className="text-gray-500 font-medium">Establish your synchronization windows within the weekly cycle.</p>
            </div>
        </div>

        <Card className="p-8 bg-white/[0.02] border-white/5 shadow-inner">
            <AvailabilityCalendar availability={availability} onChange={onChange} />
        </Card>

        {Object.keys(availability).length === 0 && (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 mt-8 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl"
            >
                <Info className="w-4 h-4 text-amber-500" />
                <p className="text-xs font-bold text-amber-500 uppercase tracking-widest">Define at least one synchronization slot</p>
            </motion.div>
        )}
    </div>
);

const StepPreferences = ({
    languages,
    timezone,
    onChange,
}: {
    languages: string[];
    timezone: string;
    onChange: (languages: string[], timezone: string) => void;
}) => {
    const commonLanguages = [
        "English", "Spanish", "French", "German", "Chinese",
        "Japanese", "Korean", "Hindi", "Arabic", "Portuguese",
    ];

    const toggleLanguage = (lang: string) => {
        if (languages.includes(lang)) {
            onChange(languages.filter((l) => l !== lang), timezone);
        } else {
            onChange([...languages, lang], timezone);
        }
    };

    return (
        <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-4 mb-12">
                <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20">
                    <Languages className="w-6 h-6 text-indigo-500" />
                </div>
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tight uppercase">Transmission Settings</h2>
                    <p className="text-gray-500 font-medium">Configure linguistic and regional sync parameters.</p>
                </div>
            </div>

            <div className="space-y-12">
                <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-6 flex items-center gap-2">
                        <Shield className="w-3 h-3" /> Linguistic Protocols
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {commonLanguages.map((lang) => (
                            <motion.button
                                key={lang}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => toggleLanguage(lang)}
                                className={cn(
                                    "px-4 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border",
                                    languages.includes(lang)
                                        ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20"
                                        : "bg-white/[0.03] border-white/5 text-gray-500 hover:text-gray-300 hover:bg-white/[0.05]"
                                )}
                            >
                                {lang}
                            </motion.button>
                        ))}
                    </div>
                </div>

                <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
                        <Clock className="w-3 h-3" /> Temporal Region
                    </h4>
                    <div className="relative group max-w-md">
                        <input
                            type="text"
                            value={timezone}
                            onChange={(e) => onChange(languages, e.target.value)}
                            className="w-full bg-white/[0.02] border border-white/10 rounded-2xl px-6 py-4 text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 group-hover:bg-white/[0.04] transition-all"
                        />
                        <div className="absolute top-1/2 right-6 -translate-y-1/2 pointer-events-none text-gray-600">
                            <Info className="w-4 h-4" />
                        </div>
                    </div>
                </div>
            </div>

            {languages.length === 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 mt-12 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl"
                >
                    <Info className="w-4 h-4 text-amber-500" />
                    <p className="text-xs font-bold text-amber-500 uppercase tracking-widest">Establish at least one linguistic protocol</p>
                </motion.div>
            )}
        </div>
    );
};
