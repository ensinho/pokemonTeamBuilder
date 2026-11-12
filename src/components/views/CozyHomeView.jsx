import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
// Selected with useShallow, not whole stores: a bare useForumStore() re-rendered
// the whole Home on every forum message and every unrelated store tick.
import { useShallow } from 'zustand/react/shallow';
import { ArrowLeftRight, ArrowUpRight, Award, BookOpen, Calculator, Check, ChevronRight, CircleHelp, Crown, Eye, Gauge, Hourglass, Medal, MoreHorizontal, Pencil, Play, Plus, Puzzle, RotateCcw, ScrollText, Search, Shapes, ShieldHalf, Sparkles, Swords, TrendingUp, Trophy, UserPlus } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { GuestAccountCard } from '../GuestAccountCard';
import { useForumStore } from '../../store/useForumStore';
import { useActiveTeamStore } from '../../store/useActiveTeamStore';
import { useTranslation } from '../../hooks/useTranslation';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useTrainerBadges } from '../../hooks/useTrainerBadges';
import { useMetaUsage } from '../../hooks/useMetaUsage';
import { useDailyPuzzle } from '../../hooks/useDailyPuzzle';
import { useChallengeSummary } from '../../hooks/useChallengeSummary';
import { useBattles } from '../../hooks/useBattles';
import { maxWidthBelow } from '../../constants/breakpoints';
import { typeColors } from '../../constants/types';
import { loadPokemonIndex } from '../../services/pokemonDataCache';
import { getPokemonArtworkSpriteUrl, getPokemonFrontSpriteUrl, getTeamPokemonDisplaySprite } from '../../utils/pokemonSprites';
import { timeUntil } from '../../utils/challengeView';
import { nextResetAt as challengeResetAt } from '../../utils/challengeDay';
import { liveStreak, localDayKey, normalizeCheckin, normalizeStreak } from '../../utils/dailyCheckin';
import { homeNote } from '../../utils/mascot/assistant';
import {
    TEAM_SIZE,
    TYPE_COUNT,
    dayPeriod,
    editedParts,
    findMetaAnswer,
    pickNextBadge,
    resolveMembers,
    summarizeTeam,
} from '../../utils/homeStatus';
import { CheckinWeek } from '../rewards/CheckinWeek';
import { HomeGreeting } from '../home/HomeGreeting';
import { MascotNote } from '../home/MascotNote';
import { DayHero } from '../home/DayHero';
import { HomeParty } from '../home/HomeParty';
import { promptSignIn } from '../../utils/navigation';
import { PcBox } from '../PcBox';
import { Sprite } from '../Sprite';
import { TypeChip } from '../TypeChip';
import { EmptyState } from '../EmptyState';
import { JourneyBar, JourneyTile, MissionRow } from '../journeys/JourneyList';
import { currentJourney, journeyEmphasis, nextMission } from '../../utils/journeys';
import { PERSONAS, PICK_DESTINATIONS, derivePersona, hasAnsweredProfile, personaDayCards, personaHero, personaHomeOrder, personaPicks, suggestedJourney } from '../../utils/trainerProfile';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import { MascotTip } from '../Mascot';
import { defaultHeroScene, getHeroScene } from '../../constants/heroScenes';
import { HeroScene, ScenePicker } from '../home/HeroScene';
import { ChallengeBoards } from '../home/ChallengeBoards';
import { challengeDayPlan, challengeLink, championAction } from '../../utils/challengeBoards';
import { CHAMPION_IDS, CHAMPION_NAMES, difficultyLabel } from '../../utils/challengeChampions';
import { ChampionLedger, ChampionSwitch } from '../home/ChampionDay';
import { CHAMPION_FACES } from '../../utils/championFaces';
import '../../styles/cozy-home.css';
// After cozy-home.css: the 2026-11-09 pieces override a few of its rules.
import '../../styles/home-today.css';
import { AnchoredPopover } from '../AnchoredPopover';
import { openTeamCompare } from '../../store/useTeamCompareStore';

// The Traveler's Badge Case: its own chunk, only that persona's Home loads it.
const BadgeCase = lazy(() => import('../home/BadgeCase').then((m) => ({ default: m.BadgeCase })));
// "Hoje no Centro" (2026-11-09): its own chunk — it polls public counters and the friends' timeline.
const CenterToday = lazy(() => import('../home/CenterToday').then((m) => ({ default: m.CenterToday })));
// The Traveler's hero (the next gym leader): its own chunk — only that persona reads the gyms.
const BadgeHero = lazy(() => import('../home/BadgeHero').then((m) => ({ default: m.BadgeHero })));
// The streak sheet opens from the greeting's flame: its own chunk, fetched on the tap.
const StreakSheet = lazy(() => import('../rewards/StreakSheet').then((m) => ({ default: m.StreakSheet })));

/**
 * The cozy Home (2026-10-06 proposal), rebuilt as an app's Today on
 * 2026-11-09 (.claude/skills/app-screens): a greeting instead of chips and
 * section tabs, the week strip, ONE hero of the day with its action in a
 * player bar, the party, the day's cards as a rail — a priority list, not a
 * stack of panels. Teams, the forum and the journeys are routes of their own,
 * one tap away (the dock, the rail, "Ver todos").
 */

// A saved team's "⋯" on Home: open its page, edit it, or compare it with
// another team. The card itself still edits on a tap, as it always has.
function TeamCardMenu({ team, onOpen, onEdit }) {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const anchorRef = useRef(null);
    const popoverRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return undefined;
        const onDown = (event) => {
            if (anchorRef.current?.contains(event.target) || popoverRef.current?.contains(event.target)) return;
            setIsOpen(false);
        };
        const onKey = (event) => {
            if (event.key === 'Escape') { setIsOpen(false); anchorRef.current?.focus(); }
        };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [isOpen]);

    const items = [
        { id: 'open', label: t('teamCompare.openTeam'), icon: <ArrowUpRight aria-hidden="true" />, onClick: onOpen },
        { id: 'edit', label: t('common.edit'), icon: <Pencil aria-hidden="true" />, onClick: onEdit },
        { id: 'compare', label: t('teamCompare.openWith'), icon: <ArrowLeftRight aria-hidden="true" />, onClick: () => openTeamCompare(team.id, 'home') },
    ];

    return (
        <>
            <button
                ref={anchorRef}
                type="button"
                onClick={() => setIsOpen((v) => !v)}
                className={`btn btn-ghost btn-icon btn-sm touch-target cozy-team__menu ${isOpen ? 'is-active' : ''}`}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                aria-label={t('teamCompare.teamMenu', { name: team.name })}
                title={t('teamCompare.teamMenu', { name: team.name })}
            >
                <MoreHorizontal aria-hidden="true" />
            </button>
            <AnchoredPopover
                isOpen={isOpen}
                anchorRef={anchorRef}
                popoverRef={popoverRef}
                role="menu"
                ariaLabel={t('teamCompare.teamMenu', { name: team.name })}
                offset={6}
                className="menu-surface tb-more-menu"
            >
                {items.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        role="menuitem"
                        className="menu-item"
                        onClick={() => { setIsOpen(false); item.onClick?.(); }}
                    >
                        {item.icon}
                        {item.label}
                    </button>
                ))}
            </AnchoredPopover>
        </>
    );
}

const PERIOD_PARTNER = { morning: 196, afternoon: 25, evening: 197, night: 197 };

const displayName = (name = '') =>
    name.split('-').filter(Boolean).map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');

const stripDot = (s) => s.replace(/\./g, '').replace(/\sde\s/g, ' ').trim();

const useNow = () => {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 60 * 1000);
        return () => clearInterval(id);
    }, []);
    return now;
};

/**
 * Every panel on this page opens the same way: the design system's section
 * head (title, an optional qualifier, the action at the far end), then the
 * content. `card` puts it on a card; without it the section sits on the page
 * (the Meta list brings its own .data-list surface).
 */
/** The last Champion result the Home showed, so its arrival plays once (`${dayKey}:${statuses}`). */
const CHALLENGE_SEEN_KEY = 'ptb:challenge:seenOutcome';

const Panel = ({ title, meta, action, card = true, children }) => (
    <section className={`section cozy-panel ${card ? 'card' : ''}`}>
        <header className="section-head">
            <h3 className="section-title">{title}</h3>
            {meta && <span className="section-meta">{meta}</span>}
            {action && <span className="section-action">{action}</span>}
        </header>
        {children}
    </section>
);

/** The icon each "Para você" destination wears (utils/trainerProfile.js PICK_DESTINATIONS). */
const PICK_ICONS = {
    builder: Swords, pokedex: Search, meta: TrendingUp, bestTeams: Award, tournaments: Trophy,
    damageCalc: Calculator, speedTiers: Gauge, guides: BookOpen, types: Shapes, gyms: Medal,
    moves: ScrollText, pokepuzzle: Puzzle, challenge: Crown, generationQuiz: CircleHelp, battles: ShieldHalf,
};

/**
 * The party row from the battle HUD, with the team itself in it: a member
 * stands on its slot, an empty slot is a dashed Poké Ball (dashed means absent,
 * here as everywhere in this app). Six slots always, so the row's length says
 * how complete the team is before a single sprite is read.
 */
const PartyRow = ({ members, label }) => (
    <span className="cozy-party" role="img" aria-label={label}>
        {Array.from({ length: TEAM_SIZE }, (_, i) => {
            const member = members[i];
            return member ? (
                <span key={i} className="cozy-party__slot is-filled" style={{ '--i': i }}>
                    <Sprite src={getTeamPokemonDisplaySprite(member)} className="cozy-party__sprite" />
                </span>
            ) : (
                <span key={i} className="cozy-party__slot">
                    <svg viewBox="0 0 16 16" className="cozy-party__ball" aria-hidden="true">
                        <circle cx="8" cy="8" r="6.5" className="cozy-party__rim" />
                        <path d="M1.5 8h13" className="cozy-party__band" />
                        <circle cx="8" cy="8" r="2" className="cozy-party__button" />
                    </svg>
                </span>
            );
        })}
    </span>
);

export function CozyHomeView({
    navigate,
    savedTeams = [],
    favoritePokemons,
    greetingPokemonId,
    greetingPokemonIsShiny,
    onOpenPokemonSelector,
    handleEditTeam,
    activeTeamId,
    heroBackgroundId,
    onChangeHeroBackground,
}) {
    const { t, language } = useTranslation();
    const isPhone = useMediaQuery(maxWidthBelow('lg'));
    // Every sprite on this page is the Pokédex's own: the pixel front sprite
    // through <Sprite> (placeholder, fade-in, artwork fallback for forms).
    const dexSprite = (id, shiny = false) => getPokemonFrontSpriteUrl(id, { shiny });
    const now = useNow();
    const [isStreakOpen, setIsStreakOpen] = useState(false);

    const { userId, streak, checkin, isAnonymous, trainerProfile, displayName: trainerName } = useAuthStore(useShallow((s) => ({
        userId: s.userId, streak: s.streak, checkin: s.checkin, isAnonymous: s.isAnonymous, trainerProfile: s.trainerProfile, displayName: s.displayName,
    })));
    const openOnboarding = useOnboardingStore((s) => s.open);
    const { badges, journeys, stats: trainerStats } = useTrainerBadges();
    const { ranked: metaRanked } = useMetaUsage();
    const puzzle = useDailyPuzzle(userId);
    const challenge = useChallengeSummary(userId, isAnonymous);
    const { awaitingMeCount } = useBattles();
    const challengeLine = (c) => {
        if (c.state === 'guest') return t('cozyHome.challengeGuest');
        if (c.state === 'new') return t('cozyHome.challengeNew');
        if (c.state === 'active') return t('cozyHome.challengeContinue');
        if (c.state === 'won') return t('cozyHome.challengeWon', { n: c.streak });
        if (c.state === 'lost') return t('cozyHome.challengeLost');
        // Without a difficulty yet, never fall back to the title: every place
        // that shows this line shows the title right above it.
        return c.difficulty
            ? t('cozyHome.challengeReady', { difficulty: t(`challenge.difficulty.${c.difficulty}`) })
            : t('cozyHome.challengeWaiting');
    };

    // The Pokédex index carries names and types for every id; saved slots and
    // usage rows only carry ids, so everything here resolves through it.
    const [indexById, setIndexById] = useState(() => new Map());
    useEffect(() => {
        let cancelled = false;
        loadPokemonIndex()
            .then((index) => { if (!cancelled) setIndexById(new Map(index.map((p) => [p.id, p]))); })
            .catch(() => {});
        return () => { cancelled = true; };
    }, []);
    const typesById = useMemo(() => new Map([...indexById].map(([id, p]) => [id, p.types || []])), [indexById]);

    // Forum: the same "Teams" topic the classic Home mirrors.
    const { topics, messages, initTopicsListener, setCurrentTopicId } = useForumStore(useShallow((s) => ({
        topics: s.topics, messages: s.messages, initTopicsListener: s.initTopicsListener, setCurrentTopicId: s.setCurrentTopicId,
    })));
    const teamsTopicId = useMemo(() => {
        const byTitle = topics.find((tp) => (tp.title || '').trim().toLowerCase() === 'teams');
        return byTitle?.id || topics.find((tp) => tp.category === 'teams')?.id || null;
    }, [topics]);
    useEffect(() => { initTopicsListener(); }, [initTopicsListener]);
    useEffect(() => { if (teamsTopicId) setCurrentTopicId(teamsTopicId); }, [teamsTopicId, setCurrentTopicId]);

    const period = dayPeriod(now.getHours());

    // The banner's scene (constants/heroScenes.js): the one the trainer picked
    // — a photograph, the weather, or one only theirs — or one photograph per
    // day of the year until they pick.
    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
    const scene = (heroBackgroundId && getHeroScene(heroBackgroundId)) || defaultHeroScene(dayOfYear);
    const [sceneChanged, setSceneChanged] = useState(false);
    const pickScene = (id) => {
        if (!onChangeHeroBackground || id === scene.id) return;
        setSceneChanged(true);
        onChangeHeroBackground(id);
    };
    const locale = language === 'pt' ? 'pt-BR' : 'en-GB';
    const shortDate = (date) => stripDot(new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' }).format(date));
    const clockLine = [
        stripDot(new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(now)),
        shortDate(now),
    ].join(' ');
    const clock = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const whenLabel = (iso) => {
        const parts = editedParts(iso, now);
        if (!parts) return '';
        if (parts.kind === 'today') return t('cozyHome.when.today', { time: parts.time });
        if (parts.kind === 'yesterday') return t('cozyHome.when.yesterday', { time: parts.time });
        if (parts.kind === 'days') return t('cozyHome.when.days', { n: parts.n });
        if (parts.kind === 'weeks') return parts.n === 1 ? t('cozyHome.when.weeksOne') : t('cozyHome.when.weeks', { n: parts.n });
        return shortDate(parts.date);
    };
    const journeyDate = (iso) => {
        const parts = editedParts(iso, now);
        if (!parts) return '';
        if (parts.kind === 'today') return t('cozyHome.jToday');
        if (parts.kind === 'yesterday') return t('cozyHome.jYesterday');
        return shortDate(parts.date);
    };
    const typeName = (type) => t(`types.${type}`);

    // ── The team in progress ────────────────────────────────────────────────
    const activeTeam = savedTeams.find((team) => team.id === activeTeamId) || savedTeams[0] || null;
    const summary = useMemo(() => summarizeTeam(activeTeam, typesById), [activeTeam, typesById]);

    const hasPartner = Boolean(greetingPokemonId);
    const partnerId = greetingPokemonId || PERIOD_PARTNER[period];
    const partner = indexById.get(partnerId);
    const partnerType = partner?.types?.[0] || 'normal';

    // With no team yet, the empty hero speaks to what the trainer came for
    // (the trainer profile's persona), and their persona's Pokémon waits as a
    // silhouette — "not chosen yet" — until a partner or a team fills it.
    const emptyPersona = hasAnsweredProfile(trainerProfile) ? derivePersona(trainerProfile) : null;
    const emptyKey = `cozyHome.empty.${emptyPersona?.id || 'default'}`;
    const heroTitle = !activeTeam
        ? t(`${emptyKey}.title`)
        : summary.status === 'ready'
            ? t('cozyHome.titleReady')
            : summary.status === 'draft'
                ? t('cozyHome.titleDraft')
                : summary.missing === 1 ? t('cozyHome.titleMissingOne') : t('cozyHome.titleMissing', { n: summary.missing });

    const nextAction = !activeTeam
        ? t('cozyHome.actionStart')
        : summary.status !== 'ready'
            ? t('cozyHome.actionComplete', { name: activeTeam.name })
            : summary.weakness
                ? t('cozyHome.actionCover', { type: typeName(summary.weakness.type) })
                : t('cozyHome.actionBattle');

    const { currentTeam, editingTeamId, setCurrentTeam, setTeamName, setEditingTeamId } = useActiveTeamStore(useShallow((s) => ({
        currentTeam: s.currentTeam, editingTeamId: s.editingTeamId, setCurrentTeam: s.setCurrentTeam,
        setTeamName: s.setTeamName, setEditingTeamId: s.setEditingTeamId,
    })));
    const startNewTeam = () => {
        // Keep an unsaved draft in the builder; start clean over a saved team.
        if (currentTeam.length === 0 || editingTeamId) {
            setCurrentTeam([]);
            setTeamName('');
            setEditingTeamId(null);
        }
        navigate('/builder');
    };
    const continueTeam = () => (activeTeam ? handleEditTeam(activeTeam) : startNewTeam());
    const ctaLabel = activeTeam ? t('cozyHome.continue', { name: activeTeam.name }) : t('cozyHome.buildTeam');

    // ── Today ───────────────────────────────────────────────────────────────
    const nextBadge = useMemo(() => pickNextBadge(badges), [badges]);
    const badgeName = (badge) => (language === 'pt' ? badge.namePt : badge.nameEn);

    const metaLeader = metaRanked[0] || null;
    const metaLeaderType = (metaLeader && typesById.get(metaLeader.id)?.[0]) || 'normal';
    const metaAnswer = useMemo(
        () => findMetaAnswer(summary.members, (metaLeader && typesById.get(metaLeader.id)) || []),
        [summary.members, metaLeader, typesById],
    );

    // ── Story ───────────────────────────────────────────────────────────────
    const latestShare = useMemo(
        () => [...messages].reverse().find((m) => m.sharedTeam && m.createdBy !== userId) || null,
        [messages, userId],
    );

    const journey = useMemo(() => {
        const items = [];
        if (nextBadge) {
            items.push({
                key: 'badge', when: t('cozyHome.jNext'), tone: 'accent', icon: <Sparkles />,
                title: t('cozyHome.jBadge', { badge: badgeName(nextBadge) }),
                sub: `${nextBadge.progress.current} / ${nextBadge.progress.target}`,
            });
        }
        if (puzzle.target) {
            const solved = puzzle.summary?.solved;
            items.push({
                key: 'puzzle', when: t('cozyHome.jToday'), tone: solved ? 'success' : 'warning',
                icon: solved ? <Check /> : <Hourglass />,
                title: t('cozyHome.jPuzzle', { n: puzzle.target.id }),
                sub: solved ? t('cozyHome.jSolved', { n: puzzle.summary.attempts }) : t('cozyHome.jOpen'),
                onClick: () => navigate('/pokepuzzle'),
            });
        }
        if (challenge) {
            const tone = { won: 'success', active: 'warning', lost: 'neutral' }[challenge.state] || 'accent';
            items.push({
                key: 'challenge', when: t('cozyHome.jToday'), tone,
                icon: challenge.state === 'won' ? <Check /> : <Crown />,
                title: t('cozyHome.jChallenge'),
                sub: challengeLine(challenge),
                onClick: () => navigate(challengeLink({ champion: 'cynthia' })),
            });
        }
        if (savedTeams[0]) {
            const team = savedTeams[0];
            const s = team === activeTeam ? summary : summarizeTeam(team, typesById);
            items.push({
                key: 'team', when: journeyDate(team.updatedAt), tone: s.status === 'ready' ? 'success' : 'neutral',
                icon: s.status === 'ready' ? <Check /> : <Pencil />,
                title: s.status === 'ready' ? t('cozyHome.jTeamComplete', { name: team.name }) : t('cozyHome.jTeamEdited', { name: team.name }),
                sub: s.status === 'ready' ? t('cozyHome.jTeamCompleteSub', { n: s.coverage }) : t('cozyHome.jTeamEditedSub', { n: s.size }),
                onClick: () => handleEditTeam(team),
            });
        }
        if (latestShare) {
            items.push({
                key: 'share', when: journeyDate(latestShare.createdAt), tone: 'sprite',
                spriteId: latestShare.creatorAvatar || 25,
                title: t('cozyHome.jShared', { name: latestShare.creatorName || 'Trainer', team: latestShare.sharedTeam.name || '—' }),
                sub: t('cozyHome.jSharedSub'),
                onClick: () => navigate(teamsTopicId ? `/feed?topic=${encodeURIComponent(teamsTopicId)}` : '/feed'),
            });
        }
        return items;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nextBadge, puzzle, challenge, savedTeams, activeTeam, summary, typesById, latestShare, language, now]);

    // ── Pieces ──────────────────────────────────────────────────────────────
    // The run as it stands today (a broken one reads 0), not the stored count.
    const streakCount = liveStreak(streak, localDayKey(now));
    const persona = derivePersona(trainerProfile);
    const heroKind = personaHero(trainerProfile);

    const greeting = (
        <HomeGreeting
            name={trainerName}
            period={period}
            personaId={hasAnsweredProfile(trainerProfile) ? persona?.id : null}
            uid={userId}
            partner={{ id: partnerId, shiny: greetingPokemonIsShiny, type: partnerType, hasPartner }}
            streakCount={streakCount}
            // A guest's way into an account sits here on a phone; the
            // desktop rail's guest card already offers it.
            isAnonymous={isAnonymous && isPhone}
            onOpenPartner={onOpenPokemonSelector}
            onOpenStreak={() => setIsStreakOpen(true)}
            onSignIn={() => promptSignIn('signIn')}
        />
    );

    const badgeSegments = nextBadge ? Math.min(nextBadge.progress.target, 10) : 0;
    // One slot per step when the target is small; tenths of the way otherwise.
    const badgeFilled = !nextBadge ? 0
        : nextBadge.progress.target <= 10 ? nextBadge.progress.current
            : Math.floor(nextBadge.progress.percent / 10);

    // Before the summary answers, the card still stands: a neutral state, the local reset time.
    const challengeDay = challenge || { state: 'ready', difficulty: null, nextResetAt: challengeResetAt(now.getTime()) };
    const resetIn = timeUntil(challengeDay.nextResetAt, now.getTime());

    // ── The champions' day, board by board (utils/challengeBoards.js) ───────
    // Cynthia and Blue, two official battles each: 0/2 · 1/2 · 2/2 with every
    // result. The hero and the "Seu dia" card read one plan, so they never
    // disagree. A summary cached before the champions were read still says
    // something: its one state stands for Cynthia's daily board.
    const isChallengeGuest = challengeDay.state === 'guest';
    const championInfo = useMemo(() => {
        const read = challenge || {};
        const list = read.champions || [{
            id: 'cynthia',
            difficulty: read.difficulty,
            lineup: read.lineup,
            streak: read.streak,
            boards: read.boards || { daily: ['won', 'lost', 'active'].includes(read.state) ? read.state : null },
        }];
        const byId = Object.fromEntries(list.map((c) => [c.id, c]));
        // Both always stand in the room, known or not yet.
        for (const id of CHAMPION_IDS) if (!byId[id]) byId[id] = { id, boards: {} };
        return byId;
    }, [challenge]);
    const dayPlan = useMemo(
        () => challengeDayPlan(CHAMPION_IDS.map((id) => ({ id, boards: championInfo[id].boards }))),
        [championInfo],
    );
    // The champion the hero shows: the trainer's tap, else the plan's focus.
    const [pickedChampion, setPickedChampion] = useState(null);
    const focusId = pickedChampion || dayPlan.focus || 'cynthia';
    const otherId = CHAMPION_IDS.find((id) => id !== focusId) || 'blue';
    const focus = championInfo[focusId];
    const boardsDay = dayPlan.champions.find((d) => d.id === focusId);
    const focusName = CHAMPION_NAMES[focusId];
    // Their six, always six: a "?" for each one not known here (the wildcard, or no day read yet).
    const herSix = Array.from({ length: 6 }, (_, i) => focus.lineup?.[i] || null);
    const showBoards = !isChallengeGuest;
    const challengeMood = isChallengeGuest ? 'calm' : boardsDay.mood;
    // Their six come out of the shadows once the trainer has beaten them once today.
    const lineupRevealed = boardsDay.won > 0;
    const boardName = (id) => (id ? t(`cozyHome.boards.${id}`) : '');
    const challengeCopy = (() => {
        const fresh = isChallengeGuest || boardsDay.outcome === 'fresh';
        const next = boardsDay.next;
        const action = fresh
            ? { Icon: Swords, glyph: 'clash', label: t('cozyHome.champions.challenge', { name: focusName }), short: t('cozyHome.challengeGo') }
            : boardsDay.outcome === 'active'
                ? { Icon: Play, glyph: 'nudge', label: t('cozyHome.boards.resume', { board: boardName(next) }), short: t('cozyHome.boards.resumeShort') }
                : next
                    ? { Icon: Swords, glyph: 'clash', label: t('cozyHome.boards.play', { board: boardName(next) }), short: t('cozyHome.boards.playShort') }
                    : boardsDay.won === 0
                        ? { Icon: RotateCcw, glyph: 'nudge', label: t('cozyHome.boards.rematch'), short: t('cozyHome.boards.rematchShort') }
                        : { Icon: Trophy, glyph: 'lift', label: t('cozyHome.boards.ranking'), short: t('cozyHome.boards.rankingShort') };
        const freshTitle = focusId === 'cynthia' ? t('cozyHome.challengeTitle') : t('cozyHome.boards.title.fresh', { name: focusName });
        return {
            title: fresh ? freshTitle : t(`cozyHome.boards.title.${boardsDay.outcome}`, { name: focusName }),
            // Fresh: the day under this champion's own names, never Cynthia's "ela".
            sub: fresh
                ? (isChallengeGuest
                    ? t('cozyHome.challengeGuest')
                    : focus.difficulty
                        ? t('cozyHome.champions.ready', { difficulty: difficultyLabel(t, focusId, focus.difficulty) })
                        : t('cozyHome.champions.waiting'))
                : t(`cozyHome.boards.sub.${boardsDay.outcome}`, { board: next ? t(`cozyHome.boards.inline.${next}`) : '', n: focus.streak || 0, name: focusName }),
            action,
            // Straight to that battle (or that ranking), on the right champion.
            href: isChallengeGuest ? challengeLink({ champion: focusId }) : championAction(focusId, boardsDay),
        };
    })();
    const openChampion = (day) => navigate(isChallengeGuest ? challengeLink({ champion: day.id }) : championAction(day.id, day));

    // The arrival plays once per new result (a board just won or lost), never
    // on a plain reload and never for a new day arriving — celebrate only the
    // trainer's own act. Remembered per device in the trainer's storage.
    const outcomeKey = challenge && !isChallengeGuest && dayPlan.done > 0
        ? `${challenge.dayKey}:${dayPlan.champions.map((d) => d.slots.map((slot) => slot.status).join(',')).join('|')}`
        : null;
    const [revealKey, setRevealKey] = useState(null);
    useEffect(() => {
        if (!outcomeKey) return;
        let seen = null;
        try { seen = localStorage.getItem(CHALLENGE_SEEN_KEY); } catch (_) { /* private mode: no reveal */ }
        if (seen === outcomeKey) return;
        try { localStorage.setItem(CHALLENGE_SEEN_KEY, outcomeKey); } catch (_) { /* ignore */ }
        setRevealKey(outcomeKey);
    }, [outcomeKey]);
    const challengeReveal = Boolean(outcomeKey) && revealKey === outcomeKey;
    const champArt = (big, small, prefix) => (
        <>
            <img src={CHAMPION_FACES[small]} alt="" width={80} height={80} decoding="async" className={`${prefix}__rival`} />
            <img key={big} src={CHAMPION_FACES[big]} alt="" width={80} height={80} decoding="async" fetchPriority="high" className={`${prefix}__trainer`} />
        </>
    );
    // The compact cards stacked beside the featured one: it spans all their rows.
    // The hero's subject leaves the rail: nothing shows twice.


    // ── The hero of the day ─────────────────────────────────────────────────
    // The team in progress: tinted by its lead's type (the partner's with no
    // team), the lead's official artwork as the protagonist.
    const lead = summary.members[0] || null;
    const leadType = lead?.types?.[0] || partnerType;
    const heroArtId = lead?.id || (hasPartner ? partnerId : (emptyPersona ? PERSONAS[emptyPersona.id]?.art : null) || partnerId);
    const heroArtShiny = lead ? Boolean(lead.customization?.isShiny) : greetingPokemonIsShiny;
    // The scene and its picker, for whichever hero leads. `owner` is what
    // makes the trainer's own scenes theirs (their partner, their Trainer ID).
    const sceneOwner = { uid: userId, partnerId, partnerShiny: greetingPokemonIsShiny };
    const heroScene = (tone) => ({
        scene: <HeroScene key={scene.id} scene={scene} owner={sceneOwner} changed={sceneChanged} />,
        sceneControl: onChangeHeroBackground
            ? <ScenePicker currentId={scene.id} onPick={pickScene} owner={sceneOwner} tone={tone} />
            : null,
    });
    // The hero's floor while a lazy hero loads, so nothing under it moves.
    const heroPlaceholder = <section className="day-hero day-hero--placeholder" aria-hidden="true" />;
    const hero = heroKind === 'badges' ? (
        <Suspense fallback={heroPlaceholder}>
            <BadgeHero {...heroScene('var(--color-primary)')} />
        </Suspense>
    ) : heroKind === 'challenge' ? (
        <DayHero
            {...heroScene(typeColors.dragon)}
            tone={challengeMood === 'gold' ? 'var(--brand-gold)' : typeColors.dragon}
            mood={challengeMood}
            reveal={challengeReveal}
            art={(
                <span className="day-hero__trainers">{champArt(focusId, otherId, 'day-hero')}</span>
            )}
            eyebrow={t('cozyHome.challengeNextInShort', { ...resetIn, minutes: String(resetIn.minutes).padStart(2, '0') })}
            title={challengeCopy.title}
            sub={challengeCopy.sub}
            extra={(
                <>
                <ChampionSwitch plan={dayPlan} focus={focusId} onFocus={setPickedChampion} showBoards={showBoards} />
                <span className="day-hero__lineup" aria-hidden="true">
                    {herSix.map((dex, index) => (
                        <span key={index} className={`cozy-day__mini ${dex ? '' : 'cozy-day__mini--unknown'}`}>
                            {dex
                                ? <Sprite src={dexSprite(dex)} className={`cozy-day__mini-sprite ${lineupRevealed ? '' : 'pokepuzzle-silhouette'}`} />
                                : '?'}
                        </span>
                    ))}
                </span>
                </>
            )}
            label={t('homeToday.herTeam')}
            status={showBoards ? <ChallengeBoards day={boardsDay} compact={isPhone} /> : null}
            meta={[
                focusName,
                difficultyLabel(t, focusId, focus.difficulty),
                t('homeToday.challengeStreak', { n: focus.streak || 0 }),
            ].filter(Boolean).join(' · ')}
            action={{ ...challengeCopy.action, onClick: () => navigate(challengeCopy.href) }}
        />
    ) : (
        <DayHero
            {...heroScene(typeColors[leadType])}
            tone={typeColors[leadType]}
            art={(
                <img
                    key={`${heroArtId}-${heroArtShiny}`}
                    src={getPokemonArtworkSpriteUrl(heroArtId, { shiny: heroArtShiny })}
                    alt=""
                    width={240}
                    height={240}
                    decoding="async"
                    fetchPriority="high"
                    className={`day-hero__artwork ${lead || hasPartner ? '' : 'is-unchosen'}`}
                />
            )}
            eyebrow={`${clockLine} · ${clock}`}
            title={heroTitle}
            sub={activeTeam ? `${t('cozyHome.nextAction')}: ${nextAction}` : t(`${emptyKey}.sub`)}
            // The desktop bar has room for the party itself; a phone shows
            // it as its own row under the hero (HomeParty).
            extra={activeTeam && !isPhone ? <PartyRow members={summary.members} label={t('cozyHome.ofSix', { n: summary.size })} /> : null}
            label={activeTeam ? activeTeam.name : t('homeToday.newTeam')}
            meta={activeTeam
                ? [
                    t('cozyHome.ofSix', { n: summary.size }),
                    summary.size > 0 ? t('homeToday.coverageShort', { n: summary.coverage, total: TYPE_COUNT }) : null,
                    activeTeam.updatedAt ? t('cozyHome.saved', { when: whenLabel(activeTeam.updatedAt) }) : null,
                ].filter(Boolean).join(' · ')
                : t('cozyHome.actionStart')}
            percent={(summary.size / TEAM_SIZE) * 100}
            action={{
                Icon: activeTeam ? Play : Plus,
                glyph: activeTeam ? 'nudge' : 'pop',
                label: ctaLabel,
                short: activeTeam ? t('homeToday.continueShort') : t('cozyHome.buildTeam'),
                onClick: continueTeam,
            }}
        />
    );

    // The compact cards, each one its own state (2026-11-12): open, solved or
    // missed for the puzzle; a battle that waits on the trainer leads the rail
    // when there is one; the Challenger's "challenge a friend" when none waits.
    // personaDayCards orders them; a card with nothing to say is left out.
    const puzzleSolved = Boolean(puzzle.summary?.solved);
    const puzzleMissed = !puzzleSolved && (puzzle.summary?.attempts || 0) >= 8;
    const puzzleDone = puzzleSolved || puzzleMissed;
    const puzzleName = puzzle.target ? displayName(indexById.get(puzzle.target.id)?.name || '') : '';
    const dayCards = {
        battles: awaitingMeCount > 0 && (
            <button type="button" className="card card--interactive cozy-day__card cozy-day__card--compact cozy-day__card--live" style={{ '--day-tone': 'var(--brand-live)' }}
                onClick={() => navigate('/battles')}>
                <span className="cozy-day__head">
                    <span className="cozy-day__tile cozy-day__tile--badge" aria-hidden="true"><ShieldHalf /></span>
                    <span className="badge badge--live cozy-day__go">{awaitingMeCount}</span>
                </span>
                <span className="cozy-day__eyebrow"><span className="live-dot" aria-hidden="true" />{t('cozyHome.dayCards.yourTurn')}</span>
                <span className="cozy-day__title">
                    {awaitingMeCount === 1 ? t('cozyHome.dayCards.battlesOne') : t('cozyHome.dayCards.battles', { n: awaitingMeCount })}
                </span>
                <span className="cozy-day__sub">{t('cozyHome.dayCards.battlesSub')}</span>
            </button>
        ),
        invite: awaitingMeCount === 0 && (
            <button type="button" className="card card--interactive cozy-day__card cozy-day__card--compact" style={{ '--day-tone': typeColors.fighting }}
                onClick={() => navigate('/battles')}>
                <span className="cozy-day__head">
                    <span className="cozy-day__tile cozy-day__tile--badge" aria-hidden="true"><UserPlus /></span>
                    <span className="cozy-day__chevron"><ChevronRight aria-hidden="true" /></span>
                </span>
                <span className="cozy-day__eyebrow">PvP</span>
                <span className="cozy-day__title">{t('cozyHome.dayCards.inviteTitle')}</span>
                <span className="cozy-day__sub">{t('cozyHome.dayCards.inviteSub')}</span>
            </button>
        ),
        puzzle: puzzle.target && (
            <button type="button" className={`card card--interactive cozy-day__card cozy-day__card--compact ${puzzleMissed ? 'is-missed' : ''}`}
                style={{ '--day-tone': puzzleDone ? typeColors[typesById.get(puzzle.target.id)?.[0] || 'normal'] : 'var(--color-primary)' }}
                onClick={() => navigate('/pokepuzzle')}>
                <span className="cozy-day__head">
                    <span className="cozy-day__tile" aria-hidden="true">
                        <Sprite
                            src={dexSprite(puzzleDone ? puzzle.target.id : puzzle.silhouetteId)}
                            className={`cozy-day__sprite ${puzzleDone ? '' : 'pokepuzzle-silhouette'}`}
                        />
                    </span>
                    {puzzleSolved
                        ? <span className="badge badge--success cozy-day__go"><Check aria-hidden="true" /> {t('cozyHome.solved')}</span>
                        : puzzleMissed
                            ? <span className="badge cozy-day__go"><Eye aria-hidden="true" /> {t('cozyHome.dayCards.revealed')}</span>
                            : <span className="btn btn-sm cozy-ink cozy-day__go">{t('cozyHome.play')}</span>}
                </span>
                <span className="cozy-day__eyebrow">{!puzzleDone && <span className="live-dot" aria-hidden="true" />}#{String(puzzle.target.id).padStart(3, '0')}</span>
                <span className="cozy-day__title">
                    {puzzleMissed && puzzleName ? t('cozyHome.dayCards.puzzleMissed', { name: puzzleName }) : t('cozyHome.puzzleTitle')}
                </span>
                <span className="cozy-day__sub">
                    {puzzleSolved
                        ? t('cozyHome.puzzleSolved', { n: puzzle.summary.attempts })
                        : puzzleMissed
                            ? t('cozyHome.dayCards.puzzleMissedSub')
                            : t('cozyHome.puzzleOpen', { n: puzzle.target.id })}
                </span>
            </button>
        ),
        badge: (
            <button type="button" className="card card--interactive cozy-day__card cozy-day__card--compact" style={{ '--day-tone': 'var(--color-accent)' }}
                onClick={() => navigate('/journeys?tab=badges')}>
                <span className="cozy-day__head">
                    <span className="cozy-day__tile cozy-day__tile--badge" aria-hidden="true">
                        {nextBadge ? <nextBadge.Icon /> : <Sparkles />}
                    </span>
                </span>
                <span className="cozy-day__eyebrow">{nextBadge ? `${nextBadge.progress.current}/${nextBadge.progress.target}` : '★'}</span>
                <span className="cozy-day__title">{nextBadge ? badgeName(nextBadge) : t('cozyHome.allBadges')}</span>
                <span className="cozy-day__sub">
                    {nextBadge
                        ? (language === 'pt' ? nextBadge.reqPt : nextBadge.reqEn)
                        : t('cozyHome.allBadgesSub')}
                </span>
                {nextBadge && (
                    <span className="cozy-case" aria-hidden="true">
                        {Array.from({ length: badgeSegments }, (_, i) => (
                            <i key={i} className={i < badgeFilled ? 'is-on' : ''} />
                        ))}
                    </span>
                )}
            </button>
        ),
        meta: metaLeader && (
            <button type="button" className="card card--interactive cozy-day__card cozy-day__card--compact"
                style={{ '--day-tone': typeColors[metaLeaderType] }} onClick={() => navigate('/meta')}>
                <span className="cozy-day__head">
                    <span className="cozy-day__tile" aria-hidden="true">
                        <Sprite src={dexSprite(metaLeader.id)} className="cozy-day__sprite" />
                    </span>
                    <span className="cozy-day__chevron"><ChevronRight aria-hidden="true" /></span>
                </span>
                <span className="cozy-day__eyebrow">{metaLeader.count}%</span>
                <span className="cozy-day__title">{t('cozyHome.metaLeads', { name: displayName(metaLeader.name) })}</span>
                <span className="cozy-day__sub">
                    {activeTeam && summary.size > 0
                        ? (metaAnswer
                            ? t('cozyHome.metaAnswer', { team: activeTeam.name, answer: displayName(indexById.get(metaAnswer.id)?.name || metaAnswer.name || '') })
                            : t('cozyHome.metaNoAnswer', { team: activeTeam.name }))
                        : t('cozyHome.metaShare', { pct: metaLeader.count })}
                </span>
            </button>
        ),
    };
    const dayCardIds = personaDayCards(trainerProfile).filter((id) => dayCards[id]);

    const yourDay = (
        <Panel
            card={false}
            title={t('cozyHome.yourDay')}
            meta={streakCount > 0 ? t('cozyHome.streakDay', { n: streakCount }) : t('cozyHome.noStreak')}
        >
            <div className="cozy-day" style={{ '--day-rows': Math.max(dayCardIds.length, 1) }}>
                {/* The featured card: the Champion and her six, the day's one battle,
                    drawn as Black & White's trainer intro — the band across the card,
                    Cynthia on her pad. Always drawn (the summary fills it in), so the
                    grid never reflows — unless she is the hero (personaHero). */}
                {heroKind !== 'challenge' && (
                    <section
                        className={`card cozy-day__card cozy-day__card--feature cozy-day__card--challenge ${challengeReveal ? 'is-revealing' : ''}`}
                        data-mood={challengeMood}
                        style={{ '--day-tone': challengeMood === 'gold' ? 'var(--brand-gold)' : typeColors.dragon }}
                        aria-labelledby="cozy-day-champions">
                        <span className="cozy-day__band" aria-hidden="true" />
                        <span className="cozy-day__head">
                            {/* The champion in focus on the pad; the other a step behind. */}
                            <span className="cozy-day__tile cozy-day__tile--trainer" aria-hidden="true">
                                <span className="cozy-day__pad" />
                                {champArt(focusId, otherId, 'cozy-day')}
                            </span>
                        </span>
                        <span className="cozy-day__eyebrow">
                            {/* A phone's row has room for the short countdown only. */}
                            <span className="cozy-day__long">{t('cozyHome.challengeNextIn', resetIn)}</span>
                            <span className="cozy-day__short">{t('cozyHome.challengeNextInShort', { ...resetIn, minutes: String(resetIn.minutes).padStart(2, '0') })}</span>
                            {showBoards && <span className="cozy-day__daycount"> · {t('cozyHome.champions.day', { n: dayPlan.done, total: dayPlan.total })}</span>}
                        </span>
                        <button type="button" className="cozy-day__title cozy-day__title-link" id="cozy-day-champions" onClick={() => navigate(challengeCopy.href)}>
                            {challengeCopy.title}
                        </button>
                        <span className="cozy-day__sub">{challengeCopy.sub}</span>
                        {/* The focused champion's six as silhouettes until beaten today; the
                            wildcard stays a "?". The filter goes on the sprite, never the slot. */}
                        <span className="cozy-day__lineup" aria-hidden="true">
                            {herSix.map((dex, index) => (
                                <span key={index} className={`cozy-day__mini ${dex ? '' : 'cozy-day__mini--unknown'}`}>
                                    {dex
                                        ? <Sprite src={dexSprite(dex)} className={`cozy-day__mini-sprite ${lineupRevealed ? '' : 'pokepuzzle-silhouette'}`} />
                                        : '?'}
                                </span>
                            ))}
                        </span>
                        {/* Each champion a row: their day, and the way straight to their next battle. */}
                        <span className="cozy-day__foot">
                            <ChampionLedger plan={dayPlan} info={championInfo} focus={focusId} isGuest={isChallengeGuest} onOpen={openChampion} />
                        </span>
                    </section>
                )}

                {dayCardIds.map((id) => <React.Fragment key={id}>{dayCards[id]}</React.Fragment>)}
            </div>
        </Panel>
    );

    const teamStatus = (s) => (
        <span className={`badge cozy-status ${s.status === 'ready' ? 'badge--success' : s.status === 'missing' ? 'badge--warning' : ''}`}>
            {s.status === 'ready' ? t('cozyHome.statusReady')
                : s.status === 'draft' ? t('cozyHome.statusDraft')
                    : t('cozyHome.statusMissing', { n: s.missing })}
        </span>
    );

    const completeCount = useMemo(
        () => savedTeams.filter((team) => resolveMembers(team).length >= TEAM_SIZE).length,
        [savedTeams],
    );

    const teamsPanel = (limit) => (
        <Panel
            title={t('cozyHome.yourTeams')}
            meta={t('cozyHome.yourTeamsSub')}
            action={(
                <button type="button" className="btn btn-secondary btn-icon cozy-round" onClick={startNewTeam} aria-label={t('cozyHome.newTeam')}>
                    <Plus aria-hidden="true" />
                </button>
            )}
        >
            {savedTeams.length === 0 ? (
                <EmptyState
                    compact
                    title={t(`${emptyKey}.title`)}
                    message={t(`${emptyKey}.teams`)}
                    // No button: the hero's "Montar time" and the "+" beside this
                    // heading already start a team (one primary per view).
                />
            ) : (
                <ul className="cozy-teams">
                    {savedTeams.slice(0, limit).map((team) => {
                        const s = team === activeTeam ? summary : summarizeTeam(team, typesById);
                        return (
                            <li key={team.id}>
                                {/* The name is the card's button, stretched over the
                                    whole card (::after), so the "⋯" beside it can be
                                    a button of its own — a button may not hold one. */}
                                <div className="card card--inset card--interactive card--compact cozy-team pc-box-host">
                                    <PcBox members={s.members} size={isPhone ? 'sm' : 'md'} className={`cozy-team__roster ${isPhone ? '' : 'pc-box--fluid'}`} />
                                    <span className="cozy-team__text">
                                        <button type="button" className="cozy-team__open" onClick={() => handleEditTeam(team)}>
                                            <span className="cozy-team__name">{team.name}</span>
                                        </button>
                                        <span className="cozy-team__sub">
                                            {[team.updatedAt && t('cozyHome.edited', { when: whenLabel(team.updatedAt) }), t('cozyHome.ofSix', { n: s.size })]
                                                .filter(Boolean).join(' · ')}
                                        </span>
                                    </span>
                                    {teamStatus(s)}
                                    <TeamCardMenu team={team} onOpen={() => navigate(`/teams/${team.id}`)} onEdit={() => handleEditTeam(team)} />
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            <dl className="cozy-tally">
                <div className="stat"><dt className="stat__label">{t('cozyHome.statTeams')}</dt><dd className="stat__value">{savedTeams.length}</dd></div>
                <div className="stat"><dt className="stat__label">{t('cozyHome.statComplete')}</dt><dd className="stat__value">{completeCount}</dd></div>
                <div className="stat"><dt className="stat__label">{t('cozyHome.statFavorites')}</dt><dd className="stat__value">{favoritePokemons?.size || 0}</dd></div>
            </dl>

            {savedTeams.length > limit && (
                <button type="button" className="btn btn-ghost btn-sm cozy-panel__more" onClick={() => navigate('/teams')}>
                    {t('cozyHome.seeAll')} <ChevronRight aria-hidden="true" />
                </button>
            )}
        </Panel>
    );

    const journeyPanel = (
        <Panel
            title={t('cozyHome.journey')}
            meta={streakCount > 0 ? t('cozyHome.journeyDay', { n: streakCount }) : null}
        >
            <ol className="cozy-journey">
                {journey.map((item) => {
                    const Tag = item.onClick ? 'button' : 'div';
                    return (
                        <li key={item.key}>
                            <Tag {...(item.onClick ? { type: 'button', onClick: item.onClick } : {})} className="cozy-journey__row">
                                <span className="cozy-journey__when">{item.when}</span>
                                <span className={`cozy-journey__node cozy-journey__node--${item.tone}`} aria-hidden="true">
                                    {item.spriteId ? <Sprite src={dexSprite(item.spriteId)} className="cozy-journey__sprite" /> : item.icon}
                                </span>
                                <span className="cozy-journey__text">
                                    <span className="cozy-journey__title">{item.title}</span>
                                    <span className="cozy-journey__sub">{item.sub}</span>
                                </span>
                            </Tag>
                        </li>
                    );
                })}
            </ol>
        </Panel>
    );

    // ── The journey ─────────────────────────────────────────────────────────
    // The level being played and what is left in it, each mission a button
    // that goes and does it — the onboarding a new trainer meets first, and
    // the next step for everyone else until all five levels are done.
    //
    // How loud it is depends on who is looking (journeyEmphasis): a new
    // trainer gets the full card — welcome, the level, its open missions —
    // an active one a small "next step" card with the one mission up next.
    const level = currentJourney(journeys);
    const emphasis = journeyEmphasis(journeys, { activeDays: trainerStats.activeDays });
    const isBrandNew = level?.level === 1 && level.doneCount === 0;
    // An active trainer's next step follows what they came for (the trainer
    // profile): a competitive one is pointed at Strategy before the League.
    const suggested = suggestedJourney(journeys, trainerProfile) || level;
    const upNext = nextMission(suggested);
    const seeJourneys = (
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/journeys')}>
            {t('journeys.home.seeAll')} <ChevronRight aria-hidden="true" />
        </button>
    );
    const journeyFocus = emphasis === 'focus' && (
        <Panel title={t('journeys.home.title')} action={seeJourneys}>
            <div className="journey-home">
                {isBrandNew && <MascotTip pose="acenando" play="wave">{t('journeys.home.welcome')}</MascotTip>}
                <div className="journey-home__head">
                    <JourneyTile journey={level} isCurrent />
                    <span className="journey__text">
                        <span className="journey__level">{t('journeys.home.meta', { n: level.level, total: journeys.length })}</span>
                        <span className="journey__title">{t(`journeys.list.${level.id}.title`)}</span>
                        <span className="journey__sub">{t(`journeys.list.${level.id}.sub`)}</span>
                    </span>
                    <span className="journey__count">{level.doneCount}/{level.total}</span>
                </div>
                <JourneyBar percent={level.percent} />
                <ol className="journey__missions">
                    {level.missions.filter((m) => !m.done).slice(0, 3).map((mission) => (
                        <MissionRow key={mission.id} mission={mission} />
                    ))}
                </ol>
            </div>
        </Panel>
    );
    const journeyCompact = emphasis === 'compact' && upNext && (
        <section className="card card--compact journey-mini" aria-label={t('journeys.home.nextStep')}>
            <div className="journey-mini__head">
                <JourneyTile journey={suggested} isCurrent />
                <span className="journey__text">
                    <span className="journey__level">{t('journeys.home.nextStep')} · {t('journeys.level', { n: suggested.level })}</span>
                    <span className="journey-mini__title">{t(`journeys.list.${suggested.id}.title`)}</span>
                </span>
                <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => navigate('/journeys')}
                    aria-label={t('journeys.home.seeAll')} title={t('journeys.home.seeAll')}>
                    <ChevronRight aria-hidden="true" />
                </button>
            </div>
            <JourneyBar percent={suggested.percent} />
            <ol className="journey__missions">
                <MissionRow mission={upNext} />
            </ol>
        </section>
    );
    // "Para você" (2026-11-05): where this trainer's profile says to look
    // first — a few destinations, each a line saying why. Without a profile
    // it is an invitation to make one, small, in the rail.
    const picks = personaPicks(trainerProfile, 4);
    const forYouPanel = hasAnsweredProfile(trainerProfile) && persona && picks.length > 0 && (
        <Panel
            title={t('onboarding.home.title')}
            meta={t(`onboarding.personas.${persona.id}.name`)}
            action={(
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => openOnboarding('home')}>
                    <Pencil aria-hidden="true" /> {t('onboarding.home.edit')}
                </button>
            )}
        >
            <ul className="for-you" style={{ '--for-you-tone': typeColors[persona.tone] }}>
                {picks.map((key) => {
                    const Icon = PICK_ICONS[key] || ChevronRight;
                    return (
                        <li key={key}>
                            <button type="button" className="for-you__item" onClick={() => navigate(PICK_DESTINATIONS[key].path)}>
                                <span className="for-you__head">
                                    {/* data-motion: each icon moves its own parts on hover (cozy-home.css). */}
                                    <span className="for-you__icon" data-motion={key} aria-hidden="true"><Icon /></span>
                                    <ArrowUpRight className="for-you__chevron" aria-hidden="true" />
                                </span>
                                <span className="for-you__text">
                                    <span className="for-you__title">{t(PICK_DESTINATIONS[key].labelKey)}</span>
                                    <span className="for-you__desc">{t(`onboarding.picks.${key}`)}</span>
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </Panel>
    );
    const forYouSetup = !hasAnsweredProfile(trainerProfile) && (
        <section className="card card--compact for-you-setup" aria-label={t('onboarding.home.setupTitle')}>
            <span className="for-you-setup__art" aria-hidden="true">
                {[445, 25, 150].map((id) => (
                    <img key={id} src={getPokemonArtworkSpriteUrl(id)} alt="" width={56} height={56} decoding="async" loading="lazy" />
                ))}
            </span>
            <span className="for-you-setup__text">
                <span className="for-you-setup__title">{t('onboarding.home.setupTitle')}</span>
                <span className="for-you-setup__sub">{t('onboarding.home.setupSub')}</span>
            </span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => openOnboarding('home')}>
                {t('onboarding.home.setupCta')}
            </button>
        </section>
    );

    // ── Layout ──────────────────────────────────────────────────────────────
    // One priority list (2026-11-09, .claude/skills/app-screens): on a phone
    // greeting → week → the hero → (a new trainer's first journey) → the party
    // → the persona's blocks (the day's rail among them) → what is left. A
    // desktop keeps the same main column and moves the week, the Centre and
    // the journey into the rail beside it.
    //
    // The guest's invitation: at the top of the rail on desktop; on a phone
    // only once there is progress to save (the greeting's "Entrar" covers
    // the rest). Renders nothing for an account holder.
    const guestCard = <GuestAccountCard variant="home" />;
    // The mascot's one line for today (utils/mascot/assistant.js decides what,
    // or nothing): who is waiting on the trainer, else the day's open door,
    // else "all done". Unknowns stay null so he never speaks, then changes his mind.
    const note = homeNote({
        hour: now.getHours(),
        isNew: emphasis === 'focus' && isBrandNew,
        battlesWaiting: awaitingMeCount,
        checkedIn: normalizeCheckin(checkin).lastDay === localDayKey(now),
        streak: streakCount,
        shields: normalizeStreak(streak).shields,
        puzzle: puzzle.isLoading ? null : (puzzle.summary && (puzzle.summary.solved || puzzle.summary.attempts >= 8)) ? 'done' : 'open',
        challenge: !challenge ? null : challenge.state === 'guest' ? 'none' : ['won', 'lost'].includes(challenge.state) ? 'done' : 'open',
    });
    const mascotNote = <MascotNote note={note} onOpenStreak={() => setIsStreakOpen(true)} />;
    // The daily check-in as the week strip (rewards, 2026-10-17 → 2026-11-09):
    // the day's first thing to do. Reads recorded stores only.
    const checkinWeek = (
        <CheckinWeek
            onOpenRewards={() => navigate('/journeys?tab=rewards')}
            onOpenStreak={() => setIsStreakOpen(true)}
        />
    );
    // The persona orders the day's blocks (personaHomeOrder); phones carry no
    // teams block (the party and "Ver todos" stand for it there).
    const homeOrder = personaHomeOrder(trainerProfile);
    const homeBlocks = {
        forYou: forYouPanel,
        yourDay,
        teams: isPhone ? null : teamsPanel(3),
        badges: homeOrder.includes('badges') ? <Suspense fallback={null}><BadgeCase /></Suspense> : null,
    };
    const ordered = homeOrder.map((id) => <React.Fragment key={id}>{homeBlocks[id]}</React.Fragment>);
    // The day's own result, so a friend's puzzle line can say who did better.
    const myPuzzle = puzzle.summary && (puzzle.summary.solved || puzzle.summary.attempts >= 8)
        ? { won: Boolean(puzzle.summary.solved), guesses: puzzle.summary.attempts }
        : null;
    const centerToday = (variant) => <Suspense fallback={null}><CenterToday variant={variant} myPuzzle={myPuzzle} /></Suspense>;
    const party = isPhone && activeTeam && summary.size > 0 && (
        <HomeParty
            team={activeTeam}
            members={summary.members}
            onEdit={() => handleEditTeam(activeTeam)}
            onSeeAll={() => navigate('/teams')}
        />
    );

    return (
        <main className="cozy-home">
            <div className="cozy-layout">
                <div className="cozy-main">
                    {greeting}
                    {mascotNote}
                    {isPhone && checkinWeek}
                    {hero}
                    {isPhone ? (
                        <>
                            {party}
                            {journeyFocus}
                            {ordered}
                            {forYouSetup}
                            {journeyCompact}
                            {centerToday('rail')}
                            {savedTeams.length > 0 && guestCard}
                        </>
                    ) : ordered}
                </div>

                {!isPhone && (
                    <aside className="cozy-rail">
                        {guestCard}
                        {checkinWeek}
                        {/* The day as a place, right under the trainer's own check-in (2026-11-09). */}
                        {centerToday('rail')}
                        {forYouSetup}
                        {journeyFocus || journeyCompact}
                        {journeyPanel}
                    </aside>
                )}
            </div>

            {isStreakOpen && (
                <Suspense fallback={null}>
                    <StreakSheet onClose={() => setIsStreakOpen(false)} />
                </Suspense>
            )}
        </main>
    );
}
