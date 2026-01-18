import { forwardRef } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends HTMLMotionProps<'button'> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg' | 'icon';
    isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
        const variants = {
            primary: 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20',
            secondary: 'bg-white/10 text-white hover:bg-white/15 backdrop-blur-sm',
            outline: 'bg-transparent border border-white/10 text-white hover:bg-white/5',
            ghost: 'bg-transparent text-gray-400 hover:text-white hover:bg-white/5',
            danger: 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20',
        };

        const sizes = {
            sm: 'px-3 py-1.5 text-xs rounded-lg',
            md: 'px-6 py-2.5 text-sm rounded-xl',
            lg: 'px-8 py-3.5 text-base rounded-2xl',
            icon: 'p-2.5 rounded-xl',
        };

        return (
            <motion.button
                ref={ref}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={disabled || isLoading}
                className={cn(
                    'inline-flex items-center justify-center font-black uppercase tracking-tight transition-colors disabled:opacity-50 disabled:cursor-not-allowed outline-none select-none',
                    variants[variant],
                    sizes[size],
                    className
                )}
                {...props}
            >
                {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    children
                )}
            </motion.button>
        );
    }
);

Button.displayName = 'Button';
