import { useMutation } from "convex/react";
import { api } from "../../../convex/convex/_generated/api";
import type { Id } from "../../../convex/convex/_generated/dataModel";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MessageSquare, Video, Check, X, Calendar, User, ArrowRight } from "lucide-react";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";

interface SessionCardProps {
    sessionId: Id<"sessions">;
    skill: string;
    scheduledAt: number;
    duration: number;
    status: "pending" | "accepted" | "declined" | "completed" | "cancelled";
    isRequester: boolean;
    otherUserName: string;
    otherUserPhoto?: string;
    otherUserId: Id<"users">;
    currentUserId: Id<"users">;
    conversationId: Id<"conversations">;
}

export const SessionCard: React.FC<SessionCardProps> = ({
    sessionId,
    skill,
    scheduledAt,
    duration,
    status,
    isRequester,
    otherUserName,
    otherUserPhoto,
    otherUserId,
    currentUserId,
    conversationId,
}) => {
    const navigate = useNavigate();
    const acceptSession = useMutation(api.sessions.acceptSessionRequest);
    const declineSession = useMutation(api.sessions.declineSessionRequest);
    const cancelSession = useMutation(api.sessions.cancelSession);

    const formatDateTime = (timestamp: number) => {
        const date = new Date(timestamp);
        return {
            date: date.toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
            }),
            time: date.toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
            }),
        };
    };

    const { date, time } = formatDateTime(scheduledAt);

    const isActiveNow = () => {
        const now = Date.now();
        const BufferTime = 15 * 60 * 1000; // 15 minutes
        return (
            now >= scheduledAt - BufferTime &&
            now <= scheduledAt + duration * 60 * 1000 + BufferTime
        );
    };

    const getStatusBadge = () => {
        const variants: Record<string, "warning" | "success" | "danger" | "info" | "default"> = {
            pending: "warning",
            accepted: "success",
            declined: "danger",
            completed: "info",
            cancelled: "default",
        };

        return (
            <Badge variant={variants[status]} className="capitalize">
                {status}
            </Badge>
        );
    };

    const handleAccept = async () => {
        try {
            await acceptSession({ sessionId, userId: currentUserId });
        } catch (error) {
            console.error("Failed to accept session:", error);
        }
    };

    const handleDecline = async () => {
        try {
            await declineSession({ sessionId, userId: currentUserId });
        } catch (error) {
            console.error("Failed to decline session:", error);
        }
    };

    const handleCancel = async () => {
        try {
            await cancelSession({ sessionId, userId: currentUserId });
        } catch (error) {
            console.error("Failed to cancel session:", error);
        }
    };

    return (
        <Card variant="glass" className="overflow-hidden group border-white/5 hover:border-indigo-500/30 transition-colors">
            <div className="p-6">
                <div className="flex items-start justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            {otherUserPhoto ? (
                                <img
                                    src={otherUserPhoto}
                                    alt={otherUserName}
                                    className="w-16 h-16 rounded-[1.25rem] object-cover ring-2 ring-white/10 group-hover:ring-indigo-500/50 transition-all duration-500"
                                />
                            ) : (
                                <div className="w-16 h-16 rounded-[1.25rem] bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center">
                                    <User className="w-8 h-8 text-indigo-400 opacity-50" />
                                </div>
                            )}
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-4 border-gray-950 shadow-lg"></div>
                        </div>
                        <div>
                            <h3 className="font-black text-xl text-white tracking-tight leading-none mb-2 group-hover:text-indigo-400 transition-colors">
                                {otherUserName}
                            </h3>
                            <div className="flex items-center gap-2">
                                <p className="text-[10px] uppercase tracking-widest font-black text-gray-500">
                                    {isRequester ? "Mentorship Node" : "Learning Bridge"}
                                </p>
                                <span className="w-1 h-1 rounded-full bg-gray-800" />
                                <span className="text-[10px] uppercase tracking-widest font-black text-indigo-500/70">{duration}m Duration</span>
                            </div>
                        </div>
                    </div>
                    {getStatusBadge()}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/5 group-hover:bg-white/[0.05] transition-colors">
                        <div className="flex items-center gap-2 mb-2 text-gray-500">
                            <Calendar className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Temporal Coordinate</span>
                        </div>
                        <p className="text-white font-bold">{time} <span className="text-gray-500 mx-1">•</span> {date}</p>
                    </div>
                    <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/5 group-hover:bg-white/[0.05] transition-colors">
                        <div className="flex items-center gap-2 mb-2 text-gray-500">
                            <motion.div
                                animate={{ rotate: [0, 10, -10, 0] }}
                                transition={{ repeat: Infinity, duration: 4 }}
                            >
                                <Check className="w-3.5 h-3.5 text-indigo-500" />
                            </motion.div>
                            <span className="text-[10px] font-black uppercase tracking-widest">Skill exchange</span>
                        </div>
                        <p className="text-white font-bold truncate">{skill}</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3">
                    {status === "pending" && !isRequester && (
                        <>
                            <Button
                                onClick={handleAccept}
                                className="flex-1"
                                variant="primary"
                            >
                                <Check className="w-4 h-4 mr-2" /> Accept Transfer
                            </Button>
                            <Button
                                onClick={handleDecline}
                                className="flex-1"
                                variant="danger"
                            >
                                <X className="w-4 h-4 mr-2" /> Reject
                            </Button>
                        </>
                    )}

                    {status === "pending" && isRequester && (
                        <Button
                            onClick={handleCancel}
                            className="w-full"
                            variant="outline"
                        >
                            Abort Connection Request
                        </Button>
                    )}

                    {status === "accepted" && (
                        <>
                            <Button
                                onClick={() => navigate(`/chat/${conversationId}`)}
                                variant="outline"
                                className="flex-1"
                            >
                                <MessageSquare className="w-4 h-4 mr-2" /> Internal Comms
                            </Button>
                            <Button
                                onClick={() => navigate(`/call/${sessionId}`)}
                                disabled={!isActiveNow()}
                                className="flex-[2]"
                                variant={isActiveNow() ? "primary" : "secondary"}
                            >
                                <Video className="w-4 h-4 mr-2" />
                                {isActiveNow() ? 'Initialize Uplink' : 'Signal Offline'}
                            </Button>
                        </>
                    )}

                    {(status === "completed" || status === "declined" || status === "cancelled") && (
                        <Button
                            onClick={() => navigate(`/matches/${otherUserId}`)}
                            className="w-full"
                            variant="secondary"
                        >
                            Review Logs <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    )}
                </div>
            </div>
        </Card>
    );
};
