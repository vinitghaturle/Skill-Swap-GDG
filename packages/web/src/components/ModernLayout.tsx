/**
 * ModernLayout - Premium layout wrapper for protected routes
 * Includes navigation, fixed header with NotificationBell, and responsive container
 */

import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { NotificationBell } from "./NotificationBell";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../hooks/useNotifications";

interface ModernLayoutProps {
    children: ReactNode;
}

export function ModernLayout({ children }: ModernLayoutProps) {
    const location = useLocation();
    const { user, convexUserId, signOut } = useAuth();

    // Initialize notification handling
    useNotifications({ userId: convexUserId });

    const navigation = [
        {
            name: 'Dashboard', href: '/dashboard', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
            )
        },
        {
            name: 'Matches', href: '/matches', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            )
        },
        {
            name: 'Sessions', href: '/sessions', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            )
        },
        {
            name: 'Chat', href: '/chat', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
            )
        },
    ];

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
            {/* Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/5 blur-[120px]"></div>
            </div>

            {/* Header */}
            <header className="fixed top-0 left-0 right-0 h-20 bg-gray-950/80 backdrop-blur-xl border-b border-white/5 z-50">
                <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <Link to="/dashboard" className="flex items-center gap-2 group">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform duration-300">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <span className="text-xl font-black tracking-tighter text-white">SkillSwap</span>
                        </Link>

                        <nav className="hidden md:flex items-center gap-1">
                            {navigation.map((item) => {
                                const isActive = location.pathname.startsWith(item.href);
                                return (
                                    <Link
                                        key={item.name}
                                        to={item.href}
                                        className={`
                                            px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 flex items-center gap-2
                                            ${isActive
                                                ? 'bg-white/10 text-white'
                                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                            }
                                        `}
                                    >
                                        {item.icon}
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>

                    <div className="flex items-center gap-4">
                        <NotificationBell />

                        <div className="h-8 w-px bg-white/10 hidden sm:block mx-2"></div>

                        <div className="flex items-center gap-3 pl-2">
                            {user?.photoURL && (
                                <img
                                    src={user.photoURL}
                                    alt={user.displayName || "User"}
                                    className="w-9 h-9 rounded-full ring-2 ring-white/10 p-0.5"
                                />
                            )}
                            <div className="hidden lg:block text-left">
                                <p className="text-xs font-black text-white leading-none mb-1">{user?.displayName}</p>
                                <button
                                    onClick={() => signOut()}
                                    className="text-[10px] text-gray-500 hover:text-red-400 font-bold uppercase tracking-wider transition-colors"
                                >
                                    Log out
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 pt-24 pb-12 relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {children}
                </div>
            </main>
        </div>
    );
}
