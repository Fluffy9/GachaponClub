import React from 'react';

interface PixelIconProps {
    icon: string;
    className?: string;
}

export function PixelIcon({ icon, className = '' }: PixelIconProps) {
    return (
        <span className={`pixel-icon ${className}`}>
            {icon}
        </span>
    );
} 