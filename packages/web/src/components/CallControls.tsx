import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';
import { cn } from '../lib/utils';

interface CallControlsProps {
    onToggleMicrophone: () => boolean;
    onToggleCamera: () => boolean;
    onEndCall: () => void;
    disabled?: boolean;
}

export function CallControls({
    onToggleMicrophone,
    onToggleCamera,
    onEndCall,
    disabled = false,
}: CallControlsProps) {
    const [isMicOn, setIsMicOn] = useState(true);
    const [isCameraOn, setIsCameraOn] = useState(true);

    const handleToggleMic = () => {
        const newState = onToggleMicrophone();
        setIsMicOn(newState);
    };

    const handleToggleCamera = () => {
        const newState = onToggleCamera();
        setIsCameraOn(newState);
    };

    const ControlButton = ({
        onClick,
        isOn,
        onIcon: OnIcon,
        offIcon: OffIcon,
        variant = 'default'
    }: any) => (
        <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "p-4 rounded-3xl transition-all shadow-xl",
                variant === 'danger'
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : (isOn ? "bg-white/10 hover:bg-white/20 text-white" : "bg-red-500/20 hover:bg-red-500/30 text-red-500 border border-red-500/20"),
                "disabled:opacity-30 disabled:cursor-not-allowed"
            )}
        >
            {isOn ? <OnIcon className="w-6 h-6" /> : <OffIcon className="w-6 h-6" />}
        </motion.button>
    );

    return (
        <div className="flex items-center justify-center gap-6">
            <ControlButton
                onClick={handleToggleMic}
                isOn={isMicOn}
                onIcon={Mic}
                offIcon={MicOff}
            />

            <ControlButton
                onClick={handleToggleCamera}
                isOn={isCameraOn}
                onIcon={Video}
                offIcon={VideoOff}
            />

            <ControlButton
                onClick={onEndCall}
                isOn={true}
                onIcon={PhoneOff}
                variant="danger"
            />
        </div>
    );
}
