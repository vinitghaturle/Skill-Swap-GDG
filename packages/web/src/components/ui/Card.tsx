import { forwardRef, type ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '../../lib/utils';

// Card Component
interface CardProps extends HTMLMotionProps<'div'> {
    children: ReactNode;
    variant?: 'glass' | 'outline' | 'flat';
    noPadding?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
    ({ className, children, variant = 'glass', noPadding = false, ...props }, ref) => {
        const variants = {
            glass: 'bg-gray-950/40 backdrop-blur-xl border border-white/5 shadow-2xl',
            outline: 'bg-transparent border border-white/10',
            flat: 'bg-gray-900 border border-white/5',
        };

        return (
            <motion.div
                ref={ref}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                    'rounded-3xl overflow-hidden',
                    variants[variant],
                    !noPadding && 'p-6',
                    className
                )}
                {...props}
            >
                {children}
            </motion.div>
        );
    }
);
Card.displayName = 'Card';

// Input Component
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, icon, ...props }, ref) => {
        return (
            <div className="space-y-2 w-full">
                {label && (
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-500 ml-1">
                        {label}
                    </label>
                )}
                <div className="relative group">
                    {icon && (
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-white transition-colors">
                            {icon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        className={cn(
                            'w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-gray-600 outline-none focus:border-indigo-500/50 focus:bg-white/[0.08] transition-all',
                            icon && 'pl-11',
                            error && 'border-red-500/50 bg-red-500/5',
                            className
                        )}
                        {...props}
                    />
                </div>
                {error && <p className="text-[10px] font-black uppercase text-red-500 ml-1">{error}</p>}
            </div>
        );
    }
);
Input.displayName = 'Input';
