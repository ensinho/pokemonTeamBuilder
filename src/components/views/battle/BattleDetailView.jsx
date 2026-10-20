import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FastForward, MessageSquare, Music, Swords, Volume2, VolumeX } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';

import { useBattles } from '../../../hooks/useBattles';
import { useBattleSound } from '../../../hooks/useBattleSound';
import { useConsoleInput } from '../../../hooks/useConsoleInput';
import { useConsoleLayout, useRailMode } from '../../../hooks/useConsoleLayout';
import { useDocumentMeta } from '../../../hooks/useDocumentMeta';
import { useFirestoreTeams } from '../../../hooks/useFirestoreTeams';
import { useFriends } from '../../../hooks/useFriends';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { useTranslation } from '../../../hooks/useTranslation';
import { useVersusSide } from '../../../hooks/useVersusSide';
import { useAuthStore } from '../../../store/useAuthStore';
import { readLastBattleTeam, useBattlesStore } from '../../../store/useBattlesStore';
import { useForumStore } from '../../../store/useForumStore';
import { toast } from '../../../store/useToastStore';
import { readMyRequest } from '../../../utils/battleProtocol';
import { readBattleField } from '../../../utils/battleState';
import { faintedSpecies, trainerSpriteUrl } from '../../../utils/challengeView';
import { asViewer, opponentRoster, simNameOf } from '../../../utils/pvpView';
import { EmptyState } from '../../EmptyState';
import { Loader } from '../../Loader';
import { ChallengeModal } from '../../modals/ChallengeModal';
import { DsBattleScene } from '../challenge/ds/DsBattleScene';
import { DsBattleStage } from '../challenge/ds/DsBattleStage';
import { DsConsole } from '../challenge/ds/DsConsole';
import { DsVersusLazy } from '../challenge/ds/DsVersusLazy';
import { preloadVersus } from '../challenge/ds/versusChunk';
import { PvpChat } from './PvpChat';
import { PvpLobby } from './PvpLobby';
import { PvpResult } from './PvpResult';
import '../../../styles/champion-challenge-ds.css';
import '../../../styles/battle-pvp.css';

const PRE_BATTLE = new Set(['pending', 'open', 'teamSelect', 'declined', 'cancelled']);
const SEEN_VS_KEY = (battleId) => `ptb:battle:vs:${battleId}`;
// The trainer on the far platform when the opponent's avatar is a Pokémon.
const FALLBACK_FOE_TRAINER = 'acetrainer';
const EMPTY_FIELD = readBattleField([]);

const hasSeenVersus = (battleId) => {
    try {
        return localStorage.getItem(SEEN_VS_KEY(battleId)) === '1';
    } catch (_) {
        return false;
    }
};
const markSeenVersus = (battleId) => {
    try {
        localStorage.setItem(SEEN_VS_KEY(battleId), '1');
    } catch (_) { /* a convenience, best-effort */ }
};

/** How many of a side's Pokémon are still standing, from `|teamsize|` and the faints. */
const standing = (lines, side) => {
    const size = lines.find((line) => line.startsWith(`|teamsize|${side}|`));
    const total = size ? Number(size.split('|')[3]) || 0 : 0;
    return Math.max(0, total - faintedSpecies(lines, side).size);
};

/**
 * `/battles/:battleId` — a battle against a friend, on the Champion
 * Challenge's console: the same field, sprites, move effects, text and
 * sound, with a VS card in the friends' own avatars and music of its own.
 *
 *   lobby ──accept (team + start, one request)──▶ versus ──▶ battle ──▶ result
 *                                                              └── replay
 *
 * ## Cheap on the database
 *
 *  - The log this device has already received is kept on it
 *    (`battleLogCache`): reopening paints at once and the listener asks only
 *    for rounds it doesn't have. Leaving loses nothing.
 *  - A turn's own lines come back in its response and play immediately.
 *  - No polling: the server resolves a round in the request that completes it
 *    (`api/_lib/pvpState.js`), so the listener is the only channel. One silent
 *    probe on opening (and on coming back to the tab) covers a function that
 *    died mid-turn.
 *
 * The viewer is always p1 on screen (`asViewer`), so everything under
 * `challenge/ds/` works unchanged for the trainer who accepted (p2).
 */
export function BattleDetailView() {
    const { t } = useTranslation();
    const { battleId } = useParams();
    const navigate = useNavigate();
    const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
    const layout = useConsoleLayout();
    const [viewRef, railMode] = useRailMode(layout === 'single');
    const railsOn = railMode !== 'none';
    const sound = useBattleSound();

    const userId = useAuthStore((s) => s.userId);
    const myName = useAuthStore((s) => s.trainerDisplayName)();
    const myAvatar = useAuthStore(useShallow((s) => s.publicAvatar()));
    const { battles, hasLoadedBattles } = useBattles();
    const { savedTeams } = useFirestoreTeams();
    const { friends } = useFriends();

    const {
        initChatListener, initLogListener, loadMyTeam, clearOpenBattle,
        myLog, hasLog, myTeam, chatMessages, sendChatMessage,
        submitChoice, isResolvingTurn, isBeginning, isRollingTeams,
        acceptChallenge, declineChallenge, cancelChallenge, submitTeam, rollRandomTeams,
        forfeitBattle, challengeFriend,
    } = useBattlesStore(useShallow((s) => ({
        initChatListener: s.initChatListener,
        initLogListener: s.initLogListener,
        loadMyTeam: s.loadMyTeam,
        clearOpenBattle: s.clearOpenBattle,
        myLog: s.myLog,
        hasLog: s.hasLog,
        myTeam: s.myTeam,
        chatMessages: s.chatMessages,
        sendChatMessage: s.sendChatMessage,
        submitChoice: s.submitChoice,
        isResolvingTurn: s.isResolvingTurn,
        isBeginning: s.isBeginning,
        isRollingTeams: s.isRollingTeams,
        acceptChallenge: s.acceptChallenge,
        declineChallenge: s.declineChallenge,
        cancelChallenge: s.cancelChallenge,
        submitTeam: s.submitTeam,
        rollRandomTeams: s.rollRandomTeams,
        forfeitBattle: s.forfeitBattle,
        challengeFriend: s.challengeFriend,
    })));

    const entry = useMemo(() => battles.find(({ battle }) => battle.id === battleId) || null, [battles, battleId]);
    const battle = entry?.battle || null;
    const view = entry?.view || null;
    const status = battle?.status || null;
    const opponentName = view?.opponentName || (view?.isPublicInvite ? t('battle.openInviteOpponent') : t('friends.unknownTrainer'));
    const opponentAvatar = view?.opponentAvatar || null;

    useDocumentMeta({
        title: view?.opponentName ? `Battle vs ${view.opponentName}` : 'Battle',
        description: 'A turn-by-turn battle against a friend.',
        path: `/battles/${battleId}`,
    });

    useEffect(() => {
        if (!battleId) return undefined;
        initChatListener(battleId);
        initLogListener(battleId);
        loadMyTeam(battleId);
        return () => clearOpenBattle();
    }, [battleId, initChatListener, initLogListener, loadMyTeam, clearOpenBattle]);

    // A random battle accepted elsewhere but never dealt: deal it (the endpoint
    // refuses a second roll, so racing the other player is harmless).
    const rollAttemptedFor = useRef(null);
    useEffect(() => {
        if (!battleId || !view?.canRollRandomTeams || rollAttemptedFor.current === battleId) return;
        rollAttemptedFor.current = battleId;
        rollRandomTeams(battleId);
    }, [battleId, view?.canRollRandomTeams, rollRandomTeams]);
    useEffect(() => {
        if (battle?.randomTeamsRolledAt) loadMyTeam(battleId);
    }, [battleId, battle?.randomTeamsRolledAt, loadMyTeam]);

    // ── The log, from my side, as p1 ──────────────────────────────────────
    const mySide = battle?.challenger === userId ? 'p1' : 'p2';
    const lines = useMemo(() => asViewer(myLog, mySide), [myLog, mySide]);
    const request = useMemo(() => readMyRequest(lines), [lines]);
    // The log's length when it is known — null while it hasn't loaded, so a
    // "you already chose" from the probe isn't pinned to an empty log.
    const linesRef = useRef(null);
    linesRef.current = hasLog ? lines.length : null;
    const currentRound = battle?.turn ?? 0;

    // ── The stage ─────────────────────────────────────────────────────────
    const [stage, setStage] = useState(null); // 'lobby' | 'versus' | 'battle' | 'result'
    const [playIntro, setPlayIntro] = useState(false);
    const [replayKey, setReplayKey] = useState(0);
    useEffect(() => {
        setStage(null);
        setPlayIntro(false);
    }, [battleId]);
    useEffect(() => {
        if (!status) return;
        setStage((previous) => {
            if (PRE_BATTLE.has(status)) return 'lobby';
            if (status === 'active') {
                if (previous === 'battle' || previous === 'versus') return previous;
                // Started on this screen, or opened for the first time since it started.
                return previous === 'lobby' || !hasSeenVersus(battleId) ? 'versus' : 'battle';
            }
            // Ended: a battle playing here plays to its end first (onFinished).
            if (previous === 'battle' || previous === 'versus') return previous;
            return 'result';
        });
    }, [status, battleId]);

    // The VS card's chunk, a step before it is needed: from the lobby, or for a
    // battle that will open on it.
    useEffect(() => {
        if (stage === 'lobby' || stage === 'versus') preloadVersus();
    }, [stage]);

    const handleVersusDone = useCallback(() => {
        markSeenVersus(battleId);
        // From the first line only while it is young: the opening, a turn at most.
        setPlayIntro(!lines.some((line) => line.startsWith('|turn|2')));
        setStage('battle');
    }, [battleId, lines]);

    // ── Choosing, and waiting for the other trainer ──────────────────────
    const [awaiting, setAwaiting] = useState(null); // {round, logLength, label}
    useEffect(() => setAwaiting(null), [battleId]);
    const waitingKnown = Boolean(awaiting && awaiting.round === currentRound
        && (awaiting.logLength === null || awaiting.logLength === lines.length));
    const isWaiting = status === 'active' && (request.kind === 'wait' || waitingKnown || isResolvingTurn);
    const pending = useMemo(() => (isWaiting ? { label: awaiting?.label || null } : null), [isWaiting, awaiting?.label]);

    const handleChoice = useCallback(async (choice, label) => {
        setAwaiting({ round: currentRound, logLength: linesRef.current, label });
        const result = await submitChoice(battleId, choice);
        if (!result) setAwaiting(null);
        else if (result.waitingOnOpponent && !result.waitingOnYou) {
            setAwaiting({ round: result.round ?? currentRound, logLength: linesRef.current, label });
        }
    }, [battleId, currentRound, submitChoice]);

    // One silent probe when the battle is (or goes) live, and on coming back to
    // the tab: it publishes the opening of a battle dealt elsewhere, says
    // whether this round is already answered, and finishes a round whose
    // resolver died. Never a poll.
    const isActive = status === 'active';
    useEffect(() => {
        if (!isActive || !battleId) return undefined;
        let alive = true;
        const probe = () => submitChoice(battleId, null, { silent: true }).then((res) => {
            if (!alive || !res) return;
            if (res.waitingOnOpponent && !res.waitingOnYou) {
                setAwaiting((previous) => ({ round: res.round, logLength: linesRef.current, label: previous?.label || null }));
            }
        });
        probe();
        const onVisibility = () => { if (!document.hidden) probe(); };
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            alive = false;
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [isActive, battleId, submitChoice]);

    // A battle that started under Team Preview (an older one) answers it at once.
    const previewAnswered = useRef(null);
    useEffect(() => {
        if (request.kind !== 'teamPreview' || pending || previewAnswered.current === `${battleId}:${currentRound}`) return;
        previewAnswered.current = `${battleId}:${currentRound}`;
        handleChoice('default', t('battle.teamOrderConfirmed'));
    }, [request.kind, pending, battleId, currentRound, handleChoice, t]);

    // ── The lobby's actions ───────────────────────────────────────────────
    const preferredTeamId = useMemo(readLastBattleTeam, [battleId]);
    const lobbyBusy = isBeginning || isRollingTeams;
    const onAccept = async (team) => {
        await acceptChallenge(battleId, { mode: battle?.mode, team });
    };
    const onSubmitTeam = (team) => submitTeam(battleId, team.members, team.name, team.id);

    // ── Rematch, share, replay ───────────────────────────────────────────
    const friend = useMemo(() => friends.find((f) => f.userId === view?.opponentId) || null, [friends, view?.opponentId]);
    const [rematchOpen, setRematchOpen] = useState(false);
    const onRematch = friend ? () => setRematchOpen(true) : null;

    const shareToForum = async () => {
        if (!view) return;
        const outcomeText = battle.winner === userId
            ? t('battle.result.shareWon', { name: opponentName })
            : battle.winner ? t('battle.result.shareLost', { name: opponentName }) : t('battle.result.shareTie', { name: opponentName });
        const url = `${window.location.origin}${import.meta.env.BASE_URL}battles/${battleId}`.replace(/([^:]\/)\/+/g, '$1');
        const ok = await useForumStore.getState().sendMessage('general', `${outcomeText}\n${url}`);
        if (ok) toast.success(t('battle.shareForumSuccess'));
        else toast.error(t('battle.shareForumError'));
    };

    const outcome = useMemo(() => {
        if (status !== 'ended') return null;
        if (battle.forfeitedBy) return battle.forfeitedBy === userId ? 'forfeitLost' : 'forfeitWon';
        if (!battle.winner) return 'tie';
        return battle.winner === userId ? 'won' : 'lost';
    }, [status, battle?.forfeitedBy, battle?.winner, userId]);

    // ── Chat ──────────────────────────────────────────────────────────────
    const [chatOpen, setChatOpen] = useState(false);
    const [chatSeen, setChatSeen] = useState(0);
    const chatVisible = chatOpen || (railsOn && layout === 'single');
    useEffect(() => {
        if (chatVisible) setChatSeen(chatMessages.length);
    }, [chatVisible, chatMessages.length]);
    const unread = chatVisible ? 0 : chatMessages.slice(chatSeen).filter((m) => m.createdBy !== userId).length;
    const send = (text) => sendChatMessage(battleId, text);
    const chatPanel = (inRail) => (
        <PvpChat
            messages={chatMessages}
            userId={userId}
            onSend={send}
            onClose={inRail ? null : () => setChatOpen(false)}
            inRail={inRail}
        />
    );

    // ── The VS card's two sides ───────────────────────────────────────────
    const versusMe = useVersusSide(userId, { name: myName, tag: t('battle.stage.you'), avatar: myAvatar });
    const versusThem = useVersusSide(view?.opponentId || null, {
        name: opponentName,
        tag: t('battle.stage.rival'),
        avatar: opponentAvatar,
        fallback: FALLBACK_FOE_TRAINER,
    });

    const rival = useMemo(() => ({
        foeSimName: simNameOf(lines, 'p2') || opponentName,
        foeSprite: trainerSpriteUrl(opponentAvatar?.trainerSprite || FALLBACK_FOE_TRAINER),
        foeRoster: opponentRoster,
        pendingText: t('battle.stage.waiting', { name: opponentName }),
        labels: {
            foeButton: t('battle.stage.foeTeamButton'),
            foeTitle: t('battle.stage.foeTeam', { name: opponentName }),
        },
        forfeitCopy: {
            title: t('battle.stage.forfeitTitle'),
            message: t('battle.stage.forfeitMessage', { name: opponentName }),
            confirmText: t('challenge.battle.forfeitConfirm'),
        },
        // `lines` changes per round; the sim name is in the opening, so the
        // object stays put after the first.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [lines.length > 0, opponentName, opponentAvatar?.trainerSprite, t]);

    // ── The console ───────────────────────────────────────────────────────
    const screenInput = useRef(null);
    useConsoleInput({
        enabled: stage === 'lobby' || stage === 'result',
        onAction: (action) => screenInput.current?.onAction?.(action),
    });

    const showChatChip = !(railsOn && layout === 'single');
    const bar = (
        <>
            <button type="button" className="ds-chip is-button" onClick={() => navigate('/battles')} aria-label={t('battle.backToList')} title={t('battle.backToList')}>
                <ArrowLeft className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span className="ds-chip__long">{t('battle.stage.battles')}</span>
            </button>
            <span className="ds-chip is-accent pvp-chip__name">
                <Swords className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span className="pvp-chip__text">{opponentName}</span>
            </span>
            <span className="ds-console__spacer" />
            {showChatChip && (
                <button
                    type="button"
                    className="ds-chip is-button"
                    aria-pressed={chatOpen}
                    onClick={() => setChatOpen((value) => !value)}
                    aria-label={t('battle.chatTitle')}
                    title={t('battle.chatTitle')}
                >
                    <MessageSquare className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    {unread > 0 && <span className="pvp-chip__count">{unread}</span>}
                </button>
            )}
            <button
                type="button"
                className="ds-chip is-button"
                aria-pressed={sound.musicOn}
                onClick={sound.toggleMusic}
                aria-label={t(sound.musicOn ? 'battle.stage.musicOff' : 'battle.stage.musicOn')}
                title={t(sound.musicOn ? 'battle.stage.musicOff' : 'battle.stage.musicOn')}
            >
                <Music className={`w-3.5 h-3.5 shrink-0 ${sound.musicOn ? '' : 'opacity-40'}`} aria-hidden="true" />
            </button>
            <button
                type="button"
                className="ds-chip is-button"
                aria-pressed={!sound.muted}
                onClick={sound.toggleMuted}
                aria-label={t(sound.muted ? 'challenge.console.unmute' : 'challenge.console.mute')}
                title={t(sound.muted ? 'challenge.console.unmute' : 'challenge.console.mute')}
            >
                {sound.muted ? <VolumeX className="w-3.5 h-3.5 shrink-0" aria-hidden="true" /> : <Volume2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
            </button>
            <button type="button" className="ds-chip is-button" aria-pressed={sound.fast} onClick={sound.toggleFast} title={t('challenge.console.speed')}>
                <FastForward className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                {sound.fast ? '2×' : '1×'}
            </button>
        </>
    );
    const chatRail = railsOn && layout === 'single' ? chatPanel(true) : null;
    const rails = railsOn ? { mode: railMode, start: null, end: chatRail, endLabel: t('battle.chatTitle') } : null;

    const rematchModal = rematchOpen && friend && (
        <ChallengeModal
            isOpen
            onClose={() => setRematchOpen(false)}
            friend={friend}
            userId={userId}
            onStartChallenge={async (target, options) => {
                const id = await challengeFriend(target, options);
                if (id) navigate(`/battles/${id}`);
            }}
        />
    );

    if (!battle || !view) {
        return (
            <div className="challenge-view pvp-view">
                {hasLoadedBattles ? (
                    <EmptyState
                        compact
                        title={t('battle.notFoundTitle')}
                        message={t('battle.notFoundMessage')}
                        action={{ label: t('battle.backToList'), onClick: () => navigate('/battles') }}
                    />
                ) : (
                    <div className="challenge-loading"><Loader size="lg" block label={t('battle.stage.loading')} /></div>
                )}
            </div>
        );
    }

    // The far platform with the opponent standing on it — the backdrop of the
    // lobby, the result and the wait for a log.
    const backdrop = (text) => (
        <DsBattleScene
            field={EMPTY_FIELD}
            current={null}
            text={text}
            speaker={null}
            foeBalls={[]}
            myBalls={[]}
            switchKeys={{ p1: 0, p2: 0 }}
            moveMeta={() => null}
            championName={opponentName}
            foeSprite={rival.foeSprite}
            reducedMotion={reducedMotion}
            messageMode={layout === 'single' ? 'none' : 'band'}
        />
    );

    // ── Battle ───────────────────────────────────────────────────────────
    // Mounted only after the VS card: the playback decides at mount whether
    // it plays from the first line (`playIntro`) or picks up where it is.
    if (stage === 'battle' && hasLog && lines.length > 0) {
        const overlay = chatOpen
            ? (layout === 'single' ? <div className="bw-overlay is-menu">{chatPanel(false)}</div> : chatPanel(false))
            : null;
        return (
            <div className="challenge-view pvp-view" ref={viewRef}>
                <DsBattleStage
                    key={`${battleId}:${replayKey}`}
                    run={{ runId: battleId, lines, status: status === 'active' ? 'active' : 'ended', practice: false }}
                    lineup={[]}
                    events={[]}
                    eventsBase={0}
                    pending={pending}
                    championName={opponentName}
                    playIntro={playIntro}
                    fast={sound.fast}
                    reducedMotion={reducedMotion}
                    bar={bar}
                    rails={rails}
                    rival={rival}
                    music="rival"
                    overlay={overlay}
                    onChoose={handleChoice}
                    onForfeit={() => forfeitBattle(battleId)}
                    onFinished={() => setStage('result')}
                />
            </div>
        );
    }

    // ── Lobby, result, or a battle waiting for its log ────────────────────
    let panel;
    let headline = '';
    if (stage === 'result') {
        headline = t(`battle.result.${outcome || 'tie'}`, { name: opponentName });
        panel = (
            <PvpResult
                outcome={outcome || 'tie'}
                opponentName={opponentName}
                turns={readBattleField(lines).turn}
                remaining={standing(lines, 'p1')}
                onRematch={onRematch}
                onReplay={lines.length ? () => {
                    setReplayKey((key) => key + 1);
                    setPlayIntro(true);
                    setStage('battle');
                } : null}
                onShare={shareToForum}
                onBack={() => navigate('/battles')}
                inputRef={screenInput}
            />
        );
    } else if (stage === 'lobby') {
        headline = view.canAccept
            ? t('challenge.text.intro', { name: opponentName })
            : t('battle.stage.vsLine', { name: opponentName });
        panel = (
            <PvpLobby
                view={view}
                opponentName={opponentName}
                savedTeams={savedTeams}
                preferredTeamId={preferredTeamId}
                myTeam={myTeam}
                isBusy={lobbyBusy}
                inputRef={screenInput}
                onAccept={onAccept}
                onDecline={() => declineChallenge(battleId)}
                onCancel={() => cancelChallenge(battleId)}
                onSubmitTeam={onSubmitTeam}
                onRoll={() => rollRandomTeams(battleId)}
                onRematch={onRematch}
                onBack={() => navigate('/battles')}
            />
        );
    } else {
        headline = t('battle.stage.loading');
        panel = <div className="ds-panel pvp-lobby is-loading"><Loader size="md" block label={t('battle.stage.loading')} /></div>;
    }
    const lowerScreen = chatOpen ? chatPanel(false) : panel;

    return (
        <div className="challenge-view pvp-view" ref={viewRef}>
            {layout === 'single' ? (
                <DsConsole
                    layout="single"
                    label={t('battle.stage.consoleLabel', { name: opponentName })}
                    bar={bar}
                    rails={rails}
                    screen={(
                        <>
                            {backdrop(headline)}
                            <div className="bw-overlay is-menu">{lowerScreen}</div>
                        </>
                    )}
                />
            ) : (
                <DsConsole
                    label={t('battle.stage.consoleLabel', { name: opponentName })}
                    bar={bar}
                    top={backdrop(headline)}
                    bottom={lowerScreen}
                    controls={false}
                    onAction={() => {}}
                    onRelease={() => {}}
                />
            )}
            {stage === 'versus' && (
                <DsVersusLazy left={versusMe} right={versusThem} variant="rival" reducedMotion={reducedMotion} onDone={handleVersusDone} />
            )}
            {rematchModal}
        </div>
    );
}
