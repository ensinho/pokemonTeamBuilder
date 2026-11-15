import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Crown, Puzzle, Rows3 } from 'lucide-react';

import { useTranslation } from '../hooks/useTranslation';
import { navHue } from '../utils/navHue';
import '../styles/next-game.css';

/*
 * "Próximo do dia" (2026-11-15, Enzo: "focar… desde a home e atração, até o
 * ciclo dentro do site"): where a game ends, the next one is one tap away —
 * the PokéPuzzle's result points at the Champion, the tier list at the
 * Champion too. One row, the destination's tone on its icon (utils/navHue.js),
 * never a second primary: the screen's own action stays the loud one.
 */
const GAMES = {
    challenge: { path: '/challenge', icon: Crown, label: 'nav.challenge', hint: 'nav.challengeCardHint' },
    pokepuzzle: { path: '/pokepuzzle', icon: Puzzle, label: 'nav.pokepuzzle', hint: 'nav.pokepuzzleCardHint' },
    tierList: { path: '/tier-list', icon: Rows3, label: 'nav.tierList', hint: 'nextGame.tierListHint' },
};

export function NextGameCard({ game }) {
    const { t } = useTranslation();
    const entry = GAMES[game];
    if (!entry) return null;
    const Icon = entry.icon;
    return (
        <Link to={entry.path} className="next-game" style={{ '--nav-hue': navHue(game) }}>
            <span className="next-game__icon" aria-hidden="true"><Icon /></span>
            <span className="next-game__text">
                <span className="next-game__kicker">{t('nextGame.kicker')}</span>
                <span className="next-game__name">{t(entry.label)}</span>
                <span className="next-game__hint">{t(entry.hint)}</span>
            </span>
            <ChevronRight className="next-game__chevron" aria-hidden="true" />
        </Link>
    );
}

export default NextGameCard;
