import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Compass, LayoutGrid, LockKeyhole, Mail, Sparkles, Target, UserRound } from 'lucide-react';

import { AnimatedSprite } from '../AnimatedSprite';
import { BrandIntro } from '../brand/BrandIntro';
import { TrainerCardPrint } from '../moments/TrainerCardPrint';
import { Mascot } from '../Mascot';
import { Loader } from '../Loader';
import { PartyPips } from '../PartyPips';
import { RollingNumber } from '../RollingNumber';
import { TypeChip } from '../TypeChip';
import { PasswordField } from '../modals/auth/PasswordField';
import { GoogleButton } from '../GoogleButton';
import { useGoogleSignInAvailable } from '../../services/googleAvailability';
import { useShinyBurst } from '../../hooks/useShinyBurst';
import { useTranslation } from '../../hooks/useTranslation';
import { useAuthStore } from '../../store/useAuthStore';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import { useJourneyCoachStore } from '../../store/useJourneyCoachStore';
import { typeColors, typeIcons } from '../../constants/types';
import { getPokemonArtworkSpriteUrl } from '../../utils/pokemonSprites';
import { analyzeTeam, rateTeam } from '../../utils/teamAnalysis';
import { track } from '../../services/analytics';
import { INTRO, climbFrames } from '../../utils/brandIntro';
import { levelForXp } from '../../utils/trainerLevel';
import { useRewardsStore } from '../../store/useRewardsStore';
import { authErrorField, isAuthCancel, prettifyAuthError } from '../../utils/authErrors';
import { MIN_PASSWORD_LENGTH } from '../../utils/passwordStrength';
import {
    BATTLE_FORMATS, COMPETITIVE_LEVELS, INTERESTS, LEVEL_ART, PERSONAS,
    builderRegulationSeed, hasAnsweredProfile, personaHero, personaNavOrder,
} from '../../utils/trainerProfile';
import {
    INTEREST_MOOD, LEVEL_MOOD, PARTNER_CHOICES, SPARK_POOL, SPARK_START, STEP_LOOK,
    canContinue, journeyActivation, journeyAnswers, journeyHasChrome, journeyStepMeta,
    journeySteps, journeyXp, nextJourneyStep, toggleSparkMember,
} from '../../utils/firstJourney';
import '../../styles/first-journey.css';

/**
 * The Primeira Jornada 2.0 — 4-step, value-first onboarding with a widescreen
 * interactive Living Stage on desktop and a thumb-zone layout on phones.
 *
 * Flow (first run):
 * 1. `play`      — Live interactive 4-Pokémon arena + real analyzeTeam/rateTeam.
 * 2. `interests` — Pick 1–3 paths; miniature live app preview rearranges live.
 * 3. `level` OR `partner` — Interactive Gible→Gabite→Garchomp track OR Partner
 *                           Sanctuary with live Shiny toggle + Home preview.
 * 4. `blueprint` — Holographic Trainer Pass, personal insight, 3 configured
 *                  changes, and 1-tap launch into the #1 Activation Moment.
 */

const INTEREST_ART = Object.fromEntries(INTERESTS.map((i) => [i, PERSONAS[{ competitive: 'strategist', franchise: 'traveler', minigames: 'challenger' }[i]]]));
const EMAIL_RE = /^\S+@\S+\.\S+$/;
const prefersReduced = () => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
const cssVar = (name, fallback) => {
    if (typeof window === 'undefined') return fallback;
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
};

/** A headline line, word by word, each in its own mask (the entrance lifts them out). */
function Words({ text, accent = false }) {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    const spans = words.map((w, i) => (
        <React.Fragment key={`${w}-${i}`}>
            {i > 0 && ' '}
            <span className="fj-w"><span>{w}</span></span>
        </React.Fragment>
    ));
    return accent ? <em className="accent-word">{spans}</em> : <>{spans}</>;
}

/** Official artwork, boxed before it loads, never announced. */
const Art = ({ id, shiny = false, className = '', imgRef }) => (
    <img ref={imgRef} src={getPokemonArtworkSpriteUrl(id, { shiny })} alt="" width={240} height={240} decoding="async" draggable={false} className={className} />
);

export function FirstJourney() {
    const { t, language } = useTranslation();
    const navigate = useNavigate();
    const titleId = useId();
    const source = useOnboardingStore((s) => s.source);
    const requestedEntry = useOnboardingStore((s) => s.entry);
    const closeStore = useOnboardingStore((s) => s.close);
    const saved = useAuthStore((s) => s.trainerProfile);
    const setTrainerProfile = useAuthStore((s) => s.setTrainerProfile);
    const savedPartnerId = useAuthStore((s) => s.greetingPokemonId);
    const savedPartnerShiny = useAuthStore((s) => s.greetingPokemonIsShiny);
    const setGreetingPokemon = useAuthStore((s) => s.setGreetingPokemon);
    const savedName = useAuthStore((s) => s.displayName);
    const uid = useAuthStore((s) => s.userId);
    const trainerXp = useRewardsStore((s) => s.xp);

    const [initialEntry] = useState(() => requestedEntry || (hasAnsweredProfile(saved) && source !== 'landing' ? 'redo' : 'welcome'));
    const [entry, setEntry] = useState(initialEntry);
    const [reduced] = useState(prefersReduced);

    // Step 1: live interactive synergy arena
    const [sparkIds, setSparkIds] = useState(SPARK_START);
    const [sparkTouched, setSparkTouched] = useState(false);

    // Steps 2 & 3: answers
    const [interests, setInterests] = useState(() => (hasAnsweredProfile(saved) ? saved.interests : []));
    const [level, setLevel] = useState(() => saved.competitiveLevel || 'casual');
    const [format, setFormat] = useState(() => saved.battleFormat || 'both');
    const [partnerId, setPartnerId] = useState(() => savedPartnerId || PARTNER_CHOICES[0].id);
    const [partnerShiny, setPartnerShiny] = useState(() => Boolean(savedPartnerShiny));
    const shinyBurst = useShinyBurst();

    const steps = useMemo(() => journeySteps({ interests, entry }), [interests, entry]);
    const [step, setStep] = useState(() => steps[0]);
    // The hello opens on the brand intro (components/brand/BrandIntro.jsx); it
    // leaves through the mascot's silhouette when the trainer starts.
    const [introOn, setIntroOn] = useState(() => steps[0] === 'hello');
    const stepRef = useRef(step);
    stepRef.current = step;
    const history = useRef([]);
    const navDir = useRef(1);

    const answers = useMemo(() => journeyAnswers({ interests, level, format }), [interests, level, format]);
    const activation = useMemo(() => journeyActivation(answers.profile), [answers.profile]);
    const xp = useMemo(() => journeyXp(), []);

    // Live analysis for Step 1 (`play`)
    const sparkTeam = useMemo(() => SPARK_POOL.filter((p) => sparkIds.includes(p.id)), [sparkIds]);
    const { teamAnalysis: sparkAnalysis } = useMemo(() => analyzeTeam(sparkTeam), [sparkTeam]);
    const { score: sparkScore } = useMemo(() => rateTeam(sparkAnalysis, sparkTeam.length), [sparkAnalysis, sparkTeam.length]);
    const sparkWeaknesses = useMemo(
        () => Object.entries(sparkAnalysis.weaknesses).sort(([, a], [, b]) => b - a).slice(0, 3).map(([tp]) => tp),
        [sparkAnalysis],
    );
    const sparkCoveredCount = useMemo(() => Object.keys(sparkAnalysis.defensiveCoverage || {}).length, [sparkAnalysis]);

    // The persistent 3D mascot
    const [look, setLook] = useState(STEP_LOOK[steps[0]] || { mood: 'animado' });
    const [gesture, setGesture] = useState({ name: null, id: 0 });
    const [confetti, setConfetti] = useState(false);
    const react = useCallback((name) => { if (name) setGesture((g) => ({ name, id: g.id + 1 })); }, []);
    const hat = step === 'blueprint' || step === 'done' ? answers.hat : null;

    // Account screen (used for `entry === 'signIn'`)
    const [mode, setMode] = useState(entry === 'signIn' ? 'signIn' : 'signUp');
    const [name, setName] = useState(savedName || '');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [errorField, setErrorField] = useState(null);
    const [busy, setBusy] = useState(false);
    const [googleBusy, setGoogleBusy] = useState(false);
    const googleOn = useGoogleSignInAvailable();
    const [resetSentTo, setResetSentTo] = useState('');
    const [outcome, setOutcome] = useState(null);
    const emailRef = useRef(null);
    const passwordRef = useRef(null);

    const layerRef = useRef(null);
    const screenRef = useRef(null);
    const dockRef = useRef(null);
    const stageRef = useRef(null);
    const botRef = useRef(null);
    const orbitRef = useRef(null);
    const cardRef = useRef(null);
    const evoRef = useRef(null);
    const flashRef = useRef(null);
    const partnerArtRef = useRef(null);
    const botBox = useRef({ x: 0, y: 0, size: 0 });
    const navBusy = useRef(false);
    const finished = useRef(false);
    const committed = useRef(false);
    const closing = useRef(false);
    const firstPaint = useRef(true);

    /* ---------- fluid cursor ambient light across the full canvas ---------- */
    const handleCanvasPointerMove = useCallback((e) => {
        if (reduced) return;
        const el = layerRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) return;
        const px = Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100));
        const py = Math.max(0, Math.min(100, ((e.clientY - r.top) / r.height) * 100));
        el.style.setProperty('--mx', `${px.toFixed(1)}%`);
        el.style.setProperty('--my', `${py.toFixed(1)}%`);
    }, [reduced]);

    /* ---------- the mascot's travel ---------- */
    const orbitFollow = useCallback(() => {
        const orbit = orbitRef.current;
        if (!orbit) return;
        const { x, y, size } = botBox.current;
        const r = Math.max(54, size * 0.62);
        const spots = [[-0.95, -0.16], [0.95, -0.16], [0, -0.78]];
        for (const img of orbit.children) {
            const [ox, oy] = spots[INTERESTS.indexOf(img.dataset.orb) % 3];
            img.style.left = `${x + ox * r}px`;
            img.style.top = `${Math.max(82, y + oy * r)}px`;
        }
    }, []);

    const placeBot = useCallback((instant = false) => {
        const layer = layerRef.current;
        const bot = botRef.current;
        if (!layer || !bot) return;
        const lr = layer.getBoundingClientRect();
        const base = bot.offsetWidth || 200;
        const slot = [...(screenRef.current?.querySelectorAll('[data-slot]') || [])].find((n) => n.getClientRects().length > 0);
        if (!slot) return;
        const r = slot.getBoundingClientRect();
        const size = Math.max(40, Math.min(r.width, r.height));
        const cx = r.left - lr.left + r.width / 2;
        const cy = r.top - lr.top + r.height / 2;
        botBox.current = { x: cx, y: cy, size };
        const to = `translate(${cx - base / 2}px, ${cy - base / 2}px) scale(${size / base})`;
        const from = getComputedStyle(bot).transform;
        bot.getAnimations().forEach((a) => a.cancel());
        bot.style.transform = to;
        if (!instant && !reduced && from && from !== 'none') {
            bot.animate([{ transform: from }, { transform: to }], { duration: 640, easing: cssVar('--ease-glide', 'ease-out') });
        }
        orbitFollow();
    }, [reduced, orbitFollow]);

    /* ---------- the orbit: picked interests circle the mascot ---------- */
    const fly = useCallback((interest, fromImg) => {
        const orbit = orbitRef.current;
        if (!orbit || orbit.querySelector(`[data-orb="${interest}"]`)) return;
        const img = document.createElement('img');
        img.src = getPokemonArtworkSpriteUrl(INTEREST_ART[interest].art);
        img.alt = '';
        img.dataset.orb = interest;
        img.className = 'fj-orb';
        orbit.append(img);
        orbitFollow();
        if (fromImg && !reduced) {
            const a = fromImg.getBoundingClientRect();
            const b = img.getBoundingClientRect();
            const dx = a.left - b.left;
            const dy = a.top - b.top;
            img.animate([
                { transform: `translate(${dx}px, ${dy}px) scale(0.6)`, opacity: 0.4 },
                { transform: `translate(${dx * 0.4}px, ${dy * 0.4 - 60}px) scale(1.12) rotate(-10deg)`, opacity: 1, offset: 0.55 },
                { transform: 'none', opacity: 1 },
            ], { duration: 680, easing: cssVar('--ease-glide', 'ease-out') });
        }
    }, [orbitFollow, reduced]);

    const drop = useCallback((interest) => {
        const img = orbitRef.current?.querySelector(`[data-orb="${interest}"]`);
        if (!img) return;
        if (reduced) { img.remove(); return; }
        img.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(3rem) scale(0.5) rotate(18deg)', opacity: 0 }], { duration: 320, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' })
            .finished.then(() => img.remove(), () => img.remove());
    }, [reduced]);

    /* ---------- saving answers & partner ---------- */
    const commitProfile = useCallback(() => {
        if (committed.current || entry === 'signIn') return;
        committed.current = true;
        finished.current = true;
        const profile = setTrainerProfile({ ...answers.profile, answeredAt: Date.now() });
        const seed = builderRegulationSeed(profile);
        if (seed) {
            try {
                if (!window.localStorage.getItem('tb-regulation')) window.localStorage.setItem('tb-regulation', seed);
            } catch { /* builder keeps its default */ }
        }
        if (!answers.profile.interests.includes('competitive') && partnerId) {
            setGreetingPokemon({ pokemonId: partnerId, isShiny: partnerShiny });
        }
        track('onboarding_complete', {
            persona: answers.persona?.id || 'none',
            interests: profile.interests.join(','),
            level: profile.competitiveLevel || 'none',
            source: source || 'unknown',
        });
    }, [answers, entry, partnerId, partnerShiny, setGreetingPokemon, setTrainerProfile, source]);

    /* ---------- leaving ---------- */
    const close = useCallback((then) => {
        if (closing.current) return;
        closing.current = true;
        const layer = layerRef.current;
        const done = () => { closeStore(); then?.(); };
        if (reduced || !layer) { done(); return; }
        const bot = botRef.current;
        if (bot) {
            const from = getComputedStyle(bot).transform;
            const base = bot.offsetWidth || 200;
            bot.animate([{ transform: from }, { transform: `translate(${-base * 0.2}px, ${-base * 0.2}px) scale(0.18)`, opacity: 0.2 }], { duration: 420, easing: cssVar('--ease-glide', 'ease-out'), fill: 'forwards' });
        }
        layer.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-1rem)' }], { duration: 320, delay: 60, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' })
            .finished.then(done, done);
    }, [closeStore, reduced]);

    const dismiss = useCallback(() => {
        if (!finished.current && initialEntry === 'welcome' && !hasAnsweredProfile(useAuthStore.getState().trainerProfile)) {
            setTrainerProfile({ skippedAt: Date.now() });
            track('onboarding_skip', { step: stepRef.current, source: source || 'unknown' });
        }
        close();
    }, [close, initialEntry, setTrainerProfile, source]);

    const launchActivation = useCallback(() => {
        commitProfile();
        track('onboarding_activate', {
            persona: activation.personaId,
            target: activation.id,
            mission: activation.missionId,
        });
        close(() => {
            if (activation.missionId) {
                useJourneyCoachStore.getState().startMission(activation.missionId);
            }
            navigate(activation.path);
        });
    }, [activation, close, commitProfile, navigate]);

    /* ---------- moving between screens ---------- */
    const goTo = useCallback((next, { push = true, dir = 1 } = {}) => {
        if (!next || navBusy.current) return;
        navDir.current = dir;
        const commit = () => {
            navBusy.current = false;
            if (push) history.current.push(stepRef.current);
            setStep(next);
        };
        const el = screenRef.current;
        if (reduced || !el) { commit(); return; }
        navBusy.current = true;
        const shift = dir > 0 ? '-1.25rem' : '1.25rem';
        el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${shift})` }], { duration: 170, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' })
            .finished.then(commit, commit);
    }, [reduced]);

    const next = useCallback(() => {
        if (!canContinue(stepRef.current, { interests })) return;
        if (stepRef.current === 'level' && !level) setLevel('casual');
        goTo(nextJourneyStep(steps, stepRef.current), { push: true, dir: 1 });
    }, [goTo, interests, level, steps]);

    const back = () => {
        const prev = history.current.pop();
        if (!prev) return;
        if (!journeySteps({ interests, entry }).includes(prev)) setEntry(initialEntry === 'signIn' ? 'welcome' : initialEntry);
        goTo(prev, { push: false, dir: -1 });
    };

    // Screen entrance choreography: place mascot BEFORE transforms, instant first paint
    useLayoutEffect(() => {
        const base = STEP_LOOK[step] || {};
        setLook({ mood: base.mood, pose: base.pose });
        if (base.play) react(base.play);
        const isInitialEntry = firstPaint.current || (history.current.length === 0 && step === steps[0]);
        firstPaint.current = false;
        placeBot(isInitialEntry);
        const el = screenRef.current;
        if (el && !reduced && !isInitialEntry) {
            const glide = cssVar('--ease-glide', 'ease-out');
            const dir = navDir.current;
            el.querySelectorAll('[data-s]').forEach((n, i) => {
                const delay = Math.min(220, 40 + i * 44);
                n.animate(
                    [{ opacity: 0, transform: `translate(${dir > 0 ? '0.625rem' : '-0.625rem'}, 0.375rem)` }, { opacity: 1, transform: 'none' }],
                    { duration: 420, delay, easing: glide, fill: 'backwards' },
                );
            });
            el.querySelectorAll('.fj-w > span').forEach((n, i) => n.animate(
                [{ transform: 'translateY(105%)' }, { transform: 'none' }],
                { duration: 420, delay: Math.min(180, 30 + i * 30), easing: glide, fill: 'backwards' },
            ));
        }
        const heading = el?.querySelector('h2');
        if (heading) requestAnimationFrame(() => heading.focus({ preventScroll: true }));
        // eslint-disable-next-line react-hooks/exhaustive-deps -- once per screen
    }, [step]);

    // The hello: the name docks (BrandIntro), then the mascot climbs into his
    // slot, waves, and his first line and the way in arrive.
    useLayoutEffect(() => {
        if (step !== 'hello' || reduced) return undefined;
        const glide = cssVar('--ease-glide', 'ease-out');
        screenRef.current?.querySelectorAll('[data-s]').forEach((n, i) => n.animate(
            [{ opacity: 0, transform: 'translateY(0.75rem) scale(0.96)' }, { opacity: 1, transform: 'none' }],
            { duration: 460, delay: INTRO.rise + 420 + i * 90, easing: glide, fill: 'backwards' },
        ));
        const climb = climbFrames(Math.round(window.innerHeight * 0.7));
        const rise = botRef.current?.querySelector('.fj__bot-in')?.animate(climb.keyframes, { duration: climb.duration, delay: INTRO.rise, fill: 'backwards' });
        const wave = setTimeout(() => react('wave'), INTRO.rise + 700);
        return () => { clearTimeout(wave); rise?.cancel(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- once per screen
    }, [step]);

    // Keep mascot locked onto its slot whenever layout settles
    useEffect(() => {
        const el = screenRef.current;
        if (!el || typeof ResizeObserver === 'undefined') return undefined;
        const ro = new ResizeObserver(() => placeBot(true));
        ro.observe(el);
        return () => ro.disconnect();
    }, [step, placeBot]);

    // Screen side effects (orbit cleanup, blueprint 3D tilt + confetti)
    useEffect(() => {
        if (step === 'interests') {
            INTERESTS.filter((i) => interests.includes(i)).forEach((i) => fly(i, null));
            const orbit = orbitRef.current;
            return () => { if (orbit) [...orbit.children].forEach((img) => drop(img.dataset.orb)); };
        }
        if (step === 'blueprint') {
            commitProfile();
            const card = cardRef.current;
            if (card && !reduced) {
                card.animate(
                    [{ transform: 'perspective(56rem) rotateY(70deg) scale(0.92)', opacity: 0 }, { transform: 'none', opacity: 1 }],
                    { duration: 760, delay: 140, easing: cssVar('--ease-pop', 'ease-out'), fill: 'backwards' },
                );
            }
            const layer = layerRef.current;
            const tilt = (e) => {
                if (!card || reduced) return;
                const r = card.getBoundingClientRect();
                const x = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / Math.max(1, r.width)));
                const y = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / Math.max(1, r.height)));
                card.style.transform = `perspective(48rem) rotateX(${y * -7}deg) rotateY(${x * 9}deg)`;
                card.style.setProperty('--hx', `${((x + 1) * 50).toFixed(1)}%`);
                card.style.setProperty('--hy', `${((y + 1) * 50).toFixed(1)}%`);
            };
            const resetTilt = () => {
                if (!card) return;
                card.style.transform = '';
                card.style.setProperty('--hx', '35%');
                card.style.setProperty('--hy', '25%');
            };
            layer?.addEventListener('pointermove', tilt);
            layer?.addEventListener('pointerleave', resetTilt);
            let confTimer;
            if (!reduced) {
                setConfetti(true);
                confTimer = setTimeout(() => setConfetti(false), 2200);
            }
            return () => {
                layer?.removeEventListener('pointermove', tilt);
                layer?.removeEventListener('pointerleave', resetTilt);
                if (confTimer) clearTimeout(confTimer);
                setConfetti(false);
            };
        }
        return undefined;
        // eslint-disable-next-line react-hooks/exhaustive-deps -- once per screen
    }, [step]);

    useEffect(() => {
        const onResize = () => placeBot(true);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [placeBot]);
    useLayoutEffect(() => { if (step === 'account') placeBot(false); }, [mode, step, placeBot]);

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape' && !busy) { e.preventDefault(); dismiss(); } };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [dismiss, busy]);

    /* ---------- interactions ---------- */
    const handleSparkToggle = (pokemon) => {
        const nextIds = toggleSparkMember(sparkIds, pokemon.id);
        setSparkIds(nextIds);
        setSparkTouched(true);
        const nextTeam = SPARK_POOL.filter((p) => nextIds.includes(p.id));
        const { teamAnalysis } = analyzeTeam(nextTeam);
        const weakCount = Object.keys(teamAnalysis.weaknesses || {}).length;
        if (weakCount === 0 && nextTeam.length >= 3) {
            setLook({ mood: 'radiante' });
            react('jump');
        } else if (nextIds.includes(pokemon.id)) {
            setLook({ mood: 'animado' });
            react('hop');
        } else {
            setLook({ mood: 'curioso' });
            react('nod');
        }
    };

    const toggleInterest = (interest, fromImg) => {
        const on = !interests.includes(interest);
        setInterests((prev) => (on ? [...prev, interest] : prev.filter((i) => i !== interest)));
        if (on) {
            fly(interest, fromImg);
            setLook({ mood: INTEREST_MOOD[interest] });
            react('hop');
        } else {
            drop(interest);
            const last = INTERESTS.filter((i) => i !== interest && interests.includes(i)).pop();
            setLook({ mood: last ? INTEREST_MOOD[last] : 'curioso' });
            react('nod');
        }
    };

    const pickLevel = (value) => {
        setLevel(value);
        setLook({ mood: LEVEL_MOOD[value] });
        react(value === 'ranked' ? 'jump' : 'hop');
        const img = evoRef.current;
        const flash = flashRef.current;
        const src = getPokemonArtworkSpriteUrl(LEVEL_ART[value]);
        if (!img) return;
        if (reduced) { img.src = src; return; }
        flash?.animate([{ opacity: 0, transform: 'scale(0.4)' }, { opacity: 1, transform: 'scale(1)', offset: 0.4 }, { opacity: 0, transform: 'scale(1.35)' }], { duration: 560, easing: 'cubic-bezier(0, 0, 0.2, 1)' });
        img.animate([{ filter: 'brightness(1)', transform: 'scale(1)' }, { filter: 'brightness(0) invert(1)', transform: 'scale(1.1)' }], { duration: 200, easing: 'cubic-bezier(0, 0, 0.2, 1)', fill: 'forwards' })
            .finished.then(() => {
                img.src = src;
                img.getAnimations().forEach((a) => a.cancel());
                img.animate([{ filter: 'brightness(0) invert(1)', transform: 'scale(1.1)' }, { filter: 'brightness(1)', transform: 'scale(1)' }], { duration: 380, easing: cssVar('--ease-pop', 'ease-out') });
            }, () => { img.src = src; });
    };

    const pickPartner = (choice) => {
        setPartnerId(choice.id);
        setLook({ mood: 'animado' });
        react('hop');
        const img = partnerArtRef.current;
        if (img && !reduced) {
            img.getAnimations().forEach((a) => a.cancel());
            img.animate(
                [{ transform: 'scale(0.84) translateY(0.5rem)', opacity: 0.6 }, { transform: 'none', opacity: 1 }],
                { duration: 420, easing: cssVar('--ease-pop', 'ease-out') },
            );
        }
    };

    const togglePartnerShiny = () => {
        const nextVal = !partnerShiny;
        setPartnerShiny(nextVal);
        if (nextVal) {
            shinyBurst.fire();
            setLook({ mood: 'brilhando' });
            react('sparks');
        } else {
            setLook({ mood: 'feliz' });
            react('nod');
        }
    };

    /* ---------- account sign-in (returning trainers) ---------- */
    const auth = useAuthStore.getState;
    const showError = (message, field = null) => { setError(message); setErrorField(field); setLook({ mood: 'preocupado' }); react('shake'); };
    useEffect(() => {
        if (busy || !error) return;
        if (errorField === 'email') emailRef.current?.focus();
        else if (errorField === 'password') passwordRef.current?.focus();
    }, [busy, error, errorField]);

    const switchMode = (m) => {
        setError(''); setErrorField(null); setResetSentTo('');
        setMode(m);
        setLook({ mood: m === 'signIn' ? 'feliz' : 'animado' });
        react('nod');
    };

    const saveName = () => {
        const clean = name.trim().slice(0, 24);
        if (!clean || clean === savedName) return;
        useAuthStore.setState({ displayName: clean });
        auth().savePreferences({ displayName: clean }).then((status) => {
            if (status === 'saved') auth().syncPublicProfile?.();
        }, () => {});
    };

    const submit = async (e) => {
        e.preventDefault();
        if (!EMAIL_RE.test(email.trim())) { showError(t('modals.authValidationErrorEmail'), 'email'); return; }
        if (mode !== 'reset' && password.length < MIN_PASSWORD_LENGTH) { showError(t('modals.authValidationErrorPassword'), 'password'); return; }
        setError(''); setErrorField(null); setBusy(true);
        setLook({ mood: 'expectante' });
        try {
            if (mode === 'reset') {
                await auth().sendPasswordReset(email.trim());
                setResetSentTo(email.trim());
                setBusy(false);
                setLook({ mood: 'feliz' });
                react('nod');
                return;
            }
            if (mode === 'signUp') await auth().handleSignUp(email.trim(), password);
            else await auth().handleSignIn(email.trim(), password);
            track('onboarding_account', { mode, source: source || 'unknown' });
            if (mode === 'signUp') saveName();
            setOutcome(mode === 'signUp' ? 'account' : 'signedIn');
            setBusy(false);
            goTo('done');
        } catch (err) {
            setBusy(false);
            showError(prettifyAuthError(err, t), authErrorField(err));
        }
    };

    const googleGo = async () => {
        setError(''); setErrorField(null); setGoogleBusy(true);
        setLook({ mood: 'expectante' });
        try {
            const { linked, isNewUser, name: googleName } = await auth().handleGoogleSignIn();
            track('onboarding_account', { mode: 'google', source: source || 'unknown' });
            if (name.trim()) saveName();
            else if (googleName) setName(googleName);
            setOutcome(linked || isNewUser ? 'account' : 'signedIn');
            setGoogleBusy(false);
            goTo('done');
        } catch (err) {
            setGoogleBusy(false);
            if (isAuthCancel(err)) { setLook({ mood: 'feliz' }); return; }
            showError(prettifyAuthError(err, t));
        }
    };

    /* ---------- visual tone & step chrome ---------- */
    const persona = answers.persona;
    const chosenPartner = PARTNER_CHOICES.find((p) => p.id === partnerId) || PARTNER_CHOICES[0];
    const tone = (key) => typeColors[key] || 'var(--color-primary)';
    const sparkLead = sparkTeam[sparkTeam.length - 1] || SPARK_POOL[0];
    const glow = step === 'play'
        ? tone(sparkLead.tone)
        : step === 'interests' && interests.length
            ? tone(INTEREST_ART[interests[interests.length - 1]].tone)
            : step === 'level'
                ? tone('dragon')
                : step === 'partner'
                    ? tone(chosenPartner.type)
                    : (step === 'blueprint' || step === 'done') && persona && entry !== 'signIn'
                        ? tone(persona.tone)
                        : 'var(--color-primary)';

    const stepMeta = journeyStepMeta(steps, step);
    const chrome = journeyHasChrome(step);

    const previewNavOrder = personaNavOrder(answers.profile);
    const previewNavKey = previewNavOrder[0] || 'teamBuilding';
    const previewHeroKind = interests.length
        ? personaHero({ ...answers.profile, answeredAt: 1 })
        : 'challenge';

    const accountTitle = mode === 'reset' ? ['accountResetTitle', 'accountResetAccent'] : mode === 'signIn' ? ['accountSignInTitle', 'accountSignInAccent'] : ['accountSignUpTitle', 'accountSignUpAccent'];
    const doneTitle = outcome === 'signedIn' || entry === 'signIn' ? ['doneSignInTitle', 'doneSignInAccent']
        : name.trim() ? ['doneTitle', 'doneAccent'] : ['doneGuestTitle', 'doneGuestAccent'];
    const doneSub = outcome === 'signedIn' || entry === 'signIn' ? 'doneSubSignIn' : 'doneSub';

    const heading = (keys, vars = {}) => (
        <h2 id={titleId} className="fj__title" tabIndex={-1}>
            <Words text={t(`journey.${keys[0]}`, vars)} /> <Words accent text={t(`journey.${keys[1]}`, { name: name.trim().split(/\s+/)[0], ...vars })} />
        </h2>
    );
    const cta = (label, onClick, { disabled = false, type = 'button', icon = false } = {}) => (
        <button type={type} className="btn btn-primary btn-lg btn-block fj__cta" data-s onClick={onClick} disabled={disabled}>
            <span>{label}</span>
            {icon && <ArrowRight aria-hidden="true" className="fj__cta-icon" />}
        </button>
    );

    const slot = (size) => <span className="fj__slot" style={{ '--slot': size }} data-slot aria-hidden="true" />;
    const inlineSlot = <span className="fj__slot fj__slot--inline" data-slot aria-hidden="true" />;

    const google = googleOn && mode !== 'reset' && !resetSentTo && !busy && (
        <div className="fj-google" data-s>
            <GoogleButton onClick={googleGo} busy={googleBusy} label={t('modals.authGoogle')} busyLabel={t('modals.authGoogleWorking')} />
            <p className="auth-or" aria-hidden="true">{t('modals.authOr')}</p>
        </div>
    );

    let stage = null;
    let talk = null;

    if (step === 'hello') {
        stage = slot('44%');
        talk = (
            <>
                <div className="fj-hello__bubble" data-s>
                    <h2 id={titleId} className="fj-hello__hi" tabIndex={-1}>{t('journey.introHi')}</h2>
                    <p className="fj-hello__ask">{t('journey.introAsk')}</p>
                </div>
                <span className="fj__grow" />
                {cta(t('journey.introCta'), () => goTo('play', { push: false }), { icon: true })}
                <button type="button" className="fj__link" data-s onClick={() => { setEntry('signIn'); setMode('signIn'); goTo('account', { push: false }); }}>
                    {t('journey.haveAccount')} <b>{t('journey.signIn')}</b>
                </button>
            </>
        );
    } else if (step === 'play') {
        const sparkStatusKey = sparkWeaknesses.length === 0 && sparkTeam.length >= 3
            ? 'journey.play.verdictStrong'
            : sparkTouched
                ? 'journey.play.verdictReact'
                : 'journey.play.verdictStart';
        const isHighScore = sparkScore >= 90;
        stage = (
            <div className="fj-spark">
                <div className="fj-spark__top">
                    {inlineSlot}
                    <div className="fj-spark__bubble" aria-live="polite">
                        <span className="fj-spark__bubble-head">
                            <span className="fj-spark__bubble-kicker">
                                <Sparkles aria-hidden="true" />
                                {t('journey.play.liveTag')}
                            </span>
                            <PartyPips team={sparkTeam} />
                        </span>
                        <span className="fj-spark__bubble-text">{t(sparkStatusKey, { count: sparkTeam.length })}</span>
                    </div>
                </div>

                {/* Desktop widescreen live battlefield: active Pokémon dance as animated GIFs on glowing type pedestals */}
                <div className="fj-arena fj__desk-only" aria-hidden="true">
                    <div className="fj-arena__head">
                        <span className="fj-arena__tag">{t('journey.play.arenaLabel')}</span>
                        <span className="fj-arena__hint">{t('journey.play.tapHint')}</span>
                    </div>
                    <div className="fj-arena__lineup">
                        {sparkTeam.map((mon) => (
                            <div
                                key={mon.id}
                                className="fj-arena__mon"
                                style={{ '--tone': tone(mon.tone) }}
                            >
                                <span className="fj-arena__pedestal type-platform" style={{ '--card-type': tone(mon.tone) }}>
                                    <AnimatedSprite id={mon.id} alt={mon.name} className="fj-arena__gif" />
                                </span>
                                <span className="fj-arena__name">{mon.name}</span>
                                <span className="fj-arena__types">
                                    {mon.types.map((tp) => <TypeChip key={tp} type={tp} size="sm" />)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="fj-spark__grid" role="group" aria-label={t('journey.play.gridLabel')}>
                    {SPARK_POOL.map((mon) => {
                        const active = sparkIds.includes(mon.id);
                        return (
                            <button
                                key={mon.id}
                                type="button"
                                aria-pressed={active}
                                className={`fj-spark__card ${active ? 'is-on' : ''}`}
                                style={{ '--tone': tone(mon.tone) }}
                                onClick={() => handleSparkToggle(mon)}
                            >
                                <span className="fj-spark__check" aria-hidden="true"><Check /></span>
                                <span className="fj-spark__stage type-platform" style={{ '--card-type': tone(mon.tone) }}>
                                    <Art id={mon.id} className="fj-spark__art" />
                                </span>
                                <span className="fj-spark__meta">
                                    <span className="fj-spark__name">{mon.name}</span>
                                    <span className="fj-spark__types" aria-hidden="true">
                                        {mon.types.map((tp) => (
                                            <img key={tp} src={typeIcons[tp]} alt="" width={14} height={14} />
                                        ))}
                                    </span>
                                </span>
                            </button>
                        );
                    })}
                </div>

                <div className="fj-spark__meter" aria-live="polite">
                    <div className="fj-spark__score">
                        <span className="fj-spark__score-label">{t('journey.play.scoreLabel')}</span>
                        <span className={`fj-spark__score-val ${isHighScore ? 'is-peak' : ''}`}>
                            <RollingNumber value={sparkScore} />
                            <em>/100</em>
                        </span>
                        <span className="fj-spark__bar" aria-hidden="true">
                            <span
                                className={`fj-spark__bar-fill ${isHighScore ? 'is-peak' : ''}`}
                                style={{ transform: `scaleX(${Math.max(0.08, Math.min(1, sparkScore / 100))})` }}
                            />
                        </span>
                    </div>
                    <div className="fj-spark__weak">
                        <span className="fj-spark__score-label">
                            {sparkWeaknesses.length ? t('journey.play.weakLabel') : t('journey.play.coverLabel')}
                        </span>
                        <div className="fj-spark__chips">
                            {sparkWeaknesses.length
                                ? sparkWeaknesses.map((tp) => <TypeChip key={tp} type={tp} size="sm" />)
                                : <span className="fj-spark__ok">{t('journey.play.noWeak', { n: sparkCoveredCount })}</span>}
                        </div>
                    </div>
                    <div className="fj-spark__cov fj__desk-only">
                        <span className="fj-spark__score-label">{t('journey.play.coverageBar')}</span>
                        <strong className="fj-spark__cov-val">
                            {t('journey.play.typesCovered', { n: sparkCoveredCount })}
                        </strong>
                    </div>
                </div>
            </div>
        );
        talk = (
            <>
                <span className="fj__eyebrow" data-s>{t('journey.helloEyebrow')}</span>
                {heading(['playTitle', 'playAccent'])}
                <p className="fj__sub" data-s>{t('journey.playSub')}</p>
                <span className="fj__grow" />
                {cta(t('journey.playCta'), next, { icon: true })}
                <button type="button" className="fj__link" data-s onClick={() => { setEntry('signIn'); setMode('signIn'); goTo('account'); }}>
                    {t('journey.haveAccount')} <b>{t('journey.signIn')}</b>
                </button>
            </>
        );
    } else if (step === 'interests') {
        const previewArtId = persona?.art || (previewHeroKind === 'team' ? 445 : 150);
        const previewTone = persona ? tone(persona.tone) : tone('psychic');
        stage = (
            <>
                <div className="fj-orbit-stage">
                    <span className="fj-orbit-stage__rings" aria-hidden="true" />
                    {slot('100%')}
                </div>

                {/* Mobile compact preview */}
                <div className="fj-live-preview fj__mob-only" aria-live="polite">
                    <span className="fj-live-preview__kicker">{t('journey.preview.eyebrow')}</span>
                    <div className="fj-live-preview__grid">
                        <div className="fj-live-preview__item">
                            <span className="fj-live-preview__label">{t('journey.preview.home')}</span>
                            <strong className="fj-live-preview__value">
                                {previewHeroKind === 'team' ? t('journey.preview.heroTeam') : t('journey.preview.heroChallenge')}
                            </strong>
                        </div>
                        <div className="fj-live-preview__item">
                            <span className="fj-live-preview__label">{t('journey.preview.menu')}</span>
                            <strong className="fj-live-preview__value">
                                {t(`journey.preview.nav.${previewNavKey}`)}
                            </strong>
                        </div>
                    </div>
                </div>

                {/* Desktop Stageshow miniature live app shell */}
                <div className="fj-mini-app fj__desk-only" aria-live="polite" style={{ '--preview-tone': previewTone }}>
                    <div className="fj-mini-app__bar">
                        <span className="fj-mini-app__dots" aria-hidden="true"><i /><i /><i /></span>
                        <span className="fj-mini-app__kicker">{t('journey.preview.eyebrow')}</span>
                    </div>
                    <div className="fj-mini-app__body">
                        <div className="fj-mini-app__rail">
                            <span className="fj-mini-app__col-label">{t('journey.preview.sidebarTitle')}</span>
                            <ul>
                                {previewNavOrder.map((navKey, idx) => (
                                    <li key={navKey} className={idx === 0 ? 'is-top' : ''}>
                                        <span className="fj-mini-app__rank">#{idx + 1}</span>
                                        <span>{t(`journey.preview.nav.${navKey}`)}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="fj-mini-app__hero">
                            <span className="fj-mini-app__col-label">{t('journey.preview.homeTitle')}</span>
                            <div className="fj-mini-app__card">
                                <div className="fj-mini-app__card-copy">
                                    <strong>{previewHeroKind === 'team' ? t('journey.preview.heroTeam') : t('journey.preview.heroChallenge')}</strong>
                                    <span>{previewHeroKind === 'team' ? t('journey.preview.heroSubTeam') : t('journey.preview.heroSubChallenge')}</span>
                                </div>
                                <span className="fj-mini-app__art-wrap">
                                    <AnimatedSprite id={previewArtId} className="fj-mini-app__gif" />
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </>
        );
        talk = (
            <>
                {heading(['interestsTitle', 'interestsAccent'])}
                <p className="fj__sub" data-s>{t('onboarding.interests.sub')}</p>
                <div className="fj-chips" role="group" aria-labelledby={titleId}>
                    {INTERESTS.map((interest) => {
                        const on = interests.includes(interest);
                        return (
                            <button
                                key={interest}
                                type="button"
                                role="checkbox"
                                aria-checked={on}
                                className={`fj-chip ${on ? 'is-on' : ''}`}
                                style={{ '--tone': tone(INTEREST_ART[interest].tone) }}
                                data-s
                                onClick={(e) => toggleInterest(interest, e.currentTarget.querySelector('img'))}
                            >
                                <span className="fj-chip__art"><Art id={INTEREST_ART[interest].art} /></span>
                                <span className="fj-chip__text">
                                    <span className="fj-chip__title">{t(`onboarding.interests.${interest}.title`)}</span>
                                    <span className="fj-chip__desc">{t(`onboarding.interests.${interest}.desc`)}</span>
                                </span>
                                <span className="fj-check" aria-hidden="true"><Check /></span>
                            </button>
                        );
                    })}
                </div>
                <span className="fj__grow" />
                {cta(t('journey.continue'), next, { disabled: !canContinue('interests', { interests }), icon: true })}
            </>
        );
    } else if (step === 'level') {
        const activeLevel = level || 'casual';
        stage = (
            <div className="fj-level-stage">
                <div className="fj-evo" aria-hidden="true">
                    <span className="fj-evo__flash" ref={flashRef} />
                    <Art id={LEVEL_ART[activeLevel]} imgRef={evoRef} className="fj-evo__art" />
                </div>

                {/* Desktop interactive 3-stage evolution track with animated GIFs */}
                <div className="fj-evo-track fj__desk-only" role="group" aria-label={t('onboarding.level.title')}>
                    {COMPETITIVE_LEVELS.map((val, idx) => {
                        const isActive = activeLevel === val;
                        return (
                            <React.Fragment key={val}>
                                {idx > 0 && <span className="fj-evo-track__arrow" aria-hidden="true">→</span>}
                                <button
                                    type="button"
                                    className={`fj-evo-node ${isActive ? 'is-on' : ''}`}
                                    onClick={() => pickLevel(val)}
                                >
                                    <span className="fj-evo-node__sprite">
                                        <AnimatedSprite id={LEVEL_ART[val]} still={!isActive} className="fj-evo-node__gif" />
                                    </span>
                                    <span>{t(`onboarding.levelShort.${val}`)}</span>
                                </button>
                            </React.Fragment>
                        );
                    })}
                </div>

                <div className="fj-level-unlock">
                    {inlineSlot}
                    <div className="fj-level-unlock__copy" aria-live="polite">
                        <span className="fj-level-unlock__kicker">{t('journey.levelUnlock.eyebrow')}</span>
                        <p>{t(`journey.levelUnlock.${activeLevel}`, { format: t(`onboarding.format.${format}`) })}</p>
                    </div>
                </div>
            </div>
        );
        talk = (
            <>
                {heading(['levelTitle', 'levelAccent'])}
                <div className="fj-opts" role="radiogroup" aria-labelledby={titleId}>
                    {COMPETITIVE_LEVELS.map((value) => (
                        <button key={value} type="button" role="radio" aria-checked={level === value} className={`fj-opt ${level === value ? 'is-on' : ''}`} data-s onClick={() => pickLevel(value)}>
                            <span className="fj-opt__title">{t(`onboarding.level.${value}.title`)}</span>
                            <span className="fj-opt__desc">{t(`onboarding.level.${value}.desc`)}</span>
                        </button>
                    ))}
                </div>
                <div className="fj-format-row" data-s>
                    <span className="fj__label">{t('onboarding.format.label')}</span>
                    <div className="segmented segmented--quiet segmented--block" role="group" aria-label={t('onboarding.format.label')}>
                        {BATTLE_FORMATS.map((value) => (
                            <button key={value} type="button" className="segmented__item" aria-pressed={format === value} onClick={() => { setFormat(value); react('nod'); }}>
                                {t(`onboarding.format.${value}`)}
                            </button>
                        ))}
                    </div>
                </div>
                <span className="fj__grow" />
                {cta(t('journey.buildPlan'), next, { icon: true })}
            </>
        );
    } else if (step === 'partner') {
        stage = (
            <div className="fj-partner-stage">
                <div className="fj-partner-stage__hero type-platform" style={{ '--card-type': tone(chosenPartner.type) }}>
                    <span className="fj-partner-stage__rings" aria-hidden="true" />
                    <Art id={chosenPartner.id} shiny={partnerShiny} imgRef={partnerArtRef} className="fj-partner-stage__art" />
                </div>
                <div className="fj-partner-stage__controls">
                    <div className="fj-partner-stage__foot">
                        {inlineSlot}
                        <div className="fj-partner-stage__meta">
                            <span className="fj-partner-stage__name">{chosenPartner.name}</span>
                            <TypeChip type={chosenPartner.type} size="sm" />
                        </div>
                    </div>
                    <button
                        type="button"
                        className={`fj-shiny-btn ${partnerShiny ? 'is-on' : ''} ${shinyBurst.isBursting ? 'is-bursting' : ''}`}
                        aria-pressed={partnerShiny}
                        onClick={togglePartnerShiny}
                    >
                        {shinyBurst.burst}
                        <Sparkles aria-hidden="true" />
                        <span>{t('journey.partnerShiny')}</span>
                    </button>
                </div>

                {/* Desktop live Home greeting preview with animated GIF */}
                <div className="fj-greeting-preview fj__desk-only" style={{ '--tone': tone(chosenPartner.type) }}>
                    <span className="fj-greeting-preview__kicker">{t('journey.partnerGreeting')}</span>
                    <div className="fj-greeting-preview__row">
                        <span className="fj-greeting-preview__avatar">
                            <AnimatedSprite id={chosenPartner.id} alt={chosenPartner.name} className="fj-greeting-preview__gif" />
                        </span>
                        <span className="fj-greeting-preview__text">
                            <strong>{t('journey.partnerHello', { name: chosenPartner.name })}</strong>
                            <span>{t('journey.preview.heroChallenge')}</span>
                        </span>
                    </div>
                </div>
            </div>
        );
        talk = (
            <>
                {heading(['partnerTitle', 'partnerAccent'])}
                <p className="fj__sub" data-s>{t('journey.partnerSub')}</p>
                <div className="fj-partners" role="radiogroup" aria-labelledby={titleId}>
                    {PARTNER_CHOICES.map((choice) => {
                        const on = partnerId === choice.id;
                        return (
                            <button
                                key={choice.id}
                                type="button"
                                role="radio"
                                aria-checked={on}
                                className={`fj-partner-tile ${on ? 'is-on' : ''}`}
                                style={{ '--tone': tone(choice.type) }}
                                data-s
                                onClick={() => pickPartner(choice)}
                            >
                                <span className="fj-partner-tile__art">
                                    <Art id={choice.id} shiny={on && partnerShiny} />
                                </span>
                                <span className="fj-partner-tile__name">{choice.name}</span>
                            </button>
                        );
                    })}
                </div>
                <span className="fj__grow" />
                {cta(t('journey.buildPlan'), next, { icon: true })}
            </>
        );
    } else if (step === 'blueprint' && persona) {
        const useChosenPartner = !interests.includes('competitive') && Boolean(partnerId);
        const passArtId = useChosenPartner ? partnerId : persona.art;
        const passShiny = useChosenPartner && partnerShiny;
        const personaName = t(`onboarding.personas.${persona.id}.name`);
        const insightText = t(`journey.blueprint.insight.${persona.id}`, {
            partner: chosenPartner.name,
            format: t(`onboarding.format.${format}`),
            level: t(`onboarding.levelShort.${level || 'casual'}`),
        });
        const passSquadIds = [
            ...new Set([
                ...(useChosenPartner ? [partnerId] : []),
                ...persona.interests.map((i) => INTEREST_ART[i]?.art).filter(Boolean),
                persona.art,
            ]),
        ].slice(0, 4);
        stage = (
            <div className="fj-blueprint-stage" style={{ '--spark-color': tone(persona.tone) }}>
                <span className="fj-blueprint-aura" aria-hidden="true" />
                <div className="fj-blueprint-mascot">
                    {slot('100%')}
                </div>
                <div className="fj-persona" ref={cardRef} style={{ '--tone': tone(persona.tone) }}>
                    <div className="fj-persona__main">
                        <div className="fj-persona__text">
                            <span className="fj-persona__tags">
                                {persona.interests.map((i) => t(`onboarding.interestShort.${i}`)).join(' · ')}
                            </span>
                            <p className="fj-persona__name">{personaName}</p>
                            <p className="fj-persona__tag">{t(`onboarding.personas.${persona.id}.tagline`)}</p>
                        </div>
                        <Art id={passArtId} shiny={passShiny} className="fj-persona__art" />
                    </div>
                    <div className="fj-persona__squad fj__desk-only" aria-hidden="true">
                        {passSquadIds.map((id) => (
                            <span key={id} className="fj-persona__squad-mon">
                                <AnimatedSprite id={id} className="fj-persona__squad-gif" />
                            </span>
                        ))}
                    </div>
                    <span className="fj-persona__foil" aria-hidden="true" />
                    <span className="fj-persona__shine" aria-hidden="true" />
                </div>
                <p className="fj-insight" style={{ '--tone': tone(persona.tone) }} data-s>{insightText}</p>
            </div>
        );
        talk = (
            <>
                <span className="fj__eyebrow" data-s>{t('journey.blueprint.eyebrow')}</span>
                {heading(['blueprintTitle', 'blueprintAccent'], { persona: personaName })}
                <ul className="fj-plan" data-s>
                    <li className="fj-plan__item">
                        <span className="fj-plan__icon"><LayoutGrid aria-hidden="true" /></span>
                        <span className="fj-plan__copy">
                            <strong>{t('journey.blueprint.homeTitle')}</strong>
                            <span>{activation.heroKind === 'team' ? t('journey.preview.heroTeam') : t('journey.preview.heroChallenge')}</span>
                        </span>
                    </li>
                    <li className="fj-plan__item">
                        <span className="fj-plan__icon"><Compass aria-hidden="true" /></span>
                        <span className="fj-plan__copy">
                            <strong>{t('journey.blueprint.menuTitle')}</strong>
                            <span>{t(`journey.preview.nav.${activation.navTop}`)}</span>
                        </span>
                    </li>
                    <li className="fj-plan__item">
                        <span className="fj-plan__icon"><Target aria-hidden="true" /></span>
                        <span className="fj-plan__copy">
                            <strong>{t('journey.blueprint.missionTitle')}</strong>
                            <span>{t(`journey.blueprint.mission.${activation.id}`)}</span>
                        </span>
                    </li>
                </ul>
                <span className="fj__grow" />
                {cta(t(`journey.blueprint.cta.${activation.id}`), launchActivation, { icon: true })}
                <button type="button" className="fj__link" data-s onClick={() => close()}>
                    {t('journey.blueprint.goHome')}
                </button>
            </>
        );
    } else if (step === 'account') {
        const signIn = mode !== 'signUp';
        stage = (
            <>
                <div className="fj-card" ref={cardRef} data-s style={{ '--tone': persona && !signIn ? tone(persona.tone) : 'var(--color-primary)' }}>
                    <span className="fj-card__avatar"><Art id={persona && !signIn ? persona.art : 94} /></span>
                    <span className="fj-card__text">
                        <span className="fj-card__name">{signIn ? t('journey.cardSignIn') : (name.trim() || t('journey.cardPlaceholder'))}</span>
                        <span className="fj-card__sub">
                            {signIn ? (email.trim() || 'trainer@pokemail.com') : [persona ? t(`onboarding.personas.${persona.id}.name`) : null, interests.includes('competitive') ? t(`onboarding.format.${format}`) : null].filter(Boolean).join(' · ')}
                        </span>
                    </span>
                    <span className="fj-card__level">{t('journey.xpLevel', { n: 1 })}</span>
                </div>
                {slot('36%')}
            </>
        );
        talk = (
            <>
                {heading(accountTitle)}
                <p className="fj__sub" data-s>{mode === 'reset' ? t('journey.accountResetSub') : signIn ? t('journey.accountSignInSub') : t('journey.accountSignUpSub', { xp: xp.mission })}</p>
                {google}
                {resetSentTo ? (
                    <div className="fj__done-note" role="status" data-s>
                        <p>{t('journey.resetSent', { email: resetSentTo })}</p>
                        <button type="button" className="btn btn-secondary btn-block" onClick={() => switchMode('signIn')}>{t('journey.backToSignIn')}</button>
                    </div>
                ) : busy ? (
                    <div className="fj__busy" data-s><Loader size="sm" label={mode === 'signUp' ? t('journey.creating') : t('journey.signingIn')} /></div>
                ) : (
                    <form className="fj-form" onSubmit={submit} noValidate>
                        {mode === 'signUp' && (
                            <label className="field field--filled" data-s>
                                <span className="sr-only">{t('journey.name')}</span>
                                <span className="field__control">
                                    <UserRound className="field__icon" aria-hidden="true" />
                                    <input className="input-clean" value={name} maxLength={24} autoComplete="nickname" enterKeyHint="next" placeholder={t('journey.namePlaceholder')} onChange={(e) => { setName(e.target.value); if (e.target.value.length === 1) react('nod'); }} />
                                </span>
                            </label>
                        )}
                        <label className="field field--filled" data-s>
                            <span className="sr-only">{t('modals.authEmailLabel')}</span>
                            <span className="field__control">
                                <Mail className="field__icon" aria-hidden="true" />
                                <input
                                    ref={emailRef}
                                    type="email"
                                    autoComplete="email"
                                    autoCapitalize="none"
                                    autoCorrect="off"
                                    inputMode="email"
                                    enterKeyHint={mode === 'reset' ? 'send' : 'next'}
                                    className="input-clean"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    aria-invalid={errorField === 'email' || undefined}
                                    aria-describedby={error ? 'fj-error' : undefined}
                                    placeholder="trainer@pokemail.com"
                                />
                            </span>
                        </label>
                        {mode !== 'reset' && (
                            <div data-s>
                                <PasswordField
                                    filled
                                    icon={LockKeyhole}
                                    label={t('modals.authPasswordLabel')}
                                    value={password}
                                    onChange={setPassword}
                                    autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
                                    enterKeyHint="go"
                                    minLength={MIN_PASSWORD_LENGTH}
                                    inputRef={passwordRef}
                                    invalid={errorField === 'password'}
                                    describedBy={error ? 'fj-error' : undefined}
                                />
                            </div>
                        )}
                        {error && <p id="fj-error" className="fj__error" role="alert">{error}</p>}
                        <button type="submit" className="btn btn-primary btn-lg btn-block fj__cta" data-s>
                            {mode === 'reset' ? t('journey.sendLink') : mode === 'signIn' ? t('journey.enter') : t('journey.create')}
                        </button>
                    </form>
                )}
                {!busy && !resetSentTo && (
                    <div className="fj__links" data-s>
                        {mode === 'signUp' ? (
                            <button type="button" className="fj__link" onClick={() => switchMode('signIn')}>{t('journey.haveAccount')} <b>{t('journey.signIn')}</b></button>
                        ) : (
                            <>
                                {mode === 'signIn' && <button type="button" className="fj__link" onClick={() => switchMode('reset')}>{t('journey.forgot')}</button>}
                                {mode === 'reset'
                                    ? <button type="button" className="fj__link" onClick={() => switchMode('signIn')}>{t('journey.backToSignIn')}</button>
                                    : <button type="button" className="fj__link" onClick={() => switchMode('signUp')}>{t('journey.newHere')} <b>{t('journey.createLink')}</b></button>}
                            </>
                        )}
                    </div>
                )}
            </>
        );
    } else if (step === 'done') {
        // The account is real now: the trainer card comes out printed
        // (components/moments/TrainerCardPrint.jsx), the mascot beside it.
        stage = (
            <>
                <TrainerCardPrint
                    seed={uid || name || 'trainer'}
                    name={name.trim() || savedName || t('journey.cardPlaceholder')}
                    partnerId={partnerId}
                    tone={persona ? tone(persona.tone) : 'var(--color-primary)'}
                    persona={persona ? t(`onboarding.personas.${persona.id}.name`) : null}
                    level={levelForXp(trainerXp).level}
                    since={new Date().toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', { month: 'short', year: 'numeric' })}
                />
                {slot('26%')}
            </>
        );
        talk = (
            <>
                {heading(doneTitle)}
                <p className="fj__sub" data-s>{t(`journey.${doneSub}`)}</p>
                <span className="fj__grow" />
                {cta(t('journey.doneCta'), () => close(), { icon: true })}
            </>
        );
    }

    return (
        <div
            ref={layerRef}
            className="fj"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onPointerMove={handleCanvasPointerMove}
            style={{ '--fj-glow': glow, '--fj-electric': typeColors.electric }}
        >
            <div className="fj__atmosphere" aria-hidden="true">
                <span className="fj__orb-glow fj__orb-glow--a" />
                <span className="fj__orb-glow fj__orb-glow--b" />
                <span className="fj__ball-ring" />
            </div>
            <div className="fj__col">
                <div className={`fj__bar${chrome ? '' : ' is-quiet'}`}>
                    {chrome && history.current.length > 0 ? (
                        <button type="button" className="btn btn-ghost btn-icon fj__back" onClick={back} aria-label={t('onboarding.back')} title={t('onboarding.back')}>
                            <ArrowLeft aria-hidden="true" />
                        </button>
                    ) : <span className="fj__back" aria-hidden="true" />}

                    <div
                        className="fj__steps"
                        role="progressbar"
                        aria-valuemin={1}
                        aria-valuemax={stepMeta.total}
                        aria-valuenow={stepMeta.index + 1}
                        aria-label={t('onboarding.progress', { n: stepMeta.index + 1, total: stepMeta.total })}
                    >
                        {Array.from({ length: stepMeta.total }, (_, idx) => (
                            <span
                                key={idx}
                                className={`fj__step-pip ${idx < stepMeta.index ? 'is-done' : idx === stepMeta.index ? 'is-active' : ''}`}
                            />
                        ))}
                    </div>

                    {step === 'hello' && <span className="fj__mark" ref={dockRef} aria-hidden="true" />}

                    {step !== 'blueprint' && step !== 'done' ? (
                        <button type="button" className="fj__skip" onClick={dismiss}>{t('onboarding.skip')}</button>
                    ) : (
                        <span className="fj__step-count" aria-hidden="true">
                            {stepMeta.index + 1}/{stepMeta.total}
                        </span>
                    )}
                </div>
                <div className={`fj__screen fj__screen--${step}`} key={step} ref={screenRef}>
                    {stage && (
                        <div className="fj__stage" ref={stageRef}>
                            {stage}
                        </div>
                    )}
                    <div className="fj__talk">{talk}</div>
                </div>
            </div>
            {introOn && (
                <BrandIntro variant="journey" dockRef={dockRef} leaving={step !== 'hello'} onLeft={() => setIntroOn(false)} />
            )}
            <div className="fj__orbit" ref={orbitRef} aria-hidden="true" />
            <div className="fj__bot" ref={botRef} aria-hidden="true">
                <div className="fj__bot-in">
                <Mascot
                    bot
                    size="fill"
                    framing="body"
                    mood={look.mood}
                    pose={look.pose}
                    hat={hat || undefined}
                    seasonal={false}
                    extra={confetti ? { fx: ['confetti'] } : undefined}
                    play={gesture.name || undefined}
                    playKey={gesture.id}
                    coverable={step === 'account'}
                    interactive
                    stage
                />
                </div>
            </div>
        </div>
    );
}

export default FirstJourney;
