import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
    className?: string;
}

export const Badge = ({ children, variant = 'default', className }: BadgeProps) => {
    const variants = {
        default: 'bg-white/10 text-gray-300',
        success: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
        warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
        danger: 'bg-red-500/10 text-red-500 border border-red-500/20',
        info: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
    };

    return (
        <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
                'px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest',
                variants[variant],
                className
            )}
        >
            {children}
        </motion.span>
    );
};
