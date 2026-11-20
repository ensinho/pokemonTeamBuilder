import React, { useId, useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { useTrainerCosmetics } from '../hooks/useTrainerCosmetics';

const SIZE_CLASSES = {
    xs: 'w-3.5 h-3.5 min-w-[0.875rem]',
    sm: 'w-[1.125rem] h-[1.125rem] min-w-[1.125rem]',
    md: 'w-6 h-6 min-w-[1.5rem]',
    lg: 'w-9 h-9 min-w-[2.25rem]',
};

/**
 * Exclusive Admin / Creator hexagonal enamel crest — crafted to sit beside the
 * trainer's normal Gym/Milestone TrainerBadge with matching geometry and lustre.
 */
export function AdminEmblemSvg({ className = 'w-6 h-6', ...props }) {
    const id = useId().replace(/:/g, '');
    return (
        <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <defs>
                <linearGradient id={`${id}-gold`} x1="12%" y1="6%" x2="88%" y2="94%">
                    <stop offset="0%" stopColor="#fef08a" />
                    <stop offset="38%" stopColor="#f59e0b" />
                    <stop offset="78%" stopColor="#b45309" />
                    <stop offset="100%" stopColor="#78350f" />
                </linearGradient>
                <linearGradient id={`${id}-core`} x1="15%" y1="10%" x2="85%" y2="90%">
                    <stop offset="0%" stopColor="#a78bfa" />
                    <stop offset="48%" stopColor="#7c3aed" />
                    <stop offset="100%" stopColor="#311068" />
                </linearGradient>
                <linearGradient id={`${id}-gloss`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.65" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
            </defs>
            {/* Outer beveled gold hexagon */}
            <polygon
                points="50,4 91,27 91,73 50,96 9,73 9,27"
                fill={`url(#${id}-gold)`}
                stroke="#451a03"
                strokeWidth="3"
                strokeLinejoin="round"
            />
            {/* Inner obsidian-violet enamel field */}
            <polygon
                points="50,13 82,31 82,69 50,87 18,69 18,31"
                fill={`url(#${id}-core)`}
                stroke="#fef08a"
                strokeOpacity="0.45"
                strokeWidth="2"
                strokeLinejoin="round"
            />
            {/* Top specular facet */}
            <polygon
                points="50,15 80,32 50,47 20,32"
                fill={`url(#${id}-gloss)`}
            />
            {/* Verified Shield + Star Crest */}
            <path
                d="M50 26 L68 34 V51 C68 62.5 60.2 71.2 50 75 C39.8 71.2 32 62.5 32 51 V34 L50 26 Z"
                fill="#1e1b4b"
                fillOpacity="0.55"
                stroke="#fde68a"
                strokeWidth="3.2"
                strokeLinejoin="round"
            />
            {/* Inner golden sparkle/bolt */}
            <path
                d="M50 36 L53.8 46.2 L64 50 L53.8 53.8 L50 64 L46.2 53.8 L36 50 L46.2 46.2 Z"
                fill="#fef08a"
            />
        </svg>
    );
}

/**
 * "Amigo do Dev" — pocket-sized sibling of the Admin crest (compact warm-gold
 * bezel + soft violet-pink enamel + friendly 4-point star gem).
 */
export function DevFriendEmblemSvg({ className = 'w-6 h-6', ...props }) {
    const id = useId().replace(/:/g, '');
    return (
        <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <defs>
                <linearGradient id={`${id}-rim`} x1="15%" y1="10%" x2="85%" y2="90%">
                    <stop offset="0%" stopColor="#fde68a" />
                    <stop offset="55%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#b45309" />
                </linearGradient>
                <linearGradient id={`${id}-body`} x1="15%" y1="15%" x2="85%" y2="85%">
                    <stop offset="0%" stopColor="#c4b5fd" />
                    <stop offset="55%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#5b21b6" />
                </linearGradient>
            </defs>
            {/* Pocket-scaled rounded hex crest */}
            <g transform="translate(50 50) scale(0.86) translate(-50 -50)">
                <polygon
                    points="50,6 88,28 88,72 50,94 12,72 12,28"
                    fill={`url(#${id}-rim)`}
                    stroke="#451a03"
                    strokeWidth="3"
                    strokeLinejoin="round"
                />
                <polygon
                    points="50,16 79,33 79,67 50,84 21,67 21,33"
                    fill={`url(#${id}-body)`}
                />
                <polygon
                    points="50,18 77,34 50,48 23,34"
                    fill="#ffffff"
                    fillOpacity="0.32"
                />
                {/* Friendly star-heart gem */}
                <path
                    d="M50 32 L54.5 44.5 L67 49 L54.5 53.5 L50 66 L45.5 53.5 L33 49 L45.5 44.5 Z"
                    fill="#fef3c7"
                />
                <circle cx="50" cy="49" r="3.5" fill="#f59e0b" />
            </g>
        </svg>
    );
}

const ROLE_META = {
    admin: {
        Icon: AdminEmblemSvg,
        namePt: 'Admin · Criador',
        nameEn: 'Admin · Creator',
        descPt: 'Insígnia exclusiva do administrador e criador do PokemonBuilder.',
        descEn: 'Exclusive crest of the PokemonBuilder administrator and creator.',
    },
    dev_friend: {
        Icon: DevFriendEmblemSvg,
        namePt: 'Amigo do Dev',
        nameEn: 'Friend of the Dev',
        descPt: 'Insígnia pocket especial concedida pessoalmente pelo criador do PokemonBuilder.',
        descEn: 'Special pocket crest granted personally by the creator of PokemonBuilder.',
    },
};

/**
 * Renders the exclusive Admin crest or pocket "Amigo do Dev" crest right beside
 * a trainer's normal `TrainerBadge`.
 *
 * Pass `role` directly (e.g. ProfileView / Sidebar) OR pass `uid` (+ optional
 * `fallbackRole`) to resolve live from `useTrainerCosmetics`.
 */
export function SpecialRoleBadge({
    role = null,
    uid = null,
    fallbackRole = null,
    size = 'xs',
    showTooltip = true,
    className = '',
}) {
    const { language } = useTranslation();
    const [isHovered, setIsHovered] = useState(false);
    const cosmetics = useTrainerCosmetics(role ? null : uid, { specialBadge: fallbackRole });

    const resolvedRole = role || cosmetics.specialBadge || fallbackRole || null;
    const meta = resolvedRole ? ROLE_META[resolvedRole] : null;
    if (!meta) return null;

    const Icon = meta.Icon;
    const badgeName = language === 'pt' ? meta.namePt : meta.nameEn;
    const badgeDesc = language === 'pt' ? meta.descPt : meta.descEn;
    const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.xs;

    return (
        <span
            className={`trainer-badge-wrapper inline-flex items-center justify-center relative shrink-0 select-none ${className}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onFocus={() => setIsHovered(true)}
            onBlur={() => setIsHovered(false)}
            aria-label={badgeName}
            style={{ display: 'inline-flex', verticalAlign: 'middle' }}
        >
            <span
                className={`trainer-badge-icon ${sizeClass} transition-transform duration-200 ease-out hover:scale-125 cursor-pointer filter drop-shadow-sm`}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            >
                <Icon className="w-full h-full object-contain" />
            </span>

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
                        boxShadow: 'var(--elevation-3)',
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
                            <Icon className="w-full h-full" />
                        </span>
                        <span className="font-bold text-sm leading-tight" style={{ color: 'var(--color-accent)' }}>
                            {badgeName}
                        </span>
                    </div>
                    <p className="text-2xs text-muted leading-snug">
                        {badgeDesc}
                    </p>
                </div>
            )}
        </span>
    );
}

export default SpecialRoleBadge;
