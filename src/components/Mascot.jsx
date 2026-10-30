import React from 'react';
import '../styles/mascot.css';
import { LogoMark } from './LogoMark';

// The app icon itself (LogoMark: the 128px file at these sizes). Its plum
// tile is part of the drawing, so it reads the same on all six themes.
const MASCOT_SIZES = { xs: '1.5rem', sm: '2.25rem', md: '3rem', lg: '4rem' };

/**
 * The app's mascot — the Gengar of the favicon — as the voice of tips and of
 * the bigger moments (2026-10-17): the mission guide, the Home's welcome, a
 * page's tips, a finished journey. Decorative: whatever it "says" is the text
 * next to it, so it carries no alt text of its own.
 *
 * `size`: xs 24px · sm 36px · md 48px · lg 64px. `cheer` plays one hop, for a
 * moment the trainer just earned.
 */
export function Mascot({ size = 'md', cheer = false, className = '' }) {
    return (
        <LogoMark
            sizes={MASCOT_SIZES[size] || MASCOT_SIZES.md}
            className={`mascot mascot--${size} ${cheer ? 'is-cheering' : ''} ${className}`}
        />
    );
}

/** The mascot saying something: the mascot, then a speech bubble. */
export function MascotTip({ children, size = 'md', cheer = false, className = '' }) {
    return (
        <div className={`mascot-tip mascot-tip--${size} ${className}`}>
            <Mascot size={size} cheer={cheer} />
            <div className="mascot-tip__bubble">{children}</div>
        </div>
    );
}

export default Mascot;
