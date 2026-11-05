import React, { useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, House, PanelLeft, Route } from 'lucide-react';

import { LogoMark } from '../LogoMark';
import { useTranslation } from '../../hooks/useTranslation';
import { useModalA11y } from '../../hooks/useModalA11y';
import { useAuthStore } from '../../store/useAuthStore';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import { typeColors } from '../../constants/types';
import { getPokemonArtworkSpriteUrl } from '../../utils/pokemonSprites';
import { track } from '../../services/analytics';
import {
    BATTLE_FORMATS,
    COMPETITIVE_LEVELS,
    INTERESTS,
    LEVEL_ART,
    PERSONAS,
    PICK_DESTINATIONS,
    asksCompetitiveLevel,
    builderRegulationSeed,
    derivePersona,
    hasAnsweredProfile,
    normalizeTrainerProfile,
    personaPicks,
} from '../../utils/trainerProfile';
import '../../styles/onboarding.css';

/** The art each interest is drawn with — its persona's Pokémon. */
const INTEREST_ART = {
    competitive: PERSONAS.strategist.art,
    franchise: PERSONAS.traveler.art,
    minigames: PERSONAS.challenger.art,
};
const INTEREST_TONE = {
    competitive: PERSONAS.strategist.tone,
    franchise: PERSONAS.traveler.tone,
    minigames: PERSONAS.challenger.tone,
};

/** The welcome's three promises, each with its icon. */
const PERK_ICONS = { home: House, menu: PanelLeft, journeys: Route };

/** Official artwork, boxed before it loads (CLS 0), never announced. */
const Art = ({ id, className = '', style }) => (
    <img
        src={getPokemonArtworkSpriteUrl(id)}
        alt=""
        width={240}
        height={240}
        decoding="async"
        draggable={false}
        className={`onboarding__art ${className}`}
        style={style}
    />
);

/** The four-pointed sparkles scattered over the scene, as in the reference art. */
const Sparkles = () => (
    <svg className="onboarding__sparkles" viewBox="0 0 320 180" aria-hidden="true" focusable="false">
        <path d="M262 26l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" />
        <path d="M286 52l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
        <path d="M40 120l2.5 7 7 2.5-7 2.5-2.5 7-2.5-7-7-2.5 7-2.5z" />
        <circle cx="58" cy="34" r="2.5" />
        <circle cx="70" cy="28" r="1.6" />
        <circle cx="66" cy="42" r="1.6" />
        <circle cx="250" cy="140" r="2" />
        <circle cx="262" cy="148" r="1.4" />
    </svg>
);

/**
 * The scene at the top of the card — the reference's illustration panel,
 * drawn with the Pokémon each answer stands for. It answers the questions
 * live: an interest picked lights its Pokémon, a level picked brings its
 * evolution forward, the result stands the persona alone.
 */
function Scene({ step, interests, level, persona }) {
    let art;
    if (step === 'welcome') {
        art = (
            <div className="onboarding__trio">
                <Art id={25} className="is-side is-left" />
                <Art id={94} className="is-center" />
                <Art id={445} className="is-side is-right" />
            </div>
        );
    } else if (step === 'interests') {
        art = (
            <div className="onboarding__trio">
                {INTERESTS.map((interest, index) => (
                    <Art
                        key={interest}
                        id={INTEREST_ART[interest]}
                        className={`${index === 1 ? 'is-center' : `is-side ${index === 0 ? 'is-left' : 'is-right'}`} ${interests.includes(interest) ? 'is-on' : 'is-off'} ${interest === 'minigames' && !interests.includes(interest) ? 'is-mystery' : ''}`}
                    />
                ))}
            </div>
        );
    } else if (step === 'level') {
        art = (
            <div className="onboarding__trio onboarding__trio--line">
                {COMPETITIVE_LEVELS.map((value) => (
                    <Art key={value} id={LEVEL_ART[value]} className={`is-stage ${level === value ? 'is-on' : 'is-off'}`} />
                ))}
            </div>
        );
    } else {
        art = (
            <div className="onboarding__trio">
                <span className="onboarding__burst" aria-hidden="true" />
                <Art id={persona?.art || 94} className="is-center is-hero" />
            </div>
        );
    }
    return (
        <div className="onboarding__scene" aria-hidden="true">
            <Sparkles />
            {/* Keyed by step so each step's art makes its own entrance. */}
            <div key={step} className="onboarding__scene-art">{art}</div>
        </div>
    );
}

/**
 * The trainer-profile onboarding (2026-11-05): a card in the shape of the
 * reference — a coloured scene on top, a curve, the app's mark on it, a step
 * pill, one big line and a round arrow — that asks what the trainer came for
 * and arranges the app around the answer (utils/trainerProfile.js).
 *
 * Four steps at most: welcome, interests (any of three), the competitive
 * level and format (only for the competitive), and the persona with where to
 * start. Closing it any other way than finishing records a skip, so it never
 * comes back uninvited; the Home and the Profile can reopen it.
 */
export function TrainerOnboarding() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const titleId = useId();
    const source = useOnboardingStore((s) => s.source);
    const close = useOnboardingStore((s) => s.close);
    const saved = useAuthStore((s) => s.trainerProfile);
    const setTrainerProfile = useAuthStore((s) => s.setTrainerProfile);
    // Someone who has used the app on other days meets the "new for you" copy.
    const isReturning = useAuthStore((s) => (s.activeDays?.count || 0) > 1);

    // A redo starts from the saved answers; a first run from nothing.
    const [interests, setInterests] = useState(() => (hasAnsweredProfile(saved) ? saved.interests : []));
    const [level, setLevel] = useState(() => saved.competitiveLevel || null);
    const [format, setFormat] = useState(() => saved.battleFormat || 'both');
    const [stepIndex, setStepIndex] = useState(0);
    const [hint, setHint] = useState(null);
    const finished = useRef(false);

    const steps = useMemo(
        () => ['welcome', 'interests', ...(asksCompetitiveLevel(interests) ? ['level'] : []), 'result'],
        [interests],
    );
    const step = steps[Math.min(stepIndex, steps.length - 1)];
    const isLast = step === 'result';

    const answers = useMemo(() => normalizeTrainerProfile({
        interests,
        competitiveLevel: level || 'casual',
        battleFormat: format,
    }), [interests, level, format]);
    const persona = derivePersona(answers);
    const picks = personaPicks(answers, 3);

    const tone = step === 'result' && persona ? persona.tone
        : step === 'level' ? 'dragon'
            : step === 'interests' && interests.length ? INTEREST_TONE[INTERESTS.find((i) => interests.includes(i))]
                : null;

    // Every way out that is not finishing — Escape, the drag, "Pular" — is a
    // skip, recorded only if there were no answers before (a redo keeps them).
    const dismiss = () => {
        if (!finished.current && !hasAnsweredProfile(useAuthStore.getState().trainerProfile)) {
            setTrainerProfile({ skippedAt: Date.now() });
            track('onboarding_skip', { step, source: source || 'unknown' });
        }
        close();
    };
    const panelRef = useModalA11y(dismiss);

    const finish = (to) => {
        finished.current = true;
        const profile = setTrainerProfile({ ...answers, answeredAt: Date.now() });
        // The builder's first regulation, only if it has none stored yet.
        const seed = builderRegulationSeed(profile);
        if (seed) {
            try {
                if (!window.localStorage.getItem('tb-regulation')) window.localStorage.setItem('tb-regulation', seed);
            } catch { /* the builder keeps its default */ }
        }
        track('onboarding_complete', {
            persona: persona?.id || 'none',
            interests: profile.interests.join(','),
            level: profile.competitiveLevel || 'none',
            source: source || 'unknown',
        });
        close();
        if (to) navigate(to);
    };

    const next = () => {
        if (step === 'interests' && interests.length === 0) {
            setHint(t('onboarding.interests.needOne'));
            return;
        }
        if (step === 'level' && !level) setLevel('casual');
        setHint(null);
        if (isLast) finish();
        else setStepIndex((i) => Math.min(i + 1, steps.length - 1));
    };
    const back = () => {
        setHint(null);
        setStepIndex((i) => Math.max(i - 1, 0));
    };
    const toggleInterest = (interest) => {
        setHint(null);
        setInterests((prev) => (prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]));
    };

    const title = step === 'welcome'
        ? t(isReturning ? 'onboarding.welcomeBack.title' : 'onboarding.welcome.title')
        : step === 'result' && persona
            ? t(`onboarding.personas.${persona.id}.name`)
            : t(`onboarding.${step}.title`);

    return (
        <div className="modal-scrim onboarding-scrim">
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                className="modal-panel modal-panel--md onboarding"
                style={{ '--ob-tone': tone ? typeColors[tone] : 'var(--color-primary)' }}
            >
                <Scene step={step} interests={interests} level={level} persona={persona} />

                <button type="button" className="onboarding__skip" onClick={dismiss}>
                    {t('onboarding.skip')}
                </button>

                <span className="onboarding__mark" aria-hidden="true">
                    <LogoMark sizes="2.5rem" />
                </span>

                <div className="onboarding__body" key={step}>
                    <span className="onboarding__pill">
                        {step === 'result'
                            ? t('onboarding.result.eyebrow')
                            : t('onboarding.step', { n: String(stepIndex + 1).padStart(2, '0') })}
                    </span>
                    <h2 id={titleId} className="onboarding__title">{title}</h2>

                    {step === 'welcome' && (
                        <>
                            <p className="onboarding__sub">{t(isReturning ? 'onboarding.welcomeBack.sub' : 'onboarding.welcome.sub')}</p>
                            {/* What the answers change — said before they are asked. */}
                            <ul className="onboarding__perks">
                                {Object.keys(PERK_ICONS).map((key) => {
                                    const Icon = PERK_ICONS[key];
                                    return (
                                        <li key={key} className="onboarding__perk">
                                            <span className="onboarding__perk-icon" aria-hidden="true"><Icon /></span>
                                            <span>{t(`onboarding.welcome.perks.${key}`)}</span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </>
                    )}

                    {step === 'interests' && (
                        <>
                            <p className="onboarding__sub">{t('onboarding.interests.sub')}</p>
                            <div className="onboarding__choices" role="group" aria-labelledby={titleId}>
                                {INTERESTS.map((interest) => {
                                    const on = interests.includes(interest);
                                    return (
                                        <button
                                            key={interest}
                                            type="button"
                                            role="checkbox"
                                            aria-checked={on}
                                            className={`onboarding__choice ${on ? 'is-on' : ''}`}
                                            style={{ '--choice-tone': typeColors[INTEREST_TONE[interest]] }}
                                            onClick={() => toggleInterest(interest)}
                                        >
                                            <span className="onboarding__choice-tile">
                                                <Art id={INTEREST_ART[interest]} className="onboarding__choice-art" />
                                            </span>
                                            <span className="onboarding__choice-text">
                                                <span className="onboarding__choice-title">{t(`onboarding.interests.${interest}.title`)}</span>
                                                <span className="onboarding__choice-desc">{t(`onboarding.interests.${interest}.desc`)}</span>
                                            </span>
                                            <span className="onboarding__check" aria-hidden="true"><Check /></span>
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    {step === 'level' && (
                        <>
                            <p className="onboarding__sub">{t('onboarding.level.sub')}</p>
                            <div className="onboarding__choices" role="radiogroup" aria-labelledby={titleId}>
                                {COMPETITIVE_LEVELS.map((value) => (
                                    <button
                                        key={value}
                                        type="button"
                                        role="radio"
                                        aria-checked={level === value}
                                        className={`onboarding__choice onboarding__choice--compact ${level === value ? 'is-on' : ''}`}
                                        style={{ '--choice-tone': typeColors.dragon }}
                                        onClick={() => setLevel(value)}
                                    >
                                        <span className="onboarding__choice-text">
                                            <span className="onboarding__choice-title">{t(`onboarding.level.${value}.title`)}</span>
                                            <span className="onboarding__choice-desc">{t(`onboarding.level.${value}.desc`)}</span>
                                        </span>
                                        <span className="onboarding__check" aria-hidden="true"><Check /></span>
                                    </button>
                                ))}
                            </div>
                            <div className="onboarding__format">
                                <span className="onboarding__format-label">{t('onboarding.format.label')}</span>
                                <div className="segmented segmented--sm segmented--block" role="group" aria-label={t('onboarding.format.label')}>
                                    {BATTLE_FORMATS.map((value) => (
                                        <button
                                            key={value}
                                            type="button"
                                            className="segmented__item"
                                            aria-pressed={format === value}
                                            onClick={() => setFormat(value)}
                                        >
                                            {t(`onboarding.format.${value}`)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {step === 'result' && persona && (
                        <>
                            <p className="onboarding__tagline">{t(`onboarding.personas.${persona.id}.tagline`)}</p>
                            <ul className="onboarding__tags" aria-label={t('onboarding.result.eyebrow')}>
                                {persona.interests.map((interest) => (
                                    <li key={interest} className="badge">{t(`onboarding.interestShort.${interest}`)}</li>
                                ))}
                                {answers.competitiveLevel && (
                                    <li className="badge">{t(`onboarding.levelShort.${answers.competitiveLevel}`)}</li>
                                )}
                            </ul>
                            <p className="onboarding__sub">{t('onboarding.result.sub')}</p>
                            <ol className="onboarding__picks">
                                {picks.map((key) => (
                                    <li key={key}>
                                        <button type="button" className="onboarding__pick" onClick={() => finish(PICK_DESTINATIONS[key].path)}>
                                            <span className="onboarding__pick-text">
                                                <span className="onboarding__pick-title">{t(PICK_DESTINATIONS[key].labelKey)}</span>
                                                <span className="onboarding__pick-desc">{t(`onboarding.picks.${key}`)}</span>
                                            </span>
                                            <ArrowRight aria-hidden="true" />
                                        </button>
                                    </li>
                                ))}
                            </ol>
                            <p className="onboarding__note">{t('onboarding.result.change')}</p>
                        </>
                    )}

                    <p className="onboarding__hint" role="status" aria-live="polite">{hint}</p>
                </div>

                <footer className="onboarding__foot">
                    {stepIndex > 0 ? (
                        <button type="button" className="btn btn-ghost btn-icon onboarding__back" onClick={back} aria-label={t('onboarding.back')} title={t('onboarding.back')}>
                            <ArrowLeft aria-hidden="true" />
                        </button>
                    ) : <span className="onboarding__back" aria-hidden="true" />}

                    <ol className="onboarding__dots" aria-label={t('onboarding.progress', { n: stepIndex + 1, total: steps.length })}>
                        {steps.map((s, index) => (
                            <li key={s} className={index === stepIndex ? 'is-current' : index < stepIndex ? 'is-done' : ''} />
                        ))}
                    </ol>

                    {isLast ? (
                        <button type="button" className="btn btn-primary onboarding__finish" onClick={next}>
                            {t('onboarding.finish')} <ArrowRight aria-hidden="true" />
                        </button>
                    ) : (
                        <button type="button" className="btn btn-primary btn-icon onboarding__next" onClick={next} aria-label={t('onboarding.next')} title={t('onboarding.next')}>
                            <ArrowRight aria-hidden="true" />
                        </button>
                    )}
                </footer>
            </div>
        </div>
    );
}

export default TrainerOnboarding;
