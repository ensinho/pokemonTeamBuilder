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
} from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import { useMoveTypes } from '../../../hooks/useMoveTypes';
import { typeColors } from '../../../constants/types';

export function BattleLogPanel({ logEntries = [] }) {
    const { language } = useTranslation();
    const { typeForMove } = useMoveTypes();
    const logEndRef = useRef(null);
    const containerRef = useRef(null);

    useEffect(() => {
        if (logEndRef.current) {
            logEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [logEntries.length]);

    if (!logEntries || logEntries.length === 0) {
        return (
            <div className="battle-log__empty">
                <p>{language === 'pt' ? 'Nenhum registro de batalha ainda.' : 'No battle log entries yet.'}</p>
            </div>
        );
    }

    return (
        <div className="battle-log-container" ref={containerRef}>
            <ul className="battle-log__list">
                {logEntries.map((entry, index) => {
                    if (entry.kind === 'turn') {
                        return (
                            <li key={index} className="battle-log__item battle-log__turn-header">
                                <span className="battle-log__turn-badge">
                                    {language === 'pt' ? `TURNO ${entry.turn || entry.text.replace('Turn ', '')}` : entry.text.toUpperCase()}
                                </span>
                            </li>
                        );
                    }

                    if (entry.kind === 'move') {
                        const mType = typeForMove(entry.move);
                        const color = mType ? typeColors[mType] : null;
                        return (
                            <li key={index} className="battle-log__item battle-log__item--move">
                                <span className="battle-log__user">{entry.user}</span>
                                <span className="battle-log__action-label">{language === 'pt' ? 'usou' : 'used'}</span>
                                <span
                                    className="battle-log__move-chip"
                                    style={color ? { backgroundColor: `${color}25`, borderColor: color, color: color } : {}}
                                >
                                    {entry.move}
                                </span>
                            </li>
                        );
                    }

                    if (entry.kind === 'boost') {
                        const isPositive = (entry.amount || 0) > 0;
                        return (
                            <li key={index} className={`battle-log__item battle-log__item--boost ${isPositive ? 'is-up' : 'is-down'}`}>
                                <span className="battle-log__mon">{entry.mon}</span>
                                <span className={`battle-log__stat-badge ${isPositive ? 'is-up' : 'is-down'}`}>
                                    {isPositive ? (
                                        <ArrowUp className="w-3 h-3 inline-block mr-0.5" />
                                    ) : (
                                        <ArrowDown className="w-3 h-3 inline-block mr-0.5" />
                                    )}
                                    {isPositive ? `+${entry.amount}` : entry.amount} {entry.statName || entry.stat}
                                </span>
                            </li>
                        );
                    }

                    if (entry.kind === 'damage') {
                        return (
                            <li key={index} className={`battle-log__item battle-log__item--damage ${entry.fainted ? 'is-faint' : ''}`}>
                                {entry.fainted ? (
                                    <span className="battle-log__faint-chip flex items-center gap-1">
                                        <Skull className="w-3.5 h-3.5 text-red-400 inline-block" />
                                        <span>{entry.mon} {language === 'pt' ? 'desmaiou!' : 'fainted!'}</span>
                                    </span>
                                ) : (
                                    <>
                                        <span className="battle-log__mon">{entry.mon}</span>
                                        <span className="battle-log__hp-chip">{entry.hp}</span>
                                    </>
                                )}
                            </li>
                        );
                    }

                    if (entry.kind === 'heal') {
                        return (
                            <li key={index} className="battle-log__item battle-log__item--heal">
                                <span className="battle-log__mon">{entry.mon}</span>
                                <span className="battle-log__heal-chip flex items-center gap-1">
                                    <Heart className="w-3.5 h-3.5 text-green-400 inline-block" />
                                    <span>{entry.hp}</span>
                                </span>
                            </li>
                        );
                    }

                    if (entry.kind === 'effect') {
                        let subClass = '';
                        let textLabel = entry.text;
                        let IconComponent = Zap;

                        if (entry.subkind === 'supereffective') {
                            subClass = 'is-super';
                            textLabel = language === 'pt' ? 'É super efetivo!' : "It's super effective!";
                            IconComponent = Zap;
                        } else if (entry.subkind === 'resisted') {
                            subClass = 'is-resisted';
                            textLabel = language === 'pt' ? 'Não foi muito efetivo...' : 'It was not very effective...';
                            IconComponent = Shield;
                        } else if (entry.subkind === 'crit') {
                            subClass = 'is-crit';
                            textLabel = language === 'pt' ? 'Acerto crítico!' : 'Critical hit!';
                            IconComponent = Target;
                        } else if (entry.subkind === 'immune') {
                            subClass = 'is-immune';
                            textLabel = language === 'pt' ? `${entry.mon || 'Alvo'} é imune.` : `${entry.mon || 'Target'} is immune.`;
                            IconComponent = Ban;
                        }

                        return (
                            <li key={index} className={`battle-log__item battle-log__item--effect ${subClass}`}>
                                <span className="battle-log__effect-badge flex items-center gap-1">
                                    <IconComponent className="w-3.5 h-3.5 inline-block" />
                                    <span>{textLabel}</span>
                                </span>
                            </li>
                        );
                    }

                    if (entry.kind === 'status') {
                        return (
                            <li key={index} className="battle-log__item battle-log__item--status">
                                <span className="battle-log__mon">{entry.mon}</span>
                                <span className={`battle-log__status-tag is-${String(entry.status).toLowerCase()}`}>
                                    {entry.status ? entry.status.toUpperCase() : 'STATUS'}
                                </span>
                            </li>
                        );
                    }

                    if (entry.kind === 'switch') {
                        return (
                            <li key={index} className="battle-log__item battle-log__item--switch">
                                <span className="battle-log__switch-badge flex items-center gap-1">
                                    <ArrowRightLeft className="w-3.5 h-3.5 text-blue-400 inline-block" />
                                    <span>{entry.mon} {language === 'pt' ? 'entrou na batalha!' : 'came out!'}</span>
                                </span>
                            </li>
                        );
                    }

                    if (entry.kind === 'win') {
                        return (
                            <li key={index} className="battle-log__item battle-log__item--win flex items-center justify-center gap-1.5">
                                <Trophy className="w-4 h-4 text-amber-400 inline-block" />
                                <span>{entry.text}</span>
                            </li>
                        );
                    }

                    return (
                        <li key={index} className={`battle-log__item is-${entry.kind || 'default'}`}>
                            {entry.text}
                        </li>
                    );
                })}
                <li ref={logEndRef} aria-hidden="true" />
            </ul>
        </div>
    );
}
