import React, { useEffect, useRef } from 'react';
import {
    Skull,
    Heart,
    Zap,
    Shield,
    Target,
    Ban,
    ArrowRightLeft,
    Trophy,
    ArrowUp,
    ArrowDown,
    Sparkles,
} from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import { useMoveTypes } from '../../../hooks/useMoveTypes';
import { typeColors } from '../../../constants/types';
import { getBattleIcon } from '../../../utils/battleSprites';

/**
 * Group raw flat log entries into turn blocks containing action message cards
 */
function groupLogEntriesIntoActionBlocks(logEntries) {
    const turnBlocks = [];
    let currentTurn = { turnNumber: 0, actions: [] };
    let currentAction = null;

    for (const entry of logEntries) {
        if (entry.kind === 'turn') {
            const turnNum = Number.parseInt(entry.turn || entry.text.replace(/Turn\s*/i, ''), 10) || (turnBlocks.length + 1);
            currentAction = null;
            currentTurn = { turnNumber: turnNum, actions: [] };
            turnBlocks.push(currentTurn);
            continue;
        }

        if (turnBlocks.length === 0) {
            currentTurn = { turnNumber: 0, actions: [] };
            turnBlocks.push(currentTurn);
        }

        if (entry.kind === 'move' || entry.kind === 'switch' || entry.kind === 'win') {
            currentAction = {
                id: Math.random(),
                kind: entry.kind,
                user: entry.user || entry.mon || 'Batalha',
                move: entry.move,
                details: [],
            };
            currentTurn.actions.push(currentAction);
        } else if (currentAction) {
            currentAction.details.push(entry);
        } else {
            currentAction = {
                id: Math.random(),
                kind: 'event',
                user: entry.mon || 'Campo',
                details: [entry],
            };
            currentTurn.actions.push(currentAction);
        }
    }

    return turnBlocks;
}

export function BattleLogPanel({ logEntries = [] }) {
    const { language } = useTranslation();
    const { typeForMove } = useMoveTypes();
    const containerRef = useRef(null);

    // Auto-scroll inside the log container only (prevents window scrolling)
    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [logEntries.length]);

    if (!logEntries || logEntries.length === 0) {
        return (
            <div className="battle-log__empty">
                <p>{language === 'pt' ? 'Nenhum registro de batalha ainda.' : 'No battle log entries yet.'}</p>
            </div>
        );
    }

    const groupedTurns = groupLogEntriesIntoActionBlocks(logEntries);

    return (
        <div className="battle-log-container" ref={containerRef}>
            <div className="battle-log__turns">
                {groupedTurns.map((turnBlock, tIdx) => (
                    <div key={tIdx} className="battle-log__turn-group">
                        {turnBlock.turnNumber > 0 && (
                            <div className="battle-log__turn-divider">
                                <span className="battle-log__turn-pill">
                                    {language === 'pt' ? `TURNO ${turnBlock.turnNumber}` : `TURN ${turnBlock.turnNumber}`}
                                </span>
                            </div>
                        )}

                        <div className="battle-log__action-cards">
                            {turnBlock.actions.map((action, aIdx) => {
                                const monIcon = action.user ? getBattleIcon(action.user) : null;
                                const mType = action.move ? typeForMove(action.move) : null;
                                const moveColor = mType ? typeColors[mType] : null;

                                return (
                                    <div
                                        key={aIdx}
                                        className={`battle-log__action-card is-${action.kind}`}
                                    >
                                        {/* Card Header: User avatar + Action description */}
                                        <div className="battle-log__card-header">
                                            <div className="battle-log__user-info">
                                                {monIcon?.url ? (
                                                    <img src={monIcon.url} alt={action.user} className="battle-log__mon-icon" />
                                                ) : (
                                                    <Sparkles className="w-3.5 h-3.5 text-muted inline-block" />
                                                )}
                                                <span className="battle-log__user-name">{action.user}</span>
                                            </div>

                                            {action.kind === 'move' && (
                                                <div className="flex items-center gap-1">
                                                    <span className="battle-log__used-label">{language === 'pt' ? 'usou' : 'used'}</span>
                                                    <span
                                                        className="battle-log__move-badge"
                                                        style={moveColor ? { backgroundColor: `${moveColor}25`, borderColor: moveColor, color: moveColor } : {}}
                                                    >
                                                        {action.move}
                                                    </span>
                                                </div>
                                            )}

                                            {action.kind === 'switch' && (
                                                <span className="battle-log__switch-chip flex items-center gap-1 text-blue-400">
                                                    <ArrowRightLeft className="w-3 h-3 inline-block" />
                                                    <span>{language === 'pt' ? 'entrou na batalha!' : 'came out!'}</span>
                                                </span>
                                            )}

                                            {action.kind === 'win' && (
                                                <span className="battle-log__win-chip flex items-center gap-1 text-amber-400">
                                                    <Trophy className="w-3.5 h-3.5 inline-block" />
                                                    <span>{action.user}</span>
                                                </span>
                                            )}
                                        </div>

                                        {/* Card Details: Damage, HP, Status, Boosts, Effects */}
                                        {action.details.length > 0 && (
                                            <div className="battle-log__card-details">
                                                {action.details.map((detail, dIdx) => {
                                                    if (detail.kind === 'boost') {
                                                        const isPositive = (detail.amount || 0) > 0;
                                                        return (
                                                            <div key={dIdx} className="battle-log__detail-row">
                                                                <span className="battle-log__detail-target">{detail.mon}</span>
                                                                <span className={`battle-log__stat-pill ${isPositive ? 'is-up' : 'is-down'}`}>
                                                                    {isPositive ? (
                                                                        <ArrowUp className="w-3 h-3 inline-block mr-0.5" />
                                                                    ) : (
                                                                        <ArrowDown className="w-3 h-3 inline-block mr-0.5" />
                                                                    )}
                                                                    {isPositive ? `+${detail.amount}` : detail.amount} {detail.statName || detail.stat}
                                                                </span>
                                                            </div>
                                                        );
                                                    }

                                                    if (detail.kind === 'damage') {
                                                        return (
                                                            <div key={dIdx} className="battle-log__detail-row">
                                                                <span className="battle-log__detail-target">{detail.mon}</span>
                                                                {detail.fainted ? (
                                                                    <span className="battle-log__faint-badge flex items-center gap-1 text-red-400 font-bold">
                                                                        <Skull className="w-3.5 h-3.5 inline-block" />
                                                                        <span>{language === 'pt' ? 'desmaiou!' : 'fainted!'}</span>
                                                                    </span>
                                                                ) : (
                                                                    <span className="battle-log__hp-badge">{detail.hp}</span>
                                                                )}
                                                            </div>
                                                        );
                                                    }

                                                    if (detail.kind === 'heal') {
                                                        return (
                                                            <div key={dIdx} className="battle-log__detail-row">
                                                                <span className="battle-log__detail-target">{detail.mon}</span>
                                                                <span className="battle-log__heal-badge flex items-center gap-1 text-green-400 font-bold">
                                                                    <Heart className="w-3.5 h-3.5 inline-block" />
                                                                    <span>{detail.hp}</span>
                                                                </span>
                                                            </div>
                                                        );
                                                    }

                                                    if (detail.kind === 'effect') {
                                                        let subClass = '';
                                                        let textLabel = detail.text;
                                                        let IconComponent = Zap;

                                                        if (detail.subkind === 'supereffective') {
                                                            subClass = 'is-super';
                                                            textLabel = language === 'pt' ? 'É super efetivo!' : "It's super effective!";
                                                            IconComponent = Zap;
                                                        } else if (detail.subkind === 'resisted') {
                                                            subClass = 'is-resisted';
                                                            textLabel = language === 'pt' ? 'Não foi muito efetivo...' : 'It was not very effective...';
                                                            IconComponent = Shield;
                                                        } else if (detail.subkind === 'crit') {
                                                            subClass = 'is-crit';
                                                            textLabel = language === 'pt' ? 'Acerto crítico!' : 'Critical hit!';
                                                            IconComponent = Target;
                                                        } else if (detail.subkind === 'immune') {
                                                            subClass = 'is-immune';
                                                            textLabel = language === 'pt' ? `${detail.mon || 'Alvo'} é imune.` : `${detail.mon || 'Target'} is immune.`;
                                                            IconComponent = Ban;
                                                        }

                                                        return (
                                                            <div key={dIdx} className={`battle-log__detail-row ${subClass}`}>
                                                                <span className="battle-log__effect-tag flex items-center gap-1">
                                                                    <IconComponent className="w-3.5 h-3.5 inline-block" />
                                                                    <span>{textLabel}</span>
                                                                </span>
                                                            </div>
                                                        );
                                                    }

                                                    if (detail.kind === 'status') {
                                                        return (
                                                            <div key={dIdx} className="battle-log__detail-row">
                                                                <span className="battle-log__detail-target">{detail.mon}</span>
                                                                <span className={`battle-log__status-pill is-${String(detail.status).toLowerCase()}`}>
                                                                    {detail.status ? detail.status.toUpperCase() : 'STATUS'}
                                                                </span>
                                                            </div>
                                                        );
                                                    }

                                                    return (
                                                        <div key={dIdx} className="battle-log__detail-row text-muted text-xs">
                                                            <span>{detail.text}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
