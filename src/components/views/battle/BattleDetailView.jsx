import React, { useEffect, useMemo, useState } from 'react';
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
import { POKEBALL_PLACEHOLDER_URL } from '../../../constants/theme';
import '../../../styles/battle-view.css';

/** Six slots of sprite icons — the team preview bar. */
function TeamSpriteBar({ sprites = [] }) {
    return (
        <div className="battle-team-bar">
            {Array.from({ length: 6 }).map((_, index) => {
                const mon = sprites[index];
                return (
                    <span key={index} className="battle-team-bar__slot">
                        {mon ? (
                            <img
                                src={getPokemonFrontSpriteUrl(mon.id)}
                                alt={mon.name || ''}
                                loading="lazy"
                                onError={(event) => { event.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                            />
                        ) : (
                            <PokeballIcon className="w-4 h-4 text-muted opacity-20" />
                        )}
                    </span>
                );
            })}
        </div>
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

    const myRequest = useMemo(() => readMyRequest(myLog), [myLog]);
    const transcript = useMemo(() => describeLogLines(myLog), [myLog]);

    const selectedTeam = useMemo(
        () => savedTeams.find((team) => team.id === selectedTeamId) || null,
        [savedTeams, selectedTeamId],
    );

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
                        {t('battle.formatLine', { format: battle.format, level: battle.level })}
                    </p>
                </div>
            </header>

            {/* ── Lifecycle actions ───────────────────────────────────── */}
            <section className="battle-panel">
                <h3 className="battle-panel__title">{t('battle.statusTitle')}</h3>

                {view.status === 'pending' && (
                    <>
                        <p className="battle-panel__copy">
                            {view.isChallenger ? t('battle.pendingSent') : t('battle.pendingReceived')}
                        </p>
                        <div className="battle-actions">
                            {view.canAccept && (
                                <button type="button" className="btn btn-primary" onClick={() => acceptChallenge(battleId)}>
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

                {view.status === 'teamSelect' && (
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
                        {myTeam && <TeamSpriteBar sprites={myTeam.sprites} />}

                        {myRequest.kind === 'wait' && (
                            <p className="battle-panel__copy">{t('battle.waitingOpponentTurn')}</p>
                        )}

                        {myRequest.kind === 'none' && (
                            <p className="battle-panel__copy">
                                {isResolvingTurn ? t('battle.syncing') : t('battle.noPromptYet')}
                            </p>
                        )}

                        {myRequest.kind === 'teamPreview' && (
                            <div className="battle-choices">
                                <p className="battle-panel__label">{t('battle.teamPreviewPrompt')}</p>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    disabled={isResolvingTurn}
                                    onClick={() => submitChoice(battleId, 'default')}
                                >
                                    {t('battle.confirmOrder')}
                                </button>
                            </div>
                        )}

                        {(myRequest.kind === 'move' || myRequest.kind === 'switch') && (
                            <div className="battle-choices">
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
                                                    onClick={() => submitChoice(battleId, `move ${move.slot}`)}
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
                                                <button
                                                    key={mon.slot}
                                                    type="button"
                                                    className="battle-move battle-move--switch"
                                                    disabled={isResolvingTurn}
                                                    onClick={() => submitChoice(battleId, `switch ${mon.slot}`)}
                                                >
                                                    <span className="battle-move__name">{mon.name}</span>
                                                    <span className="battle-move__pp">{mon.condition}</span>
                                                </button>
                                            ))}
                                        </div>
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
        </div>
    );
}
