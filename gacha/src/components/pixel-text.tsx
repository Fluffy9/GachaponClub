import React from 'react';

interface PixelTextProps {
    children: React.ReactNode;
    className?: string;
}

export function PixelText({ children, className = '' }: PixelTextProps) {
    return (
        <span className={`pixel-text ${className}`}>
            {children}
        </span>
    );
} 