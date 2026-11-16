import React from 'react';

import { useTranslation } from '../hooks/useTranslation';
import { useGamesToday } from '../hooks/useGamesToday';
import { DAILY_GAMES, GAME_NAV_KEYS, dayTally } from '../utils/gamesToday';
import { navHue } from '../utils/navHue';
import '../styles/next-game.css';

/**
 * The day's games as pips (2026-11-15): one per game in the day's order,
 * filled in the game's own tone once it was played today, all gold once the
 * four are. "A party is pips" (design system): how far the day is, read
 * before a word is — never "2/4" as text. Reads the device's record
 * (`useGamesToday`), so every place that shows it agrees.
 */
export function DayPips({ className = '' }) {
    const { t } = useTranslation();
    const done = useGamesToday();
    const tally = dayTally(done);
    return (
        <span
            className={`day-pips ${tally.complete ? 'is-complete' : ''} ${className}`}
            role="img"
            aria-label={t('nav.gamesDone', { n: tally.played, total: tally.total })}
        >
            {DAILY_GAMES.map((game) => (
                <span
                    key={game}
                    className={`day-pips__pip ${done[game] ? 'is-done' : ''}`}
                    style={{ '--nav-hue': navHue(GAME_NAV_KEYS[game]) }}
                />
            ))}
        </span>
    );
}

export default DayPips;
