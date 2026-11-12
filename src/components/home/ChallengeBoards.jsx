import React from 'react';
import { Crown, Swords, X } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import '../../styles/champion-day.css';

/** What a board's slot holds: the dashed ball for "not yet", then its result. */
const SlotMark = ({ status }) => {
    if (status === 'won') return <Crown aria-hidden="true" />;
    if (status === 'lost') return <X aria-hidden="true" />;
    if (status === 'active') return <Swords aria-hidden="true" />;
    return (
        <svg viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="8" cy="8" r="6" className="challenge-boards__rim" />
            <path d="M2 8h12" className="challenge-boards__rim" />
        </svg>
    );
};

/**
 * The Champion's day as two slots (2026-11-12): the Time do dia and your own
 * team, each with its result — a crown earned in gold, an ✕ for a loss, the
 * live swords while a battle runs, a dashed ball for "not played" (dashed is
 * absent, as everywhere here) — and the count, 0/2 · 1/2 · 2/2.
 *
 * `day` is `challengeBoardsOutcome()`'s answer. `compact` drops the board
 * names (a phone's bar, the rail card's foot); the names stay as each
 * slot's accessible label either way.
 */
export function ChallengeBoards({ day, compact = false, className = '' }) {
    const { t } = useTranslation();
    if (!day) return null;
    const label = t('cozyHome.boards.count', { n: day.done, total: day.total });
    return (
        <span className={`challenge-boards ${compact ? 'is-compact' : ''} ${className}`} role="group" aria-label={label}>
            <span className="challenge-boards__count" aria-hidden="true">{day.done}/{day.total}</span>
            {day.slots.map((slot, i) => {
                const name = t(`cozyHome.boards.${slot.id}`);
                const state = t(`cozyHome.boards.status.${slot.status}`);
                return (
                    <span
                        key={slot.id}
                        className={`challenge-boards__slot is-${slot.status}`}
                        style={{ '--i': i }}
                        role="img"
                        aria-label={`${name}: ${state}`}
                        title={`${name}: ${state}`}
                    >
                        <span className="challenge-boards__mark"><SlotMark status={slot.status} /></span>
                        {!compact && <span className="challenge-boards__name">{name}</span>}
                    </span>
                );
            })}
        </span>
    );
}
