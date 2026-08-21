import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, MessageSquare, RefreshCw, Share2 } from 'lucide-react';

import { useBattles } from '../../../hooks/useBattles';
import { useBattlesStore } from '../../../store/useBattlesStore';
import { useForumStore } from '../../../store/useForumStore';
import { useToastStore } from '../../../store/useToastStore';
import { useFirestoreTeams } from '../../../hooks/useFirestoreTeams';
import { useAuthStore } from '../../../store/useAuthStore';
import { useTranslation } from '../../../hooks/useTranslation';
import { useDocumentMeta } from '../../../hooks/useDocumentMeta';
import { useMoveTypes } from '../../../hooks/useMoveTypes';
import { AvatarSprite } from '../../AvatarSprite';
import { EmptyState } from '../../EmptyState';
import { PokeballIcon } from '../../icons';
import { getPokemonFrontSpriteUrl, getTeamPokemonDisplaySprite } from '../../../utils/pokemonSprites';
import { readMyRequest, describeLogLines } from '../../../utils/battleProtocol';
import { readBattleField, parseCondition, hpTone } from '../../../utils/battleState';
import { getBattleIcon } from '../../../utils/battleSprites';
import { Battlefield } from './Battlefield';
import { BattleLogPanel } from './BattleLogPanel';
import { TooltipTrigger, MoveTooltipCard, MonTooltipCard } from './BattlePopover';
import { typeColors, typeIcons } from '../../../constants/types';
import { POKEBALL_PLACEHOLDER_URL } from '../../../constants/theme';
import '../../../styles/battle-view.css';

const ANIMATED_SPRITES_KEY = 'ptb:battleAnimatedSprites';
const CHOICE_STORAGE_KEY = (battleId, round) => `ptb:battleChoice:${battleId}:${round}`;

/**
 * Six slots of sprite icons — the team preview bar.
 */
function TeamSpriteBar({ sprites = [], showLevels = false }) {
    return (
        <div className="battle-team-bar">
            {Array.from({ length: 6 }).map((_, index) => {
                const mon = sprites[index];
                return (
                    <span key={index} className="battle-team-bar__slot" title={mon?.name || ''}>
                        {mon ? (
                            <>
                                <img
                                    src={getPokemonFrontSpriteUrl(mon.id)}
                                    alt={mon.name || ''}
                                    loading="lazy"
                                    onError={(event) => { event.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                                />
                                {showLevels && mon.level && (
                                    <span className="battle-team-bar__level">L{mon.level}</span>
                                )}
                            </>
                        ) : (
                            <PokeballIcon className="w-4 h-4 text-muted opacity-20" />
                        )}
                    </span>
                );
            })}
        </div>
    );
}

/**
 * Turn indicator banner with manual sync refresh button.
 */
function TurnBanner({ waiting, opponentName, choiceLabel, t, language, onSync, isSyncing }) {
    return (
        <div className={`battle-turn-banner ${waiting ? 'is-waiting' : 'is-yours'}`}>
            {waiting ? (
                <span className="battle-turn-banner__dots" aria-hidden="true">
                    <span /><span /><span />
                </span>
            ) : (
                <span className="battle-turn-banner__icon" aria-hidden="true" />
            )}
            <span className="battle-turn-banner__text">
                {waiting ? t('battle.waitingOpponentTurn', { name: opponentName }) : t('battle.turnYours')}
            </span>
            {waiting && choiceLabel && (
                <span className="battle-turn-banner__choice">{t('battle.youChose', { choice: choiceLabel })}</span>
            )}
            {waiting && onSync && (
                <button
                    type="button"
                    className="battle-turn-banner__sync-btn"
                    disabled={isSyncing}
                    onClick={onSync}
                    title={language === 'pt' ? 'Sincronizar turno com servidor' : 'Sync turn with server'}
                >
                    <RefreshCw className={`w-3.5 h-3.5 inline-block ${isSyncing ? 'animate-spin' : ''}`} />
                    <span className="sync-text">{language === 'pt' ? 'Sincronizar' : 'Sync'}</span>
                </button>
            )}
        </div>
    );
}

/** Move button styled with type color chip accents. */
function MoveOption({ move, disabled, onClick, typeForMove }) {
    const mType = typeForMove ? typeForMove(move.name) : null;
    const color = mType ? typeColors[mType] : null;
    const iconUrl = mType ? typeIcons[mType] : null;

    return (
        <button
            key={move.slot}
            type="button"
            className="battle-move battle-move--chip"
            disabled={disabled}
            onClick={onClick}
            style={color ? {
                '--move-type-color': color,
                borderColor: `${color}99`,
                background: `linear-gradient(135deg, color-mix(in srgb, ${color} 22%, var(--color-surface)) 0%, var(--color-surface) 100%)`,
            } : {}}
        >
            <div className="battle-move__header">
                {iconUrl ? (
                    <img src={iconUrl} alt={mType || ''} className="battle-move__type-icon" />
                ) : mType ? (
                    <span className="battle-move__type-tag" style={{ backgroundColor: color }}>
                        {mType}
                    </span>
                ) : null}
                <span className="battle-move__name">{move.name}</span>
            </div>
            {Number.isFinite(move.pp) && (
                <span className="battle-move__pp">{move.pp}/{move.maxpp} PP</span>
            )}
        </button>
    );
}

/** A switch option button */
function SwitchOption({ mon, disabled, onClick }) {
    const icon = getBattleIcon(mon.name);
    const condition = parseCondition(mon.condition);
    return (
        <button
            type="button"
            className="battle-move battle-move--switch"
            disabled={disabled}
            onClick={onClick}
        >
            <span className="battle-move__icon">
                {icon.url ? (
                    <img src={icon.url} alt={mon.name} loading="lazy" />
                ) : (
                    <PokeballIcon className="w-5 h-5 text-muted opacity-40" />
                )}
            </span>
            <span className="battle-move__body">
                <span className="battle-move__name">{mon.name}</span>
                {condition && (
                    <span className="battle-move__hp">
                        <span className={`battle-move__hp-track is-${hpTone(condition.pct)}`}>
                            <span className="battle-move__hp-fill" style={{ width: `${condition.pct}%` }} />
                        </span>
                        <span className="battle-move__hp-text">
                            {condition.max ? `${condition.current}/${condition.max}` : `${Math.round(condition.pct)}%`}
                        </span>
                    </span>
                )}
            </span>
        </button>
    );
}

export function BattleDetailView() {
    const { t, language } = useTranslation();
    const { battleId } = useParams();
    const navigate = useNavigate();

    const userId = useAuthStore((state) => state.userId);
    const { battles } = useBattles();
    const { savedTeams } = useFirestoreTeams();
    const { typeForMove } = useMoveTypes();

    const {
        acceptChallenge, declineChallenge, cancelChallenge,
        submitTeam, startBattle, deleteBattle,
        loadMyTeam, myTeam, initChatListener, clearOpenBattle,
        chatMessages, sendChatMessage,
        initLogListener, myLog, submitChoice, isResolvingTurn,
        rollRandomTeams, isRollingTeams,
    } = useBattlesStore();

    const entry = useMemo(
        () => battles.find(({ battle }) => battle.id === battleId) || null,
        [battles, battleId],
    );
    const battle = entry?.battle || null;
    const view = entry?.view || null;

    useDocumentMeta({
        title: view?.opponentName ? `Battle vs ${view.opponentName}` : 'Battle',
        description: 'A turn-by-turn battle against a friend.',
        path: `/battles/${battleId}`,
    });

    const [selectedTeamId, setSelectedTeamId] = useState('');
    const [chatDraft, setChatDraft] = useState('');
    const [activeSideTab, setActiveSideTab] = useState('log'); // 'log' | 'chat'
    const chatEndRef = useRef(null);

    const [animatedSprites, setAnimatedSprites] = useState(() => {
        try {
            return localStorage.getItem(ANIMATED_SPRITES_KEY) !== '0';
        } catch (_) {
            return true;
        }
    });

    const toggleAnimatedSprites = () => {
        setAnimatedSprites((previous) => {
            const next = !previous;
            try {
                localStorage.setItem(ANIMATED_SPRITES_KEY, next ? '1' : '0');
            } catch (_) { /* preference best-effort */ }
            return next;
        });
    };

    const currentRound = battle?.turn ?? 0;
    const [awaitingRound, setAwaitingRound] = useState(null);
    const [awaitingLogLength, setAwaitingLogLength] = useState(null);
    const [lastChoiceLabel, setLastChoiceLabel] = useState(null);

    useEffect(() => {
        setAwaitingRound(null);
        setAwaitingLogLength(null);
        setLastChoiceLabel(null);
    }, [battleId]);

    useEffect(() => {
        if (!battleId) return undefined;
        initChatListener(battleId);
        initLogListener(battleId);
        loadMyTeam(battleId);
        return () => clearOpenBattle();
    }, [battleId, initChatListener, initLogListener, loadMyTeam, clearOpenBattle]);

    const rollAttemptedFor = useRef(null);
    useEffect(() => {
        if (!battleId || !view?.canRollRandomTeams) return;
        if (rollAttemptedFor.current === battleId) return;
        rollAttemptedFor.current = battleId;
        rollRandomTeams(battleId);
    }, [battleId, view?.canRollRandomTeams, rollRandomTeams]);

    useEffect(() => {
        if (battle?.randomTeamsRolledAt) loadMyTeam(battleId);
    }, [battleId, battle?.randomTeamsRolledAt, loadMyTeam]);

    useEffect(() => {
        if (activeSideTab === 'chat') {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [chatMessages.length, activeSideTab]);

    const myRequest = useMemo(() => readMyRequest(myLog), [myLog]);
    const transcript = useMemo(() => describeLogLines(myLog), [myLog]);
    const field = useMemo(() => readBattleField(myLog), [myLog]);

    const selectedTeam = useMemo(
        () => savedTeams.find((team) => team.id === selectedTeamId) || null,
        [savedTeams, selectedTeamId],
    );

    const isWaitingForOpponent = myRequest.kind === 'wait'
        || (awaitingRound === currentRound && (awaitingLogLength === null || awaitingLogLength === myLog.length));

    // Persistent Choice State across page switches/reloads:
    useEffect(() => {
        let isMounted = true;
        if (battle?.status === 'active' && battleId) {
            // Restore persistent choice label if saved for this round
            try {
                const savedLabel = localStorage.getItem(CHOICE_STORAGE_KEY(battleId, currentRound));
                if (savedLabel && isMounted) {
                    setLastChoiceLabel(savedLabel);
                }
            } catch (_) {}

            // Check choice status with server authoritative resolver
            submitChoice(battleId, null).then((res) => {
                if (!isMounted || !res) return;
                if (res.waitingOnOpponent && !res.waitingOnYou) {
                    setAwaitingRound(res.round ?? currentRound);
                    setAwaitingLogLength(myLog.length);
                }
            });
        }
        return () => { isMounted = false; };
    }, [battleId, battle?.status, battle?.turn, submitChoice, currentRound, myLog.length]);

    // Auto-sync polling every 5s while waiting for opponent to eliminate turn deadlocks
    useEffect(() => {
        if (!isWaitingForOpponent || !battleId || battle?.status !== 'active') return undefined;
        const interval = setInterval(() => {
            submitChoice(battleId, null).then((res) => {
                if (res && res.waitingOnOpponent && !res.waitingOnYou) {
                    setAwaitingRound(res.round ?? currentRound);
                }
            });
        }, 5000);
        return () => clearInterval(interval);
    }, [isWaitingForOpponent, battleId, battle?.status, currentRound, submitChoice]);

    useEffect(() => {
        if (!isWaitingForOpponent) {
            setAwaitingRound(null);
            setAwaitingLogLength(null);
            setLastChoiceLabel(null);
        }
    }, [isWaitingForOpponent]);

    const handleChoice = async (choice, label) => {
        try {
            localStorage.setItem(CHOICE_STORAGE_KEY(battleId, currentRound), label);
        } catch (_) {}

        setAwaitingRound(currentRound);
        setAwaitingLogLength(myLog.length);
        setLastChoiceLabel(label);

        const result = await submitChoice(battleId, choice);
        if (!result) {
            setAwaitingRound(null);
            setAwaitingLogLength(null);
            setLastChoiceLabel(null);
        } else if (result.waitingOnOpponent && !result.waitingOnYou) {
            setAwaitingRound(result.round ?? currentRound);
            setAwaitingLogLength(myLog.length);
        }
    };

    const handleManualSync = () => {
        submitChoice(battleId, null).then((res) => {
            if (res && res.waitingOnOpponent && !res.waitingOnYou) {
                setAwaitingRound(res.round ?? currentRound);
            }
        });
    };

    // Auto-confirm lead order during teamPreview without requiring manual click
    const autoConfirmedPreviewFor = useRef(null);
    useEffect(() => {
        if (
            myRequest.kind === 'teamPreview'
            && !isWaitingForOpponent
            && !isResolvingTurn
            && autoConfirmedPreviewFor.current !== `${battleId}:${currentRound}`
        ) {
            autoConfirmedPreviewFor.current = `${battleId}:${currentRound}`;
            handleChoice('default', t('battle.teamOrderConfirmed'));
        }
    }, [myRequest.kind, isWaitingForOpponent, isResolvingTurn, battleId, currentRound, handleChoice, t]);

    const [isSharingForum, setIsSharingForum] = useState(false);
    const showToast = useToastStore((state) => state.showToast);
    const sendMessage = useForumStore((state) => state.sendMessage);

    const handleShareResultToForum = async () => {
        if (isSharingForum || !view) return;
        setIsSharingForum(true);
        try {
            const opponent = view.opponentName || t('friends.unknownTrainer');
            let summaryText = '';
            if (view.winner === userId) {
                summaryText = language === 'pt'
                    ? `Venci a batalha contra @${opponent}!`
                    : `I won the battle against @${opponent}!`;
            } else if (view.winner) {
                summaryText = language === 'pt'
                    ? `@${opponent} venceu a batalha contra mim.`
                    : `@${opponent} won the battle against me.`;
            } else {
                summaryText = language === 'pt'
                    ? `Batalha empatada contra @${opponent}!`
                    : `Battle tied against @${opponent}!`;
            }

            const replayUrl = `${window.location.origin}${window.location.pathname}#/battles/${battleId}`;
            const fullMsg = `${summaryText}\n${language === 'pt' ? 'Assista o replay' : 'Watch the replay'}: ${replayUrl}`;

            const ok = await sendMessage('general', fullMsg);
            if (ok) {
                showToast(t('battle.shareForumSuccess'), 'success');
            } else {
                showToast(t('battle.shareForumError'), 'error');
            }
        } catch (err) {
            console.error('Error sharing battle to forum:', err);
            showToast(t('battle.shareForumError'), 'error');
        } finally {
            setIsSharingForum(false);
        }
    };

    if (!battle || !view) {
        return (
            <div className="battle-view">
                <EmptyState
                    compact
                    title={t('battle.notFoundTitle')}
                    message={t('battle.notFoundMessage')}
                    action={{ label: t('battle.backToList'), onClick: () => navigate('/battles') }}
                />
            </div>
        );
    }

    const handleSubmitTeam = async () => {
        if (!selectedTeam) return;
        const ok = await submitTeam(battleId, selectedTeam.pokemons, selectedTeam.name);
        if (ok) loadMyTeam(battleId);
    };

    const handleSend = async (event) => {
        event.preventDefault();
        const text = chatDraft;
        setChatDraft('');
        const ok = await sendChatMessage(battleId, text);
        if (!ok) setChatDraft(text);
    };

    return (
        <div className="battle-view">
            {/* ── Sleek top bar with inline opponent identity ───────── */}
            <div className="battle-nav-bar flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => navigate('/battles')}
                    >
                        {t('battle.backBtn')}
                    </button>

                    <div className="battle-nav-opponent flex items-center gap-2">
                        <span className="battle-header__avatar battle-header__avatar--sm">
                            <AvatarSprite
                                trainerSprite={view.opponentAvatar?.trainerSprite}
                                pokemonId={view.opponentAvatar?.pokemonId}
                                isShiny={view.opponentAvatar?.isShiny}
                                fallback={<PokeballIcon className="w-5 h-5 text-muted opacity-50" />}
                            />
                        </span>
                        <div className="battle-nav-opponent__text">
                            <h2 className="battle-nav-opponent__name">
                                {view.opponentName || t('friends.unknownTrainer')}
                            </h2>
                            <span className="battle-nav-opponent__meta">
                                {view.isRandom
                                    ? t('battle.randomFormatLine', { format: battle.format })
                                    : t('battle.formatLine', { format: battle.format, level: battle.level })}
                            </span>
                        </div>
                    </div>
                </div>

                <button
                    type="button"
                    className="btn btn-ghost btn-sm text-red-400 hover:text-red-300"
                    onClick={async () => {
                        if (window.confirm(t('battle.confirmDiscard'))) {
                            const ok = await deleteBattle(battleId);
                            if (ok) navigate('/battles');
                        }
                    }}
                >
                    {t('battle.discardBattle')}
                </button>
            </div>

            <div className="battle-layout">
                <div className="battle-layout__main">
                    <section className="battle-panel">
                        <h3 className="battle-panel__title">{t('battle.statusTitle')}</h3>

                        {view.status === 'pending' && (
                            <>
                                <p className="battle-panel__copy">
                                    {view.isChallenger ? t('battle.pendingSent') : t('battle.pendingReceived')}
                                </p>
                                {view.isRandom && (
                                    <p className="battle-panel__copy">{t('battle.randomPendingHint')}</p>
                                )}
                                <div className="battle-actions">
                                    {view.canAccept && (
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            onClick={() => acceptChallenge(battleId, { mode: battle.mode })}
                                        >
                                            {t('battle.accept')}
                                        </button>
                                    )}
                                    {view.canDecline && (
                                        <button type="button" className="btn btn-outline" onClick={() => declineChallenge(battleId)}>
                                            {t('battle.decline')}
                                        </button>
                                    )}
                                    {view.canCancel && (
                                        <button type="button" className="btn btn-outline" onClick={() => cancelChallenge(battleId)}>
                                            {t('battle.cancelChallenge')}
                                        </button>
                                    )}
                                </div>
                            </>
                        )}

                        {view.status === 'teamSelect' && view.isRandom && (
                            <>
                                <p className="battle-panel__copy">{t('battle.randomDealing')}</p>
                                <div className="battle-actions">
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        disabled={isRollingTeams}
                                        onClick={() => rollRandomTeams(battleId)}
                                    >
                                        {isRollingTeams ? t('battle.randomDealingBtnBusy') : t('battle.randomDealBtn')}
                                    </button>
                                </div>
                            </>
                        )}

                        {view.status === 'teamSelect' && !view.isRandom && (
                            <>
                                <div className="battle-ready">
                                    <span className={`battle-ready__side ${view.myReady ? 'is-ready' : ''}`}>
                                        {view.myReady ? t('battle.yourTeamIn') : t('battle.yourTeamPending')}
                                    </span>
                                    <span className={`battle-ready__side ${view.theirReady ? 'is-ready' : ''}`}>
                                        {view.theirReady ? t('battle.theirTeamIn') : t('battle.theirTeamPending')}
                                    </span>
                                </div>

                                {view.canSubmitTeam ? (
                                    savedTeams.length === 0 ? (
                                        <EmptyState
                                            compact
                                            title={t('battle.noTeamsTitle')}
                                            message={t('battle.noTeamsMessage')}
                                            action={{ label: t('battle.goToBuilder'), onClick: () => navigate('/builder') }}
                                        />
                                    ) : (
                                        <div className="battle-team-picker">
                                            <label htmlFor="battle-team-select" className="battle-panel__label">
                                                {t('battle.chooseTeam')}
                                            </label>
                                            <select
                                                id="battle-team-select"
                                                className="input-clean"
                                                value={selectedTeamId}
                                                onChange={(event) => setSelectedTeamId(event.target.value)}
                                            >
                                                <option value="">{t('battle.chooseTeamPlaceholder')}</option>
                                                {savedTeams.map((team) => (
                                                    <option key={team.id} value={team.id}>
                                                        {team.name} ({team.pokemons?.length || 0})
                                                    </option>
                                                ))}
                                            </select>

                                            {selectedTeam && (
                                                <div className="battle-team-preview">
                                                    {(selectedTeam.pokemons || []).slice(0, 6).map((mon, index) => (
                                                        <img
                                                            key={mon.instanceId || index}
                                                            src={getTeamPokemonDisplaySprite(mon)}
                                                            alt={mon.name}
                                                            loading="lazy"
                                                            onError={(event) => { event.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                                                        />
                                                    ))}
                                                </div>
                                            )}

                                            <button
                                                type="button"
                                                className="btn btn-primary"
                                                disabled={!selectedTeam}
                                                onClick={handleSubmitTeam}
                                            >
                                                {t('battle.lockTeam')}
                                            </button>
                                        </div>
                                    )
                                ) : (
                                    myTeam && (
                                        <div className="battle-locked-team">
                                            <p className="battle-panel__label">
                                                {t('battle.yourLockedTeam', { name: myTeam.teamName })}
                                            </p>
                                            <TeamSpriteBar sprites={myTeam.sprites} />
                                        </div>
                                    )
                                )}

                                {view.canStart && (
                                    <div className="battle-actions">
                                        <button type="button" className="btn btn-primary" onClick={() => startBattle(battleId)}>
                                            {t('battle.startBattle')}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}

                        {view.status === 'active' && (
                            <>
                                {view.isRandom && myTeam?.sprites?.length > 0 && (
                                    <div className="battle-locked-team">
                                        <p className="battle-panel__label">{t('battle.randomYourTeam')}</p>
                                        <TeamSpriteBar sprites={myTeam.sprites} showLevels />
                                    </div>
                                )}

                                <Battlefield
                                    field={field}
                                    animated={animatedSprites}
                                    onToggleAnimated={toggleAnimatedSprites}
                                />

                                {myRequest.kind === 'none' && (
                                    <p className="battle-panel__copy">
                                        {isResolvingTurn ? t('battle.syncing') : t('battle.noPromptYet')}
                                    </p>
                                )}

                                {myRequest.kind !== 'none' && (
                                    <div className="battle-choices">
                                        <TurnBanner
                                            waiting={isWaitingForOpponent}
                                            opponentName={view.opponentName || t('friends.unknownTrainer')}
                                            choiceLabel={lastChoiceLabel}
                                            t={t}
                                            language={language}
                                            onSync={handleManualSync}
                                            isSyncing={isResolvingTurn}
                                        />

                                        {!isWaitingForOpponent && myRequest.kind === 'teamPreview' && (
                                            <p className="battle-panel__copy flex items-center justify-center gap-2 py-2 text-primary font-semibold animate-pulse">
                                                <RefreshCw className="w-4 h-4 animate-spin text-primary shrink-0" />
                                                <span>{t('battle.syncing')}</span>
                                            </p>
                                        )}

                                        {!isWaitingForOpponent && (myRequest.kind === 'move' || myRequest.kind === 'switch') && (
                                            <>
                                                {myRequest.kind === 'move' && (
                                                    <>
                                                        <p className="battle-panel__label">{t('battle.chooseMove')}</p>
                                                        <div className="battle-choices__grid">
                                                            {myRequest.moves.map((move) => (
                                                                <TooltipTrigger
                                                                    key={move.slot}
                                                                    tooltipContent={
                                                                        <MoveTooltipCard
                                                                            moveName={move.name}
                                                                            currentPP={move.pp}
                                                                            maxPP={move.maxpp}
                                                                        />
                                                                    }
                                                                >
                                                                    <MoveOption
                                                                        move={move}
                                                                        disabled={move.disabled || isResolvingTurn}
                                                                        onClick={() => handleChoice(`move ${move.slot}`, move.name)}
                                                                        typeForMove={typeForMove}
                                                                    />
                                                                </TooltipTrigger>
                                                            ))}
                                                        </div>
                                                    </>
                                                )}

                                                {myRequest.switches.length > 0 && (
                                                    <>
                                                        <p className="battle-panel__label">
                                                            {myRequest.kind === 'switch' ? t('battle.mustSwitch') : t('battle.orSwitch')}
                                                        </p>
                                                        <div className="battle-choices__grid">
                                                            {myRequest.switches.map((mon) => (
                                                                <TooltipTrigger
                                                                    key={mon.slot}
                                                                    tooltipContent={
                                                                        <MonTooltipCard
                                                                            speciesName={mon.name}
                                                                            hpCondition={mon.condition}
                                                                        />
                                                                    }
                                                                >
                                                                    <SwitchOption
                                                                        mon={mon}
                                                                        disabled={isResolvingTurn}
                                                                        onClick={() => handleChoice(
                                                                            `switch ${mon.slot}`,
                                                                            t('battle.switchChoiceLabel', { name: mon.name }),
                                                                        )}
                                                                    />
                                                                </TooltipTrigger>
                                                            ))}
                                                        </div>
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}
                            </>
                        )}

                        {view.isOver && (
                            <>
                                <p className="battle-panel__copy">{t(`battle.status_${view.status}`)}</p>
                                <div className="battle-actions flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        className="btn btn-primary flex items-center gap-1.5"
                                        disabled={isSharingForum}
                                        onClick={handleShareResultToForum}
                                    >
                                        <Share2 className="w-4 h-4" />
                                        <span>{t('battle.shareForum')}</span>
                                    </button>

                                    {view.canDelete && (
                                        <button
                                            type="button"
                                            className="btn btn-outline"
                                            onClick={async () => {
                                                const ok = await deleteBattle(battleId);
                                                if (ok) navigate('/battles');
                                            }}
                                        >
                                            {t('battle.dismiss')}
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </section>
                </div>

                {/* ── Right-Side Tabbed Panel (Registro de batalha & Conversa) ── */}
                <aside className="battle-layout__side">
                    <div className="battle-side-tabs">
                        <button
                            type="button"
                            className={`battle-side-tab ${activeSideTab === 'log' ? 'is-active' : ''}`}
                            onClick={() => setActiveSideTab('log')}
                        >
                            <FileText className="w-4 h-4 inline-block mr-1" />
                            <span>{language === 'pt' ? 'Registro' : 'Log'}</span>
                            {transcript.length > 0 && <span className="battle-side-tab__count">{transcript.length}</span>}
                        </button>
                        <button
                            type="button"
                            className={`battle-side-tab ${activeSideTab === 'chat' ? 'is-active' : ''}`}
                            onClick={() => setActiveSideTab('chat')}
                        >
                            <MessageSquare className="w-4 h-4 inline-block mr-1" />
                            <span>{language === 'pt' ? 'Chat' : 'Chat'}</span>
                            {chatMessages.length > 0 && <span className="battle-side-tab__count">{chatMessages.length}</span>}
                        </button>
                    </div>

                    <div className="battle-side-content">
                        {activeSideTab === 'log' ? (
                            <section className="battle-panel battle-panel--side-log">
                                <h3 className="battle-panel__title">
                                    {language === 'pt' ? 'Registro de Batalha' : 'Battle Log'}
                                </h3>
                                <BattleLogPanel logEntries={transcript} />
                            </section>
                        ) : (
                            <section className="battle-panel battle-panel--side-chat">
                                <h3 className="battle-panel__title">{t('battle.chatTitle')}</h3>

                                <ul className="battle-chat">
                                    {chatMessages.length === 0 ? (
                                        <li className="battle-chat__empty">{t('battle.chatEmpty')}</li>
                                    ) : (
                                        chatMessages.map((message) => (
                                            <li
                                                key={message.id}
                                                className={`battle-chat__row ${message.createdBy === userId ? 'is-mine' : ''}`}
                                            >
                                                <span className="battle-chat__avatar">
                                                    <AvatarSprite
                                                        trainerSprite={message.creatorTrainerSprite}
                                                        pokemonId={message.creatorAvatar}
                                                        isShiny={message.creatorAvatarIsShiny}
                                                        fallback={<PokeballIcon className="w-4 h-4 text-muted opacity-40" />}
                                                    />
                                                </span>
                                                <span className="battle-chat__bubble">
                                                    <span className="battle-chat__author">{message.creatorName}</span>
                                                    <span className="battle-chat__text">{message.text}</span>
                                                </span>
                                            </li>
                                        ))
                                    )}
                                    <li ref={chatEndRef} aria-hidden="true" />
                                </ul>

                                <form className="battle-chat__composer" onSubmit={handleSend}>
                                    <input
                                        type="text"
                                        className="input-clean"
                                        maxLength={500}
                                        placeholder={t('battle.chatPlaceholder')}
                                        value={chatDraft}
                                        onChange={(event) => setChatDraft(event.target.value)}
                                    />
                                    <button type="submit" className="btn btn-primary" disabled={!chatDraft.trim()}>
                                        {language === 'pt' ? 'Enviar' : 'Send'}
                                    </button>
                                </form>
                            </section>
                        )}
                    </div>
                </aside>
            </div>
        </div>
    );
}
