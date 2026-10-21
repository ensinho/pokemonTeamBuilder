import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../../styles/landing.css';

import { useTranslation } from '../../hooks/useTranslation';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { useActiveTeamStore } from '../../store/useActiveTeamStore';
import { analyzeTeam, rateTeam } from '../../utils/teamAnalysis';
import { DEMO_POOL, DEMO_START, toggleDemoMember } from '../../utils/landing';
import { getPokemonArtworkSpriteUrl, getPokemonFrontSpriteUrl } from '../../utils/pokemonSprites';
import { titleCaseSlug } from '../../utils/smogonSets';
import { typeIcons } from '../../constants/types';
import { TypeChip } from '../TypeChip';
import { RollingNumber } from '../RollingNumber';
import { AnimatedSprite } from '../AnimatedSprite';
import { LandingFeatures } from '../landing/LandingFeatures';
import { THEME_META } from '../../constants/theme';
import { LANGUAGES } from '../../utils/localePath';

/**
 * Home for a first visit (2026-10-21): what the app does, shown working, and
 * one step into it. The demo runs the builder's own analysis (`analyzeTeam`,
 * `rateTeam`) on a pool of six, so what a visitor sees here is what the builder
 * will tell them — and "open in the builder" hands that exact team over.
 *
 * Every way out marks the landing as seen (`onLeave`), so it greets a visitor
 * once; crawlers, which never keep storage, always get it — its copy is also
 * what api/_lib/seoSnapshot.js prerenders for `/`.
 */

/** The demo's six standing in a row, each on its own battle platform. */
function LandingParty() {
    return (
        <div className="landing-party" aria-hidden="true">
            {DEMO_POOL.map((p) => (
                <span key={p.id} className="landing-party__slot">
                    <AnimatedSprite id={p.id} className="landing-party__sprite" />
                </span>
            ))}
        </div>
    );
}

function LandingDemo({ onLeave }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [selected, setSelected] = useState(DEMO_START);

    const team = useMemo(() => DEMO_POOL.filter((p) => selected.includes(p.id)), [selected]);
    const { teamAnalysis } = useMemo(() => analyzeTeam(team), [team]);
    const { score } = rateTeam(teamAnalysis, team.length);
    const weaknesses = Object.entries(teamAnalysis.weaknesses).sort(([, a], [, b]) => b - a).map(([type]) => type);
    const resists = Object.entries(teamAnalysis.defensiveCoverage).sort(([, a], [, b]) => b - a).slice(0, 8).map(([type]) => type);

    // The builder's own add path: each slot fills on the spot from these list
    // entries and completes (abilities, the most-used set) in the background,
    // so the hand-over is instant and survives a slow or failed detail fetch.
    const openInBuilder = () => {
        onLeave();
        const store = useActiveTeamStore.getState();
        if (store.currentTeam.length === 0) store.setTeamName(t('landing.demo.teamName'));
        team.forEach((p) => {
            store.handleAddPokemon({
                ...p,
                sprite: getPokemonArtworkSpriteUrl(p.id),
                shinySprite: getPokemonArtworkSpriteUrl(p.id, { shiny: true }),
                animatedSprite: getPokemonFrontSpriteUrl(p.id),
                animatedShinySprite: getPokemonFrontSpriteUrl(p.id, { shiny: true }),
            });
        });
        navigate('/builder');
    };

    return (
        <section className="landing-demo" aria-labelledby="landing-demo-title">
            <div className="landing-demo__head">
                <h2 id="landing-demo-title" className="landing-demo__title">{t('landing.demo.title')}</h2>
                <p className="landing-demo__hint">{t('landing.demo.hint')}</p>
            </div>

            <div className="landing-demo__pool">
                {DEMO_POOL.map((p) => {
                    const on = selected.includes(p.id);
                    return (
                        <button
                            key={p.id}
                            type="button"
                            className="landing-pick"
                            aria-pressed={on}
                            onClick={() => setSelected((prev) => toggleDemoMember(prev, p.id))}
                        >
                            {/* On the team it moves; on the bench it waits, still. */}
                            <span className="landing-pick__stage">
                                <AnimatedSprite id={p.id} still={!on} className="landing-pick__sprite" />
                            </span>
                            <span className="landing-pick__name">{titleCaseSlug(p.name)}</span>
                            <span className="landing-pick__types">
                                {p.types.map((type) => (
                                    <img key={type} src={typeIcons[type]} alt={t(`types.${type}`)} title={t(`types.${type}`)} className="landing-pick__type" />
                                ))}
                            </span>
                        </button>
                    );
                })}
            </div>

            <dl className="landing-demo__result">
                <div className="landing-demo__row">
                    <dt>{t('landing.demo.score')}</dt>
                    <dd className="landing-demo__score"><RollingNumber value={score} /><span>/100</span></dd>
                </div>
                <div className="landing-demo__row">
                    <dt>{t('landing.demo.sharedWeakness')}</dt>
                    <dd className="landing-demo__types">
                        {weaknesses.length
                            ? weaknesses.map((type) => <TypeChip key={type} type={type} size="sm" />)
                            : <span className="landing-demo__ok">{t('landing.demo.noWeakness')}</span>}
                    </dd>
                </div>
                <div className="landing-demo__row">
                    <dt>{t('landing.demo.resists')}</dt>
                    <dd className="landing-demo__types">
                        {resists.map((type) => <TypeChip key={type} type={type} size="sm" />)}
                    </dd>
                </div>
            </dl>

            <button type="button" className="btn btn-secondary btn-block" onClick={openInBuilder}>
                {t('landing.demo.openInBuilder')}
            </button>
        </section>
    );
}

export function LandingView({ onLeave, onSkip }) {
    const { t } = useTranslation();
    useDocumentMeta({ path: '/' });

    return (
        <div className="landing">
            <section className="landing-hero">
                <div className="landing-hero__copy">
                    <LandingParty />
                    <p className="landing-eyebrow">{t('landing.eyebrow')}</p>
                    <h1 className="landing-title">{t('landing.title')}</h1>
                    <p className="landing-lede">{t('landing.lede')}</p>
                    <div className="landing-actions">
                        <Link to="/builder" className="btn btn-primary btn-lg" onClick={onLeave}>{t('landing.primaryCta')}</Link>
                        <Link to="/pokedex" className="btn btn-outline btn-lg" onClick={onLeave}>{t('landing.secondaryCta')}</Link>
                    </div>
                    <button type="button" className="landing-skip" onClick={onSkip}>{t('landing.skip')}</button>
                    <dl className="landing-stats">
                        {[
                            ['1025', t('landing.stats.pokemon')],
                            ['18', t('landing.stats.types')],
                            [String(THEME_META.length), t('landing.stats.themes')],
                            [String(LANGUAGES.length), t('landing.stats.languages')],
                        ].map(([value, label]) => (
                            <div key={label} className="landing-stats__item">
                                <dt>{label}</dt>
                                <dd>{value}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
                <LandingDemo onLeave={onLeave} />
            </section>

            <LandingFeatures onLeave={onLeave} />

            <section className="landing-closing">
                <h2 className="landing-section-title">{t('landing.closingTitle')}</h2>
                <p className="landing-closing__body">{t('landing.closingBody')}</p>
                <Link to="/builder" className="btn btn-primary btn-lg" onClick={onLeave}>{t('landing.primaryCta')}</Link>
            </section>
        </div>
    );
}
