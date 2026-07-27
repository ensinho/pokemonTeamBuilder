import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { useBattles } from '../../../hooks/useBattles';
import { useBattlesStore } from '../../../store/useBattlesStore';
import { useFirestoreTeams } from '../../../hooks/useFirestoreTeams';
import { useAuthStore } from '../../../store/useAuthStore';
import { useTranslation } from '../../../hooks/useTranslation';
import { useDocumentMeta } from '../../../hooks/useDocumentMeta';
import { AvatarSprite } from '../../AvatarSprite';
import { EmptyState } from '../../EmptyState';
import { PokeballIcon } from '../../icons';
import { getPokemonFrontSpriteUrl, getTeamPokemonDisplaySprite } from '../../../utils/pokemonSprites';
import { readMyRequest, describeLogLines } from '../../../utils/battleProtocol';
import { readBattleField, parseCondition, hpTone } from '../../../utils/battleState';
import { getBattleIcon } from '../../../utils/battleSprites';
import { Battlefield } from './Battlefield';
import { POKEBALL_PLACEHOLDER_URL } from '../../../constants/theme';
import '../../../styles/battle-view.css';

const ANIMATED_SPRITES_KEY = 'ptb:battleAnimatedSprites';

/**
 * Six slots of sprite icons — the team preview bar.
 *
 * `showLevels` is for random battles, where the level is the balancing mechanism
 * rather than a constant: a team of L95 Gumshoos and a L69 Eternatus is the
 * generator doing its job, and hiding that would make the matchup look lopsided.
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
 * The turn indicator. It's the single clearest signal in the whole screen: a
 * glowing "your turn" strip while a choice is owed, replaced the instant you
 * submit one by a muted "waiting" strip — so clicking a move always produces an
 * unmistakable visual change, even before the network round-trip lands.
 */
function TurnBanner({ waiting, opponentName, choiceLabel, t }) {
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
        </div>
    );
}

/** A switch option: sprite, name, and a mini HP bar — everything the team-select
 *  team bar already shows, just sized for a button in the choice grid. */
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
    const chatEndRef = useRef(null);

    // Animated sprites are ~80 KB each, so slow connections get a way out. The
    // choice is remembered; storage is best-effort, as everywhere else here.
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
            } catch (_) { /* a preference is not worth throwing over */ }
            return next;
        });
    };

    // The server never confirms "I've recorded your choice, now wait" as a
    // durable log line — it only says so in the HTTP response, because nothing
    // is resolved (and so nothing is written to my log) until *both* players
    // have chosen. So the "waiting for opponent" state has to be tracked here,
    // optimistically, the moment a choice is sent — otherwise clicking a move
    // looks like it did nothing until the opponent, possibly hours later, also
    // moves. `awaitingRound` is compared against the battle's live `turn` on
    // every render, so it self-clears the instant the round actually advances.
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

    // Ask the resolver for the current position when an active battle opens. This
    // is also what generates the seed on first contact.
    useEffect(() => {
        if (battle?.status === 'active') submitChoice(battleId, null);
        // Intentionally keyed on the battle's turn: re-sync once per round, not on
        // every unrelated re-render.
    }, [battleId, battle?.status, battle?.turn, submitChoice]);

    // An accepted random battle that hasn't been dealt yet. The roll normally
    // rides the accept, so reaching here means that call didn't land — a closed
    // tab, a dropped connection — or that this is the *challenger*, who never
    // touched accept and would otherwise sit on an empty screen. One attempt per
    // visit: the endpoint is idempotent, but a roll that keeps failing must not
    // become a retry loop.
    const rollAttemptedFor = useRef(null);
    useEffect(() => {
        if (!battleId || !view?.canRollRandomTeams) return;
        if (rollAttemptedFor.current === battleId) return;
        rollAttemptedFor.current = battleId;
        rollRandomTeams(battleId);
    }, [battleId, view?.canRollRandomTeams, rollRandomTeams]);

    // The other player may be the one who triggers the roll, and this screen was
    // already open when they did: the team document appears from under us, and
    // the mount-time read found nothing. The battle doc's roll timestamp is the
    // signal that it exists now.
    useEffect(() => {
        if (battle?.randomTeamsRolledAt) loadMyTeam(battleId);
    }, [battleId, battle?.randomTeamsRolledAt, loadMyTeam]);

    // Keep the chat pinned to the newest message. `block: 'nearest'` so only the
    // chat column scrolls — scrolling the whole page would yank the battle out of
    // view every time either trainer talks.
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, [chatMessages.length]);

    const myRequest = useMemo(() => readMyRequest(myLog), [myLog]);
    const transcript = useMemo(() => describeLogLines(myLog), [myLog]);
    const field = useMemo(() => readBattleField(myLog), [myLog]);

    const selectedTeam = useMemo(
        () => savedTeams.find((team) => team.id === selectedTeamId) || null,
        [savedTeams, selectedTeamId],
    );

    const currentRound = battle?.turn ?? 0;
    // `myRequest.kind === 'wait'` is the sim's own signal (e.g. only one side
    // needs a mid-turn switch). Otherwise this is this component's own
    // optimistic memory of "I already answered this one" — true only while
    // *both* the round number and my own log are still exactly what they were
    // the moment I clicked. Either one moving on (the round resolves, or the
    // opponent's turn appends fresh lines to my log) clears it, whichever the
    // two independent Firestore listeners deliver first.
    const isWaitingForOpponent = myRequest.kind === 'wait'
        || (awaitingRound === currentRound && awaitingLogLength === myLog.length);

    // Once we're no longer waiting, drop the memory of what we submitted —
    // otherwise a stale "you chose X" could bleed into a later round that
    // happens to land on the same round number by coincidence.
    useEffect(() => {
        if (!isWaitingForOpponent) {
            setAwaitingRound(null);
            setAwaitingLogLength(null);
            setLastChoiceLabel(null);
        }
    }, [isWaitingForOpponent]);

    // Every move/switch/team-preview button routes through here so the "waiting"
    // state flips on immediately, before the fetch even resolves.
    const handleChoice = async (choice, label) => {
        setAwaitingRound(currentRound);
        setAwaitingLogLength(myLog.length);
        setLastChoiceLabel(label);
        const result = await submitChoice(battleId, choice);
        if (!result) {
            // The request failed outright — nothing was recorded, so let them retry.
            setAwaitingRound(null);
            setAwaitingLogLength(null);
            setLastChoiceLabel(null);
        }
    };

    // The live list is the source of truth; while it loads, `entry` is null.
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
        if (!ok) setChatDraft(text);   // keep what they typed if it failed
    };

    return (
        <div className="battle-view">
            {/* ── Navigation top bar ─────────────────────────────────── */}
            <div className="battle-nav-bar flex items-center justify-between gap-2 mb-3">
                <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => navigate('/battles')}
                >
                    {t('battle.backBtn')}
                </button>

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

            {/* ── Opponent header ─────────────────────────────────────── */}
            <header className="battle-header">
                <span className="battle-header__avatar">
                    <AvatarSprite
                        trainerSprite={view.opponentAvatar?.trainerSprite}
                        pokemonId={view.opponentAvatar?.pokemonId}
                        isShiny={view.opponentAvatar?.isShiny}
                        fallback={<PokeballIcon className="w-6 h-6 text-muted opacity-50" />}
                    />
                </span>
                <div className="battle-header__identity">
                    <p className="battle-header__eyebrow">{t('battle.versus')}</p>
                    <h2 className="battle-header__name">
                        {view.opponentName || t('friends.unknownTrainer')}
                    </h2>
                    <p className="battle-header__meta">
                        {/* A random battle has no single level to name — each
                            Pokémon gets one that offsets how strong it is. */}
                        {view.isRandom
                            ? t('battle.randomFormatLine', { format: battle.format })
                            : t('battle.formatLine', { format: battle.format, level: battle.level })}
                    </p>
                </div>
            </header>

            <div className="battle-layout">
                <div className="battle-layout__main">
            {/* ── Lifecycle actions ───────────────────────────────────── */}
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

                {/* A random battle has nothing to select: the server deals both
                    sides and flips the battle to active in one write, so this is
                    a brief "dealing…" state and, if the roll failed, the way back. */}
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
                        {/* The reveal. In a random battle this is the first time
                            the player sees what they were dealt, and the levels
                            are the interesting part — see TeamSpriteBar. */}
                        {view.isRandom && myTeam?.sprites?.length > 0 && (
                            <div className="battle-locked-team">
                                <p className="battle-panel__label">{t('battle.randomYourTeam')}</p>
                                <TeamSpriteBar sprites={myTeam.sprites} showLevels />
                            </div>
                        )}

                        <Battlefield field={field} animated={animatedSprites} />

                        <button
                            type="button"
                            className="battle-sprite-toggle"
                            aria-pressed={animatedSprites}
                            onClick={toggleAnimatedSprites}
                        >
                            {t('battle.animatedSprites')}: {animatedSprites ? t('common.yes') : t('common.no')}
                        </button>

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
                                />

                                {!isWaitingForOpponent && myRequest.kind === 'teamPreview' && (
                                    <>
                                        <p className="battle-panel__label">{t('battle.teamPreviewPrompt')}</p>
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            disabled={isResolvingTurn}
                                            onClick={() => handleChoice('default', t('battle.teamOrderConfirmed'))}
                                        >
                                            {t('battle.confirmOrder')}
                                        </button>
                                    </>
                                )}

                                {!isWaitingForOpponent && (myRequest.kind === 'move' || myRequest.kind === 'switch') && (
                                    <>
                                        {myRequest.kind === 'move' && (
                                            <>
                                                <p className="battle-panel__label">{t('battle.chooseMove')}</p>
                                                <div className="battle-choices__grid">
                                                    {myRequest.moves.map((move) => (
                                                        <button
                                                            key={move.slot}
                                                            type="button"
                                                            className="battle-move"
                                                            disabled={move.disabled || isResolvingTurn}
                                                            onClick={() => handleChoice(`move ${move.slot}`, move.name)}
                                                        >
                                                            <span className="battle-move__name">{move.name}</span>
                                                            {Number.isFinite(move.pp) && (
                                                                <span className="battle-move__pp">{move.pp}/{move.maxpp}</span>
                                                            )}
                                                        </button>
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
                                                        <SwitchOption
                                                            key={mon.slot}
                                                            mon={mon}
                                                            disabled={isResolvingTurn}
                                                            onClick={() => handleChoice(
                                                                `switch ${mon.slot}`,
                                                                t('battle.switchChoiceLabel', { name: mon.name }),
                                                            )}
                                                        />
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

                {(view.status === 'active' || view.status === 'ended') && transcript.length > 0 && (
                    <div className="battle-transcript">
                        <p className="battle-panel__label">{t('battle.transcript')}</p>
                        <ol className="battle-transcript__list">
                            {transcript.map((entry, index) => (
                                <li key={index} className={`battle-transcript__line is-${entry.kind}`}>
                                    {entry.text}
                                </li>
                            ))}
                        </ol>
                    </div>
                )}

                {view.isOver && (
                    <>
                        <p className="battle-panel__copy">{t(`battle.status_${view.status}`)}</p>
                        {view.canDelete && (
                            <div className="battle-actions">
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
                            </div>
                        )}
                    </>
                )}
            </section>

                </div>

                <aside className="battle-layout__side">
            {/* ── Trainer talk ────────────────────────────────────────── */}
            <section className="battle-panel">
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
                </aside>
            </div>
        </div>
    );
}
