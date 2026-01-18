import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    Activity,
    Shield,
    Zap,
    AlertCircle,
    ToggleLeft,
    ToggleRight,
    Terminal,
    Users,
    Video,
    XCircle,
    RotateCcw
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/convex/_generated/api";
import { useAuth } from "../contexts/AuthContext";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { cn } from "../lib/utils";

export const AdminPage = () => {
    const { user } = useAuth();
    const currentUser = useQuery(api.auth.getUserByFirebaseUid, user ? { firebaseUid: user.uid } : "skip");

    // Live Monitoring Data
    const monitorData = useQuery(api.admin.getLiveMonitorData, currentUser ? { adminId: currentUser._id } : "skip");

    // Feature Flags
    const matchingEnabled = useQuery(api.admin.getSystemConfig, { key: "matchingEnabled" });
    const maintenanceMode = useQuery(api.admin.getSystemConfig, { key: "maintenanceMode" });

    // Mutations
    const setConfig = useMutation(api.admin.updateSystemConfig);
    const terminateSession = useMutation(api.admin.emergencyTerminate);

    const activeSessionsDetail = useQuery(api.admin.getActiveSessions, currentUser ? { adminId: currentUser._id } : "skip");

    const [logs, setLogs] = useState<any[]>([]);

    useEffect(() => {
        if (monitorData?.recentErrors) {
            setLogs(monitorData.recentErrors);
        }
    }, [monitorData]);

    const toggleMatching = async () => {
        if (!currentUser) return;
        await setConfig({
            adminId: currentUser._id,
            key: "matchingEnabled",
            value: matchingEnabled === false ? true : false
        });
    };

    const toggleMaintenance = async () => {
        if (!currentUser) return;
        await setConfig({
            adminId: currentUser._id,
            key: "maintenanceMode",
            value: maintenanceMode === true ? false : true
        });
    };

    const handleTerminate = async (sessionId: any) => {
        if (!currentUser) return;
        const reason = window.prompt("Reason for termination:");
        if (!reason) return;

        await terminateSession({
            adminId: currentUser._id,
            sessionId,
            reason
        });
    };

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-12">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter italic">Nexus Command Center</h1>
                    <p className="text-[10px] uppercase tracking-[0.4em] text-gray-500 font-bold mt-2 flex items-center gap-2">
                        <Shield className="w-3 h-3 text-indigo-500" /> Administrative Ley Level 5 Access
                    </p>
                </div>
                <div className="flex gap-4">
                    <Badge variant="success" className="bg-emerald-500/5 text-emerald-500 border-emerald-500/20">
                        <Activity className="w-3 h-3 mr-1.5 animate-pulse" /> System Nominal
                    </Badge>
                    <div className="text-right">
                        <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Uptime</p>
                        <p className="text-sm font-bold text-white tabular-nums">14.2 Days</p>
                    </div>
                </div>
            </div>

            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12"
            >
                {/* Stats Cards */}
                <motion.div variants={item}>
                    <Card variant="glass" className="h-full border-indigo-500/10 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Video className="w-5 h-5 text-indigo-400" />
                            <Badge variant="info" className="bg-indigo-500/10 text-indigo-400">Live</Badge>
                        </div>
                        <p className="text-3xl font-black text-white tabular-nums">{monitorData?.activeCalls ?? 0}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mt-1">Active Call Links</p>
                    </Card>
                </motion.div>

                <motion.div variants={item}>
                    <Card variant="glass" className="h-full border-purple-500/10 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Users className="w-5 h-5 text-purple-400" />
                        </div>
                        <p className="text-3xl font-black text-white tabular-nums">{monitorData?.activeSessions ?? 0}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mt-1">Connected Sessions</p>
                    </Card>
                </motion.div>

                <motion.div variants={item}>
                    <Card variant="glass" className="h-full border-red-500/10 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <AlertCircle className="w-5 h-5 text-red-400" />
                            {monitorData?.pendingReports && monitorData.pendingReports > 0 ? (
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                            ) : null}
                        </div>
                        <p className="text-3xl font-black text-white tabular-nums">{monitorData?.pendingReports ?? 0}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mt-1">Pending Protocols</p>
                    </Card>
                </motion.div>

                <motion.div variants={item}>
                    <Card variant="glass" className="h-full border-emerald-500/10 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Zap className="w-5 h-5 text-emerald-400" />
                        </div>
                        <p className="text-3xl font-black text-white tabular-nums">42ms</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mt-1">Avg Latency (DB)</p>
                    </Card>
                </motion.div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Control Panel */}
                <div className="lg:col-span-1 space-y-6">
                    <h2 className="text-xl font-black text-white tracking-tighter italic mb-4">System Directives</h2>

                    <Card variant="glass" className="p-6">
                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl">
                                <div>
                                    <p className="text-xs font-black text-white uppercase tracking-tight">Matching Engine</p>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Global Discovery toggle</p>
                                </div>
                                <button onClick={toggleMatching} className="focus:outline-none transition-transform active:scale-90">
                                    {matchingEnabled === false ? (
                                        <ToggleLeft className="w-10 h-10 text-gray-700" />
                                    ) : (
                                        <ToggleRight className="w-10 h-10 text-indigo-500" />
                                    )}
                                </button>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl">
                                <div>
                                    <p className="text-xs font-black text-white uppercase tracking-tight">Maintenance Mode</p>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Platform Lockdown</p>
                                </div>
                                <button onClick={toggleMaintenance} className="focus:outline-none transition-transform active:scale-90">
                                    {maintenanceMode === true ? (
                                        <ToggleRight className="w-10 h-10 text-red-500" />
                                    ) : (
                                        <ToggleLeft className="w-10 h-10 text-gray-700" />
                                    )}
                                </button>
                            </div>

                            <Button variant="danger" className="w-full py-4 text-xs">
                                <RotateCcw className="w-3.5 h-3.5 mr-2" /> Reboot Signal Server
                            </Button>
                        </div>
                    </Card>

                    <Card variant="glass" className="border-indigo-500/10 overflow-hidden group">
                        <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative p-6">
                            <h3 className="text-sm font-black text-white tracking-tight uppercase mb-2 italic">Security Oversight</h3>
                            <p className="text-xs text-gray-400 mb-4 font-medium leading-relaxed">
                                Review system artifacts and resolve user conflict reports to maintain neural integrity.
                            </p>
                            <Button variant="outline" className="w-full text-[10px]">Open Protocol Logs</Button>
                        </div>
                    </Card>
                </div>

                {/* Log Ticker */}
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-xl font-black text-white tracking-tighter italic mb-4 flex items-center gap-2">
                        <Terminal className="w-5 h-5 text-indigo-500" /> Intelligence Feed
                    </h2>

                    <Card variant="glass" className="p-0 border-white/5 overflow-hidden">
                        <div className="bg-white/5 p-4 border-b border-white/5 flex items-center justify-between">
                            <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">System Events</p>
                            <Badge variant="info" className="bg-indigo-500/10 text-indigo-400 text-[10px]">Real-time</Badge>
                        </div>
                        <div className="p-4 space-y-3 font-mono text-[11px] max-h-[500px] overflow-y-auto custom-scrollbar">
                            {logs && logs.length > 0 ? logs.map((log: any, idx: number) => (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    key={log._id || idx}
                                    className="flex items-start gap-4 p-3 rounded-xl bg-black/20 border border-white/5 group hover:border-indigo-500/30 transition-colors"
                                >
                                    <span className="text-gray-600 min-w-[80px] font-bold">
                                        [{new Date(log.timestamp).toLocaleTimeString()}]
                                    </span>
                                    <span className={cn(
                                        "font-black uppercase tracking-tight",
                                        log.level === 'error' ? "text-red-500" : log.level === 'warn' ? "text-orange-500" : "text-emerald-500"
                                    )}>
                                        {log.level}
                                    </span>
                                    <span className="text-gray-300 flex-1">{log.message}</span>
                                    {log.metadata && (
                                        <XCircle className="w-3 h-3 text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    )}
                                </motion.div>
                            )) : (
                                <div className="text-center py-12 text-gray-600 uppercase font-black tracking-widest opacity-50">
                                    No immediate threats detected.
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Active Sessions Intervention */}
                    <h2 className="text-xl font-black text-white tracking-tighter italic mt-12 mb-4">Tactical Interventions</h2>
                    <Card variant="glass" className="p-0 border-white/5 overflow-hidden">
                        <div className="bg-white/5 p-4 border-b border-white/5">
                            <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Active Sessions</p>
                        </div>
                        <div className="p-4 space-y-3">
                            {activeSessionsDetail && activeSessionsDetail.length > 0 ? (
                                activeSessionsDetail.map((s) => (
                                    <div key={s._id} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl">
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase">{s.skill}</p>
                                            <p className="text-xs font-bold text-white tracking-tight">
                                                {s.requesterName} + {s.receiverName}
                                            </p>
                                        </div>
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            className="h-8 px-3 text-[10px]"
                                            onClick={() => handleTerminate(s._id)}
                                        >
                                            Terminate
                                        </Button>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center py-6 text-[10px] font-black uppercase text-gray-600 tracking-widest opacity-50">
                                    No active sessions found.
                                </p>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};
