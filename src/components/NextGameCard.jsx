import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronRight, Crown, Puzzle, Rows3 } from 'lucide-react';

import { useTranslation } from '../hooks/useTranslation';
import { useGamesToday } from '../hooks/useGamesToday';
import { nextGameFor, nextGameResetAt } from '../utils/gamesToday';
import { countdownLabel } from '../utils/playToday';
import { navHue } from '../utils/navHue';
import '../styles/next-game.css';

/*
 * "Próximo do dia" (2026-11-15, Enzo: "focar… desde a home e atração, até o
 * ciclo dentro do site"): where a game ends, the next one is one tap away.
 * Since the second pass it knows what was played today (`useGamesToday`):
 * `game` is the screen's pick, `from` the screen itself, and a game already
 * played hands over to the other (`nextGameFor`). Both played: "Tudo feito
 * hoje" with the clock to the next games, pointing at the tier list — or,
 * on the tier list, only the clock. One row, the destination's tone on its
 * icon (utils/navHue.js), never a second primary.
 */
const GAMES = {
    challenge: { path: '/challenge', icon: Crown, label: 'nav.challenge', hint: 'nav.challengeCardHint' },
    pokepuzzle: { path: '/pokepuzzle', icon: Puzzle, label: 'nav.pokepuzzle', hint: 'nav.pokepuzzleCardHint' },
    tierList: { path: '/tier-list', icon: Rows3, label: 'nav.tierList', hint: 'nextGame.tierListHint' },
};

/** The clock to the next games, ticking once a minute while it is shown. */
function useResetClock(active) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (!active) return undefined;
        const id = setInterval(() => setNow(Date.now()), 60000);
        return () => clearInterval(id);
    }, [active]);
    return countdownLabel(now, nextGameResetAt(now));
}

export function NextGameCard({ game, from = null }) {
    const { t } = useTranslation();
    const done = useGamesToday();
    const pick = nextGameFor({ preferred: game, from, done });
    const allDone = pick?.kind === 'allDone';
    const clock = useResetClock(allDone);
    if (!pick) return null;

    if (!pick.game) {
        return (
            <div className="next-game next-game--done" role="status">
                <span className="next-game__icon" aria-hidden="true"><Check /></span>
                <span className="next-game__text">
                    <span className="next-game__name">{t('nextGame.allDone')}</span>
                    <span className="next-game__hint">{t('nextGame.opensIn', { time: clock })}</span>
                </span>
            </div>
        );
    }

    const entry = GAMES[pick.game];
    const Icon = entry.icon;
    return (
        <Link to={entry.path} className="next-game" style={{ '--nav-hue': navHue(pick.game) }}>
            <span className="next-game__icon" aria-hidden="true"><Icon /></span>
            <span className="next-game__text">
                <span className="next-game__kicker">
                    {allDone ? t('nextGame.allDoneIn', { time: clock }) : t('nextGame.kicker')}
                </span>
                <span className="next-game__name">{t(entry.label)}</span>
                <span className="next-game__hint">{t(entry.hint)}</span>
            </span>
            <ChevronRight className="next-game__chevron" aria-hidden="true" />
        </Link>
    );
}

export default NextGameCard;
