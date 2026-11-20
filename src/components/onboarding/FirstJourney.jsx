import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, LockKeyhole, Mail, UserRound, Zap } from 'lucide-react';

import { Mascot } from '../Mascot';
import { Loader } from '../Loader';
import { PasswordField } from '../modals/auth/PasswordField';
import { GoogleButton } from '../GoogleButton';
import { useGoogleSignInAvailable } from '../../services/googleAvailability';
import { useTranslation } from '../../hooks/useTranslation';
import { useAuthStore } from '../../store/useAuthStore';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import { typeColors } from '../../constants/types';
import { getPokemonArtworkSpriteUrl } from '../../utils/pokemonSprites';
import { track } from '../../services/analytics';
import { authErrorField, isAuthCancel, prettifyAuthError } from '../../utils/authErrors';
import { MIN_PASSWORD_LENGTH } from '../../utils/passwordStrength';
import { JOURNEYS } from '../../utils/journeys';
import {
    BATTLE_FORMATS, COMPETITIVE_LEVELS, INTERESTS, LEVEL_ART, PERSONAS, PICK_DESTINATIONS,
    builderRegulationSeed, hasAnsweredProfile, personaPicks,
} from '../../utils/trainerProfile';
import {
    INTEREST_MOOD, JOURNEY_TOUR, LEVEL_MOOD, STEP_LOOK, TOUR_MS,
    canContinue, journeyAnswers, journeyHasChrome, journeyProgress, journeySteps, journeyXp, nextJourneyStep,
} from '../../utils/firstJourney';
import '../../styles/first-journey.css';

/**
 * The Primeira Jornada (2026-11-12) — the onboarding and the account in one
 * conversation with the 3D mascot. What is shown, in what order, and how the
 * mascot looks on each screen is utils/firstJourney.js; this file animates it.
 *
 * The choreography, from the approved proposal: ONE thing never leaves the
 * screen — the mascot. He travels to each screen's slot on the glide spring
 * while the screen that leaves rises and fades and the next one arrives in a
 * cascade (70 ms apart), the headline word by word out of a mask. Everything
 * is transform/opacity; under reduced motion every state still changes,
 * nothing travels.
 *
 * Data: the answers are `trainerProfile` (useAuthStore), saved when the
 * persona is revealed — so leaving at the account screen keeps them. The
 * account is useAuthStore's sign-up (a guest is upgraded in place, nothing is
 * lost), sign-in and reset; a guest can always go on without one. Closing it
 * any other way than finishing records a skip on a first run, so it never
 * comes back uninvited.
 */

const INTEREST_ART = Object.fromEntries(INTERESTS.map((i) => [i, PERSONAS[{ competitive: 'strategist', franchise: 'traveler', minigames: 'challenger' }[i]]]));
const EMAIL_RE = /^\S+@\S+\.\S+$/;
const prefersReduced = () => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
const cssVar = (name, fallback) => {
    if (typeof window === 'undefined') return fallback;
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
};
const tourImage = (file) => `${import.meta.env.BASE_URL}onboarding/${file}`;

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
const Art = ({ id, className = '', imgRef }) => (
    <img ref={imgRef} src={getPokemonArtworkSpriteUrl(id)} alt="" width={240} height={240} decoding="async" draggable={false} className={className} />
);

/** The tour: real screens of the app as stories — a card turning in, a caption, the mascot's pose beside it. */
function JourneyTour({ t, reduced, onLook, onDone, onIndex, children }) {
    const [index, setIndex] = useState(0);
    const stageRef = useRef(null);
    const segRefs = useRef([]);
    const dir = useRef(1);
    const look = useRef(onLook);
    look.current = onLook;
    const done = useRef(onDone);
    done.current = onDone;
    const indexRef = useRef(onIndex);
    indexRef.current = onIndex;

    useEffect(() => { JOURNEY_TOUR.forEach((item) => { const img = new Image(); img.src = tourImage(item.image); }); }, []);

    useEffect(() => {
        const item = JOURNEY_TOUR[index];
        look.current(item);
        indexRef.current?.(index);
        const stage = stageRef.current;
        if (!stage) return undefined;
        const old = stage.lastElementChild;
        const card = document.createElement('div');
        card.className = 'fj-shot';
        const img = document.createElement('img');
        img.src = tourImage(item.image);
        img.alt = '';
        img.decoding = 'async';
        card.append(img);
        stage.append(card);
        const glide = cssVar('--ease-glide', 'ease-out');
        if (!reduced) {
            card.animate([
                { transform: `translateX(${70 * dir.current}%) rotateY(${-38 * dir.current}deg) scale(0.86)`, opacity: 0 },
                { transform: 'none', opacity: 1 },
            ], { duration: 760, easing: glide });
        }
        if (old) {
            if (reduced) old.remove();
            else {
                old.animate([
                    { transform: 'none', opacity: 1 },
                    { transform: `translateX(${-70 * dir.current}%) rotateY(${38 * dir.current}deg) scale(0.86)`, opacity: 0 },
                ], { duration: 520, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' }).finished.then(() => old.remove(), () => old.remove());
            }
        }
        segRefs.current.forEach((seg, k) => {
            if (!seg) return;
            seg.getAnimations().forEach((a) => a.cancel());
            seg.style.transform = `scaleX(${k < index ? 1 : 0})`;
        });
        const seg = segRefs.current[index];
        if (seg && !reduced) seg.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: TOUR_MS, easing: 'linear', fill: 'forwards' });
        else if (seg) seg.style.transform = 'scaleX(1)';
        const timer = setTimeout(() => {
            if (index + 1 >= JOURNEY_TOUR.length) done.current();
            else { dir.current = 1; setIndex(index + 1); }
        }, TOUR_MS);
        return () => clearTimeout(timer);
    }, [index, reduced]);

    const step = (by) => {
        dir.current = by;
        const next = index + by;
        if (next >= JOURNEY_TOUR.length) done.current();
        else setIndex(Math.max(0, next));
    };
    return (
        <>
            <div className="fj-segs" data-s aria-hidden="true">
                {JOURNEY_TOUR.map((s, k) => <i key={s.id}><b ref={(n) => { segRefs.current[k] = n; }} /></i>)}
            </div>
            <div className="fj-tour" data-s>
                <div className="fj-tour__stage" ref={stageRef} aria-hidden="true" />
                <button type="button" className="fj-tour__zone fj-tour__zone--prev" onClick={() => step(-1)} aria-label={t('journey.tour.prev')} />
                <button type="button" className="fj-tour__zone fj-tour__zone--next" onClick={() => step(1)} aria-label={t('journey.tour.next')} />
            </div>
            {children}
        </>
    );
}

export function FirstJourney() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const titleId = useId();
    const source = useOnboardingStore((s) => s.source);
    const requestedEntry = useOnboardingStore((s) => s.entry);
    const closeStore = useOnboardingStore((s) => s.close);
    const saved = useAuthStore((s) => s.trainerProfile);
    const setTrainerProfile = useAuthStore((s) => s.setTrainerProfile);
    const isAnonymousNow = useAuthStore((s) => s.isAnonymous);
    const savedName = useAuthStore((s) => s.displayName);

    // Decided once per opening: who this is does not change under them mid-flow.
    const [initialEntry] = useState(() => requestedEntry || (hasAnsweredProfile(saved) && source !== 'landing' ? 'redo' : 'welcome'));
    const [entry, setEntry] = useState(initialEntry);
    const [wasGuest] = useState(() => isAnonymousNow !== false);
    const [reduced] = useState(prefersReduced);

    const [interests, setInterests] = useState(() => (hasAnsweredProfile(saved) ? saved.interests : []));
    const [level, setLevel] = useState(() => saved.competitiveLevel || null);
    const [format, setFormat] = useState(() => saved.battleFormat || 'both');
    const steps = useMemo(() => journeySteps({ interests, entry, isAnonymous: wasGuest }), [interests, entry, wasGuest]);
    const [step, setStep] = useState(() => steps[0]);
    const stepRef = useRef(step);
    stepRef.current = step;
    const history = useRef([]);

    const answers = useMemo(() => journeyAnswers({ interests, level, format }), [interests, level, format]);
    const xp = useMemo(() => journeyXp(), []);

    // the mascot: one, alive, holding the stage while the journey is open
    const [look, setLook] = useState(STEP_LOOK[steps[0]] || { mood: 'feliz' });
    const [gesture, setGesture] = useState({ name: null, id: 0 });
    const [confetti, setConfetti] = useState(false);
    const react = useCallback((name) => { if (name) setGesture((g) => ({ name, id: g.id + 1 })); }, []);
    const hat = step === 'persona' || step === 'account' || step === 'done' ? answers.hat : null;

    // the account screen
    const [mode, setMode] = useState(entry === 'signIn' ? 'signIn' : 'signUp');
    const [name, setName] = useState(savedName || '');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [errorField, setErrorField] = useState(null);
    const [busy, setBusy] = useState(false);
    const [googleBusy, setGoogleBusy] = useState(false);
    const googleOn = useGoogleSignInAvailable();
    const [tourIndex, setTourIndex] = useState(0);
    const [resetSentTo, setResetSentTo] = useState('');
    const [outcome, setOutcome] = useState(null); // 'account' | 'signedIn' | 'guest' | null
    const emailRef = useRef(null);
    const passwordRef = useRef(null);

    const layerRef = useRef(null);
    const screenRef = useRef(null);
    const botRef = useRef(null);
    const orbitRef = useRef(null);
    const cardRef = useRef(null);
    const evoRef = useRef(null);
    const flashRef = useRef(null);
    const xpFillRef = useRef(null);
    const botBox = useRef({ x: 0, y: 0, size: 0 });
    const navBusy = useRef(false);
    const finished = useRef(false);
    const committed = useRef(false);
    const closing = useRef(false);

    /* ---------- the mascot's travel ---------- */
    const orbitFollow = useCallback(() => {
        const orbit = orbitRef.current;
        if (!orbit) return;
        const { x, y, size } = botBox.current;
        const r = Math.max(56, size * 0.62);
        const spots = [[-0.95, -0.15], [0.95, -0.2], [0, -1.05]];
        for (const img of orbit.children) {
            const [ox, oy] = spots[INTERESTS.indexOf(img.dataset.orb) % 3];
            img.style.left = `${x + ox * r}px`;
            img.style.top = `${y + oy * r}px`;
        }
    }, []);

    const placeBot = useCallback((instant = false) => {
        const layer = layerRef.current;
        const bot = botRef.current;
        if (!layer || !bot) return;
        const lr = layer.getBoundingClientRect();
        const base = bot.offsetWidth || 200;
        let cx; let cy; let size;
        const slot = [...(screenRef.current?.querySelectorAll('[data-slot]') || [])].find((n) => n.getClientRects().length > 0);
        if (stepRef.current === 'peek') {
            size = Math.min(lr.width, 448) * 0.72;
            cx = lr.width / 2;
            cy = lr.height - size * 0.14;
        } else if (slot) {
            const r = slot.getBoundingClientRect();
            size = Math.max(40, Math.min(r.width, r.height));
            cx = r.left - lr.left + r.width / 2;
            cy = r.top - lr.top + r.height / 2;
        } else return;
        botBox.current = { x: cx, y: cy, size };
        const to = `translate(${cx - base / 2}px, ${cy - base / 2}px) scale(${size / base})`;
        const from = getComputedStyle(bot).transform;
        bot.getAnimations().forEach((a) => a.cancel());
        bot.style.transform = to;
        if (!instant && !reduced && from && from !== 'none') {
            bot.animate([{ transform: from }, { transform: to }], { duration: 720, easing: cssVar('--ease-glide', 'ease-out') });
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
            const dx = a.left - b.left; const dy = a.top - b.top;
            img.animate([
                { transform: `translate(${dx}px, ${dy}px) scale(0.6)`, opacity: 0.4 },
                { transform: `translate(${dx * 0.4}px, ${dy * 0.4 - 70}px) scale(1.15) rotate(-12deg)`, opacity: 1, offset: 0.55 },
                { transform: 'none', opacity: 1 },
            ], { duration: 760, easing: cssVar('--ease-glide', 'ease-out') });
        }
    }, [orbitFollow, reduced]);
    const drop = useCallback((interest) => {
        const img = orbitRef.current?.querySelector(`[data-orb="${interest}"]`);
        if (!img) return;
        if (reduced) { img.remove(); return; }
        img.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(3.5rem) scale(0.5) rotate(20deg)', opacity: 0 }], { duration: 380, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' })
            .finished.then(() => img.remove(), () => img.remove());
    }, [reduced]);

    /* ---------- saving the answers ---------- */
    const commitProfile = useCallback(() => {
        if (committed.current || entry === 'signIn') return;
        committed.current = true;
        finished.current = true;
        const profile = setTrainerProfile({ ...answers.profile, answeredAt: Date.now() });
        const seed = builderRegulationSeed(profile);
        if (seed) {
            try {
                if (!window.localStorage.getItem('tb-regulation')) window.localStorage.setItem('tb-regulation', seed);
            } catch { /* the builder keeps its default */ }
        }
        track('onboarding_complete', {
            persona: answers.persona?.id || 'none',
            interests: profile.interests.join(','),
            level: profile.competitiveLevel || 'none',
            source: source || 'unknown',
        });
    }, [answers, entry, setTrainerProfile, source]);

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
            bot.animate([{ transform: from }, { transform: `translate(${-base * 0.2}px, ${-base * 0.2}px) scale(0.18)`, opacity: 0.2 }], { duration: 520, easing: cssVar('--ease-glide', 'ease-out'), fill: 'forwards' });
        }
        layer.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-1.5rem)' }], { duration: 420, delay: 80, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' })
            .finished.then(done, done);
    }, [closeStore, reduced]);

    const dismiss = useCallback(() => {
        if (!finished.current && initialEntry === 'welcome' && !hasAnsweredProfile(useAuthStore.getState().trainerProfile)) {
            setTrainerProfile({ skippedAt: Date.now() });
            track('onboarding_skip', { step: stepRef.current, source: source || 'unknown' });
        }
        close();
    }, [close, initialEntry, setTrainerProfile, source]);

    /* ---------- moving between screens ---------- */
    const goTo = useCallback((next, { push = true } = {}) => {
        if (!next || navBusy.current) return;
        const commit = () => {
            navBusy.current = false;
            if (push) history.current.push(stepRef.current);
            setStep(next);
        };
        const el = screenRef.current;
        if (reduced || !el) { commit(); return; }
        navBusy.current = true;
        el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-1rem)' }], { duration: 200, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' })
            .finished.then(commit, commit);
    }, [reduced]);
    const next = useCallback(() => {
        if (!canContinue(stepRef.current, { interests })) return;
        if (stepRef.current === 'level' && !level) setLevel('casual');
        goTo(nextJourneyStep(steps, stepRef.current));
    }, [goTo, interests, level, steps]);
    const back = () => {
        const prev = history.current.pop();
        if (!prev) return;
        if (!journeySteps({ interests, entry, isAnonymous: wasGuest }).includes(prev)) setEntry(initialEntry === 'signIn' ? 'welcome' : initialEntry);
        goTo(prev, { push: false });
    };

    // each screen arriving: the mascot's look, the cascade, his travel, the focus
    useLayoutEffect(() => {
        const base = STEP_LOOK[step] || {};
        setLook({ mood: base.mood, pose: base.pose });
        if (base.play) react(base.play);
        const el = screenRef.current;
        if (el && !reduced) {
            const glide = cssVar('--ease-glide', 'ease-out');
            el.querySelectorAll('[data-s]').forEach((n, i) => n.animate(
                [{ opacity: 0, transform: 'translateY(1.375rem)' }, { opacity: 1, transform: 'none' }],
                { duration: 620, delay: 140 + i * 70, easing: glide, fill: 'backwards' },
            ));
            el.querySelectorAll('.fj-w > span').forEach((n, i) => n.animate(
                [{ transform: 'translateY(110%)' }, { transform: 'none' }],
                { duration: 560, delay: 120 + i * 45, easing: glide, fill: 'backwards' },
            ));
        }
        placeBot(false);
        const heading = el?.querySelector('h2');
        if (heading) requestAnimationFrame(() => heading.focus({ preventScroll: true }));
        // eslint-disable-next-line react-hooks/exhaustive-deps -- once per screen
    }, [step]);

    // what each screen does while it is up
    useEffect(() => {
        if (step === 'peek') {
            const id = setTimeout(() => goTo('hello'), 2600);
            return () => clearTimeout(id);
        }
        if (step === 'interests') {
            INTERESTS.filter((i) => interests.includes(i)).forEach((i) => fly(i, null));
            const orbit = orbitRef.current;
            return () => { if (orbit) [...orbit.children].forEach((img) => drop(img.dataset.orb)); };
        }
        if (step === 'xp') {
            const fill = xpFillRef.current;
            if (fill) {
                if (reduced) fill.style.transform = `scaleX(${xp.share})`;
                else fill.animate([{ transform: 'scaleX(0)' }, { transform: `scaleX(${xp.share})` }], { duration: 1100, delay: 600, easing: cssVar('--ease-glide', 'ease-out'), fill: 'both' });
            }
            const id = setTimeout(() => react('hop'), 1300);
            return () => clearTimeout(id);
        }
        if (step === 'persona') {
            commitProfile();
            const card = cardRef.current;
            if (card && !reduced) {
                card.animate([{ transform: 'perspective(56rem) rotateY(100deg) scale(0.9)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 820, delay: 200, easing: cssVar('--ease-pop', 'ease-out'), fill: 'backwards' });
            }
            if (reduced) return undefined;
            setConfetti(true);
            const id = setTimeout(() => setConfetti(false), 2400);
            return () => { clearTimeout(id); setConfetti(false); };
        }
        if (step === 'account') {
            const layer = layerRef.current;
            const tilt = (e) => {
                const card = cardRef.current;
                if (!card || reduced) return;
                const r = card.getBoundingClientRect();
                const x = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / r.width));
                const y = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / r.height));
                card.style.transform = `perspective(44rem) rotateX(${y * -8}deg) rotateY(${x * 10}deg)`;
            };
            layer?.addEventListener('pointermove', tilt);
            return () => layer?.removeEventListener('pointermove', tilt);
        }
        if (step === 'done' && entry === 'redo') commitProfile();
        return undefined;
        // eslint-disable-next-line react-hooks/exhaustive-deps -- once per screen
    }, [step]);

    // the layout moved (a rotation, the account form changing mode): the mascot follows
    useEffect(() => {
        const onResize = () => placeBot(true);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [placeBot]);
    useLayoutEffect(() => { if (step === 'account') placeBot(false); }, [mode, step, placeBot]);

    // Escape is a skip, like "Pular"
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape' && !busy) { e.preventDefault(); dismiss(); } };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [dismiss, busy]);

    /* ---------- answers ---------- */
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
            setLook({ mood: last ? INTEREST_MOOD[last] : 'feliz' });
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
        flash?.animate([{ opacity: 0, transform: 'scale(0.4)' }, { opacity: 1, transform: 'scale(1)', offset: 0.4 }, { opacity: 0, transform: 'scale(1.4)' }], { duration: 640, easing: 'cubic-bezier(0, 0, 0.2, 1)' });
        img.animate([{ filter: 'brightness(1)', transform: 'scale(1)' }, { filter: 'brightness(0) invert(1)', transform: 'scale(1.12)' }], { duration: 220, easing: 'cubic-bezier(0, 0, 0.2, 1)', fill: 'forwards' })
            .finished.then(() => {
                img.src = src;
                img.getAnimations().forEach((a) => a.cancel());
                img.animate([{ filter: 'brightness(0) invert(1)', transform: 'scale(1.12)' }, { filter: 'brightness(1)', transform: 'scale(1)' }], { duration: 420, easing: cssVar('--ease-pop', 'ease-out') });
            }, () => { img.src = src; });
    };

    /* ---------- the account ---------- */
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
    // The name is kept at once and saved quietly: a save that cannot happen yet
    // (the profile still loading, offline) is carried by the preferences sync —
    // setDisplayName's error toast would land in the middle of the celebration.
    const saveName = () => {
        const clean = name.trim().slice(0, 24);
        if (!clean || clean === savedName) return;
        useAuthStore.setState({ displayName: clean });
        auth().savePreferences({ displayName: clean }).then((status) => {
            if (status === 'saved') auth().syncPublicProfile?.();
        }, () => { /* the next preferences sync carries it */ });
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
    // Google (2026-11-12): the popup is the whole sign-up. A name the trainer
    // typed here wins over Google's; Google's fills the "Valeu, …!" otherwise.
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
    const continueAsGuest = () => {
        saveName();
        setOutcome('guest');
        goTo('done');
    };

    /* ---------- the screens ---------- */
    const persona = answers.persona;
    const tone = (key) => typeColors[key] || 'var(--color-primary)';
    const glow = step === 'interests' && interests.length ? tone(INTEREST_ART[interests[interests.length - 1]].tone)
        : step === 'level' ? tone('dragon')
            : step === 'xp' ? tone('electric')
                : (step === 'persona' || step === 'account' || step === 'done') && persona && entry !== 'signIn' ? tone(persona.tone)
                    : 'var(--color-primary)';
    const progress = journeyProgress(steps, step);
    const chrome = journeyHasChrome(step);
    const picks = persona ? personaPicks(answers.profile, 2) : [];
    const accountTitle = mode === 'reset' ? ['accountResetTitle', 'accountResetAccent'] : mode === 'signIn' ? ['accountSignInTitle', 'accountSignInAccent'] : ['accountSignUpTitle', 'accountSignUpAccent'];
    const doneTitle = outcome === 'signedIn' || entry === 'signIn' ? ['doneSignInTitle', 'doneSignInAccent']
        : name.trim() ? ['doneTitle', 'doneAccent'] : ['doneGuestTitle', 'doneGuestAccent'];
    const doneSub = outcome === 'signedIn' || entry === 'signIn' ? 'doneSubSignIn' : outcome === 'guest' ? 'doneSubGuest' : 'doneSub';
    const heading = (keys) => (
        <h2 id={titleId} className="fj__title" tabIndex={-1}>
            <Words text={t(`journey.${keys[0]}`)} /> <Words accent text={t(`journey.${keys[1]}`, { name: name.trim().split(/\s+/)[0] })} />
        </h2>
    );
    const cta = (label, onClick, { disabled = false, type = 'button' } = {}) => (
        <button type={type} className="btn btn-primary btn-lg btn-block fj__cta" data-s onClick={onClick} disabled={disabled}>{label}</button>
    );

    // Each screen is a STAGE (the scene: the mascot's slot, the art, the
    // media) and a TALK (the words and the controls). On a phone the two
    // merge back into one column (`display: contents`, the order above the
    // fold unchanged); from 64rem they are two panels — the stage large on
    // the left, the conversation on the right (2026-11-12, Enzo: "no pc uma
    // visão mais expandida"). A screen whose phone slot sits in the talk
    // (the tour's caption, the level's action row) adds a desktop slot to
    // its stage; the mascot flies to whichever is visible.
    const slot = (size) => <span className="fj__slot" style={{ '--slot': size }} data-slot aria-hidden="true" />;
    const phoneSlot = <span className="fj__slot fj__slot--side fj__slot--phone" data-slot aria-hidden="true" />;
    const deskSlot = <span className="fj__slot fj__slot--desk" data-slot aria-hidden="true" />;
    const google = googleOn && mode !== 'reset' && !resetSentTo && !busy && (
        <div className="fj-google" data-s>
            <GoogleButton onClick={googleGo} busy={googleBusy} label={t('modals.authGoogle')} busyLabel={t('modals.authGoogleWorking')} />
            <p className="auth-or" aria-hidden="true">{t('modals.authOr')}</p>
        </div>
    );

    let stage = null;
    let talk = null;
    if (step === 'peek') {
        talk = (
            <button type="button" className="fj-peek" onClick={() => goTo('hello')}>
                <span className="fj-peek__hint" data-s>{t('journey.peekHint')}</span>
            </button>
        );
    } else if (step === 'hello') {
        stage = (
            <>
                {/* desktop: the site's own screens fanned behind him — what is here, at a glance */}
                <span className="fj-fan" aria-hidden="true">
                    {JOURNEY_TOUR.slice(0, 3).map((item, i) => (
                        <img key={item.id} className={`fj-fan__shot fj-fan__shot--${i}`} src={tourImage(item.image)} alt="" decoding="async" />
                    ))}
                </span>
                {slot('34%')}
            </>
        );
        talk = (
            <>
                <span className="fj__eyebrow" data-s>{t('journey.helloEyebrow')}</span>
                {heading(['helloTitle', 'helloAccent'])}
                <p className="fj__sub" data-s>{t('journey.helloSub')}</p>
                <ul className="fj-here fj__desk-only" data-s>
                    {JOURNEY_TOUR.map((item) => <li key={item.id}>{t(`journey.tour.${item.id}.title`)}</li>)}
                </ul>
                <span className="fj__grow" />
                {cta(t('journey.start'), next)}
                <button type="button" className="fj__link" data-s onClick={() => { setEntry('signIn'); setMode('signIn'); goTo('account'); }}>
                    {t('journey.haveAccount')} <b>{t('journey.signIn')}</b>
                </button>
            </>
        );
    } else if (step === 'tour') {
        stage = (
            <JourneyTour
                t={t}
                reduced={reduced}
                onLook={(item) => { setLook({ mood: item.mood, pose: item.pose }); react('nod'); }}
                onDone={next}
                onIndex={setTourIndex}
            >
                {deskSlot}
            </JourneyTour>
        );
        talk = (
            <>
                <h2 id={titleId} className="sr-only" tabIndex={-1}>{t('journey.tour.label')}</h2>
                <div className="fj-tour__cap" data-s>
                    {phoneSlot}
                    <div className="fj-tour__text" key={JOURNEY_TOUR[tourIndex].id} aria-live="polite">
                        <h3 className="fj-tour__title">{t(`journey.tour.${JOURNEY_TOUR[tourIndex].id}.title`)}</h3>
                        <p className="fj-tour__desc">{t(`journey.tour.${JOURNEY_TOUR[tourIndex].id}.desc`)}</p>
                    </div>
                </div>
                {cta(t('journey.continue'), next)}
            </>
        );
    } else if (step === 'interests') {
        stage = slot('20%');
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
                {cta(t('journey.continue'), next, { disabled: !canContinue('interests', { interests }) })}
            </>
        );
    } else if (step === 'level') {
        stage = (
            <>
                <div className="fj-evo" data-s aria-hidden="true">
                    <span className="fj-evo__flash" ref={flashRef} />
                    <Art id={LEVEL_ART[level || 'new']} imgRef={evoRef} className="fj-evo__art" />
                </div>
                {deskSlot}
            </>
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
                <span className="fj__label" data-s>{t('onboarding.format.label')}</span>
                <div className="segmented segmented--block" role="group" aria-label={t('onboarding.format.label')} data-s>
                    {BATTLE_FORMATS.map((value) => (
                        <button key={value} type="button" className="segmented__item" aria-pressed={format === value} onClick={() => { setFormat(value); react('nod'); }}>
                            {t(`onboarding.format.${value}`)}
                        </button>
                    ))}
                </div>
                <span className="fj__grow" />
                <div className="fj__row" data-s>
                    {phoneSlot}
                    <button type="button" className="btn btn-primary btn-lg btn-block fj__cta" onClick={next}>{t('journey.continue')}</button>
                </div>
            </>
        );
    } else if (step === 'xp') {
        stage = (
            <span className="fj__slot fj__slot--xp" style={{ '--slot': '28%' }} data-slot aria-hidden="true">
                <span className="fj-bolt"><Zap /></span>
            </span>
        );
        talk = (
            <>
                {heading(['xpTitle', 'xpAccent'])}
                <p className="fj__sub" data-s>{t('journey.xpSub', { mission: xp.mission, journey: xp.journey, badge: xp.badge })}</p>
                <div className="fj-xp" data-s>
                    <div className="fj-xp__row">
                        <span>{t('journey.xpLevel', { n: 1 })}</span>
                        <span><b>{xp.mission}</b> / {xp.toNext} XP</span>
                    </div>
                    <div className="fj-xp__track"><span className="fj-xp__fill" ref={xpFillRef} /></div>
                    <span className="fj-xp__note">{t('journey.xpMission')} · +{xp.mission} XP</span>
                </div>
                <ul className="fj-perks" data-s>
                    <li>{t('journey.xpPerks.streak')}</li>
                    <li>{t('journey.xpPerks.badges')}</li>
                    <li>{t('journey.xpPerks.journeys', { n: JOURNEYS.length })}</li>
                </ul>
                <span className="fj__grow" />
                {cta(t('journey.continue'), next)}
            </>
        );
    } else if (step === 'persona' && persona) {
        stage = (
            <>
                {slot('17%')}
                <span className="fj__eyebrow" data-s>{t('onboarding.result.eyebrow')}</span>
                <div className="fj-persona" ref={cardRef} style={{ '--tone': tone(persona.tone) }}>
                    <div className="fj-persona__text">
                        <span className="fj-persona__tags">{persona.interests.map((i) => t(`onboarding.interestShort.${i}`)).join(' · ')}</span>
                        <h2 id={titleId} className="fj-persona__name" tabIndex={-1}>{t(`onboarding.personas.${persona.id}.name`)}</h2>
                        <p className="fj-persona__tag">{t(`onboarding.personas.${persona.id}.tagline`)}</p>
                    </div>
                    <Art id={persona.art} className="fj-persona__art" />
                    <span className="fj-persona__shine" aria-hidden="true" />
                </div>
            </>
        );
        talk = (
            <>
                <p className="fj__sub" data-s>{t('onboarding.result.change')}</p>
                <span className="fj__grow" />
                {cta(t('journey.continue'), next)}
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
                {slot('12%')}
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
                {!busy && entry !== 'signIn' && wasGuest && (
                    <button type="button" className="btn btn-ghost btn-block" data-s onClick={continueAsGuest}>{t('journey.guest')}</button>
                )}
            </>
        );
    } else if (step === 'done') {
        const rows = persona && entry !== 'signIn' ? [
            { key: 'persona', label: t(`onboarding.personas.${persona.id}.name`), art: persona.art, tone: persona.tone },
            ...persona.interests.slice(0, 2).map((i) => ({ key: i, label: t(`onboarding.interests.${i}.title`), art: INTEREST_ART[i].art, tone: INTEREST_ART[i].tone })),
        ] : [];
        stage = slot('26%');
        talk = (
            <>
                {heading(doneTitle)}
                <p className="fj__sub" data-s>{t(`journey.${doneSub}`)}</p>
                {rows.length > 0 && (
                    <ul className="fj-sum">
                        {rows.map((row) => (
                            <li key={row.key} className="fj-sum__row" data-s style={{ '--tone': tone(row.tone) }}>
                                <span className="fj-sum__art"><Art id={row.art} /></span>
                                <span className="fj-sum__label">{row.label}</span>
                                <span className="fj-check is-on" aria-hidden="true"><Check /></span>
                            </li>
                        ))}
                    </ul>
                )}
                {picks.length > 0 && (
                    <nav className="fj-picks" aria-label={t('journey.donePicks')} data-s>
                        {picks.map((key) => (
                            <button key={key} type="button" className="fj-pick" onClick={() => close(() => navigate(PICK_DESTINATIONS[key].path))}>
                                <span className="fj-pick__title">{t(PICK_DESTINATIONS[key].labelKey)}</span>
                                <span className="fj-pick__desc">{t(`onboarding.picks.${key}`)}</span>
                            </button>
                        ))}
                    </nav>
                )}
                <span className="fj__grow" />
                {cta(t('journey.doneCta'), () => close())}
            </>
        );
    }

    const peek = step === 'peek';
    return (
        <div
            ref={layerRef}
            className={`fj${peek ? ' is-peek' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={peek ? undefined : titleId}
            aria-label={peek ? t('onboarding.dialogLabel') : undefined}
            style={{ '--fj-glow': glow, '--fj-electric': typeColors.electric }}
        >
            <div className="fj__col">
                <div className={`fj__bar${chrome ? '' : ' is-quiet'}`}>
                    {chrome && history.current.length > 0 ? (
                        <button type="button" className="btn btn-ghost btn-icon fj__back" onClick={back} aria-label={t('onboarding.back')} title={t('onboarding.back')}>
                            <ArrowLeft aria-hidden="true" />
                        </button>
                    ) : <span className="fj__back" aria-hidden="true" />}
                    <span className="fj__progress" aria-hidden="true"><span className="fj__progress-fill" style={{ transform: `scaleX(${progress})` }} /></span>
                    {step !== 'done' && (
                        <button type="button" className="fj__skip" onClick={dismiss}>{t('onboarding.skip')}</button>
                    )}
                </div>
                <div className={`fj__screen fj__screen--${step}`} key={step} ref={screenRef}>
                    {stage && <div className="fj__stage">{stage}</div>}
                    <div className="fj__talk">{talk}</div>
                </div>
            </div>
            <div className="fj__orbit" ref={orbitRef} aria-hidden="true" />
            <div className="fj__bot" ref={botRef} aria-hidden="true">
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
    );
}

export default FirstJourney;
