import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PreCallValidator, type PreCallResult, type PreCallTestProgress } from '../lib/webrtc/PreCallValidator';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { CheckCircle2, XCircle, Loader2, Wifi, Camera, Mic, Activity } from 'lucide-react';
import { cn } from '../lib/utils';

interface PreCallTestProps {
    onComplete: (result: PreCallResult) => void;
    onCancel: () => void;
}

export function PreCallTest({ onComplete, onCancel }: PreCallTestProps) {
    const [progress, setProgress] = useState<PreCallTestProgress | null>(null);
    const [result, setResult] = useState<PreCallResult | null>(null);
    const [isRetrying, setIsRetrying] = useState(false);

    const runTests = async () => {
        setResult(null);
        setIsRetrying(false);

        const validator = new PreCallValidator((prog) => {
            setProgress(prog);
        });

        const testResult = await validator.validate();
        setResult(testResult);

        if (testResult.canProceed) {
            // Auto-proceed after brief delay
            setTimeout(() => onComplete(testResult), 1000);
        }
    };

    useEffect(() => {
        runTests();
    }, []);

    const handleRetry = () => {
        setIsRetrying(true);
        runTests();
    };

    const getStageIcon = (stage: string, completed: boolean, isCurrent: boolean) => {
        if (completed) {
            return <CheckCircle2 className="w-5 h-5 text-green-500" />;
        }
        if (isCurrent) {
            return <Loader2 className="w-5 h-5 text-warm-500 animate-spin" />;
        }

        switch (stage) {
            case 'devices': return <Camera className="w-5 h-5 text-gray-600" />;
            case 'audio-level': return <Mic className="w-5 h-5 text-gray-600" />;
            case 'network': return <Activity className="w-5 h-5 text-gray-600" />;
            case 'stun': return <Wifi className="w-5 h-5 text-gray-600" />;
            default: return null;
        }
    };

    const stages = ['devices', 'audio-level', 'stun', 'network'];
    const currentStageIndex = stages.indexOf(progress?.stage || '');

    return (
        <div className="min-h-screen bg-secondary-950 flex items-center justify-center p-4">
            <Card variant="glass" className="max-w-lg w-full p-8 sm:p-12">
                <AnimatePresence mode="wait">
                    {!result || result.canProceed ? (
                        <motion.div
                            key="testing"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-8"
                        >
                            {/* Header */}
                            <div className="text-center">
                                <motion.div
                                    animate={{ scale: [1, 1.05, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="w-20 h-20 rounded-full bg-warm-500/10 flex items-center justify-center mx-auto mb-6"
                                >
                                    <Activity className="w-10 h-10 text-warm-500" />
                                </motion.div>
                                <h2 className="text-3xl font-black text-white mb-2">
                                    {result?.canProceed ? 'Ready to Connect!' : 'Pre-Call Check'}
                                </h2>
                                <p className="text-gray-400 font-medium">
                                    {result?.canProceed
                                        ? 'All systems go. Connecting you now...'
                                        : 'Verifying your connection quality...'}
                                </p>
                            </div>

                            {/* Progress Bar */}
                            {progress && !result?.canProceed && (
                                <div className="space-y-2">
                                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full bg-gradient-to-r from-warm-500 to-warm-600"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${progress.progress}%` }}
                                            transition={{ duration: 0.3 }}
                                        />
                                    </div>
                                    <p className="text-sm text-gray-500 text-center font-medium">
                                        {progress.message}
                                    </p>
                                </div>
                            )}

                            {/* Test Stages */}
                            <div className="space-y-3">
                                {stages.map((stage, index) => {
                                    const completed = currentStageIndex > index || result?.canProceed;
                                    const isCurrent = progress?.stage === stage && !result?.canProceed;

                                    return (
                                        <motion.div
                                            key={stage}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                            className={cn(
                                                "flex items-center gap-4 p-4 rounded-2xl transition-all",
                                                isCurrent && "bg-warm-500/5 border border-warm-500/20",
                                                completed && "bg-green-500/5 border border-green-500/20",
                                                !isCurrent && !completed && "bg-gray-800/30"
                                            )}
                                        >
                                            {getStageIcon(stage, completed, isCurrent)}
                                            <div className="flex-1">
                                                <p className={cn(
                                                    "font-bold text-sm",
                                                    completed && "text-green-400",
                                                    isCurrent && "text-warm-400",
                                                    !isCurrent && !completed && "text-gray-500"
                                                )}>
                                                    {stage === 'devices' && 'Camera & Microphone'}
                                                    {stage === 'audio-level' && 'Audio Input Level'}
                                                    {stage === 'stun' && 'Server Connectivity'}
                                                    {stage === 'network' && 'Network Quality'}
                                                </p>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>

                            {/* Metrics Display */}
                            {result?.metrics && result.canProceed && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="grid grid-cols-2 gap-3 p-4 bg-green-500/5 border border-green-500/20 rounded-2xl"
                                >
                                    {result.metrics.rtt !== undefined && (
                                        <div className="text-center">
                                            <p className="text-2xl font-black text-green-400">{Math.round(result.metrics.rtt)}ms</p>
                                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Latency</p>
                                        </div>
                                    )}
                                    {result.metrics.audioLevel !== undefined && (
                                        <div className="text-center">
                                            <p className="text-2xl font-black text-green-400">{(result.metrics.audioLevel * 100).toFixed(0)}%</p>
                                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Mic Level</p>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* Cancel Button (only show during testing) */}
                            {!result && (
                                <Button
                                    variant="secondary"
                                    className="w-full"
                                    onClick={onCancel}
                                >
                                    Cancel
                                </Button>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="failed"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="space-y-8"
                        >
                            {/* Error State */}
                            <div className="text-center">
                                <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
                                    <XCircle className="w-10 h-10 text-red-500" />
                                </div>
                                <h2 className="text-3xl font-black text-white mb-3">Connection Issue</h2>
                                <p className="text-gray-400 mb-6">{result.failureReason}</p>

                                {/* Metrics if available */}
                                {result.metrics && (
                                    <div className="space-y-2 p-4 bg-gray-800/30 rounded-2xl text-left mb-6">
                                        <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">Diagnostics</p>
                                        {result.metrics.rtt !== undefined && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-400">Latency</span>
                                                <span className={cn("font-bold", result.metrics.rtt > 500 ? "text-red-400" : "text-green-400")}>
                                                    {Math.round(result.metrics.rtt)}ms
                                                </span>
                                            </div>
                                        )}
                                        {result.metrics.audioLevel !== undefined && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-400">Mic Level</span>
                                                <span className={cn("font-bold", result.metrics.audioLevel < 0.01 ? "text-red-400" : "text-green-400")}>
                                                    {(result.metrics.audioLevel * 100).toFixed(0)}%
                                                </span>
                                            </div>
                                        )}
                                        {result.metrics.devicesAvailable !== undefined && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-400">Devices</span>
                                                <span className={cn("font-bold", result.metrics.devicesAvailable === false ? "text-red-400" : "text-green-400")}>
                                                    {result.metrics.devicesAvailable === false ? 'Not Available' : 'Available'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="space-y-3">
                                <Button
                                    variant="primary"
                                    className="w-full"
                                    onClick={handleRetry}
                                    disabled={isRetrying}
                                >
                                    {isRetrying ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Try Again'}
                                </Button>
                                <Button
                                    variant="secondary"
                                    className="w-full"
                                    onClick={onCancel}
                                >
                                    Go Back
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Card>
        </div>
    );
}
