import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { typeColors } from '../../constants/types';
import { getMoveDetails } from '../../services/pokemonDataCache';
import { getPokemonDisplaySprite } from '../../utils/pokemonSprites';
import { useModalA11y } from '../../hooks/useModalA11y';
import { StatBar } from '../StatBar';
import { TypeBadge } from '../TypeBadge';
import { CloseIcon, SaveIcon } from '../icons';
import { getPokemonWeaknessEntries, WeaknessBadge } from './pokemonModalShared';
import { useTranslation } from '../../hooks/useTranslation';

export function TeamPokemonEditorModal({ pokemon, onClose, onSave, colors, items, natures, moveDetailsCache = {}, setMoveDetailsCache = () => {} }) {
    const { t } = useTranslation();
    const [customization, setCustomization] = useState(pokemon.customization);
    const [remainingEVs, setRemainingEVs] = useState(510);
    const [moveSearch, setMoveSearch] = useState('');
    const [activeTab, setActiveTab] = useState('loadout');
    const dialogRef = useModalA11y(onClose);
    const statNames = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];
    const pokemonWeaknesses = useMemo(() => getPokemonWeaknessEntries(pokemon?.types || []), [pokemon]);

    const fetchMoveDetails = useCallback(async (moveUrl, moveName) => {
        if (moveDetailsCache[moveName] !== undefined) {
            return moveDetailsCache[moveName];
        }
        try {
            const moveData = await getMoveDetails(moveUrl, moveName);
            setMoveDetailsCache((prev) => ({ ...prev, [moveName]: moveData || null }));
            return moveData;
        } catch (error) {
            console.error(`Failed to fetch details for move: ${moveName}`, error);
            return null;
        }
    }, [moveDetailsCache, setMoveDetailsCache]);

    useEffect(() => {
        setCustomization(pokemon.customization);
        setMoveSearch('');
        setActiveTab('loadout');
    }, [pokemon]);

    useEffect(() => {
        const totalEVs = Object.values(customization.evs).reduce((sum, ev) => sum + ev, 0);
        setRemainingEVs(510 - totalEVs);
    }, [customization.evs]);

    const handleEvChange = (stat, value) => {
        const numericValue = Number(value);
        const currentEvs = { ...customization.evs };
        const oldVal = currentEvs[stat];
        const diff = numericValue - oldVal;

        if (numericValue > 252) return;
        if (remainingEVs - diff < 0) return;

        setCustomization((prev) => ({
            ...prev,
            evs: { ...prev.evs, [stat]: numericValue },
        }));
    };

    const handleCustomizationChange = (field, value) => {
        setCustomization((prev) => ({ ...prev, [field]: value }));
    };

    const handleMoveToggle = (moveName) => {
        setCustomization((prev) => {
            const currentMoves = prev.moves;
            const newMoves = currentMoves.includes(moveName)
                ? currentMoves.filter((move) => move !== moveName)
                : [...currentMoves, moveName];

            if (newMoves.length > 4) return prev;
            return { ...prev, moves: newMoves };
        });
    };

    const calculateStat = (base, ev, statName) => {
        if (statName === 'hp') {
            return Math.floor(base * 2 + 31 + Math.floor(ev / 4)) + 110;
        }
        return Math.floor(Math.floor(base * 2 + 31 + Math.floor(ev / 4)) + 5);
    };

    const filteredMoves = useMemo(() => {
        const moves = pokemon.moves || [];
        if (!moveSearch) return moves;
        return moves.filter((move) => move.name.toLowerCase().includes(moveSearch.toLowerCase()));
    }, [moveSearch, pokemon.moves]);

    useEffect(() => {
        filteredMoves.slice(0, 20).forEach((move) => {
            if (moveDetailsCache[move.name] === undefined) {
                fetchMoveDetails(move.url, move.name);
            }
        });
    }, [filteredMoves, moveDetailsCache, fetchMoveDetails]);

    if (!pokemon) return null;

    const tabs = [
        { id: 'loadout', label: t('modals.editorModalTabLoadout') },
        { id: 'stats', label: t('modals.editorModalTabStats') },
        { id: 'moves', label: t('modals.editorModalTabMoves', { count: customization.moves.length }) },
    ];

    const controlClassName = 'w-full rounded-lg border-2 border-transparent bg-surface-raised text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-4" onClick={onClose} role="presentation">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="team-editor-title"
                tabIndex={-1}
                className="relative flex w-full max-w-4xl max-h-[88vh] flex-col rounded-2xl bg-surface shadow-xl animate-fade-in focus:outline-none sm:max-h-[90vh]"
                onClick={(event) => event.stopPropagation()}
            >
                <header className="border-b border-surface-raised px-4 pb-3 pt-4 sm:px-6 sm:pt-5">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                            <img
                                src={getPokemonDisplaySprite(pokemon, { shiny: customization.isShiny, animated: true })}
                                alt={pokemon.name}
                                className="h-12 w-12 sm:h-14 sm:w-14 image-pixelated flex-shrink-0"
                            />
                            <div className="min-w-0">
                                <h2 id="team-editor-title" className="truncate text-lg font-bold capitalize text-fg sm:text-xl md:text-2xl">{pokemon.name}</h2>
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                    {pokemon.types.map((type) => <TypeBadge key={type} type={type} colors={colors} />)}
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
                                        {t('modals.editorModalWeakVs')}
                                    </span>
                                    {pokemonWeaknesses.length > 0 ? pokemonWeaknesses.slice(0, 4).map(({ type, multiplier }) => (
                                        <WeaknessBadge key={type} type={type} multiplier={multiplier} colors={colors} />
                                    )) : (
                                        <span className="text-xs text-muted">{t('common.none')}</span>
                                    )}
                                    {pokemonWeaknesses.length > 4 && (
                                        <span className="rounded-full bg-surface-raised px-2 py-1 text-[10px] font-bold text-muted">
                                            +{pokemonWeaknesses.length - 4}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            type="button"
                            className="p-2 rounded-lg text-muted hover:text-fg hover:bg-surface-raised transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            aria-label={t('modals.editorModalCloseAria')}
                        >
                            <CloseIcon />
                        </button>
                    </div>

                    <div role="tablist" aria-label="Editor sections" className="-mb-3 mt-4 flex gap-1 border-b border-transparent">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                role="tab"
                                type="button"
                                id={`tab-${tab.id}`}
                                aria-selected={activeTab === tab.id}
                                aria-controls={`panel-${tab.id}`}
                                onClick={() => setActiveTab(tab.id)}
                                className={`rounded-t-lg border-b-2 px-3 py-1.5 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:px-4 sm:py-2 sm:text-sm ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted opacity-70 hover:opacity-100'}`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </header>

                <div
                    className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6"
                    style={{
                        '--scrollbar-track-color': colors.card,
                        '--scrollbar-thumb-color': colors.primary,
                        '--scrollbar-thumb-border-color': colors.card,
                    }}
                >
                    {activeTab === 'loadout' && (
                        <div role="tabpanel" id="panel-loadout" aria-labelledby="tab-loadout" className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="editor-item" className="mb-1 block text-sm font-bold text-fg">{t('modals.editorModalItemLabel')}</label>
                                    <select id="editor-item" value={customization.item} onChange={(event) => handleCustomizationChange('item', event.target.value)} className={`${controlClassName} p-2 capitalize`}>
                                        <option value="">{t('common.none')}</option>
                                        {items.map((item) => <option key={item.name} value={item.name} className="capitalize">{item.name.replace(/-/g, ' ')}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="editor-nature" className="mb-1 block text-sm font-bold text-fg">{t('modals.editorModalNatureLabel')}</label>
                                    <select id="editor-nature" value={customization.nature} onChange={(event) => handleCustomizationChange('nature', event.target.value)} className={`${controlClassName} p-2 capitalize`}>
                                        {natures.map((nature) => <option key={nature.name} value={nature.name} className="capitalize">{nature.name.replace(/-/g, ' ')}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="editor-tera" className="mb-1 block text-sm font-bold text-fg">{t('modals.editorModalTeraLabel')}</label>
                                    <select id="editor-tera" value={customization.teraType} onChange={(event) => handleCustomizationChange('teraType', event.target.value)} className={`${controlClassName} p-2 capitalize`}>
                                        {Object.keys(typeColors).map((type) => <option key={type} value={type} className="capitalize">{t(`types.${type.toLowerCase()}`, { defaultValue: type })}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-end">
                                    <button type="button" role="switch" aria-checked={customization.isShiny} onClick={() => handleCustomizationChange('isShiny', !customization.isShiny)} className="inline-flex items-center gap-3 group focus:outline-none">
                                        <span
                                            className={`relative inline-block w-11 h-6 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-primary ${customization.isShiny ? 'bg-success' : 'bg-surface-raised'}`}
                                            aria-hidden="true"
                                        >
                                            <span className={`absolute top-0.5 left-0.5 inline-block w-5 h-5 bg-white rounded-full shadow transition-transform ${customization.isShiny ? 'translate-x-5' : 'translate-x-0'}`} />
                                        </span>
                                        <span className="text-sm font-bold text-fg">{t('modals.editorModalShinyLabel')}</span>
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label htmlFor="editor-ability" className="mb-2 block text-base font-bold text-fg">{t('modals.editorModalAbilityLabel')}</label>
                                <select id="editor-ability" value={customization.ability} onChange={(event) => handleCustomizationChange('ability', event.target.value)} className={`${controlClassName} p-3 capitalize`}>
                                    {(pokemon.abilities || []).map((ability) => (
                                        <option key={ability.name} value={ability.name} className="capitalize">{ability.name.replace(/-/g, ' ')}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <h3 className="mb-2 text-base font-bold text-fg">{t('modals.editorModalBaseStats')}</h3>
                                <div className="space-y-1.5">
                                    {pokemon.stats?.map((stat) => <StatBar key={stat.name} stat={stat.name} value={stat.base_stat} colors={colors} />)}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'stats' && (
                        <div role="tabpanel" id="panel-stats" aria-labelledby="tab-stats">
                            <div className="flex items-baseline justify-between mb-3">
                                <h3 className="text-lg font-bold text-fg">{t('modals.editorModalEffortValues')}</h3>
                                <p className="text-sm text-muted">
                                    {t('modals.editorModalRemaining')}: <span className={`text-lg font-bold ${remainingEVs === 0 ? 'text-success' : 'text-primary'}`}>{remainingEVs}</span> / 510
                                </p>
                            </div>
                            <div className="mb-5 h-2 w-full overflow-hidden rounded-full bg-surface-raised">
                                <div className="h-full bg-primary transition-all" style={{ width: `${((510 - remainingEVs) / 510) * 100}%` }} />
                            </div>

                            <div className="space-y-3">
                                {statNames.map((statName, index) => {
                                    const baseStat = pokemon.stats?.[index]?.base_stat ?? 0;
                                    const ev = customization.evs[statName];
                                    const totalStat = calculateStat(baseStat, ev, statName);

                                    return (
                                        <div key={statName}>
                                            <div className="flex justify-between items-center capitalize text-sm">
                                                <span className="text-fg">{statName.replace(/-/g, ' ')}</span>
                                                <span className="text-muted">{t('modals.editorModalEvStatShort', { ev, total: totalStat })}</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max="252"
                                                value={ev}
                                                step="4"
                                                onChange={(event) => handleEvChange(statName, event.target.value)}
                                                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-surface-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                                aria-label={`${statName.replace(/-/g, ' ')} EV`}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {activeTab === 'moves' && (
                        <div role="tabpanel" id="panel-moves" aria-labelledby="tab-moves">
                            <div className="mb-4 grid min-h-[80px] grid-cols-2 gap-2 rounded-lg bg-bg p-2">
                                {customization.moves.map((moveName) => {
                                    const moveType = moveDetailsCache[moveName]?.type;
                                    return (
                                        <div key={moveName} className="p-2 rounded-lg text-center text-sm capitalize text-white" style={{ backgroundColor: moveType ? typeColors[moveType] : colors.cardLight }}>
                                            {moveName.replace(/-/g, ' ')}
                                        </div>
                                    );
                                })}
                                {Array.from({ length: 4 - customization.moves.length }).map((_, index) => (
                                    <div key={index} className="flex items-center justify-center rounded-lg bg-surface-raised p-2 opacity-50">
                                        <div className="h-1 w-8 rounded-full bg-bg"></div>
                                    </div>
                                ))}
                            </div>
                            <input
                                type="text"
                                placeholder={t('modals.editorModalSearchMoves')}
                                value={moveSearch}
                                onChange={(event) => setMoveSearch(event.target.value)}
                                className="mb-2 w-full rounded-lg bg-surface-raised p-2 text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                aria-label={t('modals.editorModalSearchMoves')}
                            />
                            <div className="grid grid-cols-2 gap-2 max-h-[55vh] overflow-y-auto custom-scrollbar pr-2" style={{ '--scrollbar-track-color': colors.card, '--scrollbar-thumb-color': colors.primary, '--scrollbar-thumb-border-color': colors.card }}>
                                {filteredMoves.map((move) => {
                                    const moveType = moveDetailsCache[move.name]?.type;
                                    const isSelected = customization.moves.includes(move.name);
                                    const style = isSelected
                                        ? { backgroundColor: moveType ? typeColors[moveType] : colors.primary, color: 'white' }
                                        : undefined;

                                    return (
                                        <button
                                            key={move.name}
                                            type="button"
                                            onClick={() => handleMoveToggle(move.name)}
                                            aria-pressed={isSelected}
                                            className={`rounded-lg p-2 text-sm capitalize transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${isSelected ? 'text-white' : 'bg-surface-raised text-fg hover:opacity-80'}`}
                                            style={style}
                                        >
                                            {move.name.replace(/-/g, ' ')}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <footer className="flex items-center justify-end gap-2 border-t border-surface-raised px-6 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg bg-surface-raised px-4 py-2 font-semibold text-fg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            onSave(pokemon.instanceId, customization);
                            onClose();
                        }}
                        className="bg-primary hover:opacity-90 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-fg"
                    >
                        <SaveIcon /> {t('modals.editorModalSave')}
                    </button>
                </footer>
            </div>
        </div>
    );
}