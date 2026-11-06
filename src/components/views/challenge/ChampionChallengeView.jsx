import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Clock, Crown, FastForward, Flame, Music, Trophy, Volume2, VolumeX,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';

import { useChampionChallenge } from '../../../hooks/useChampionChallenge';
import { useConsoleInput } from '../../../hooks/useConsoleInput';
import { useConsoleLayout, useRailMode } from '../../../hooks/useConsoleLayout';
import { SITE_URL, useDocumentMeta } from '../../../hooks/useDocumentMeta';
import { useFirestoreTeams } from '../../../hooks/useFirestoreTeams';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { useTranslation } from '../../../hooks/useTranslation';
import { useVersusSide } from '../../../hooks/useVersusSide';
import { useBattleSound } from '../../../hooks/useBattleSound';
import { useAuthStore } from '../../../store/useAuthStore';
import { useChampionChallengeStore } from '../../../store/useChampionChallengeStore';
import { toast } from '../../../store/useToastStore';
import { buildChallengeShare } from '../../../utils/challengeShare';
import { useForumStore } from '../../../store/useForumStore';
import { championArt } from '../../../utils/challengeArt';
import { CHAMPION_IDS, CHAMPION_NAMES, difficultyLabel as championDifficulty, isChampion } from '../../../utils/challengeChampions';
import { championRoster, railTeams, timeUntil } from '../../../utils/challengeView';
import { EmptyState } from '../../EmptyState';
import { Loader } from '../../Loader';
import { DsArena } from './ds/DsArena';
import { DsBattleReport } from './ds/DsBattleReport';
import { DsBattleStage } from './ds/DsBattleStage';
import { DsConsole } from './ds/DsConsole';
import { DsChampionHint, DsResult, DsSignInGate } from './ds/DsPanels';
import { DsPoketch } from './ds/DsPoketch';
import { DsTeamPicker } from './ds/DsTeamPicker';
import { DsVersusLazy } from './ds/DsVersusLazy';
import { preloadVersus } from './ds/versusChunk';
import { ChallengeRanking, ChallengeRankingSheet } from './ChallengeRanking';
import { ChallengeTeamsRail } from './ChallengeTeamsRail';
import '../../../styles/champion-challenge-ds.css';
import { ReminderOffer } from '../../ReminderOffer';
import { nudgeSupport, cancelSupportNudge } from '../../../services/supportNudge';
import { refreshChallengeRecord, useChallengeRecord } from '../../../services/challengeRecord';
import { challengeBadgesEarned } from '../../../constants/badges';
import { celebrateBadgeOnce } from '../../../hooks/useTrainerBadges';

/**
 * `/challenge` — the daily battle against the Champion, in a DS console
 * (plan: docs/plans/daily-champion-challenge.md; system: docs/modules/daily_challenge.md).
 *
 *   arena ──walk to her──▶ dialogue ──▶ pick (or gate, for a guest)
 *     ──start──▶ transition (the VS card) ──▶ battle ──every moment played──▶ result
 *                                                 └── practice ──▶ pick
 *
 * Reloading mid-battle lands straight back in the battle. The screen reads
 * through the `state` action, which also warms the function while the player
 * walks.
 */
export function ChampionChallengeView() {
    const { t } = useTranslation();
    const userId = useAuthStore((s) => s.userId);
    const isAnonymous = useAuthStore((s) => s.isAnonymous);
    const isAuthReady = useAuthStore((s) => s.isAuthReady);
    const trainerDisplayName = useAuthStore((s) => s.trainerDisplayName);
    const { savedTeams } = useFirestoreTeams();
    // Read before the battle ends, so the result can tell what it just earned.
    useChallengeRecord(userId, isAnonymous);
    const challenge = useChampionChallenge();
    const { load, reset, start, choose, forfeit, selectChampion } = challenge;
    const { championId } = challenge;
    const art = championArt(championId);
    const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
    // One screen on a desktop (Black & White's single-screen battle), two on a phone.
    const layout = useConsoleLayout();
    // Beside a desktop's one screen, where the column has room: the teams and the ranking.
    const [viewRef, railMode] = useRailMode(layout === 'single');
    const railsOn = railMode !== 'none';

    const [stage, setStage] = useState('arena');
    const [showRanks, setShowRanks] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    // Sound, music and speed — the bar's switches, unlocked by the first press.
    const { muted, toggleMuted, musicOn, toggleMusic, fast, toggleFast } = useBattleSound();
    const [startedRunId, setStartedRunId] = useState(null);
    const arenaInput = useRef(null);
    const screenInput = useRef(null);

    useDocumentMeta({ title: t('challenge.title'), description: t('challenge.metaDescription'), image: `${SITE_URL}/challenge-og.png`, path: '/challenge' });

    // Load on arrival and whenever the account changes (another uid wipes the
    // previous one's state; a guest who signs in keeps theirs).
    const lastUser = useRef(null);
    useEffect(() => {
        if (!isAuthReady || !userId) return;
        if (lastUser.current && lastUser.current !== userId) reset();
        lastUser.current = userId;
        load();
    }, [isAuthReady, userId, isAnonymous, load, reset]);

    // First answer: a battle in progress resumes at once; anything else starts in the room.
    // Picking another champion places the screen again, from their answer.
    const placed = useRef(false);
    useEffect(() => {
        if (!challenge.hasLoaded || placed.current || !challenge.day) return;
        placed.current = true;
        if (challenge.run?.status === 'active' && !isAnonymous) setStage('battle');
    }, [challenge.hasLoaded, challenge.day, challenge.run, isAnonymous]);

    // `?champion=blue` opens on that champion (a link from the "next champion" card or a post).
    const [searchParams, setSearchParams] = useSearchParams();
    const askedChampion = searchParams.get('champion');
    const [hintDismissed, setHintDismissed] = useState(false);
    // Both champions stand in the room; walking up to one makes the screen theirs.
    const switchChampion = useCallback(async (id) => {
        if (id === useChampionChallengeStore.getState().championId) return true;
        setStartedRunId(null);
        setHintDismissed(false);
        setSearchParams((params) => {
            const next = new URLSearchParams(params);
            next.set('champion', id);
            return next;
        }, { replace: true });
        return selectChampion(id);
    }, [selectChampion, setSearchParams]);
    useEffect(() => {
        if (isChampion(askedChampion) && askedChampion !== useChampionChallengeStore.getState().championId) {
            selectChampion(askedChampion);
            placed.current = false;
        }
    }, [askedChampion, selectChampion]);

    // A guest who signs in at the gate goes on to choose a team.
    useEffect(() => {
        if (stage === 'gate' && !isAnonymous && challenge.hasLoaded) setStage('pick');
    }, [stage, isAnonymous, challenge.hasLoaded]);

    // The day turns while the page is open: fetch the new team.
    const { nextResetAt } = challenge;
    useEffect(() => {
        if (!nextResetAt) return undefined;
        const delay = nextResetAt - Date.now() + 1500;
        if (delay > 2 ** 31 - 1) return undefined;
        const timer = setTimeout(load, Math.max(1000, delay));
        return () => clearTimeout(timer);
    }, [nextResetAt, load]);

    const championName = challenge.day?.championName || CHAMPION_NAMES[championId] || 'Cynthia';
    // Her six before the battle: nothing revealed yet.
    const dossier = useMemo(() => championRoster([], challenge.day?.lineup || []), [challenge.day]);
    // The first battle with the Time do dia and the first with your own team each
    // count for their own board; after that, that board's battles are practice.
    const officials = challenge.officials || { daily: challenge.official, free: null };
    const dailyDone = Boolean(officials.daily && officials.daily.status !== 'active');
    const freeDone = Boolean(officials.free && officials.free.status !== 'active');
    const practice = useMemo(() => ({ daily: dailyDone, free: freeDone }), [dailyDone, freeDone]);
    const officialDone = dailyDone || freeDone;

    const dialogue = useMemo(() => {
        // "I am Cynthia, the Champion" is gendered in Portuguese: each champion has their own.
        const greet = t(championId === 'cynthia' ? 'challenge.arena.greet1' : `challenge.champions.${championId}.arena.greet1`, { name: championName });
        if (isAnonymous) return [greet, t('challenge.arena.guest')];
        if (practice.daily && practice.free) return [t('challenge.arena.rematch1'), t('challenge.arena.rematch2')];
        // One board played: the other one still counts today.
        if (officialDone) {
            return [t('challenge.arena.rematch1'), t('challenge.arena.otherBoard', { board: t(`challenge.ranking.${practice.daily ? 'free' : 'daily'}`) })];
        }
        return [greet, t('challenge.arena.greet2')];
    }, [isAnonymous, practice, officialDone, championId, championName, t]);

    // Who you beat today: a ✓ on their plate in the room.
    const beaten = useMemo(() => (challenge.champions || []).filter((c) => c.won).map((c) => c.id), [challenge.champions]);

    // Another champion waiting: for a trainer who has beaten this one (ever) and
    // hasn't played the other today.
    const nextChampion = useMemo(() => {
        if (isAnonymous || !challenge.champions) return null;
        const here = challenge.champions.find((c) => c.id === championId);
        if (!here?.won && !(challenge.stats?.wins > 0)) return null;
        return challenge.champions.find((c) => c.id !== championId && !c.played) || null;
    }, [isAnonymous, challenge.champions, challenge.stats, championId]);

    // Reaching a champion: their day first (their lines depend on what you played
    // against them), then their dialogue — or straight back into a battle in progress.
    const handleArrive = useCallback(async (id) => {
        const ok = await switchChampion(id);
        if (!ok) {
            arenaInput.current?.release?.();
            return;
        }
        if (useChampionChallengeStore.getState().run?.status === 'active' && !isAnonymous) {
            setStage('battle');
            return;
        }
        setStage('dialogue');
    }, [switchChampion, isAnonymous]);
    const hintToasted = useRef(new Set());
    useEffect(() => {
        if (layout !== 'single' || stage !== 'arena' || !nextChampion) return;
        const key = `${championId}>${nextChampion.id}`;
        if (hintToasted.current.has(key)) return;
        hintToasted.current.add(key);
        toast.info(t('challenge.hint.title', { name: nextChampion.name }), {
            description: t('challenge.hint.body', { beaten: championName, name: nextChampion.name }),
            actions: [{ label: t('challenge.hint.go', { name: nextChampion.name }), onClick: () => arenaInput.current?.skip?.(nextChampion.id) }],
        });
    }, [layout, stage, nextChampion, championId, championName, t]);

    const handleDialogueDone = useCallback(() => setStage(isAnonymous ? 'gate' : 'pick'), [isAnonymous]);

    const handleStart = async (team, isPractice) => {
        const ok = await start({ practice: isPractice, team, trainerName: trainerDisplayName() });
        if (!ok) return;
        useAuthStore.getState().markJourney('challengePlayed');
        // Only a battle started here plays its opening; a resumed one picks up where it was.
        setStartedRunId(useChampionChallengeStore.getState().run?.runId || null);
        // The VS card plays over the room; it hands over to the battle when it leaves.
        setStage('transition');
    };
    const handleVersusDone = useCallback(() => setStage('battle'), []);
    // The VS card's chunk, a step before it is needed.
    useEffect(() => {
        if (stage === 'pick') preloadVersus();
    }, [stage]);

    // The two sides of the VS card: you (your avatar, title and level, the
    // streak) and her (the day's difficulty).
    const myAvatar = useAuthStore(useShallow((s) => s.publicAvatar()));
    const streak = challenge.stats?.streak || 0;
    const difficultyLabel = championDifficulty(t, championId, challenge.day?.difficulty);
    const myBadges = useMemo(
        () => (streak > 0 ? [{ icon: 'flame', label: t('challenge.streak', { count: streak }) }] : []),
        [streak, t],
    );
    // "CAMPEÃ" is Cynthia's: another champion carries their own title.
    const championTitle = t(championId === 'cynthia' ? 'battle.stage.champion' : `challenge.champions.${championId}.title`);
    const championBadges = useMemo(() => [
        { icon: 'crown', label: championTitle },
        ...(difficultyLabel ? [{ icon: 'chevrons', label: difficultyLabel }] : []),
    ], [difficultyLabel, championTitle]);
    const versusMe = useVersusSide(userId, {
        name: trainerDisplayName(),
        tag: t('battle.stage.you'),
        avatar: myAvatar,
        badges: myBadges,
    });
    const versusChampion = useMemo(() => ({
        name: championName,
        tag: championTitle,
        subtitle: difficultyLabel,
        portrait: { src: art.versus, kind: 'trainer' },
        badges: championBadges,
    }), [championName, championTitle, difficultyLabel, championBadges, art.versus]);

    // After the result has landed, so the coffee never covers the outcome. Held
    // in a ref: leaving the result (or the page) cancels it.
    const nudgeTimerRef = useRef(0);
    const handleFinished = useCallback(() => {
        setStage('result');
        window.clearTimeout(nudgeTimerRef.current);
        nudgeTimerRef.current = window.setTimeout(() => nudgeSupport('challenge'), 2500);
        // An official result may have earned a challenge badge (Coroa Dupla, the
        // champions' journey…): read the runs again and celebrate what this
        // battle unlocked — the badge takes the coffee's moment.
        const { run: ended } = useChampionChallengeStore.getState();
        if (!ended || ended.practice) return;
        refreshChallengeRecord(useAuthStore.getState().userId).then(({ before, after }) => {
            const [earned] = challengeBadgesEarned(before, after);
            if (earned && celebrateBadgeOnce(earned)) {
                window.clearTimeout(nudgeTimerRef.current);
                cancelSupportNudge();
            }
        });
    }, []);
    useEffect(() => {
        if (stage === 'result') return undefined;
        window.clearTimeout(nudgeTimerRef.current);
        cancelSupportNudge();
        return undefined;
    }, [stage]);
    useEffect(() => () => {
        window.clearTimeout(nudgeTimerRef.current);
        cancelSupportNudge();
    }, []);

    // One keyboard for the console; each stage takes it in turn.
    useConsoleInput({
        enabled: stage !== 'battle',
        onAction: (action) => {
            // The ranking sheet is a dialog: it owns the keyboard while open (useConsoleInput).
            if (stage === 'arena' || stage === 'dialogue') arenaInput.current?.onAction?.(action);
            else screenInput.current?.onAction?.(action);
        },
        onRelease: (action) => arenaInput.current?.onRelease?.(action),
    });
    const route = (action) => {
        if (stage === 'arena' || stage === 'dialogue') arenaInput.current?.onAction?.(action);
        else screenInput.current?.onAction?.(action);
    };

    const { hours, minutes } = timeUntil(nextResetAt);
    const bar = (
        <>
            {/* The day's difficulty, under the names of the champion last faced; a
                phone keeps the crown (the label is on the VS card). */}
            <span className="ds-chip is-accent" title={difficultyLabel || championName}>
                <Crown className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span className="ds-chip__long">{difficultyLabel || championName}</span>
            </span>
            {nextResetAt && (
                // A phone gets the short form: one row of chips has to fit above the screens.
                <span className="ds-chip" title={t('challenge.nextIn', { hours, minutes })}>
                    <Clock className="w-3.5 h-3.5 shrink-0 ds-chip__short" aria-hidden="true" />
                    <span className="ds-chip__long">{t('challenge.nextIn', { hours, minutes })}</span>
                    <span className="ds-chip__short">{t('challenge.nextInShort', { hours, minutes })}</span>
                </span>
            )}
            {!isAnonymous && challenge.stats?.streak > 0 && (
                <span className="ds-chip">
                    <Flame className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    {t('challenge.streak', { count: challenge.stats.streak })}
                </span>
            )}
            <span className="ds-console__spacer" />
            {/* After today's win: the moment tomorrow's team is worth a nudge. */}
            <ReminderOffer variant="chip" topic="challenge" active={challenge.run?.status === 'won' && !challenge.run?.practice} />
            {stage !== 'battle' && stage !== 'transition' && !railsOn && (
                <button
                    type="button"
                    className="ds-chip is-button"
                    aria-pressed={showRanks}
                    onClick={() => setShowRanks((value) => !value)}
                    aria-label={t('challenge.ranking.chip')}
                    title={t('challenge.ranking.chip')}
                >
                    <Trophy className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span className="ds-chip__long">{t('challenge.ranking.chip')}</span>
                </button>
            )}
            <button
                type="button"
                className="ds-chip is-button"
                aria-pressed={musicOn}
                onClick={toggleMusic}
                aria-label={t(musicOn ? 'battle.stage.musicOff' : 'battle.stage.musicOn')}
                title={t(musicOn ? 'battle.stage.musicOff' : 'battle.stage.musicOn')}
            >
                <Music className={`w-3.5 h-3.5 shrink-0 ${musicOn ? '' : 'opacity-40'}`} aria-hidden="true" />
            </button>
            <button
                type="button"
                className="ds-chip is-button"
                aria-pressed={!muted}
                onClick={toggleMuted}
                aria-label={t(muted ? 'challenge.console.unmute' : 'challenge.console.mute')}
                title={t(muted ? 'challenge.console.unmute' : 'challenge.console.mute')}
            >
                {muted ? <VolumeX className="w-3.5 h-3.5 shrink-0" aria-hidden="true" /> : <Volume2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
            </button>
            <button type="button" className="ds-chip is-button" aria-pressed={fast} onClick={toggleFast} title={t('challenge.console.speed')}>
                <FastForward className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                {fast ? '2×' : '1×'}
            </button>
        </>
    );

    if (!challenge.hasLoaded) {
        return (
            <div className="challenge-view">
                {challenge.status === 'error' ? (
                    <EmptyState mascot="error"
                        title={t('challenge.loadErrorTitle')}
                        message={t(`challenge.errors.${challenge.loadError === 'offline' ? 'offline' : 'server'}`)}
                        action={{ label: t('challenge.retry'), onClick: load }}
                    />
                ) : (
                    <div className="challenge-loading"><Loader size="lg" block label={t('challenge.loading', { name: championName })} /></div>
                )}
            </div>
        );
    }

    // The day's ranking, on the board of today's official run: a side rail where
    // there is room beside the screen, an app sheet over the page where there is not.
    const defaultBoard = (challenge.official?.result?.board) || (challenge.run?.teamSource === 'saved' ? 'free' : 'daily');
    const recordStats = isAnonymous ? null : challenge.stats;
    const rankingSheet = showRanks && !railsOn && (
        <ChallengeRankingSheet
            ranksByChampion={challenge.ranksByChampion}
            championId={championId}
            note={difficultyLabel}
            defaultBoard={defaultBoard}
            stats={recordStats}
            onClose={() => setShowRanks(false)}
        />
    );
    const ranksRail = railsOn && (
        <ChallengeRanking key={championId} ranksByChampion={challenge.ranksByChampion} championId={championId} defaultBoard={defaultBoard} stats={recordStats} />
    );
    const railsWith = (start) => (railsOn ? { mode: railMode, start, end: ranksRail } : null);

    if ((stage === 'battle' || stage === 'result') && challenge.run) {
        if (stage === 'result') {
            const hasChart = (challenge.run.winChanceCurve || challenge.run.result?.winChanceCurve)?.length > 1;
            const report = hasChart ? (
                <DsBattleReport run={challenge.run} championName={championName} />
            ) : (
                <DsArena
                    key="result-room"
                    mode="frozen"
                    championName={championName}
                    championId={championId}
                    beaten={beaten}
                    inputRef={arenaInput}
                    reducedMotion={reducedMotion}
                    startAtChampion
                />
            );
            // Share posts the official result to the forum's general thread in one
            // press, as the PokéPuzzle does (sendMessage reports its own failures).
            const share = async () => {
                if (isSharing) return;
                const run = challenge.run;
                const outcome = run.result || {};
                setIsSharing(true);
                try {
                    const forum = useForumStore.getState();
                    const general = forum.topics.find((topic) => topic.category === 'general')
                        || forum.topics.find((topic) => /general/i.test(topic.title || ''));
                    const ok = await forum.sendMessage(general ? general.id : 'general', '', null, null, {
                        sharedChallenge: buildChallengeShare({
                            dayKey: challenge.dayKey,
                            championId,
                            difficulty: challenge.day?.difficulty,
                            status: run.status,
                            result: outcome,
                            streak: challenge.stats?.streak || 0,
                            place: outcome.place || null,
                            board: outcome.board || null,
                            curve: run.winChanceCurve || outcome.winChanceCurve || [],
                        }),
                    });
                    if (ok) toast.success(t('challenge.share.posted'));
                } finally {
                    setIsSharing(false);
                }
            };
            const result = (
                <DsResult
                    run={challenge.run}
                    stats={challenge.stats}
                    inputRef={screenInput}
                    onPractice={() => setStage('pick')}
                    onShare={challenge.run.practice ? undefined : share}
                    isSharing={isSharing}
                    // Back to the room — where another champion may be waiting.
                    onBack={() => setStage('arena')}
                />
            );
            const teams = railsOn && railTeams(challenge.run.lines || [], challenge.day?.lineup || []);
            return (
                <div className="challenge-view" ref={viewRef}>
                    {layout === 'single' ? (
                        <DsConsole
                            layout="single"
                            label={t('challenge.title')}
                            bar={bar}
                            rails={railsWith(teams && (
                                <ChallengeTeamsRail title={t('challenge.rail.yourTeam')} mine={teams.mine} foe={teams.foe} championName={championName} />
                            ))}
                            // The chart above, the outcome and the next step in a strip below it.
                            screen={(
                                <>
                                    {hasChart ? <div className="bw-result"><div className="bw-result__report">{report}</div>{result}</div> : result}
                                </>
                            )}
                        />
                    ) : (
                        <DsConsole
                            label={t('challenge.title')}
                            bar={bar}
                            top={report}
                            bottom={result}
                            onAction={route}
                            onRelease={() => {}}
                            controls={false}
                        />
                    )}
                    {rankingSheet}
                </div>
            );
        }
        return (
            <div className="challenge-view" ref={viewRef}>
                <DsBattleStage
                    key={challenge.run.runId}
                    run={challenge.run}
                    lineup={challenge.day?.lineup || []}
                    events={challenge.events}
                    eventsBase={challenge.eventsBase}
                    pending={challenge.pending}
                    championName={championName}
                    championSprite={art.battle}
                    stats={challenge.stats}
                    nextResetAt={nextResetAt}
                    playIntro={challenge.run.runId === startedRunId}
                    fast={fast}
                    reducedMotion={reducedMotion}
                    bar={bar}
                    rails={railsOn ? { mode: railMode, end: ranksRail } : null}
                    onChoose={choose}
                    onForfeit={forfeit}
                    onFinished={handleFinished}
                />
            </div>
        );
    }

    // The room: walking, the encounter, choosing a team, the gate.
    const atChampion = stage === 'pick' || stage === 'gate' || stage === 'transition';
    let bottom = (
        <DsPoketch
            team={(challenge.day?.dailyTeam?.members || []).map((m) => ({ species: m.species }))}
            foe={dossier}
            championName={championName}
            nextResetAt={nextResetAt}
            stats={challenge.stats}
            todayStatus={challenge.official?.status || 'none'}
        />
    );
    // On a phone the card takes the bottom screen; on a desktop it would cover the
    // room where both champions stand, so it is a toast there (below, once a visit).
    const hint = layout !== 'single' && stage === 'arena' && nextChampion && !hintDismissed && (
        <DsChampionHint
            beatenName={championName}
            nextName={nextChampion.name}
            // Walks you to them: the room is where you choose.
            onGo={() => arenaInput.current?.skip?.(nextChampion.id)}
            onDismiss={() => setHintDismissed(true)}
        />
    );
    if (hint) bottom = hint;
    if (stage === 'gate') bottom = <DsSignInGate championName={championName} onCancel={() => setStage('arena')} />;
    if (stage === 'pick' || stage === 'transition') {
        bottom = (
            <DsTeamPicker
                savedTeams={savedTeams}
                dailyMembers={challenge.day?.dailyTeam?.members || []}
                practice={practice}
                championName={championName}
                isStarting={challenge.isStarting}
                teamErrors={challenge.teamErrors}
                onStart={handleStart}
                onCancel={() => setStage('arena')}
                inputRef={screenInput}
            />
        );
    }

    const room = (
        <>
            <DsArena
                mode={stage === 'arena' ? 'walk' : stage === 'dialogue' ? 'dialogue' : 'frozen'}
                dialogue={dialogue}
                championName={championName}
                championId={championId}
                beaten={beaten}
                inputRef={arenaInput}
                onArrive={handleArrive}
                onDialogueDone={handleDialogueDone}
                reducedMotion={reducedMotion}
                startAtChampion={atChampion}
            />
        </>
    );
    const transition = stage === 'transition' && (
        <DsVersusLazy left={versusMe} right={versusChampion} variant="champion" reducedMotion={reducedMotion} onDone={handleVersusDone} />
    );

    if (layout === 'single') {
        // One screen: the room, and the choice of team (or the gate) opening over it as a menu.
        const menu = ((stage === 'gate' || stage === 'pick' || stage === 'transition' || hint) && bottom);
        return (
            <div className="challenge-view" ref={viewRef}>
                <DsConsole
                    layout="single"
                    label={t('challenge.title')}
                    bar={bar}
                    rails={railsWith(railsOn && (
                        <ChallengeTeamsRail
                            title={t('challenge.rail.dailyTeam')}
                            mine={(challenge.day?.dailyTeam?.members || []).map((m) => ({ species: m.species }))}
                            foe={dossier}
                            championName={championName}
                        />
                    ))}
                    screen={(
                        <>
                            {room}
                            {menu && <div className="bw-overlay is-menu">{menu}</div>}
                            {transition}
                        </>
                    )}
                />
                {rankingSheet}
            </div>
        );
    }

    return (
        <div className="challenge-view" ref={viewRef}>
            <DsConsole
                label={t('challenge.title')}
                bar={bar}
                top={<>{room}{transition}</>}
                bottom={bottom}
                onAction={route}
                onRelease={(action) => arenaInput.current?.onRelease?.(action)}
                controls={stage === 'arena' || stage === 'dialogue'}
            />
            {rankingSheet}
        </div>
    );
}

