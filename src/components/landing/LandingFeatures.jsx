import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';

import { useTranslation } from '../../hooks/useTranslation';
import { useUsageIndex } from '../../hooks/useUsageStats';
import { typeColors, typeIcons } from '../../constants/types';
import { CYNTHIA_SHEET } from '../../utils/challengeArt';
import { analyzeTeam } from '../../utils/teamAnalysis';
import { offensiveMultiplier } from '../../utils/typeMatchups';
import { DEMO_POOL } from '../../utils/landing';
import { getPokemonFrontSpriteUrl } from '../../utils/pokemonSprites';
import { titleCaseSlug } from '../../utils/smogonSets';
import { AnimatedSprite } from '../AnimatedSprite';
import { TypeChip } from '../TypeChip';

/**
 * The landing's "everything for your team", laid out like the patch notes:
 * one featured card with its scene, the others each with an illustration of
 * its own (2026-10-21). Every illustration is drawn from real data — the
 * builder's own analysis, base stats and speeds from the index, matchups from
 * the chart, battle counts from the usage index — never a made-up figure.
 *
 * Each card carries its identity as `--feature-tone`, a canon type colour
 * mixed into theme tokens (styles/landing.css), so all ten themes hold.
 */

const byId = Object.fromEntries(DEMO_POOL.map((p) => [p.id, p]));

// Canon base stats (pokemon-index.json), so the cards draw without loading it.
const GARDEVOIR_STATS = { hp: 68, attack: 65, defense: 65, 'special-attack': 125, 'special-defense': 115, speed: 80 };
const SPEED_LINEUP = [
    { id: 445, speed: 102 },
    { id: 6, speed: 100 },
    { id: 130, speed: 81 },
    { id: 727, speed: 60 },
];
const STAT_MAX = 255;
const STAT_KEYS = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];
const TRIANGLE = ['fire', 'water', 'grass'];
const MULTIPLIER_LABEL = { 0: '0', 0.5: '½', 1: '', 2: '2' };

/** Cynthia, walking in place on her own platform — the room's overworld sheet. */
const Cynthia = () => (
    <span
        className="landing-cynthia"
        style={{ backgroundImage: `url(${CYNTHIA_SHEET.url})` }}
        aria-hidden="true"
    />
);

function ChallengeVisual() {
    const { t } = useTranslation();
    return (
        <div className="landing-visual landing-visual--challenge" aria-hidden="true">
            <div className="landing-arena">
                <span className="landing-arena__side">
                    <span className="landing-arena__stage"><Cynthia /></span>
                    <span className="landing-arena__label">Cynthia</span>
                </span>
                <span className="landing-arena__vs">VS</span>
                <span className="landing-arena__side">
                    <span className="landing-arena__stage">
                        <AnimatedSprite id={445} className="landing-arena__ace" lazy />
                    </span>
                    <span className="landing-arena__label">{titleCaseSlug('garchomp')}</span>
                </span>
            </div>
            {/* Today's six are drawn at midnight and stay hidden until you face them. */}
            <div className="landing-arena__six">
                {Array.from({ length: 6 }, (_, i) => <span key={i} className="landing-arena__ball">?</span>)}
            </div>
            <ul className="landing-arena__facts">
                <li>{t('landing.challenge.oneADay')}</li>
                <li>{t('landing.challenge.newTeam')}</li>
                <li>{t('landing.challenge.streak')}</li>
            </ul>
        </div>
    );
}

function BuilderVisual() {
    const { t } = useTranslation();
    const team = [byId[6], byId[130], byId[445]];
    const shared = Object.keys(analyzeTeam(team).teamAnalysis.weaknesses);
    return (
        <div className="landing-visual" aria-hidden="true">
            <div className="landing-slots">
                {Array.from({ length: 6 }, (_, i) => (
                    team[i]
                        ? <span key={i} className="landing-slot"><img src={getPokemonFrontSpriteUrl(team[i].id)} alt="" /></span>
                        : <span key={i} className="landing-slot landing-slot--empty" />
                ))}
            </div>
            <span className="landing-visual__caption">
                {t('landing.demo.sharedWeakness')}
                {shared.map((type) => <TypeChip key={type} type={type} size="sm" />)}
            </span>
        </div>
    );
}

function PokedexVisual() {
    const { t } = useTranslation();
    return (
        <div className="landing-visual" aria-hidden="true">
            <div className="landing-dex">
                <span className="landing-dex__sprite"><img src={getPokemonFrontSpriteUrl(282)} alt="" /></span>
                <span className="landing-dex__body">
                    <span className="landing-dex__head">
                        <span className="landing-dex__name">Gardevoir</span>
                        <span className="landing-dex__no">#0282</span>
                    </span>
                    <span className="landing-dex__stats">
                        {STAT_KEYS.map((key) => (
                            <span key={key} className="landing-dex__stat">
                                <span className="landing-dex__label">{t(`seo.snapshot.stats.${key}`)}</span>
                                <span className="landing-dex__bar"><span style={{ width: `${(GARDEVOIR_STATS[key] / STAT_MAX) * 100}%` }} /></span>
                                <span className="landing-dex__value">{GARDEVOIR_STATS[key]}</span>
                            </span>
                        ))}
                    </span>
                </span>
            </div>
        </div>
    );
}

function SpeedVisual() {
    const { t } = useTranslation();
    const top = SPEED_LINEUP[0].speed;
    return (
        <div className="landing-visual" aria-hidden="true">
            <div className="landing-speed">
                {SPEED_LINEUP.map(({ id, speed }) => (
                    <span key={id} className="landing-speed__row">
                        <img src={getPokemonFrontSpriteUrl(id)} alt="" className="landing-speed__sprite" />
                        <span className="landing-speed__bar"><span style={{ width: `${(speed / top) * 100}%` }} /></span>
                        <span className="landing-speed__value">{speed}</span>
                    </span>
                ))}
            </div>
            <span className="landing-visual__caption">{t('landing.visuals.speed')}</span>
        </div>
    );
}

function MetaVisual() {
    const { t, language } = useTranslation();
    const { formats, month } = useUsageIndex();
    const top = useMemo(
        () => [...formats].sort((a, b) => (b.totalBattles || 0) - (a.totalBattles || 0)).slice(0, 3),
        [formats],
    );
    const max = top[0]?.totalBattles || 1;
    const fmt = (n) => new Intl.NumberFormat(language === 'pt' ? 'pt-BR' : 'en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
    const monthLabel = month
        ? new Date(`${month}-15`).toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en', { month: 'long', year: 'numeric' })
        : '';
    return (
        <div className="landing-visual" aria-hidden="true">
            <div className="landing-meta">
                {top.length ? top.map((f) => (
                    <span key={f.id} className="landing-meta__row">
                        <span className="landing-meta__label">{f.label}</span>
                        <span className="landing-meta__bar"><span style={{ width: `${(f.totalBattles / max) * 100}%` }} /></span>
                        <span className="landing-meta__value">{fmt(f.totalBattles)}</span>
                    </span>
                )) : [0, 1, 2].map((i) => <span key={i} className="landing-meta__row landing-meta__row--ghost" />)}
            </div>
            <span className="landing-visual__caption">
                <AnimatedSprite id={727} className="landing-meta__mascot" lazy />
                {monthLabel ? t('landing.visuals.meta', { month: monthLabel }) : t('landing.visuals.metaLoading')}
            </span>
        </div>
    );
}

function TypesVisual() {
    const { t } = useTranslation();
    return (
        <div className="landing-visual" aria-hidden="true">
            <table className="landing-mini-chart">
                <tbody>
                    <tr>
                        <td />
                        {TRIANGLE.map((d) => <td key={d}><img src={typeIcons[d]} alt="" /></td>)}
                    </tr>
                    {TRIANGLE.map((a) => (
                        <tr key={a}>
                            <td><img src={typeIcons[a]} alt="" /></td>
                            {TRIANGLE.map((d) => {
                                const m = offensiveMultiplier(a, d);
                                const tone = m > 1 ? 'super' : m < 1 ? 'weak' : 'neutral';
                                return <td key={d} className={`is-${tone}`}>{MULTIPLIER_LABEL[m]}</td>;
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
            <span className="landing-visual__caption">{t('landing.visuals.types')}</span>
        </div>
    );
}

const FEATURES = [
    { key: 'builder', to: '/builder', tone: 'var(--color-primary)', Visual: BuilderVisual },
    { key: 'meta', to: '/meta', tone: typeColors.fire, Visual: MetaVisual },
    { key: 'pokedex', to: '/pokedex', tone: typeColors.psychic, Visual: PokedexVisual },
    { key: 'calc', to: '/damage-calculator', tone: typeColors.electric, Visual: SpeedVisual },
    { key: 'types', to: '/types', tone: typeColors.water, Visual: TypesVisual },
];

function FeatureCard({ feature, onLeave, featured = false }) {
    const { t } = useTranslation();
    const { key, to, tone, Visual } = feature;
    return (
        <Link
            to={to}
            className={`landing-feature${featured ? ' landing-feature--featured' : ''}`}
            style={{ '--feature-tone': tone }}
            onClick={() => onLeave(`feature_${key}`)}
        >
            <Visual />
            <span className="landing-feature__copy">
                {featured && <span className="landing-feature__kicker">{t('landing.challenge.kicker')}</span>}
                <h3 className="landing-feature__title">{t(`landing.features.${key}.title`)}</h3>
                <p className="landing-feature__body">{t(`landing.features.${key}.body`)}</p>
                <span className="landing-feature__cta">{t(`landing.features.${key}.cta`)} <span aria-hidden="true">→</span></span>
            </span>
        </Link>
    );
}

export function LandingFeatures({ onLeave }) {
    const { t } = useTranslation();
    return (
        <section className="landing-features" aria-labelledby="landing-features-title">
            <h2 id="landing-features-title" className="landing-section-title">{t('landing.featuresTitle')}</h2>
            <div className="landing-bento">
                <FeatureCard
                    featured
                    onLeave={onLeave}
                    feature={{ key: 'challenge', to: '/challenge', tone: typeColors.dragon, Visual: ChallengeVisual }}
                />
                {FEATURES.map((feature) => <FeatureCard key={feature.key} feature={feature} onLeave={onLeave} />)}
            </div>
        </section>
    );
}
