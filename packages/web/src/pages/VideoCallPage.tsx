import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../../../convex/convex/_generated/api';
import { useWebRTC } from '../lib/webrtc/useWebRTC';
import { CallControls } from '../components/CallControls';
import { FileUpload } from '../components/FileUpload';
import { FilePreview } from '../components/FilePreview';
import { SessionChat } from '../components/SessionChat';
import { IncomingCallModal } from '../components/IncomingCallModal';
import { FeedbackModal } from '../components/FeedbackModal';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, MessageSquare, Files, User, Loader2, Signal, PhoneOff } from 'lucide-react';
import { cn } from '../lib/utils';

export function VideoCallPage() {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);

    const [callStarted, setCallStarted] = useState(false);
    const [callState, setCallState] = useState<'idle' | 'incoming' | 'outgoing' | 'connected'>('idle');
    const [sidebarTab, setSidebarTab] = useState<'chat' | 'files'>('chat');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

    const currentUser = useQuery(api.auth.getUserByFirebaseUid, user ? { firebaseUid: user.uid } : "skip");
    const session = useQuery(api.sessions.getSessionDetails, sessionId ? { sessionId: sessionId as any } : 'skip');
    const activeCall = useQuery(api.calls.getActiveCall, sessionId ? { sessionId: sessionId as any } : 'skip');
    const sessionFiles = useQuery(api.files.getSessionFiles, sessionId && currentUser ? { sessionId: sessionId as any, userId: currentUser._id } : "skip");

    const initiateCallMutation = useMutation(api.calls.initiateCall);
    const endCallMutation = useMutation(api.calls.endCall);

    const isInitiator = !!(currentUser && session && session.requesterId === currentUser._id);

    const {
        localStream,
        remoteStream,
        connectionState,
        stats,
        error,
        isConnecting,
        startCall,
        endCall,
        toggleMute,
        toggleCamera
    } = useWebRTC({
        signalingUrl: import.meta.env.VITE_SIGNALING_SERVER_URL || 'http://localhost:3001',
        userId: currentUser?._id || '',
        sessionId: sessionId || '',
        isInitiator,
    });

    const logEventMutation = useMutation(api.logs.logEvent);
    const updateQualityMutation = useMutation(api.calls.updateCallQuality);

    useEffect(() => {
        if (stats && activeCall && currentUser) {
            updateQualityMutation({
                callId: activeCall._id,
                metrics: {
                    bitrate: stats.bitrate,
                    packetLoss: stats.packetLoss,
                    latency: stats.latency,
                    resolution: stats.resolution || 'unknown'
                }
            });

            if ((stats.packetLoss > 10 || stats.bitrate < 100)) {
                logEventMutation({
                    userId: currentUser._id,
                    category: 'call',
                    level: 'warn',
                    message: `Degraded connection quality: PL=${stats.packetLoss}%, BR=${stats.bitrate}kbps`,
                    metadata: { sessionId, stats }
                });
            }
        }
    }, [stats, activeCall, currentUser, sessionId, logEventMutation, updateQualityMutation]);

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    useEffect(() => {
        const setStream = () => {
            if (remoteVideoRef.current && remoteStream) {
                remoteVideoRef.current.srcObject = remoteStream;
                remoteVideoRef.current.play().catch(() => { });
            }
        };
        setStream();
        const timer = setTimeout(setStream, 500);
        return () => clearTimeout(timer);
    }, [remoteStream]);

    // Show feedback modal when call ends (for BOTH users)
    useEffect(() => {
        if (activeCall?.status === 'ended' && !isFeedbackModalOpen) {
            const timer = setTimeout(() => {
                setIsFeedbackModalOpen(true);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [activeCall?.status, isFeedbackModalOpen]);

    useEffect(() => {
        if (!sessionId || !session || !currentUser || callStarted) return;
        const isReceiver = session.receiverId === currentUser._id;
        if (isReceiver && activeCall) {
            setCallState('incoming');
        } else if (!isReceiver) {
            setCallState('outgoing');
            handleStartCall();
        }
    }, [sessionId, session, currentUser, activeCall, callStarted]);

    const handleStartCall = async () => {
        if (callStarted) return;
        setCallStarted(true);
        try {
            if (isInitiator && !activeCall && session) {
                await initiateCallMutation({
                    sessionId: sessionId as any,
                    callerId: currentUser!._id,
                    receiverId: session.receiverId as any,
                });
            }
            await startCall();
        } catch (err) {
            console.error('Failed to start call:', err);
        }
    };

    const handleAcceptCall = async () => {
        setCallState('connected');
        await handleStartCall();
    };

    const handleDeclineCall = async () => {
        if (activeCall && currentUser) {
            await endCallMutation({ callId: activeCall._id, userId: currentUser._id });
        }
        navigate('/sessions');
    };

    const handleEndCall = async () => {
        try {
            // End WebRTC connection first
            endCall();

            // End call in backend
            if (activeCall && currentUser) {
                await endCallMutation({ callId: activeCall._id, userId: currentUser._id });
            }

            // Show feedback modal immediately instead of waiting for status change
            setIsFeedbackModalOpen(true);
        } catch (error) {
            console.error('Failed to end call:', error);
            // Navigate away on error
            navigate('/sessions');
        }
    };

    if (error) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
                <Card variant="glass" className="max-w-md w-full text-center p-12 border-red-500/20">
                    <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-8">
                        <PhoneOff className="w-10 h-10 text-red-500" />
                    </div>
                    <h2 className="text-3xl font-black text-white mb-3">Call Failed</h2>
                    <p className="text-gray-400 mb-10 font-medium">{error}</p>
                    <Button variant="danger" className="w-full" onClick={() => navigate('/sessions')}>
                        Back to Sessions
                    </Button>
                </Card>
            </div>
        );
    }

    if (callState === 'incoming' && session) {
        return (
            <IncomingCallModal
                callerId={session.requesterId}
                sessionId={sessionId || ''}
                onAccept={handleAcceptCall}
                onDecline={handleDeclineCall}
            />
        );
    }

    return (
        <div className="h-screen bg-black flex flex-col overflow-hidden text-gray-100">
            {/* Ultra-modern Header */}
            <header className="h-24 bg-gray-950/80 border-b border-white/5 px-8 flex items-center justify-between shrink-0 z-50 backdrop-blur-2xl">
                <div className="flex items-center gap-6">
                    <motion.button
                        whileHover={{ x: -2 }}
                        onClick={handleEndCall}
                        className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-gray-400 hover:text-white transition-colors"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </motion.button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-black tracking-tight text-white">{session?.skill || 'Session'}</h1>
                            <Badge variant={connectionState === 'connected' ? 'success' : 'warning'} className="animate-pulse">
                                {connectionState}
                            </Badge>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mt-1 flex items-center gap-1.5 focus:outline-none">
                            <Signal className={cn("w-3 h-3", stats && stats.packetLoss > 5 ? "text-red-500 animate-pulse" : "text-green-500")} />
                            {stats && stats.packetLoss > 5 ? "Connection Unstable" : "Encrypted P2P Connection"}
                            {stats && <span className="text-gray-600 ml-2">({stats.bitrate} kbps)</span>}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant={isSidebarOpen ? 'primary' : 'secondary'}
                        size="icon"
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    >
                        <MessageSquare className="w-5 h-5" />
                    </Button>
                </div>
            </header>

            {/* Main Workspace */}
            <div className="flex-1 flex overflow-hidden relative">
                <div className="flex-1 relative flex flex-col items-center justify-center bg-gray-950 p-6">
                    {/* Floating Connection Overlay */}
                    <AnimatePresence>
                        {isConnecting && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-gray-950/90 z-40 flex flex-col items-center justify-center backdrop-blur-md"
                            >
                                <motion.div
                                    animate={{
                                        scale: [1, 1.1, 1],
                                        rotate: [0, 360]
                                    }}
                                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                    className="w-32 h-32 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full mb-8 shadow-[0_0_50px_-12px_rgba(79,70,229,0.5)]"
                                />
                                <h2 className="text-3xl font-black text-white tracking-tighter">Establishing Link...</h2>
                                <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mt-2">Wait for peer response</p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Video Canvas */}
                    <div className="relative w-full h-full max-w-6xl aspect-video rounded-[3rem] overflow-hidden shadow-[0_0_100px_-20px_rgba(0,0,0,0.5)] bg-gray-900 border border-white/5">
                        <motion.video
                            initial={{ opacity: 0 }}
                            animate={{ opacity: remoteStream ? 1 : 0 }}
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover"
                        />

                        {!remoteStream && !isConnecting && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4">
                                <div className="p-8 bg-white/5 rounded-full border border-white/5">
                                    <User className="w-16 h-16 text-gray-700" />
                                </div>
                                <p className="text-gray-500 font-black uppercase tracking-[0.3em] text-[10px]">Waiting for partner to join...</p>
                            </div>
                        )}

                        {remoteStream && stats && stats.bitrate < 50 && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950/60 backdrop-blur-sm z-20">
                                <div className="p-6 bg-red-500/10 rounded-full border border-red-500/20 mb-4">
                                    <Signal className="w-10 h-10 text-red-500 animate-pulse" />
                                </div>
                                <p className="text-white font-black uppercase tracking-widest text-xs">Audio Fallback Active</p>
                                <p className="text-gray-400 text-[10px] mt-2">Network too slow for video</p>
                            </div>
                        )}

                        {/* Local PiP with Frane Effect */}
                        <motion.div
                            drag
                            dragConstraints={{ left: -300, right: 0, top: 0, bottom: 200 }}
                            className="absolute bottom-10 right-10 w-56 lg:w-80 aspect-video rounded-3xl overflow-hidden shadow-2xl border-2 border-white/10 z-30 cursor-grab active:cursor-grabbing bg-gray-950"
                        >
                            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                            <div className="absolute top-4 left-4">
                                <Badge className="bg-black/60 backdrop-blur-md">You</Badge>
                            </div>
                        </motion.div>
                    </div>

                    {/* Dynamic Controls Bar */}
                    <motion.div
                        initial={{ y: 100 }}
                        animate={{ y: 0 }}
                        className="absolute bottom-12 left-1/2 -translate-x-1/2 z-50 p-3 bg-gray-900/60 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] shadow-2xl"
                    >
                        <CallControls
                            onToggleMicrophone={toggleMute}
                            onToggleCamera={toggleCamera}
                            onEndCall={handleEndCall}
                            disabled={connectionState !== 'connected' && !isConnecting}
                        />
                    </motion.div>
                </div>

                {/* Glassmorphic Sidebar */}
                <AnimatePresence>
                    {isSidebarOpen && (
                        <motion.aside
                            initial={{ x: 400, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 400, opacity: 0 }}
                            transition={{ type: "spring", damping: 20 }}
                            className="w-[420px] bg-gray-950 border-l border-white/5 flex flex-col shrink-0 z-40"
                        >
                            <div className="p-6 border-b border-white/5 flex gap-3">
                                <button
                                    onClick={() => setSidebarTab('chat')}
                                    className={cn(
                                        "flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                                        sidebarTab === 'chat' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-gray-500 hover:text-white"
                                    )}
                                >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    Conversation
                                </button>
                                <button
                                    onClick={() => setSidebarTab('files')}
                                    className={cn(
                                        "flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                                        sidebarTab === 'files' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-gray-500 hover:text-white"
                                    )}
                                >
                                    <Files className="w-3.5 h-3.5" />
                                    Resources
                                </button>
                            </div>

                            <div className="flex-1 overflow-hidden">
                                {sidebarTab === 'chat' ? (
                                    session?.conversationId && currentUser ? (
                                        <SessionChat conversationId={session.conversationId} currentUserId={currentUser._id} />
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-gray-700 animate-pulse">
                                            <Loader2 className="w-8 h-8 animate-spin mb-4" />
                                            <p className="font-black uppercase tracking-widest text-[10px]">Syncing Chat...</p>
                                        </div>
                                    )
                                ) : (
                                    <div className="h-full flex flex-col">
                                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                            {sessionFiles?.map((file) => <FilePreview key={file._id} file={file as any} canDelete={file.ownerId === currentUser?._id} />)}
                                            {!sessionFiles?.length && (
                                                <div className="h-full flex flex-col items-center justify-center py-20 opacity-30">
                                                    <Files className="w-12 h-12 mb-4" />
                                                    <p className="text-xs font-black uppercase tracking-widest">No Assets Shared</p>
                                                </div>
                                            )}
                                        </div>
                                        {session?.conversationId && currentUser && (
                                            <div className="p-6 bg-white/[0.02] border-t border-white/5">
                                                <FileUpload sessionId={sessionId as any} conversationId={session.conversationId} ownerId={currentUser._id} />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </motion.aside>
                    )}
                </AnimatePresence>
            </div>

            {/* Feedback Modal */}
            {currentUser && session && (
                <FeedbackModal
                    isOpen={isFeedbackModalOpen}
                    onClose={() => navigate('/sessions')}
                    sessionId={sessionId as any}
                    raterId={currentUser._id}
                    rateeName={isInitiator ? (session.receiver?.displayName || 'Partner') : (session.requester?.displayName || 'Partner')}
                />
            )}
        </div>
    );
}
