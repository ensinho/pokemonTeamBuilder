import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, CircleHelp, Crown, MessageCircle, Puzzle, Rows3 } from 'lucide-react';

import { DayPips } from './DayPips';
import { useTranslation } from '../hooks/useTranslation';
import { useGamesToday } from '../hooks/useGamesToday';
import { GAME_NAV_KEYS, nextGameFor, nextGameResetAt } from '../utils/gamesToday';
import { countdownLabel } from '../utils/playToday';
import { diaryTopicId, todayDiaryKey } from '../utils/forumDiary';
import { navHue } from '../utils/navHue';
import '../styles/next-game.css';

/*
 * "Próximo do dia" (2026-11-15, Enzo: "focar… desde a home e atração, até o
 * ciclo dentro do site"): where a game ends, the next one is one tap away.
 * It knows what was played today (`useGamesToday`): `game` is the screen's
 * pick, `from` the screen itself, and a game already played hands over to
 * the next one of the day (`nextGameFor`).
 *
 * Four games since the games pass — the Champion, the PokéPuzzle, the quiz
 * of the day, the tier list of the day — so the row also carries the day's
 * pips: how far the day is, beside where it goes on. All four played: the
 * pips turn gold and the row points at the Diário do dia, where everyone's
 * results are, with the clock to the next games. One row, the destination's
 * tone on its icon (utils/navHue.js), never a second primary.
 */
const GAMES = {
    challenge: { path: '/challenge', icon: Crown, label: 'nav.challenge', hint: 'nav.challengeCardHint' },
    pokepuzzle: { path: '/pokepuzzle', icon: Puzzle, label: 'nav.pokepuzzle', hint: 'nav.pokepuzzleCardHint' },
    quiz: { path: '/quiz?tab=categories&daily=1', icon: CircleHelp, label: 'nav.quizDaily', hint: 'nav.quizCardHint' },
    tierList: { path: '/tier-list?daily=1', icon: Rows3, label: 'nav.tierDaily', hint: 'nav.tierListCardHint' },
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

    if (allDone) {
        return (
            <Link to={`/feed?topic=${diaryTopicId(todayDiaryKey())}`} className="next-game next-game--done" style={{ '--nav-hue': navHue('feed') }}>
                <span className="next-game__icon" aria-hidden="true"><MessageCircle /></span>
                <span className="next-game__text">
                    <span className="next-game__kicker">{t('nextGame.allDoneIn', { time: clock })}</span>
                    <span className="next-game__name">{t('nextGame.diary')}</span>
                    <span className="next-game__hint">{t('nextGame.diaryHint')}</span>
                </span>
                <DayPips />
                <ChevronRight className="next-game__chevron" aria-hidden="true" />
            </Link>
        );
    }

    const entry = GAMES[pick.game];
    const Icon = entry.icon;
    return (
        <Link to={entry.path} className="next-game" style={{ '--nav-hue': navHue(GAME_NAV_KEYS[pick.game]) }}>
            <span className="next-game__icon" aria-hidden="true"><Icon /></span>
            <span className="next-game__text">
                <span className="next-game__kicker">{t('nextGame.kicker')}</span>
                <span className="next-game__name">{t(entry.label)}</span>
                <span className="next-game__hint">{t(entry.hint)}</span>
            </span>
            <DayPips />
            <ChevronRight className="next-game__chevron" aria-hidden="true" />
        </Link>
    );
}

export default NextGameCard;
