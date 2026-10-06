import React from 'react';

/**
 * The partner's anime flare: four-point glints that twinkle and two
 * hand-drawn strokes that flick in around the Home's partner sprite (styles
 * in home-view.css). One element on one screen — never on a list — and only
 * transform/opacity move, so it stays cheap on a phone; reduced motion hides
 * it. Lives inside `.home-partner-card__sprite-container`, which reads
 * `--partner-type-color` for the tint.
 */
export function PartnerFlare() {
    return (
        <span className="partner-flare" aria-hidden="true">
            <i className="partner-flare__rays" />
            <i className="partner-flare__glint partner-flare__glint--a" />
            <i className="partner-flare__glint partner-flare__glint--b" />
            <i className="partner-flare__glint partner-flare__glint--c" />
            <svg className="partner-flare__strokes" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path className="partner-flare__stroke partner-flare__stroke--a" d="M8 48 Q 13 20 36 8" />
                <path className="partner-flare__stroke partner-flare__stroke--b" d="M94 62 Q 91 86 70 96" />
            </svg>
        </span>
    );
}
