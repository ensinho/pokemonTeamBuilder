import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
// Selected with useShallow, not whole stores: a bare useForumStore() re-rendered
// the whole Home on every forum message and every unrelated store tick.
import { useShallow } from 'zustand/react/shallow';
import { ArrowLeftRight, ArrowUpRight, ChevronRight, MoreHorizontal, Pencil, Play, Plus, RotateCcw, Sparkles, Swords, Trophy } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { GuestAccountCard } from '../GuestAccountCard';
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
import { DayHero } from '../home/DayHero';
import { HomeParty } from '../home/HomeParty';
import { DayRoute } from '../home/DayRoute';
import { PersonaDoors } from '../home/PersonaDoors';
import { TeamDeck } from '../home/TeamDeck';
import { dayRoute, routeOrder } from '../../utils/dayRoute';
import { promptSignIn } from '../../utils/navigation';
import { Sprite } from '../Sprite';
import { EmptyState } from '../EmptyState';
import { JourneyBar, JourneyTile, MissionRow } from '../journeys/JourneyList';
import { currentJourney, journeyEmphasis, nextMission } from '../../utils/journeys';
import { PERSONAS, derivePersona, hasAnsweredProfile, homeDoors, personaDayCards, personaHero, personaHomeOrder, suggestedJourney } from '../../utils/trainerProfile';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import { MascotTip } from '../Mascot';
import { defaultHeroScene, getHeroScene } from '../../constants/heroScenes';
import { HeroScene, ScenePicker } from '../home/HeroScene';
import { challengeDayPlan, challengeLink, championAction } from '../../utils/challengeBoards';
import { CHAMPION_IDS, CHAMPION_NAMES, difficultyLabel } from '../../utils/challengeChampions';
import { ChampionLedger, ChampionSwitch } from '../home/ChampionDay';
import { RouteDuo, RouteEmblem } from '../home/RouteArt';
import { CHAMPION_FACES } from '../../utils/championFaces';
import '../../styles/cozy-home.css';
// After cozy-home.css: the 2026-11-09 pieces override a few of its rules.
import '../../styles/home-today.css';
// After home-today.css: the Home's four columns and its one card anatomy —
// the route, the doors and the deck (2026-11-12, harmony pass).
import '../../styles/home-grid.css';
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

/** A champion's ace before the day is read: Cynthia's Garchomp; Blue's is one of his starters, by day. */
const CHAMPION_ACE = { cynthia: 445, blue: 6 };

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
    // A day, not a time: "hoje", "ontem", "10 nov" — for a card's one short line.
    const shortWhen = (iso) => {
        const parts = editedParts(iso, now);
        if (!parts) return '';
        if (parts.kind === 'today') return t('cozyHome.jToday').toLowerCase();
        if (parts.kind === 'yesterday') return t('cozyHome.jYesterday').toLowerCase();
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

    // ── Pieces ──────────────────────────────────────────────────────────────
    // The run as it stands today (a broken one reads 0), not the stored count.
    const streakCount = liveStreak(streak, localDayKey(now));
    const persona = derivePersona(trainerProfile);
    const heroKind = personaHero(trainerProfile);

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
    // The champion's ace (the lineup's last, it always closes) as the hero's
    // protagonist — official artwork, big, cut by the hero's edge — with the
    // champion on her platform in front of it. A silhouette until she has
    // been beaten today ("Quem é esse Pokémon?": not known yet).
    const aceDex = focus.lineup?.[5] || CHAMPION_ACE[focusId] || CHAMPION_ACE.cynthia;

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
            layout="stage"
            art={(
                <span className="day-hero__stage">
                    <img
                        key={`ace-${aceDex}`}
                        src={getPokemonArtworkSpriteUrl(aceDex)}
                        alt=""
                        width={240}
                        height={240}
                        decoding="async"
                        className={`day-hero__ace ${lineupRevealed ? '' : 'is-unknown'}`}
                    />
                    <span className="day-hero__pad" />
                    <img key={focusId} src={CHAMPION_FACES[focusId]} alt="" width={80} height={80} decoding="async" fetchPriority="high" className="day-hero__trainer" />
                </span>
            )}
            eyebrow={t('cozyHome.challengeNextInShort', { ...resetIn, minutes: String(resetIn.minutes).padStart(2, '0') })}
            title={challengeCopy.title}
            sub={challengeCopy.sub}
            // The two champions, each tab with its day's marks: the score is read once.
            extra={<ChampionSwitch plan={dayPlan} focus={focusId} onFocus={setPickedChampion} showBoards={showBoards} />}
            label={t('homeToday.herTeam')}
            meta={[
                difficultyLabel(t, focusId, focus.difficulty),
                t('homeToday.challengeStreak', { n: focus.streak || 0 }),
            ].filter(Boolean).join(' · ')}
            status={(
                <span className="day-hero__lineup" aria-hidden="true">
                    {herSix.map((dex, index) => (
                        <span key={index} className={`cozy-day__mini ${dex ? '' : 'cozy-day__mini--unknown'}`}>
                            {dex
                                ? <Sprite src={dexSprite(dex)} className={`cozy-day__mini-sprite ${lineupRevealed ? '' : 'pokepuzzle-silhouette'}`} />
                                : '?'}
                        </span>
                    ))}
                </span>
            )}
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
    // ── Rota do dia (2026-11-12, utils/dayRoute.js) ─────────────────────────
    // Each card is a descriptor; its state decides its size: done → a stamp,
    // the first one still to do in the persona's order → the big "Agora",
    // the rest → a short line. A battle that waits on the trainer jumps ahead.
    const championsDone = !isChallengeGuest && dayPlan.total > 0 && dayPlan.done >= dayPlan.total;
    // A battle's art: the partner facing a silhouette (RouteArt.jsx).
    const duoArt = <RouteDuo partnerId={partnerId} partnerShiny={greetingPokemonIsShiny} partnerTone={typeColors[partnerType]} />;
    const routeItems = {
        battles: {
            tone: 'var(--brand-live)',
            art: duoArt,
            live: true,
            kicker: t('cozyHome.dayCards.yourTurn'),
            title: awaitingMeCount === 1 ? t('cozyHome.dayCards.battlesOne') : t('cozyHome.dayCards.battles', { n: awaitingMeCount }),
            sub: t('cozyHome.dayCards.battlesSub'),
            fig: String(awaitingMeCount),
            action: { label: t('cozyHome.route.playNow'), onClick: () => navigate('/battles') },
            onOpen: () => navigate('/battles'),
        },
        invite: {
            tone: typeColors[partnerType],
            art: duoArt,
            kicker: 'PvP',
            title: t('cozyHome.dayCards.inviteTitle'),
            sub: t('cozyHome.dayCards.inviteSub'),
            action: { label: t('cozyHome.route.challengeFriend'), onClick: () => navigate('/battles') },
            onOpen: () => navigate('/battles'),
        },
        puzzle: puzzle.target && {
            tone: puzzleDone ? typeColors[typesById.get(puzzle.target.id)?.[0] || 'normal'] : typeColors.psychic,
            art: (
                <Sprite
                    src={dexSprite(puzzleDone ? puzzle.target.id : puzzle.silhouetteId)}
                    className={`day-sprite ${puzzleDone ? '' : 'pokepuzzle-silhouette'}`}
                />
            ),
            live: !puzzleDone,
            kicker: `#${String(puzzle.target.id).padStart(3, '0')}`,
            title: t('cozyHome.puzzleTitle'),
            sub: t('cozyHome.puzzleOpen', { n: puzzle.target.id }),
            fig: puzzleDone ? null : '0/8',
            action: { label: t('cozyHome.play'), onClick: () => navigate('/pokepuzzle') },
            onOpen: () => navigate('/pokepuzzle'),
            stamp: {
                title: t('cozyHome.route.puzzleStamp', { n: puzzle.target.id }),
                sub: puzzleSolved
                    ? t('cozyHome.puzzleSolved', { n: puzzle.summary.attempts })
                    : (puzzleName ? t('cozyHome.dayCards.puzzleMissed', { name: puzzleName }) : t('cozyHome.dayCards.revealed')),
                mark: puzzleSolved ? 'check' : 'eye',
            },
        },
        champion: {
            tone: challengeMood === 'gold' ? 'var(--brand-gold)' : typeColors.dragon,
            art: <span className="day-trainers">{champArt(focusId, otherId, 'day-trainers')}</span>,
            kicker: [
                t('cozyHome.challengeNextInShort', { ...resetIn, minutes: String(resetIn.minutes).padStart(2, '0') }),
                showBoards ? t('cozyHome.champions.day', { n: dayPlan.done, total: dayPlan.total }) : null,
            ].filter(Boolean).join(' · '),
            title: challengeCopy.title,
            sub: challengeCopy.sub,
            fig: showBoards ? `${dayPlan.done}/${dayPlan.total}` : null,
            extra: (
                <>
                    <span className="cozy-day__lineup" aria-hidden="true">
                        {herSix.map((dex, index) => (
                            <span key={index} className={`cozy-day__mini ${dex ? '' : 'cozy-day__mini--unknown'}`}>
                                {dex
                                    ? <Sprite src={dexSprite(dex)} className={`cozy-day__mini-sprite ${lineupRevealed ? '' : 'pokepuzzle-silhouette'}`} />
                                    : '?'}
                            </span>
                        ))}
                    </span>
                    <span className="route-now__ledger">
                        <ChampionLedger plan={dayPlan} info={championInfo} focus={focusId} isGuest={isChallengeGuest} onOpen={openChampion} />
                    </span>
                </>
            ),
            action: { label: challengeCopy.action.label, onClick: () => navigate(challengeCopy.href) },
            onOpen: () => navigate(challengeCopy.href),
            stamp: {
                title: t('cozyHome.route.championStamp', { done: dayPlan.done, total: dayPlan.total }),
                sub: t('cozyHome.route.championStampSub'),
                mark: dayPlan.champions.some((d) => d.won > 0) ? 'crown' : 'check',
            },
        },
        badge: {
            tone: 'var(--brand-gold)',
            art: <RouteEmblem Icon={nextBadge ? nextBadge.Icon : Sparkles} percent={nextBadge ? nextBadge.progress.percent : 100} earned={!nextBadge} />,
            kicker: nextBadge ? `${nextBadge.progress.current}/${nextBadge.progress.target}` : '★',
            title: nextBadge ? badgeName(nextBadge) : t('cozyHome.allBadges'),
            sub: nextBadge ? (language === 'pt' ? nextBadge.reqPt : nextBadge.reqEn) : t('cozyHome.allBadgesSub'),
            fig: nextBadge ? `${nextBadge.progress.current}/${nextBadge.progress.target}` : null,
            action: { label: t('cozyHome.route.seeBadges'), onClick: () => navigate('/journeys?tab=badges') },
            onOpen: () => navigate('/journeys?tab=badges'),
        },
        meta: metaLeader && {
            tone: typeColors[metaLeaderType],
            art: (
                <>
                    {metaAnswer && <Sprite src={dexSprite(metaAnswer.id)} className="day-sprite day-sprite--duo" />}
                    <Sprite src={dexSprite(metaLeader.id)} className="day-sprite" />
                </>
            ),
            kicker: t('cozyHome.route.metaKicker', { pct: metaLeader.count }),
            title: t('cozyHome.metaLeads', { name: displayName(metaLeader.name) }),
            sub: activeTeam && summary.size > 0
                ? (metaAnswer
                    ? t('cozyHome.metaAnswer', { team: activeTeam.name, answer: displayName(indexById.get(metaAnswer.id)?.name || metaAnswer.name || '') })
                    : t('cozyHome.metaNoAnswer', { team: activeTeam.name }))
                : t('cozyHome.metaShare', { pct: metaLeader.count }),
            fig: `${metaLeader.count}%`,
            action: { label: t('cozyHome.route.seeMeta'), onClick: () => navigate('/meta') },
            onOpen: () => navigate('/meta'),
        },
    };
    const routeStates = {
        battles: awaitingMeCount > 0 ? 'live' : null,
        invite: awaitingMeCount === 0 ? 'open' : null,
        puzzle: puzzle.target ? (puzzleDone ? 'done' : 'open') : null,
        champion: heroKind !== 'challenge' ? (championsDone ? 'done' : 'open') : null,
        badge: 'ambient',
        meta: metaLeader ? 'open' : null,
    };
    const route = dayRoute(
        routeOrder(personaDayCards(trainerProfile), { withChampion: heroKind !== 'challenge' }),
        routeStates,
    );

    const yourDay = (
        <Panel card={false} title={t('cozyHome.route.title')}>
            <DayRoute route={route} items={routeItems} t={t} />
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

    // "Seus times" as party and PC (TeamDeck, 2026-11-12): the team in
    // progress as a party, the next ones as PC boxes; the totals ride the
    // heading instead of a strip of their own.
    const teamsPanel = (limit) => {
        const others = savedTeams
            .filter((team) => team !== activeTeam)
            .slice(0, limit)
            .map((team) => ({ team, summary: summarizeTeam(team, typesById) }));
        return (
            <Panel
                card={false}
                title={t('cozyHome.yourTeams')}
                meta={savedTeams.length > 0
                    ? t('cozyHome.deck.tally', { teams: savedTeams.length, complete: completeCount, favorites: favoritePokemons?.size || 0 })
                    : t('cozyHome.yourTeamsSub')}
                action={(
                    <span className="cozy-panel__tools">
                        {savedTeams.length > limit + 1 && (
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/teams')}>
                                {t('cozyHome.seeAll')} <ChevronRight aria-hidden="true" />
                            </button>
                        )}
                        <button type="button" className="btn btn-secondary btn-icon cozy-round" onClick={startNewTeam} aria-label={t('cozyHome.newTeam')}>
                            <Plus aria-hidden="true" />
                        </button>
                    </span>
                )}
            >
                {!activeTeam ? (
                    <EmptyState
                        compact
                        title={t(`${emptyKey}.title`)}
                        message={t(`${emptyKey}.teams`)}
                        // No button: the hero's "Montar time" and the "+" beside this
                        // heading already start a team (one primary per view).
                    />
                ) : (
                    <TeamDeck
                        active={{ team: activeTeam, summary }}
                        others={others}
                        t={t}
                        status={teamStatus}
                        menu={(team) => <TeamCardMenu team={team} onOpen={() => navigate(`/teams/${team.id}`)} onEdit={() => handleEditTeam(team)} />}
                        subline={(team, s) => [t('cozyHome.ofSix', { n: s.size }), team.updatedAt ? shortWhen(team.updatedAt) : null].filter(Boolean).join(' · ')}
                        onContinue={() => handleEditTeam(activeTeam)}
                        onEdit={handleEditTeam}
                        onNew={startNewTeam}
                    />
                )}
            </Panel>
        );
    };

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
    // Its one mission is the first that is not already a card of the route
    // ("Desafie um amigo" twice, a block apart, was the same door twice).
    const routePaths = new Set([
        routeStates.battles || routeStates.invite ? '/battles' : null,
        routeStates.puzzle ? '/pokepuzzle' : null,
        routeStates.champion ? '/challenge' : null,
        routeStates.meta ? '/meta' : null,
    ].filter(Boolean));
    const openMissions = suggested?.missions.filter((m) => !m.done) || [];
    const upNext = openMissions.find((m) => !routePaths.has((m.to || '').split('?')[0])) || nextMission(suggested);
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
    const picks = homeDoors(trainerProfile, {
        exclude: [
            // The Champion is the hero or a card of the route, every persona.
            'challenge',
            routeStates.puzzle ? 'pokepuzzle' : null,
            routeStates.battles || routeStates.invite ? 'battles' : null,
            routeStates.meta ? 'meta' : null,
            // The team in progress is the hero or the teams block.
            activeTeam ? 'builder' : null,
            // The Traveler's hero is the next gym leader.
            heroKind === 'badges' ? 'gyms' : null,
        ].filter(Boolean),
    });
    // Each door's live reading, where the Home already has it (PersonaDoors).
    const doorLive = {
        meta: metaLeader ? { dex: metaLeader.id, type: metaLeaderType, fig: `${metaLeader.count}%`, label: displayName(metaLeader.name) } : null,
        pokepuzzle: puzzle.target ? (puzzleDone
            ? { dex: puzzle.target.id, fig: puzzleSolved ? `${puzzle.summary.attempts}/8` : '×', label: t('cozyHome.doors.puzzleDone') }
            : { dex: puzzle.silhouetteId || puzzle.target.id, silhouette: true, fig: `#${String(puzzle.target.id).padStart(3, '0')}`, label: t('cozyHome.doors.puzzleOpen') }) : null,
        challenge: !isChallengeGuest ? { fig: `${dayPlan.done}/${dayPlan.total}`, label: t('cozyHome.doors.challenge') } : null,
        battles: awaitingMeCount > 0 ? { fig: String(awaitingMeCount), label: t('cozyHome.doors.battles') } : null,
        builder: activeTeam && summary.members[0] ? { dex: summary.members[0].id, type: summary.members[0].types?.[0], fig: `${summary.size}/6`, label: activeTeam.name } : null,
        pokedex: { fig: '1025', label: 'Pokémon' },
        types: { fig: '18', label: t('cozyHome.doors.types') },
    };
    const forYouPanel = hasAnsweredProfile(trainerProfile) && persona && picks.length > 0 && (
        <Panel
            card={false}
            title={t('onboarding.home.title')}
            meta={t(`onboarding.personas.${persona.id}.name`)}
            action={(
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => openOnboarding('home')}>
                    <Pencil aria-hidden="true" /> {t('onboarding.home.edit')}
                </button>
            )}
        >
            <PersonaDoors picks={picks} live={doorLive} t={t} onOpen={navigate} />
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
    const greeting = (
        <HomeGreeting
            name={trainerName}
            period={period}
            personaId={hasAnsweredProfile(trainerProfile) ? persona?.id : null}
            uid={userId}
            partner={{ id: partnerId, shiny: greetingPokemonIsShiny, type: partnerType, hasPartner }}
            streakCount={streakCount}
            // The mascot's note of the day is the greeting's second line.
            note={note}
            // A guest's way into an account sits here on a phone; the
            // desktop rail's guest card already offers it.
            isAnonymous={isAnonymous && isPhone}
            onOpenPartner={onOpenPokemonSelector}
            onOpenStreak={() => setIsStreakOpen(true)}
            onSignIn={() => promptSignIn('signIn')}
        />
    );
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
        // The party takes two of the four columns, two PC boxes the rest.
        teams: isPhone ? null : teamsPanel(2),
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
