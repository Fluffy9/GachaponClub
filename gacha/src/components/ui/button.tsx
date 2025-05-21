import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'outline' | 'ghost';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className = '', variant = 'default', ...props }, ref) => {
        const baseStyles = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";

        const variants = {
            default: "bg-[#b480e4] hover:bg-[#9d6ad0] text-white",
            outline: "border border-gray-300 dark:border-gray-700 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800",
            ghost: "bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800"
        };

        return (
            <button
                className={`${baseStyles} ${variants[variant]} ${className}`}
                ref={ref}
                {...props}
            />
        );
    }
);

Button.displayName = 'Button'; 