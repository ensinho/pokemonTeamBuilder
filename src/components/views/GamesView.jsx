import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { Check, ChevronRight, CircleHelp, Crown, Layers, MessageCircle, Puzzle, ReceiptText, Rows3, ShieldHalf } from 'lucide-react';

import { useAuthStore } from '../../store/useAuthStore';
import { useTranslation } from '../../hooks/useTranslation';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { useGameNotes, useGamesToday } from '../../hooks/useGamesToday';
import { useChallengeSummary } from '../../hooks/useChallengeSummary';
import { useDailyPuzzle } from '../../hooks/useDailyPuzzle';
import { loadPokemonIndex } from '../../services/pokemonDataCache';
import { typeColors } from '../../constants/types';
import { getPokemonFrontSpriteUrl } from '../../utils/pokemonSprites';
import { DAILY_GAMES, GAME_NAV_KEYS, dayTally, gameResetAt, localDayNumber, nextGameFor, nextGameResetAt } from '../../utils/gamesToday';
import { countdownLabel, puzzleNumberOn } from '../../utils/playToday';
import { localDayKey } from '../../utils/dailyCheckin';
import { dailyQuizFor } from '../../utils/dailyQuiz';
import { TIER_LIST_STORAGE_KEY, boardHighlights, normalizeStore } from '../../utils/tierList';
import { TEMPLATES_BY_ID, dailyTierTemplate } from '../../utils/tierTemplates';
import { challengeDayPlan } from '../../utils/challengeBoards';
import { CHAMPION_IDS } from '../../utils/challengeChampions';
import { CHAMPION_FACES } from '../../utils/championFaces';
import { diaryTopicId, todayDiaryKey } from '../../utils/forumDiary';
import { navHue } from '../../utils/navHue';
import { useRoundStore } from '../../store/useRoundStore';
import { MIME_SYNC_EVENT, dailyMimeFor, readMimeDayState } from '../../utils/dailyMime';
import { Mascot } from '../Mascot';
import { MascotEggCard } from '../games/MascotEggCard';
import { DailyMimeCard } from '../forum/DailyMimeCard';
import '../../styles/games-hub.css';

// "Hoje no Centro": the Home's own card (it polls the day's public counters).
const CenterToday = lazy(() => import('../home/CenterToday').then((m) => ({ default: m.CenterToday })));
// The friends' meadow (2026-11-17): their ghosts, awake once they played today.
const Meadow = lazy(() => import('../social/Meadow').then((m) => ({ default: m.Meadow })));

/*
 * Jogos (`/games`, 2026-11-15 — Enzo: "facilitar achar eles… que joguem os
 * outros e joguem mais nos outros dias… todos fáceis e chamativos"): the
 * day's four games in one place — the Champion, the PokéPuzzle, the quiz of
 * the day, the tier list of the day — each saying where it stands today.
 *
 * - The day is a belt of four Poké Balls: one per game, caught once it was
 *   played (the week strip's device — caught in the run, dashed while
 *   absent), all gold when the four are. The headline counts what is left.
 * - Each card's art is the franchise's "not known yet": a silhouette until
 *   the trainer plays, then what they got — the puzzle's Pokémon, the
 *   category they named, their own top of the list, the Champion's ace.
 * - One primary on the page: the next game still open, in the day's order
 *   (`nextGameFor`). The others are a tap away, never competing with it.
 * - What needs no clock sits under them as three equal doors.
 *
 * Everything here is read where it already lives (the device's record of the
 * day, the Champion's and the puzzle's summaries, the tier list's own
 * storage): the page stores nothing and adds no read of its own.
 */

const ICONS = { challenge: Crown, pokepuzzle: Puzzle, quiz: CircleHelp, tierList: Rows3 };
const PATHS = {
    challenge: '/challenge',
    pokepuzzle: '/pokepuzzle',
    quiz: '/quiz?tab=categories&daily=1',
    tierList: '/tier-list?daily=1',
};

const useNow = () => {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 60000);
        return () => clearInterval(id);
    }, []);
    return now;
};

const displayName = (name = '') => name.split('-').filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');

/** A pixel sprite standing on the card's platform; `unknown` draws it as a silhouette. */
function StageSprite({ id, unknown = false }) {
    if (!id) return null;
    return (
        <img
            src={getPokemonFrontSpriteUrl(id)}
            alt=""
            width={96}
            height={96}
            decoding="async"
            draggable="false"
            className={`daygame__sprite ${unknown ? 'is-unknown' : ''}`}
        />
    );
}

/** The trainer's own tier lists, read once and again when the tab comes back. */
function useTierBoards() {
    const read = () => {
        try {
            return normalizeStore(JSON.parse(localStorage.getItem(TIER_LIST_STORAGE_KEY) || 'null')).boards;
        } catch {
            return {};
        }
    };
    const [boards, setBoards] = useState(read);
    useEffect(() => {
        const refresh = () => { if (document.visibilityState === 'visible') setBoards(read()); };
        document.addEventListener('visibilitychange', refresh);
        return () => document.removeEventListener('visibilitychange', refresh);
    }, []);
    return boards;
}

export function GamesView() {
    const { t, language } = useTranslation();
    useDocumentMeta({ title: t('seo.games.title'), description: t('seo.games.description'), path: '/games' });
    const navigate = useNavigate();
    const now = useNow();
    const { userId, isAnonymous } = useAuthStore(useShallow((s) => ({ userId: s.userId, isAnonymous: s.isAnonymous })));

    const done = useGamesToday();
    const notes = useGameNotes();
    const tally = dayTally(done);
    const next = nextGameFor({ preferred: 'challenge', done });
    const clock = countdownLabel(now, nextGameResetAt(now));

    const challenge = useChallengeSummary(userId, isAnonymous);
    const puzzle = useDailyPuzzle(userId);

    const dayNumber = localDayNumber(now);
    const dayKey = localDayKey(new Date(now));
    const [searchParams, setSearchParams] = useSearchParams();
    const activeView = searchParams.get('view') === 'mime' ? 'mime' : 'all';
    const setView = (nextView) => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            if (nextView === 'mime') next.set('view', 'mime');
            else next.delete('view');
            return next;
        }, { replace: true });
    };

    const { number: mimeNumber, entry: mimeEntry } = useMemo(() => dailyMimeFor(dayNumber), [dayNumber]);
    const [mimeState, setMimeState] = useState(() => readMimeDayState(dayKey));
    useEffect(() => {
        const refresh = () => setMimeState(readMimeDayState(dayKey));
        window.addEventListener(MIME_SYNC_EVENT, refresh);
        window.addEventListener('storage', refresh);
        return () => {
            window.removeEventListener(MIME_SYNC_EVENT, refresh);
            window.removeEventListener('storage', refresh);
        };
    }, [dayKey]);

    const quiz = useMemo(() => dailyQuizFor(dayNumber), [dayNumber]);
    const theme = useMemo(() => dailyTierTemplate(dayNumber), [dayNumber]);
    const tierBoards = useTierBoards();

    // The index names the quiz's Pokémon (the category table holds names, the sprites want ids).
    const [idByName, setIdByName] = useState(null);
    useEffect(() => {
        let alive = true;
        loadPokemonIndex()
            .then((list) => { if (alive) setIdByName(new Map(list.map((mon) => [mon.name, mon.id]))); })
            .catch(() => {});
        return () => { alive = false; };
    }, []);

    // ── The Champion ────────────────────────────────────────────────────────
    const plan = useMemo(() => {
        if (!challenge?.champions) return null;
        const byId = Object.fromEntries(challenge.champions.map((c) => [c.id, c]));
        return challengeDayPlan(CHAMPION_IDS.map((id) => ({ id, boards: byId[id]?.boards || {} })));
    }, [challenge]);
    const beaten = Boolean(plan?.champions.some((c) => c.won > 0));
    const ace = challenge?.champions?.[0]?.lineup?.[5] || 445;

    // ── The PokéPuzzle ──────────────────────────────────────────────────────
    const puzzleSolved = Boolean(puzzle.summary?.solved);
    const puzzleOver = done.pokepuzzle || puzzleSolved || (puzzle.summary?.attempts || 0) >= 8;

    // ── The quiz of the day ─────────────────────────────────────────────────
    const quizTitle = quiz ? quiz.list.title[language === 'pt' ? 'pt' : 'en'] : '';
    const quizIds = quiz && idByName ? quiz.names.map((name) => idByName.get(name)).filter(Boolean).slice(0, 3) : [];

    // ── The tier list of the day ────────────────────────────────────────────
    // Played: the list the trainer made today (its theme is on the note), its
    // best three. Open: three of the day's theme, not ranked yet.
    const madeTheme = TEMPLATES_BY_ID[notes.tierList?.theme] || theme;
    const themeName = t(`tierList.templates.${theme.id}.name`);
    const mine = boardHighlights(tierBoards[madeTheme.id]);
    const tierIds = done.tierList && mine.length ? mine : (theme.ids?.length ? theme.ids.slice(0, 3) : [theme.art]);

    const cards = {
        challenge: {
            tone: typeColors.dragon,
            kicker: t('gamesHub.challenge.kicker', { time: countdownLabel(now, gameResetAt('challenge', now)) }),
            title: t('nav.challenge'),
            line: done.challenge
                ? (plan ? t('gamesHub.challenge.done', { done: plan.done, total: plan.total }) : t('nav.playedToday'))
                : t('gamesHub.challenge.line'),
            cta: t(done.challenge ? 'gamesHub.challenge.again' : 'gamesHub.challenge.cta'),
            art: (
                <>
                    <StageSprite id={ace} unknown={!beaten} />
                    <img src={CHAMPION_FACES.cynthia} alt="" width={80} height={80} decoding="async" draggable="false" className="daygame__sprite daygame__trainer" />
                </>
            ),
        },
        pokepuzzle: {
            tone: typeColors.ghost,
            kicker: t('gamesHub.puzzle.kicker', { n: puzzleNumberOn(localDayKey(new Date(now))) }),
            title: t('nav.pokepuzzle'),
            line: !puzzleOver
                ? t('gamesHub.puzzle.line')
                : puzzleSolved
                    ? t('gamesHub.puzzle.solved', { n: puzzle.summary.attempts })
                    : (puzzle.target ? t('gamesHub.puzzle.missed', { name: displayName(puzzle.target.name) }) : t('nav.playedToday')),
            cta: t(puzzleOver ? 'gamesHub.see' : 'gamesHub.play'),
            // Never the answer before the day is played: a drawn silhouette until then.
            art: <StageSprite id={puzzleOver && puzzle.target ? puzzle.target.id : puzzle.silhouetteId} unknown={!puzzleOver} />,
        },
        quiz: {
            tone: typeColors.fairy,
            kicker: t('gamesHub.quiz.kicker', { n: quiz?.names.length || 0 }),
            title: t('nav.quizDaily'),
            line: done.quiz && notes.quiz
                ? t('gamesHub.quiz.done', { found: notes.quiz.found, total: notes.quiz.total, category: quizTitle })
                : t('gamesHub.quiz.line', { category: quizTitle }),
            cta: t(done.quiz ? 'gamesHub.see' : 'gamesHub.play'),
            art: quizIds.map((id) => <StageSprite key={id} id={id} unknown={!done.quiz} />),
        },
        tierList: {
            tone: typeColors.ice,
            kicker: t('gamesHub.tier.kicker'),
            title: t('nav.tierDaily'),
            line: done.tierList
                ? t('gamesHub.tier.done', { theme: t(`tierList.templates.${madeTheme.id}.name`) })
                : t('gamesHub.tier.line', { theme: themeName }),
            cta: t(done.tierList ? 'gamesHub.tier.again' : 'gamesHub.tier.cta'),
            art: tierIds.map((id) => <StageSprite key={id} id={id} unknown={!done.tierList} />),
        },
    };

    // The day's receipt (2026-11-17): what the opener already holds goes with it.
    const openReceipt = useRoundStore((s) => s.openReceipt);
    const openDayReceipt = () => openReceipt('day', {
        // the outcome only when the Champion's summary says it; otherwise the row reads "jogado"
        challenge: done.challenge && plan ? { won: beaten } : null,
        puzzle: done.pokepuzzle && puzzle.summary ? { solved: Boolean(puzzle.summary.solved), attempts: puzzle.summary.attempts || 0 } : null,
    });

    const locale = language === 'pt' ? 'pt-BR' : 'en-GB';
    const dateLine = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(now));
    const left = tally.total - tally.played;
    const headline = tally.complete
        ? t('gamesHub.day.complete')
        : tally.played === 0
            ? t('gamesHub.day.fresh')
            : left === 1 ? t('gamesHub.day.leftOne') : t('gamesHub.day.left', { n: left });

    const anytime = [
        { key: 'generationQuiz', to: '/quiz', Icon: Layers, label: t('gamesHub.anytime.quiz'), hint: t('gamesHub.anytime.quizHint') },
        { key: 'tierList', to: '/tier-list', Icon: Rows3, label: t('gamesHub.anytime.tier'), hint: t('gamesHub.anytime.tierHint') },
        { key: 'battles', to: '/battles', Icon: ShieldHalf, label: t('gamesHub.anytime.battles'), hint: t('gamesHub.anytime.battlesHint') },
    ];

    return (
        <main className="games-page">
            <div className="games-page__main">
                <header className={`games-day ${tally.complete ? 'is-complete' : ''}`}>
                    <div className="games-day__text">
                        <p className="games-day__date">{dateLine}</p>
                        <h2 className="games-day__title">{headline}</h2>
                        <p className="games-day__clock">
                            {tally.complete
                                ? <Link to={`/feed?topic=${diaryTopicId(todayDiaryKey())}`} className="games-day__diary"><MessageCircle aria-hidden="true" />{t('gamesHub.day.diary')}</Link>
                                : t('gamesHub.day.sub')}
                            <span className="games-day__reset">{t('gamesHub.day.resets', { time: clock })}</span>
                        </p>
                        <button
                            type="button"
                            className={`btn btn-sm games-day__receipt ${tally.complete ? 'btn-primary' : tally.played > 0 ? 'btn-secondary' : 'btn-ghost'}`}
                            onClick={openDayReceipt}
                        >
                            <ReceiptText aria-hidden="true" />
                            <span>
                                {tally.complete
                                    ? t('gamesHub.day.receiptFull')
                                    : tally.played > 0
                                        ? t('gamesHub.day.receipt')
                                        : t('island.receipt.label')}
                            </span>
                            {!tally.complete && (
                                <span className="games-day__receipt-count">
                                    ({tally.played}/{tally.total})
                                </span>
                            )}
                        </button>
                    </div>
                    <ol className="games-day__belt" aria-label={t('nav.gamesDone', { n: tally.played, total: tally.total })}>
                        {DAILY_GAMES.map((game) => (
                            <li key={game} className={`belt-ball ${done[game] ? 'is-caught' : ''}`} style={{ '--tone': navHue(GAME_NAV_KEYS[game]) }}>
                                <span className="belt-ball__ball" aria-hidden="true" />
                                <span className="belt-ball__name">{t(`gamesHub.short.${game}`)}</span>
                                <span className="sr-only">{t(done[game] ? 'nav.playedToday' : 'nav.openToday')}</span>
                            </li>
                        ))}
                        <li
                            className={`belt-ball belt-ball--mime ${mimeState.solved ? 'is-caught' : ''} ${activeView === 'mime' ? 'is-active' : ''}`}
                            style={{ '--tone': typeColors[mimeEntry.type] || 'var(--mascot-brand)' }}
                        >
                            <button
                                type="button"
                                className="belt-ball__mime-btn"
                                onClick={() => setView(activeView === 'mime' ? 'all' : 'mime')}
                                aria-pressed={activeView === 'mime'}
                                title={t('mime.eyebrow', { n: mimeNumber })}
                            >
                                <span className="belt-ball__mime-ring" aria-hidden="true">
                                    <Mascot
                                        size="sm"
                                        tone={mimeEntry.type}
                                        mood={mimeState.solved ? 'radiante' : 'confiante'}
                                        seasonal={false}
                                    />
                                </span>
                                <span className="belt-ball__name">{t('mime.beltShort')}</span>
                            </button>
                        </li>
                    </ol>
                </header>

                <DailyMimeCard compact={activeView !== 'mime'} />

                <ul className="games-grid">
                    {DAILY_GAMES.map((game) => {
                        const card = cards[game];
                        const Icon = ICONS[game];
                        const isDone = done[game];
                        const isNext = next?.game === game;
                        const open = () => navigate(PATHS[game]);
                        return (
                            <li key={game}>
                                {/* The whole card answers a click; its button is the keyboard's way in. */}
                                <article
                                    className={`daygame ${isDone ? 'is-done' : 'is-open'} ${isNext ? 'is-next' : ''}`}
                                    style={{ '--tone': card.tone }}
                                    onClick={(event) => { if (!(event.target instanceof Element && event.target.closest('button, a'))) open(); }}
                                >
                                    <div className="daygame__stage" aria-hidden="true">
                                        <span className="daygame__art">{card.art}</span>
                                        {isDone && <span className="daygame__mark"><Check /></span>}
                                    </div>
                                    <div className="daygame__body">
                                        <p className="daygame__kicker">
                                            {isDone
                                                ? <span className="daygame__state is-done">{t('nav.playedToday')}</span>
                                                : <span className="daygame__state"><span className="live-dot" aria-hidden="true" />{t('nav.openToday')}</span>}
                                            <span className="daygame__meta">{card.kicker}</span>
                                        </p>
                                        <h3 className="daygame__title"><Icon aria-hidden="true" />{card.title}</h3>
                                        <p className="daygame__line">{card.line}</p>
                                        <button
                                            type="button"
                                            className={`btn btn-sm daygame__cta ${isNext ? 'btn-primary' : isDone ? 'btn-ghost' : 'btn-secondary'}`}
                                            onClick={open}
                                        >
                                            {card.cta}
                                            <ChevronRight aria-hidden="true" />
                                        </button>
                                    </div>
                                </article>
                            </li>
                        );
                    })}
                </ul>

                <section className="games-anytime" aria-labelledby="games-anytime-title">
                    <h2 id="games-anytime-title" className="games-anytime__title">{t('gamesHub.anytime.title')}</h2>
                    <ul className="games-anytime__list">
                        {anytime.map((door) => {
                            const DoorIcon = door.Icon;
                            return (
                                <li key={door.key}>
                                    <Link to={door.to} className="games-door" style={{ '--nav-hue': navHue(door.key) }}>
                                        <span className="games-door__icon" aria-hidden="true"><DoorIcon /></span>
                                        <span className="games-door__text">
                                            <span className="games-door__label">{door.label}</span>
                                            <span className="games-door__hint">{door.hint}</span>
                                        </span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </section>
            </div>

            <aside className="games-page__rail">
                <MascotEggCard variant="rail" />
                <Suspense fallback={null}>
                    <Meadow />
                </Suspense>
                <Suspense fallback={null}>
                    <CenterToday variant="rail" friends={false} />
                </Suspense>
            </aside>
        </main>
    );
}

export default GamesView;
