import React, { useState } from 'react';
import { getBadgeById } from '../constants/badges';
import { useTranslation } from '../hooks/useTranslation';

const SIZE_CLASSES = {
    xs: 'w-3.5 h-3.5 min-w-[0.875rem]',
    sm: 'w-4.5 h-4.5 min-w-[1.125rem]',
    md: 'w-6 h-6 min-w-[1.5rem]',
    lg: 'w-9 h-9 min-w-[2.25rem]',
    xl: 'w-16 h-16 min-w-[4rem]',
};

/**
 * TrainerBadge - Displays an equipped Gym Badge / Milestone Badge next to a trainer's name,
 * rendered like a verified badge with interactive tooltip.
 */
export function TrainerBadge({
    badgeId,
    size = 'xs',
    showTooltip = true,
    className = '',
    onClick,
    tabIndex,
    role,
    'aria-label': ariaLabel,
}) {
    const { language } = useTranslation();
    const [isHovered, setIsHovered] = useState(false);
    const badge = getBadgeById(badgeId);

    if (!badge) return null;

    const BadgeIcon = badge.Icon;
    const badgeName = language === 'pt' ? badge.namePt : badge.nameEn;
    const badgeDesc = language === 'pt' ? badge.descPt : badge.descEn;
    const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.xs;

    return (
        <span
            className={`trainer-badge-wrapper inline-flex items-center justify-center relative shrink-0 select-none ${className}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onFocus={() => setIsHovered(true)}
            onBlur={() => setIsHovered(false)}
            onClick={onClick}
            tabIndex={tabIndex}
            role={role}
            aria-label={ariaLabel || badgeName}
            style={{ display: 'inline-flex', verticalAlign: 'middle' }}
        >
            <span
                className={`trainer-badge-icon ${sizeClass} transition-transform duration-200 ease-out hover:scale-125 cursor-pointer filter drop-shadow-sm`}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <BadgeIcon className="w-full h-full object-contain" />
            </span>

            {/* Micro Tooltip */}
            {showTooltip && isHovered && (
                <div
                    role="tooltip"
                    className="trainer-badge-tooltip fixed z-[9999] pointer-events-none px-2.5 py-1.5 rounded-lg shadow-xl text-left border animate-fade-in"
                    style={{
                        backgroundColor: 'var(--color-surface)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-fg)',
                        maxWidth: '16rem',
                        minWidth: '10rem',
                        transform: 'translate(-50%, -100%)',
                        marginTop: '-0.4rem',
                        fontSize: '0.75rem',
                        lineHeight: 1.3,
                        boxShadow: 'var(--elevation-3, 0 10px 25px -5px rgba(0, 0, 0, 0.5))',
                    }}
                    ref={(el) => {
                        if (el && el.parentElement) {
                            const rect = el.parentElement.getBoundingClientRect();
                            el.style.left = `${rect.left + rect.width / 2}px`;
                            el.style.top = `${rect.top}px`;
                        }
                    }}
                >
                    <div className="flex items-center gap-1.5 mb-1">
                        <span className="w-4 h-4 shrink-0">
                            <BadgeIcon className="w-full h-full" />
                        </span>
                        <span className="font-bold text-[0.8125rem] text-primary leading-tight">
                            {badgeName}
                        </span>
                    </div>
                    <p className="text-[0.7rem] text-muted leading-snug">
                        {badgeDesc}
                    </p>
                </div>
            )}
        </span>
    );
}

export default TrainerBadge;
