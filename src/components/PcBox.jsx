import React from 'react';
import { typeColors } from '../constants/types';
import { getTeamPokemonDisplaySprite } from '../utils/pokemonSprites';
import { Sprite } from './Sprite';
import '../styles/pc-box.css';

const TEAM_SIZE = 6;

const typeName = (entry) => (typeof entry === 'string' ? entry : entry?.type?.name || entry?.name || null);

/**
 * A team as a box in Bill's PC: six cells on the box's wallpaper, each member
 * standing in its own, an empty cell a dashed slot (dashed means absent, here
 * as everywhere in this app). The wallpaper takes the lead member's type, so
 * a mono-type team reads as its type before a sprite is recognised.
 *
 * - `columns`: 6 for a one-row strip (lists), 3 for the 3×2 box (cards).
 * - `size`: 'sm' | 'md' | 'lg' — the cell size.
 * - `label`: the accessible description; the cells themselves are decorative.
 */
export function PcBox({ members = [], columns = 6, size = 'md', label, className = '' }) {
    const lead = members.find((m) => m && Array.isArray(m.types) && m.types.length > 0);
    const leadType = lead ? typeName(lead.types[0]) : null;
    const tone = (leadType && typeColors[leadType]) || 'var(--color-primary)';

    return (
        <span
            className={`pc-box pc-box--${size} ${className}`}
            style={{ '--pc-box-tone': tone, '--pc-box-columns': columns }}
            role={label ? 'img' : undefined}
            aria-label={label}
            aria-hidden={label ? undefined : 'true'}
        >
            {Array.from({ length: TEAM_SIZE }, (_, i) => {
                const member = members[i];
                return member ? (
                    <span key={member.instanceId || `${member.id}-${i}`} className="pc-box__cell is-filled" style={{ '--i': i }}>
                        <Sprite src={getTeamPokemonDisplaySprite(member)} className="pc-box__sprite" />
                    </span>
                ) : (
                    <span key={`empty-${i}`} className="pc-box__cell" />
                );
            })}
        </span>
    );
}
