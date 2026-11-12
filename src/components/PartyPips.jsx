import React from 'react';
import { typeColors } from '../constants/types';

/**
 * A party as six pips (2026-11-11, the taste pass; shared since 2026-11-12):
 * the games' party row, wherever a team is counted but its slots are not on
 * screen — and beside the builder's name, where it started.
 *
 * `team` is the members in order. A filled pip wears its member's first type
 * (mixed in CSS, `--pip`), so the row says what the team is made of, not only
 * how many; pass `count` alone when the members are not at hand and the pips
 * fill in the primary. The figure after them is the same count for anyone who
 * reads numbers first — hidden from assistive tech, which gets the label.
 */
export function PartyPips({ team, count, size = 6, figure = true, className = '' }) {
    const members = Array.isArray(team) ? team : [];
    const filled = Math.min(size, Number.isFinite(count) ? count : members.length);

    return (
        <span className={`party-pips ${className}`} role="img" aria-label={`${filled} / ${size}`}>
            {Array.from({ length: size }, (_, i) => {
                const tone = typeColors[members[i]?.types?.[0]];
                return (
                    <i
                        key={i}
                        className={i < filled ? 'is-filled' : undefined}
                        style={i < filled && tone ? { '--pip': tone } : undefined}
                    />
                );
            })}
            {figure && <span className="party-pips__figure" aria-hidden="true">{filled}/{size}</span>}
        </span>
    );
}

export default PartyPips;
