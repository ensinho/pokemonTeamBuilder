import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { useTranslation } from '../../hooks/useTranslation';
import { useTodayCrowd } from '../../hooks/useTodayCrowd';
import { typeColors } from '../../constants/types';
import { championArt } from '../../utils/challengeArt';
import { nextResetAt } from '../../utils/challengeDay';
import { localDayKey } from '../../utils/dailyCheckin';
import { getPokemonFrontSpriteUrl } from '../../utils/pokemonSprites';
import { countdownLabel, crowdLine, puzzleNumberOn } from '../../utils/playToday';
import { TIER_BALLS } from '../../utils/tierList';

/*
 * "Jogue hoje" (2026-11-15, the proposal's option A — Enzo): the day's games
 * right under the landing's hero, so the draw starts before any sign-up. The
 * Champion leads as the band's one loud object (the hero's tint, the Volt
 * action), then the PokéPuzzle and the tier list, calm. The figures are the
 * day's own: the clock to the next team, the puzzle's number, how many played
 * (useTodayCrowd, read once the page is idle). The rules are utils/playToday.js.
 */

const TIER_ART = [['S', [7, 4]], ['A', [1, 393]], ['B', [155]]];

function Crowd({ line, game }) {
    const { t } = useTranslation();
    // Room is kept for the line while the counters load, so nothing shifts.
    return (
        <span className={`play-card__crowd ${line ? '' : 'is-pending'}`} aria-live="polite">
            {line ? t(`landing.playToday.crowd.${game}.${line.key}`, { n: line.n.toLocaleString() }) : ' '}
        </span>
    );
}

export function LandingPlayToday({ onLeave }) {
    const { t } = useTranslation();
    const counts = useTodayCrowd();
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 30000);
        return () => clearInterval(timer);
    }, []);
    const champion = championArt('cynthia');

    return (
        <section className="play-today" aria-labelledby="play-today-title">
            <header className="play-today__head">
                <h2 id="play-today-title" className="landing-section-title">{t('landing.playToday.title')}</h2>
                <p className="play-today__sub"><span className="live-dot" aria-hidden="true" />{t('landing.playToday.sub')}</p>
            </header>
            <ul className="play-today__grid">
                <li>
                    <Link
                        to="/challenge"
                        className="play-card play-card--champion"
                        style={{ '--hero-type': typeColors.dragon }}
                        onClick={() => onLeave('play_challenge')}
                    >
                        <span className="play-card__text">
                            <span className="play-card__kicker">{t('landing.playToday.challenge.kicker', { time: countdownLabel(now, nextResetAt(now)) })}</span>
                            <span className="play-card__name">{t('landing.playToday.challenge.name')}</span>
                            <span className="play-card__line">{t('landing.playToday.challenge.line')}</span>
                            <Crowd line={crowdLine(counts?.champions)} game="challenge" />
                            <span className="btn btn-primary btn-sm play-card__cta">{t('landing.playToday.challenge.cta')}</span>
                        </span>
                        <span className="play-card__art play-card__art--champion" aria-hidden="true">
                            <img className="play-card__trainer" src={champion.battle} alt="" width={80} height={80} decoding="async" />
                            <img className="play-card__ace" src={getPokemonFrontSpriteUrl(445)} alt="" width={96} height={96} decoding="async" />
                        </span>
                    </Link>
                </li>
                <li>
                    <Link to="/pokepuzzle" className="play-card" style={{ '--hero-type': typeColors.ghost }} onClick={() => onLeave('play_puzzle')}>
                        <span className="play-card__text">
                            <span className="play-card__kicker">{t('landing.playToday.puzzle.kicker', { n: puzzleNumberOn(localDayKey(new Date(now))) })}</span>
                            <span className="play-card__name">{t('landing.playToday.puzzle.name')}</span>
                            <span className="play-card__line">{t('landing.playToday.puzzle.line')}</span>
                            <Crowd line={crowdLine(counts?.puzzle)} game="puzzle" />
                            <span className="btn btn-secondary btn-sm play-card__cta">{t('landing.playToday.puzzle.cta')}</span>
                        </span>
                        <span className="play-card__art play-card__art--puzzle" aria-hidden="true">
                            <span className="play-card__mark">?</span>
                            <span className="play-card__tiles"><i className="is-p" /><i /><i className="is-c" /><i /><i className="is-p" /></span>
                        </span>
                    </Link>
                </li>
                <li>
                    <Link to="/tier-list" className="play-card" style={{ '--hero-type': typeColors.ice }} onClick={() => onLeave('play_tierlist')}>
                        <span className="play-card__text">
                            <span className="play-card__kicker">{t('nav.tierList')}</span>
                            <span className="play-card__name">{t('landing.playToday.tierList.name')}</span>
                            <span className="play-card__line">{t('landing.playToday.tierList.line')}</span>
                            <span className="btn btn-secondary btn-sm play-card__cta">{t('landing.playToday.tierList.cta')}</span>
                        </span>
                        <span className="play-card__art play-card__art--tiers" aria-hidden="true">
                            {TIER_ART.map(([tier, ids]) => (
                                <span key={tier} className="play-card__tier">
                                    <b style={{ '--ball': TIER_BALLS[tier].ball === 'ultra' ? TIER_BALLS[tier].band : TIER_BALLS[tier].top }}>{tier}</b>
                                    {ids.map((id) => <img key={id} src={getPokemonFrontSpriteUrl(id)} alt="" width={32} height={32} loading="lazy" decoding="async" />)}
                                </span>
                            ))}
                        </span>
                    </Link>
                </li>
            </ul>
        </section>
    );
}

export default LandingPlayToday;
