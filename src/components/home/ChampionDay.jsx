import React from 'react';
import { ChevronRight } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { CHAMPION_NAMES, difficultyLabel } from '../../utils/challengeChampions';
import { CHAMPION_FACES } from '../../utils/championFaces';
import { ChallengeBoards } from './ChallengeBoards';
import '../../styles/champion-day.css';

/** The champion's face, cropped to the head on a disc of the card's tone. */
export function ChampionFace({ id, className = '' }) {
    return (
        <span className={`champion-face ${className}`} aria-hidden="true">
            <img src={CHAMPION_FACES[id]} alt="" width={80} height={80} decoding="async" className="champion-face__img" />
        </span>
    );
}

/**
 * The hero's two champions (2026-11-12, Enzo: "organizar a divisão
 * claramente entre os dois campeões"): one tab each — their face, their name,
 * their day as 0/2 · 1/2 · 2/2 — and the tab picked is the champion the hero
 * shows. A segmented control in the hero's own material, not a second card.
 * Since the harmony pass (2026-11-12) each tab carries its two boards' marks,
 * so the score is read once, where the champion is picked.
 *
 * `plan` is `challengeDayPlan()`'s answer; `focus` the champion on screen.
 */
export function ChampionSwitch({ plan, focus, onFocus, showBoards = true }) {
    const { t } = useTranslation();
    return (
        <div className="champion-switch" role="group" aria-label={t('cozyHome.champions.label')}>
            {plan.champions.map((day) => {
                const isOn = day.id === focus;
                const name = CHAMPION_NAMES[day.id] || day.id;
                return (
                    <button
                        key={day.id}
                        type="button"
                        className={`champion-switch__tab ${isOn ? 'is-on' : ''}`}
                        aria-pressed={isOn}
                        onClick={() => onFocus(day.id)}
                        title={showBoards ? `${name} · ${t('cozyHome.boards.count', { n: day.done, total: day.total })}` : name}
                    >
                        <ChampionFace id={day.id} />
                        <span className="champion-switch__name">{name}</span>
                        {/* The day's two results on the tab itself (a crown, an ✕, the
                            dashed ball) — the hero no longer repeats them in its foot. */}
                        {showBoards && <ChallengeBoards day={day} compact className="champion-switch__boards" />}
                    </button>
                );
            })}
        </div>
    );
}

/**
 * The "Seu dia" card's ledger: one row per champion — face, name, the day's
 * difficulty under their own names and their streak, the two boards — and
 * each row goes straight to that champion's next battle (or their ranking
 * once the day is played: `championAction`). `info` is the summary's
 * `champions` entries by id, for difficulty and streak.
 */
export function ChampionLedger({ plan, info = {}, focus, isGuest, onOpen }) {
    const { t } = useTranslation();
    return (
        <ul className="champion-ledger" aria-label={t('cozyHome.champions.label')}>
            {plan.champions.map((day) => {
                const name = CHAMPION_NAMES[day.id] || day.id;
                const facts = info[day.id] || {};
                const difficulty = difficultyLabel(t, day.id, facts.difficulty);
                const line = isGuest
                    ? t('cozyHome.challengeGuest')
                    : [difficulty, t('homeToday.challengeStreak', { n: facts.streak || 0 })].filter(Boolean).join(' · ');
                return (
                    <li key={day.id}>
                        <button
                            type="button"
                            className={`champion-ledger__row ${day.id === focus ? 'is-focus' : ''} ${day.outcome === 'perfect' ? 'is-perfect' : ''}`}
                            onClick={() => onOpen(day)}
                            aria-label={`${name}: ${isGuest ? line : t('cozyHome.boards.count', { n: day.done, total: day.total })}`}
                        >
                            <ChampionFace id={day.id} />
                            <span className="champion-ledger__text">
                                <span className="champion-ledger__name">{name}</span>
                                <span className="champion-ledger__line">{line}</span>
                            </span>
                            {!isGuest && <ChallengeBoards day={day} compact className="champion-ledger__boards" />}
                            <ChevronRight className="champion-ledger__chevron" aria-hidden="true" />
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}
