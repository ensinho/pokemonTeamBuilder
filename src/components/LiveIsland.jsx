import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import '../styles/live-island.css';

import { useTranslation } from '../hooks/useTranslation';
import { useAuthStore } from '../store/useAuthStore';
import { useBattlesStore } from '../store/useBattlesStore';
import { useQuizRunsStore } from '../store/useQuizRunsStore';
import { useJourneyCoachStore } from '../store/useJourneyCoachStore';
import { useRoundStore, selectReceiptReady } from '../store/useRoundStore';
import { describeBattle } from '../utils/battle';
import { ISLAND_MOODS, pickLive } from '../utils/liveIsland';
import { dailyQuizFor } from '../utils/dailyQuiz';
import { gameDayKey, localDayNumber } from '../utils/gamesToday';
import { puzzleNumberOn } from '../utils/playToday';
import { localDayKey } from '../utils/dailyCheckin';
import { track } from '../services/analytics';
import { navHue } from '../utils/navHue';
import { MascotFace } from './Mascot';
import { RollingNumber } from './RollingNumber';

/**
 * The island (2026-11-17, "Fantasminha de plantão" — the ai-app-widgets'
 * Live Activity in our material): a black pill at the top of the screen that
 * exists only while something is live — a friend's battle waiting on the
 * trainer, the quiz or the PokéPuzzle of the day left half-way, the round's
 * receipt. His face is the state; the figure rolls; a tap opens the card,
 * a second tap goes there. `utils/liveIsland.js` decides what, if anything.
 *
 * Reads what the app already holds (the battles listener, the quiz runs,
 * the PokéPuzzle's own summary on the device): no read of its own.
 */

const PUZZLE_MAX = 8;
const TONES = {
    battle: 'var(--brand-live)',
    quiz: navHue('generationQuiz'),
    puzzle: navHue('pokepuzzle'),
    receipt: 'var(--color-primary)',
};
const DISMISS_KEY = 'ptb:island:dismissed';

const readPuzzle = (userId) => {
    try {
        const saved = JSON.parse(localStorage.getItem(`ptb:pokepuzzle:${userId || 'anon'}:daily:summary`) || 'null');
        const now = new Date();
        const today = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
        if (!saved || saved.date !== today || saved.solved) return null;
        return { attempts: Number(saved.attempts) || 0, max: PUZZLE_MAX, n: puzzleNumberOn(localDayKey(now)) };
    } catch {
        return null;
    }
};
const readDismissed = () => {
    try { return JSON.parse(sessionStorage.getItem(DISMISS_KEY) || '{}') || {}; } catch { return {}; }
};

export function LiveIsland() {
    const { t, language } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const userId = useAuthStore((s) => s.userId);
    const battles = useBattlesStore((s) => s.battles);
    const quizRuns = useQuizRunsStore((s) => s.quizRuns);
    const coach = useJourneyCoachStore((s) => Boolean(s.missionId));
    const receiptReady = useRoundStore(selectReceiptReady);
    const openReceipt = useRoundStore((s) => s.openReceipt);
    const [open, setOpen] = useState(false);
    const [dismissed, setDismissed] = useState(readDismissed);
    const [puzzle, setPuzzle] = useState(() => readPuzzle(userId));

    // The PokéPuzzle's summary is the device's: re-read on a route change and when the tab comes back.
    useEffect(() => { setPuzzle(readPuzzle(userId)); }, [userId, location.pathname]);
    useEffect(() => {
        const onVisible = () => { if (document.visibilityState === 'visible') setPuzzle(readPuzzle(userId)); };
        document.addEventListener('visibilitychange', onVisible);
        return () => document.removeEventListener('visibilitychange', onVisible);
    }, [userId]);
    useEffect(() => { setOpen(false); }, [location.pathname]);

    const battle = useMemo(() => {
        if (!userId) return null;
        const waiting = battles.map((b) => ({ b, view: describeBattle(b, userId) })).filter((x) => x.view?.waitingOn === 'me');
        if (!waiting.length) return null;
        return { id: waiting[0].b.id, name: waiting[0].view.opponentName, count: waiting.length };
    }, [battles, userId]);

    const quiz = useMemo(() => {
        const now = Date.now();
        const daily = dailyQuizFor(localDayNumber(now));
        if (!daily) return null;
        const run = quizRuns.find((r) => r.id === daily.listId && r.dailyDay === gameDayKey('quiz', now));
        if (!run || run.isComplete || run.ended) return null;
        return { found: run.foundNames?.length || 0, total: run.totalCount || daily.names.length, list: daily.list.title[language === 'pt' ? 'pt' : 'en'] };
    }, [quizRuns, language]);

    const live = pickLive({
        battle,
        quiz,
        puzzle,
        receipt: receiptReady ? { news: 1, day: localDayKey() } : null,
        path: location.pathname,
        coach,
        dismissed,
    });
    if (!live) return null;

    const go = () => {
        track('island_go', { kind: live.kind });
        setOpen(false);
        if (live.kind === 'battle') navigate(`/battles/${live.id}`);
        else if (live.kind === 'quiz') navigate('/quiz?tab=categories&daily=1');
        else if (live.kind === 'puzzle') navigate('/pokepuzzle');
        else openReceipt('morning');
    };
    const putAway = () => {
        const next = { ...dismissed, [live.kind]: live.sig };
        setDismissed(next);
        setOpen(false);
        try { sessionStorage.setItem(DISMISS_KEY, JSON.stringify(next)); } catch { /* this visit only */ }
    };

    const copy = {
        battle: {
            label: t('island.battle.label'),
            value: live.count > 1 ? <RollingNumber value={live.count} /> : null,
            title: live.name ? t('island.battle.title', { name: live.name }) : t('island.battle.titleAnon'),
            sub: live.count > 1 ? t('island.battle.more', { n: live.count - 1 }) : t('island.battle.sub'),
            cta: t('island.battle.cta'),
        },
        quiz: {
            label: t('island.quiz.label'),
            value: <><RollingNumber value={live.found} />/{live.total}</>,
            title: live.list,
            sub: t('island.quiz.sub', { n: (live.total || 0) - (live.found || 0) }),
            cta: t('island.continue'),
            progress: live.total ? live.found / live.total : 0,
        },
        puzzle: {
            label: t('island.puzzle.label'),
            value: <><RollingNumber value={live.attempts} />/{live.max}</>,
            title: t('island.puzzle.title', { n: live.n }),
            sub: t('island.puzzle.sub', { n: live.max - live.attempts }),
            cta: t('island.continue'),
            progress: live.max ? live.attempts / live.max : 0,
        },
        receipt: {
            label: t('island.receipt.label'),
            value: null,
            title: t('island.receipt.title'),
            sub: t('island.receipt.sub'),
            cta: t('island.receipt.cta'),
        },
    }[live.kind];

    return (
        <div
            className={`live-island is-${live.kind} ${open ? 'is-open' : ''}`}
            role="region"
            aria-label={t('island.region')}
            // the game's own tone (navHue); Live Pink only for a battle waiting on the trainer
            style={{ '--island-tone': TONES[live.kind] }}
        >
            <button
                type="button"
                className="live-island__pill"
                aria-expanded={open}
                onClick={() => { if (!open) track('island_open', { kind: live.kind }); setOpen((v) => !v); }}
            >
                <MascotFace mood={ISLAND_MOODS[live.kind]} size="sm" className="live-island__face" />
                {live.kind === 'battle' && <span className="live-dot live-island__dot" aria-hidden="true" />}
                <span className="live-island__label">{copy.label}</span>
                {copy.value && <span className="live-island__value">{copy.value}</span>}
            </button>
            {open && (
                <div className="live-island__card">
                    <p className="live-island__title">{copy.title}</p>
                    <p className="live-island__sub">{copy.sub}</p>
                    {Number.isFinite(copy.progress) && (
                        <span className="live-island__track" aria-hidden="true">
                            <span className="live-island__fill" style={{ '--progress': copy.progress }} />
                        </span>
                    )}
                    <div className="live-island__actions">
                        <button type="button" className="btn btn-sm live-island__go" onClick={go}>
                            {copy.cta}
                            <ChevronRight aria-hidden="true" />
                        </button>
                        <button type="button" className="btn btn-sm btn-ghost live-island__later" onClick={putAway}>{t('island.later')}</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default LiveIsland;
