import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Clock, Crown, FastForward, Flame, Footprints, Music, Trophy, Volume2, VolumeX } from 'lucide-react';
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
import { buildChallengeShare, buildShareText } from '../../../utils/challengeShare';
import { encodeChallengeResult } from '../../../utils/resultShareCode';
import { localizePath } from '../../../utils/localePath';
import { deployBase } from '../../../services/localeHistory';
import { useForumStore } from '../../../store/useForumStore';
import { championRoster, railTeams, timeUntil, trainerSpriteUrl } from '../../../utils/challengeView';
import { EmptyState } from '../../EmptyState';
import { Loader } from '../../Loader';
import { DsArena } from './ds/DsArena';
import { DsBattleReport } from './ds/DsBattleReport';
import { DsBattleStage } from './ds/DsBattleStage';
import { DsConsole } from './ds/DsConsole';
import { DsResult, DsSignInGate } from './ds/DsPanels';
import { DsPoketch } from './ds/DsPoketch';
import { DsTeamPicker } from './ds/DsTeamPicker';
import { DsVersusLazy } from './ds/DsVersusLazy';
import { preloadVersus } from './ds/versusChunk';
import { ChallengeRanking, ChallengeRankingSheet } from './ChallengeRanking';
import { ChallengeTeamsRail } from './ChallengeTeamsRail';
import '../../../styles/champion-challenge-ds.css';
import { ReminderOffer } from '../../ReminderOffer';

const WALKED_KEY = 'ptb:challenge:walked';

const readFlag = (key) => {
    try {
        return localStorage.getItem(key) === '1';
    } catch (_) {
        return false;
    }
};
const writeFlag = (key, on) => {
    try {
        localStorage.setItem(key, on ? '1' : '0');
    } catch (_) { /* a convenience, best-effort */ }
};

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
    const { t, language } = useTranslation();
    const userId = useAuthStore((s) => s.userId);
    const isAnonymous = useAuthStore((s) => s.isAnonymous);
    const isAuthReady = useAuthStore((s) => s.isAuthReady);
    const trainerDisplayName = useAuthStore((s) => s.trainerDisplayName);
    const { savedTeams } = useFirestoreTeams();
    const challenge = useChampionChallenge();
    const { load, reset, start, choose, forfeit } = challenge;
    const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
    // One screen on a desktop (Black & White's single-screen battle), two on a phone.
    const layout = useConsoleLayout();
    // Beside a desktop's one screen, where the column has room: the teams and the ranking.
    const [viewRef, railMode] = useRailMode(layout === 'single');
    const railsOn = railMode !== 'none';

    const [stage, setStage] = useState('arena');
    const [showRanks, setShowRanks] = useState(false);
    // Sound, music and speed — the bar's switches, unlocked by the first press.
    const { muted, toggleMuted, musicOn, toggleMusic, fast, toggleFast } = useBattleSound();
    const [hasWalked] = useState(() => readFlag(WALKED_KEY));
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
    const placed = useRef(false);
    useEffect(() => {
        if (!challenge.hasLoaded || placed.current) return;
        placed.current = true;
        if (challenge.run?.status === 'active' && !isAnonymous) setStage('battle');
    }, [challenge.hasLoaded, challenge.run, isAnonymous]);

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

    const championName = challenge.day?.championName || 'Cynthia';
    // Her six before the battle: nothing revealed yet.
    const dossier = useMemo(() => championRoster([], challenge.day?.lineup || []), [challenge.day]);
    const officialDone = Boolean(challenge.official && challenge.official.status !== 'active');
    const practice = officialDone;

    const dialogue = useMemo(() => {
        if (isAnonymous) return [t('challenge.arena.greet1', { name: championName }), t('challenge.arena.guest')];
        if (officialDone) return [t('challenge.arena.rematch1'), t('challenge.arena.rematch2')];
        return [t('challenge.arena.greet1', { name: championName }), t('challenge.arena.greet2')];
    }, [isAnonymous, officialDone, championName, t]);

    const handleArrive = useCallback(() => {
        writeFlag(WALKED_KEY, true);
        setStage('dialogue');
    }, []);
    const handleDialogueDone = useCallback(() => setStage(isAnonymous ? 'gate' : 'pick'), [isAnonymous]);

    const handleStart = async (team) => {
        const ok = await start({ practice, team, trainerName: trainerDisplayName() });
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
    const difficultyLabel = challenge.day?.difficulty ? t(`challenge.difficulty.${challenge.day.difficulty}`) : null;
    const myBadges = useMemo(
        () => (streak > 0 ? [{ icon: 'flame', label: t('challenge.streak', { count: streak }) }] : []),
        [streak, t],
    );
    const championBadges = useMemo(() => [
        { icon: 'crown', label: t('battle.stage.champion') },
        ...(difficultyLabel ? [{ icon: 'chevrons', label: difficultyLabel }] : []),
    ], [difficultyLabel, t]);
    const versusMe = useVersusSide(userId, {
        name: trainerDisplayName(),
        tag: t('battle.stage.you'),
        avatar: myAvatar,
        badges: myBadges,
    });
    const versusChampion = useMemo(() => ({
        name: championName,
        tag: t('battle.stage.champion'),
        subtitle: difficultyLabel,
        portrait: { src: trainerSpriteUrl('cynthia'), kind: 'trainer' },
        badges: championBadges,
    }), [championName, difficultyLabel, championBadges, t]);

    const handleFinished = useCallback(() => setStage('result'), []);

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
            <span className="ds-chip is-accent">
                <Crown className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                {challenge.day?.difficulty ? t(`challenge.difficulty.${challenge.day.difficulty}`) : championName}
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
            {stage === 'arena' && hasWalked && (
                <button
                    type="button"
                    className="ds-chip is-button"
                    onClick={() => arenaInput.current?.skip?.()}
                    aria-label={t('challenge.arena.skip', { name: championName })}
                    title={t('challenge.arena.skip', { name: championName })}
                >
                    <Footprints className="w-3.5 h-3.5 shrink-0 ds-chip__short" aria-hidden="true" />
                    <span className="ds-chip__long">{t('challenge.arena.skip', { name: championName })}</span>
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
                    <EmptyState
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
            ranks={challenge.ranks}
            defaultBoard={defaultBoard}
            stats={recordStats}
            onClose={() => setShowRanks(false)}
        />
    );
    const ranksRail = railsOn && (
        <ChallengeRanking ranks={challenge.ranks} defaultBoard={defaultBoard} stats={recordStats} />
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
                    inputRef={arenaInput}
                    reducedMotion={reducedMotion}
                    startAtChampion
                />
            );
            // Share today's official result — the share sheet on a phone, the clipboard on a desktop.
            const share = async () => {
                const run = challenge.run;
                const outcome = run.result || {};
                // The link carries the result (`?r=`, utils/resultShareCode.js),
                // so it unfurls as this win or loss (api/og.js), not the generic card.
                const code = encodeChallengeResult(buildChallengeShare({
                    dayKey: challenge.dayKey,
                    difficulty: challenge.day?.difficulty,
                    status: run.status,
                    result: outcome,
                    streak: challenge.stats?.streak || 0,
                    curve: run.winChanceCurve || outcome.winChanceCurve || [],
                }));
                const text = buildShareText({
                    t,
                    date: new Intl.DateTimeFormat(language === 'pt' ? 'pt-BR' : 'en-US', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' }).format(new Date()),
                    difficulty: challenge.day?.difficulty ? t(`challenge.difficulty.${challenge.day.difficulty}`) : championName,
                    status: run.status,
                    result: outcome,
                    streak: challenge.stats?.streak || 0,
                    place: outcome.place || null,
                    boardLabel: outcome.board ? t(`challenge.ranking.${outcome.board}`) : '',
                    curve: run.winChanceCurve || outcome.winChanceCurve || [],
                    url: `${window.location.origin}${localizePath('/challenge', language, deployBase())}${code ? `?r=${code}` : ''}`,
                });
                if (window.matchMedia?.('(pointer: coarse)').matches && navigator.share) {
                    try {
                        await navigator.share({ text });
                        return;
                    } catch (error) {
                        if (error?.name === 'AbortError') return;
                    }
                }
                // Post the result to the forum's general thread, as the PokéPuzzle does.
                const postToForum = async () => {
                    const forum = useForumStore.getState();
                    const general = forum.topics.find((topic) => topic.category === 'general')
                        || forum.topics.find((topic) => /general/i.test(topic.title || ''));
                    const ok = await forum.sendMessage(general ? general.id : 'general', '', null, null, {
                        sharedChallenge: buildChallengeShare({
                            dayKey: challenge.dayKey,
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
                };
                try {
                    await navigator.clipboard.writeText(text);
                    toast.success(t('challenge.share.copied'), { actions: [{ label: t('challenge.share.postForum'), onClick: postToForum }] });
                } catch (_) {
                    toast.error(t('challenge.share.copyFailed'), { actions: [{ label: t('challenge.share.postForum'), onClick: postToForum }] });
                }
            };
            const result = (
                <DsResult
                    run={challenge.run}
                    stats={challenge.stats}
                    inputRef={screenInput}
                    onPractice={() => setStage('pick')}
                    onShare={challenge.run.practice ? undefined : share}
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
        const menu = ((stage === 'gate' || stage === 'pick' || stage === 'transition') && bottom);
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

