/**
 * IncomingCallModal - Modal for incoming call notifications
 * Shows caller info and accept/decline buttons
 * 
 * Uses glassmorphism design for a premium look
 */

import { useQuery } from 'convex/react';
import { api } from '../../../convex/convex/_generated/api';

interface IncomingCallModalProps {
    callerId: string;
    sessionId: string;
    onAccept: () => void;
    onDecline: () => void;
}

export function IncomingCallModal({
    callerId,
    sessionId,
    onAccept,
    onDecline,
}: IncomingCallModalProps) {
    // Queries with correct monorepo structure and API names
    const caller = useQuery(api.auth.getUserById, { userId: callerId as any });
    const session = useQuery(api.sessions.getSessionDetails, { sessionId: sessionId as any });

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
            <div className="bg-gray-900/90 border border-white/10 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-500">
                {/* Header with gradient and vibrant icon */}
                <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
                        <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle,white_1px,transparent_1px)] [background-size:20px_20px] animate-pulse"></div>
                    </div>

                    <div className="w-24 h-24 rounded-full bg-white/10 backdrop-blur-xl mx-auto mb-4 flex items-center justify-center border border-white/20 ring-4 ring-white/5 animate-bounce-slow">
                        <svg
                            className="w-12 h-12 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                        </svg>
                    </div>
                    <h2 className="text-3xl font-black text-white mb-1 tracking-tight">Incoming Call</h2>
                    <p className="text-white/80 font-medium">
                        {caller?.displayName || 'Someone'} is calling you
                    </p>
                </div>

                {/* Body with detailed session & caller cards */}
                <div className="p-8 space-y-6">
                    {/* Session Info Card */}
                    {session && (
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-5 hover:bg-white/10 transition-colors">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></span>
                                <h3 className="text-[10px] uppercase tracking-widest font-black text-gray-400">Scheduled Session</h3>
                            </div>
                            <p className="text-white font-bold leading-tight">{session.skill}</p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {new Date(session.scheduledAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                            </div>
                        </div>
                    )}

                    {/* Caller Profile Card */}
                    {caller && (
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-5 flex items-center gap-4 hover:bg-white/10 transition-colors">
                            {caller.photoURL ? (
                                <img
                                    src={caller.photoURL}
                                    alt={caller.displayName}
                                    className="w-14 h-14 rounded-2xl object-cover ring-2 ring-white/10"
                                />
                            ) : (
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-black text-xl shadow-lg">
                                    {caller.displayName.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-white font-bold truncate">{caller.displayName}</p>
                                <p className="text-xs text-gray-500 truncate">{caller.email}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions with tactile high-contrast buttons */}
                <div className="p-8 pt-0 flex gap-4">
                    <button
                        onClick={onDecline}
                        className="flex-1 px-6 py-4 bg-gray-800 hover:bg-red-900/40 text-gray-300 hover:text-red-400 font-bold rounded-2xl transition-all border border-white/5 flex items-center justify-center gap-2 group"
                    >
                        <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        Decline
                    </button>
                    <button
                        onClick={onAccept}
                        className="flex-1 px-6 py-4 bg-green-600 hover:bg-green-500 text-white font-black rounded-2xl transition-all shadow-[0_8px_24px_rgba(22,163,74,0.4)] hover:shadow-[0_12px_32px_rgba(22,163,74,0.5)] hover:-translate-y-1 flex items-center justify-center gap-2 animate-pulse-slow"
                    >
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        Accept
                    </button>
                </div>
            </div>
        </div>
    );
}
