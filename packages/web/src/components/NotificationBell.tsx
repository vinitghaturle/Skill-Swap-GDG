import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/convex/_generated/api';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCircle2, MessageSquare, Calendar, Video, Inbox, Sparkles } from 'lucide-react';
import { Badge } from './ui/Badge';
import { cn } from '../lib/utils';

export function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { user } = useAuth();
    const navigate = useNavigate();

    const currentUser = useQuery(
        api.auth.getUserByFirebaseUid,
        user ? { firebaseUid: user.uid } : "skip"
    );

    const unreadNotifications = useQuery(
        api.notifications.getNotifications,
        currentUser ? { userId: currentUser._id, unreadOnly: true } : "skip"
    );

    const recentNotifications = useQuery(
        api.notifications.getNotifications,
        currentUser ? { userId: currentUser._id, limit: 10 } : "skip"
    );

    const markAsRead = useMutation(api.notifications.markAsRead);
    const markAllAsRead = useMutation(api.notifications.markAllAsRead);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNotificationClick = async (notif: any) => {
        if (!notif.read && currentUser) {
            await markAsRead({ notificationId: notif._id, userId: currentUser._id });
        }

        if (notif.type === 'new_message' && notif.data?.conversationId) {
            navigate(`/chat/${notif.data.conversationId}`);
        } else if (notif.type === 'session_request' || notif.type === 'session_accepted' || notif.type === 'session_starting_soon') {
            navigate('/sessions');
        } else if ((notif.type === 'incoming_call' || notif.type === 'call_incoming') && notif.data?.sessionId) {
            navigate(`/call/${notif.data.sessionId}`);
        }

        setIsOpen(false);
    };

    const handleMarkAllRead = async () => {
        if (currentUser) {
            await markAllAsRead({ userId: currentUser._id });
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "relative p-3 rounded-2xl transition-all duration-300",
                    isOpen
                        ? "bg-indigo-600 text-white shadow-xl shadow-indigo-500/20"
                        : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                )}
            >
                <Bell className="w-6 h-6" />

                <AnimatePresence>
                    {unreadNotifications && unreadNotifications.length > 0 && (
                        <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="absolute top-2 right-2 flex h-4 w-4"
                        >
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[10px] font-black items-center justify-center text-white">
                                {unreadNotifications.length > 9 ? '9+' : unreadNotifications.length}
                            </span>
                        </motion.span>
                    )}
                </AnimatePresence>
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-4 w-80 md:w-[400px] bg-gray-950/90 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-2xl z-[100] overflow-hidden"
                    >
                        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                            <div className="flex items-center gap-3">
                                <h3 className="text-white font-black uppercase tracking-widest text-[10px]">Notifications</h3>
                                {unreadNotifications && unreadNotifications.length > 0 && (
                                    <Badge variant="info">{unreadNotifications.length} NEW</Badge>
                                )}
                            </div>
                            {unreadNotifications && unreadNotifications.length > 0 && (
                                <button
                                    onClick={handleMarkAllRead}
                                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-black uppercase tracking-widest transition-colors flex items-center gap-1.5"
                                >
                                    <CheckCircle2 className="w-3 h-3" />
                                    Read All
                                </button>
                            )}
                        </div>

                        <div className="max-h-[450px] overflow-y-auto custom-scrollbar">
                            {recentNotifications && recentNotifications.length > 0 ? (
                                <div className="divide-y divide-white/5">
                                    {recentNotifications.map((notif: any, i: number) => (
                                        <motion.button
                                            key={notif._id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            onClick={() => handleNotificationClick(notif)}
                                            className={cn(
                                                "w-full p-5 flex gap-4 text-left transition-all hover:bg-white/[0.05] group relative",
                                                !notif.read ? "bg-indigo-500/[0.03]" : ""
                                            )}
                                        >
                                            {!notif.read && (
                                                <div className="absolute left-0 top-2 bottom-2 w-1 bg-indigo-500 rounded-r-full shadow-[0_0_10px_rgba(79,70,229,0.5)]" />
                                            )}

                                            <div className={cn(
                                                "w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center transition-transform group-hover:scale-110",
                                                (notif.type.includes('call')) ? "bg-red-500/10 text-red-400" :
                                                    (notif.type.includes('session')) ? "bg-emerald-500/10 text-emerald-400" :
                                                        "bg-indigo-500/10 text-indigo-400"
                                            )}>
                                                {notif.type.includes('call') ? <Video className="w-5 h-5" /> :
                                                    notif.type.includes('session') ? <Calendar className="w-5 h-5" /> :
                                                        <MessageSquare className="w-5 h-5" />}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start mb-1">
                                                    <p className={cn(
                                                        "text-sm leading-tight transition-colors group-hover:text-white",
                                                        !notif.read ? "text-white font-black" : "text-gray-400 font-bold"
                                                    )}>
                                                        {notif.title}
                                                    </p>
                                                    <span className="text-[9px] text-gray-600 font-black uppercase whitespace-nowrap ml-2">
                                                        {new Date(notif.createdAt || notif._creationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                                                    {notif.body || notif.message}
                                                </p>
                                            </div>
                                        </motion.button>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-20 text-center">
                                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/5 relative">
                                        <Inbox className="w-10 h-10 text-gray-700" />
                                        <motion.div
                                            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                            className="absolute -top-1 -right-1"
                                        >
                                            <Sparkles className="w-6 h-6 text-indigo-500/30" />
                                        </motion.div>
                                    </div>
                                    <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Zero Notifications</p>
                                    <p className="text-gray-600 text-xs mt-2 font-medium px-12">You're all caught up with your skill swaps!</p>
                                </div>
                            )}
                        </div>

                        <div className="p-5 border-t border-white/5 bg-white/[0.01]">
                            <button
                                onClick={() => { navigate('/notifications'); setIsOpen(false); }}
                                className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] text-gray-400 hover:text-white font-black uppercase tracking-widest transition-all"
                            >
                                Enter Archive
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
