import React, { useEffect, useMemo, useState } from 'react';
import '../../styles/tools-views.css';
import { resolvePokemonDetail, getMoveDetails } from '../../services/pokemonDataCache';
import { calcDamage, calcStat, NATURE_MODIFIERS, natureMultiplier } from '../../utils/damageCalc';
import { useReferenceStore } from '../../store/useReferenceStore';
import { useTranslation } from '../../hooks/useTranslation';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { PokemonPicker } from '../PokemonPicker';
import { useToastStore } from '../../store/useToastStore';
import { TypeBadge } from '../TypeBadge';
import { getPokemonDisplaySprite } from '../../utils/pokemonSprites';

const NATURES = Object.keys(NATURE_MODIFIERS);
const TYPES = [
    'normal', 'fire', 'water', 'grass', 'electric', 'ice', 'fighting', 'poison',
    'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'
];

const COMMON_ITEMS = [
    { value: '', label: 'No Item' },
    { value: 'choice-band', label: 'Choice Band' },
    { value: 'choice-specs', label: 'Choice Specs' },
    { value: 'choice-scarf', label: 'Choice Scarf' },
    { value: 'life-orb', label: 'Life Orb' },
    { value: 'expert-belt', label: 'Expert Belt' },
    { value: 'assault-vest', label: 'Assault Vest' },
    { value: 'eviolite', label: 'Eviolite' },
    { value: 'muscle-band', label: 'Muscle Band' },
    { value: 'wise-glasses', label: 'Wise Glasses' },
    { value: 'leftovers', label: 'Leftovers' },
    { value: 'focus-sash', label: 'Focus Sash' },
    { value: 'sitrus-berry', label: 'Sitrus Berry' },
];

const BATTLE_ABILITIES = [
    { value: '', label: '(No Ability / Neutral)' },
    { value: 'huge-power', label: 'Huge Power' },
    { value: 'pure-power', label: 'Pure Power' },
    { value: 'guts', label: 'Guts' },
    { value: 'solar-power', label: 'Solar Power' },
    { value: 'transistor', label: 'Transistor' },
    { value: 'dragons-maw', label: "Dragon's Maw" },
    { value: 'rocky-payload', label: 'Rocky Payload' },
    { value: 'water-bubble', label: 'Water Bubble' },
    { value: 'steely-spirit', label: 'Steely Spirit' },
    { value: 'steelworker', label: 'Steelworker' },
    { value: 'tinted-lens', label: 'Tinted Lens' },
    { value: 'sharpness', label: 'Sharpness' },
    { value: 'iron-fist', label: 'Iron Fist' },
    { value: 'tough-claws', label: 'Tough Claws' },
    { value: 'sheer-force', label: 'Sheer Force' },
    { value: 'overgrow', label: 'Overgrow' },
    { value: 'blaze', label: 'Blaze' },
    { value: 'torrent', label: 'Torrent' },
    { value: 'swarm', label: 'Swarm' },
    { value: 'flash-fire', label: 'Flash Fire' },
    { value: 'multiscale', label: 'Multiscale' },
    { value: 'shadow-shield', label: 'Shadow Shield' },
    { value: 'fluffy', label: 'Fluffy' },
    { value: 'ice-scales', label: 'Ice Scales' },
    { value: 'thick-fat', label: 'Thick Fat' },
    { value: 'heatproof', label: 'Heatproof' },
    { value: 'fur-coat', label: 'Fur Coat' },
    { value: 'dry-skin', label: 'Dry Skin' },
    { value: 'marvel-scale', label: 'Marvel Scale' },
    { value: 'solid-rock', label: 'Solid Rock' },
    { value: 'filter', label: 'Filter' },
    { value: 'prism-armor', label: 'Prism Armor' },
];

const STAT_KEYS = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];
const STAT_LABELS = {
    hp: 'HP',
    attack: 'Atk',
    defense: 'Def',
    'special-attack': 'SpA',
    'special-defense': 'SpD',
    speed: 'Spe'
};

const capitalize = (s = '') => s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
const prettify = (s = '') => s.replace(/-/g, ' ');

const ToggleSwitch = ({ checked, onChange, label, activeColor = 'bg-primary' }) => {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className="inline-flex items-center gap-2.5 group focus:outline-none cursor-pointer"
        >
            <span
                className={`relative inline-block rounded-full transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-primary ${checked ? activeColor : 'bg-surface-raised border border-border'
                    }`}
                style={{ width: '2rem', height: '1.1rem' }}
            >
                <span
                    className={`absolute top-[1px] left-[1px] inline-block rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? 'translate-x-[0.9rem]' : 'translate-x-0'
                        }`}
                    style={{ width: '0.9rem', height: '0.9rem' }}
                />
            </span>
            {label && <span className="text-xs text-fg/90 font-semibold select-none leading-none">{label}</span>}
        </button>
    );
};

const NumberCounter = ({ value, onChange, min, max, step = 1, className = '' }) => {
    const handleDecrement = () => {
        const newVal = Math.max(min, value - step);
        onChange(newVal);
    };
    const handleIncrement = () => {
        const newVal = Math.min(max, value + step);
        onChange(newVal);
    };

    return (
        <div className={`inline-flex items-center bg-bg border border-border rounded-lg overflow-hidden h-8 ${className}`}>
            <button
                type="button"
                onClick={handleDecrement}
                className="px-2.5 h-full text-sm text-muted hover:text-fg hover:bg-surface-raised transition-colors focus:outline-none font-bold"
                disabled={value <= min}
            >
                −
            </button>
            <input
                type="number"
                min={min}
                max={max}
                value={value}
                onChange={(e) => {
                    let val = Number(e.target.value);
                    if (isNaN(val)) val = min;
                    onChange(Math.max(min, Math.min(max, val)));
                }}
                className="w-10 text-center bg-transparent border-none text-xs font-bold font-mono text-fg focus:outline-none h-full p-0"
                style={{ appearance: 'none', MozAppearance: 'textfield' }}
            />
            <button
                type="button"
                onClick={handleIncrement}
                className="px-2.5 h-full text-sm text-muted hover:text-fg hover:bg-surface-raised transition-colors focus:outline-none font-bold"
                disabled={value >= max}
            >
                +
            </button>
        </div>
    );
};

const initialPokemonState = (isAttacker) => ({
    pokemon: null,
    level: 50,
    nature: 'serious',
    types: ['normal'],
    teraType: 'normal',
    isTerastallized: false,
    ability: '',
    abilitiesList: [],
    item: '',
    status: 'healthy',
    ivs: { hp: 31, attack: 31, defense: 31, 'special-attack': 31, 'special-defense': 31, speed: 31 },
    evs: isAttacker
        ? { hp: 0, attack: 252, defense: 0, 'special-attack': 252, 'special-defense': 0, speed: 0 }
        : { hp: 252, attack: 0, defense: 0, 'special-attack': 0, 'special-defense': 0, speed: 0 },
    moves: [
        { name: '', power: 0, type: 'normal', category: 'physical', isSpread: false, isCritical: false },
        { name: '', power: 0, type: 'normal', category: 'physical', isSpread: false, isCritical: false },
        { name: '', power: 0, type: 'normal', category: 'physical', isSpread: false, isCritical: false },
        { name: '', power: 0, type: 'normal', category: 'physical', isSpread: false, isCritical: false },
    ],
    activeMoveIndex: 0,
    currentHp: 100, // percentage
    movesPool: [],
    baseStats: { hp: 100, attack: 100, defense: 100, 'special-attack': 100, 'special-defense': 100, speed: 100 }
});

export function DamageCalculatorView() {
    const { t } = useTranslation();
    useDocumentMeta({
        title: 'Damage Calculator',
        description: 'Calculate exact Pokémon damage ranges for any matchup, factoring stats, items, abilities, weather, and Tera type.',
        path: '/damage-calculator',
    });
    const allPokemons = useReferenceStore((s) => s.pokemonIndex);
    const fetchPokemonIndex = useReferenceStore((s) => s.fetchPokemonIndex);
    const items = useReferenceStore((s) => s.items);
    const fetchReferenceData = useReferenceStore((s) => s.fetchReferenceData);

    useEffect(() => {
        fetchPokemonIndex();
        fetchReferenceData();
    }, [fetchPokemonIndex, fetchReferenceData]);

    const [p1, setP1] = useState(() => initialPokemonState(true));
    const [p2, setP2] = useState(() => initialPokemonState(false));
    const [activeTab, setActiveTab] = useState('pokemon1'); // mobile layout tabs: 'pokemon1' | 'field' | 'pokemon2'

    const [field, setField] = useState({
        format: 'singles',
        weather: 'none',
        terrain: 'none',
        attackerSide: {
            helpingHand: false,
            tailwind: false,
            battery: false,
            powerSpot: false,
            steelySpirit: false,
        },
        defenderSide: {
            reflect: false,
            lightScreen: false,
            auroraVeil: false,
            friendGuard: false,
            stealthRock: false,
            spikes: 0,
        }
    });

    // Merge API items list
    const itemsList = useMemo(() => {
        const other = items.map(i => ({ value: i.name, label: capitalize(i.name) }));
        const commonKeys = COMMON_ITEMS.map(c => c.value);
        const filteredOther = other.filter(o => !commonKeys.includes(o.value)).sort((a, b) => a.label.localeCompare(b.label));
        return [...COMMON_ITEMS, ...filteredOther];
    }, [items]);

    // Handle full detail fetching on selection
    const handleSelectPokemon = async (side, pokemon) => {
        const setP = side === 'p1' ? setP1 : setP2;
        if (!pokemon) {
            setP(initialPokemonState(side === 'p1'));
            return;
        }

        setP(prev => ({
            ...prev,
            pokemon,
            baseStats: pokemon.baseStats || prev.baseStats,
            types: pokemon.types || [],
            teraType: pokemon.types?.[0] || 'normal',
            isTerastallized: false,
            ability: '',
            abilitiesList: [],
            movesPool: [],
            moves: [
                { name: '', power: 0, type: 'normal', category: 'physical', isSpread: false, isCritical: false },
                { name: '', power: 0, type: 'normal', category: 'physical', isSpread: false, isCritical: false },
                { name: '', power: 0, type: 'normal', category: 'physical', isSpread: false, isCritical: false },
                { name: '', power: 0, type: 'normal', category: 'physical', isSpread: false, isCritical: false },
            ],
            activeMoveIndex: 0
        }));

        const detail = await resolvePokemonDetail(pokemon.id);
        if (detail) {
            const sortedMoves = [...(detail.moves || [])].sort((a, b) => a.name.localeCompare(b.name));
            const updatedAbilities = detail.abilities || [];
            const firstAbility = updatedAbilities[0]?.name || '';

            setP(prev => ({
                ...prev,
                baseStats: detail.stats ? {
                    hp: detail.stats.find(s => s.name === 'hp')?.base_stat || 0,
                    attack: detail.stats.find(s => s.name === 'attack')?.base_stat || 0,
                    defense: detail.stats.find(s => s.name === 'defense')?.base_stat || 0,
                    'special-attack': detail.stats.find(s => s.name === 'special-attack')?.base_stat || 0,
                    'special-defense': detail.stats.find(s => s.name === 'special-defense')?.base_stat || 0,
                    speed: detail.stats.find(s => s.name === 'speed')?.base_stat || 0,
                } : prev.baseStats,
                types: detail.types || prev.types,
                teraType: detail.types?.[0] || prev.teraType,
                abilitiesList: updatedAbilities,
                ability: firstAbility,
                movesPool: sortedMoves
            }));

            // Auto-load a generic starting attack
            if (sortedMoves.length > 0) {
                const attackNames = ['tackle', 'scratch', 'pound', 'growl', 'thunderbolt', 'blizzard', 'surf', 'earthquake'];
                const firstMoveName = sortedMoves.find(m => attackNames.includes(m.name))?.name || sortedMoves[0].name;
                handleMoveChange(side, 0, firstMoveName, sortedMoves);
            }
        }
    };

    const handleMoveChange = async (side, idx, moveName, poolOverride) => {
        const setP = side === 'p1' ? setP1 : setP2;
        const currentP = side === 'p1' ? p1 : p2;
        const mPool = poolOverride || currentP.movesPool;

        if (!moveName) {
            setP(prev => {
                const newMoves = [...prev.moves];
                newMoves[idx] = { name: '', power: 0, type: 'normal', category: 'physical', isSpread: false, isCritical: false };
                return { ...prev, activeMoveIndex: idx, moves: newMoves };
            });
            return;
        }

        const poolEntry = mPool?.find(m => m.name === moveName);
        const details = await getMoveDetails(poolEntry?.url, moveName);
        if (details) {
            setP(prev => {
                const newMoves = [...prev.moves];
                newMoves[idx] = {
                    name: details.name,
                    power: details.power || 0,
                    type: details.type || 'normal',
                    category: details.damage_class === 'special' ? 'special' : (details.damage_class === 'status' ? 'status' : 'physical'),
                    isSpread: ['earthquake', 'blizzard', 'rock-slide', 'dazzling-gleam', 'hyper-voice', 'heat-wave', 'make-it-rain'].includes(details.name.toLowerCase()),
                    isCritical: prev.moves[idx]?.isCritical || false
                };
                return { ...prev, activeMoveIndex: idx, moves: newMoves };
            });
        }
    };

    const handleSwapRoles = () => {
        const tempP1 = { ...p1 };
        const tempP2 = { ...p2 };
        setP1(tempP2);
        setP2(tempP1);
        useToastStore.getState().showToast('Swapped roles!', 'info');
    };

    const handleResetAll = () => {
        setP1(initialPokemonState(true));
        setP2(initialPokemonState(false));
        setField({
            format: 'singles',
            weather: 'none',
            terrain: 'none',
            attackerSide: { helpingHand: false, tailwind: false, battery: false, powerSpot: false, steelySpirit: false },
            defenderSide: { reflect: false, lightScreen: false, auroraVeil: false, friendGuard: false, stealthRock: false, spikes: 0 }
        });
        useToastStore.getState().showToast('Reset all values.', 'info');
    };

    const activeMove = p1.moves[p1.activeMoveIndex];

    // Compute live calculations
    const result = useMemo(() => {
        if (!p1.pokemon || !p2.pokemon || !activeMove || !activeMove.name) return null;

        // Defender Max HP
        const defenderMaxHP = calcStat({
            base: p2.baseStats.hp,
            statKey: 'hp',
            level: p2.level,
            ev: p2.evs.hp,
            iv: p2.ivs.hp,
        });
        const currentHPVal = Math.max(1, Math.round((p2.currentHp / 100) * defenderMaxHP));

        return calcDamage({
            level: p1.level,
            movePower: activeMove.power,
            moveType: activeMove.type,
            moveCategory: activeMove.category,
            moveName: activeMove.name,
            isSpread: activeMove.isSpread,
            attacker: {
                baseStats: p1.baseStats,
                types: p1.types,
                evs: p1.evs,
                ivs: p1.ivs,
                nature: p1.nature,
                level: p1.level,
                ability: p1.ability,
                item: p1.item,
                status: p1.status,
                isTerastallized: p1.isTerastallized,
                teraType: p1.teraType
            },
            defender: {
                baseStats: p2.baseStats,
                types: p2.types,
                evs: p2.evs,
                ivs: p2.ivs,
                nature: p2.nature,
                level: p2.level,
                ability: p2.ability,
                item: p2.item,
                status: p2.status,
                isTerastallized: p2.isTerastallized,
                teraType: p2.teraType,
                currentHp: currentHPVal
            },
            field,
            isCritical: activeMove.isCritical || false
        });
    }, [p1, p2, activeMove, field]);

    // Format copy summary
    const summaryText = useMemo(() => {
        if (!result || !p1.pokemon || !p2.pokemon || !activeMove || !activeMove.name) return '';

        const atkVal = p1.evs[activeMove.category === 'physical' ? 'attack' : 'special-attack'] || 0;
        const atkStatName = activeMove.category === 'physical' ? 'Atk' : 'SpA';
        const defVal = p2.evs[activeMove.category === 'physical' ? 'defense' : 'special-defense'] || 0;
        const defStatName = activeMove.category === 'physical' ? 'Def' : 'SpD';

        const weatherStr = field.weather !== 'none' ? ` in ${capitalize(field.weather)}` : '';
        const terrainStr = field.terrain !== 'none' ? ` on ${capitalize(field.terrain)} Terrain` : '';

        return `${p1.level} Lvl ${capitalize(p1.pokemon.name)} ${atkVal} ${atkStatName} ${capitalize(activeMove.name)} vs. ${p2.evs.hp || 0} HP / ${defVal} ${defStatName} ${capitalize(p2.pokemon.name)}${weatherStr}${terrainStr}: ${result.minDamage}-${result.maxDamage} (${result.minPct}% - ${result.maxPct}%) -- ${result.koText}`;
    }, [result, p1, p2, activeMove, field]);

    const handleCopyResult = () => {
        if (!summaryText) return;
        navigator.clipboard.writeText(summaryText);
        useToastStore.getState().showToast('Calculation copied to clipboard!', 'success');
    };

    // Render Stats Row Helper
    const renderStatsRow = (side, key, pState, setP) => {
        const natureMod = natureMultiplier(pState.nature, key);
        const natureColor = natureMod === 1.1 ? 'text-[#F87171]' : (natureMod === 0.9 ? 'text-[#60A5FA]' : 'text-fg');

        const calculated = calcStat({
            base: pState.baseStats?.[key] || 0,
            iv: pState.ivs[key] ?? 31,
            ev: pState.evs[key] ?? 0,
            level: pState.level,
            nature: pState.nature,
            statKey: key
        });

        return (
            <tr key={key} className="border-b border-border hover:bg-surface-raised/40 transition-colors">
                <td className="py-1.5 font-semibold text-muted text-xs capitalize">{STAT_LABELS[key]}</td>
                <td className="py-1.5 text-center text-xs font-medium text-fg/80">{pState.baseStats?.[key] || 0}</td>
                <td className="py-1.5 text-center">
                    <input
                        type="number"
                        min="0"
                        max="31"
                        value={pState.ivs[key] ?? 31}
                        onChange={(e) => {
                            const val = Math.max(0, Math.min(31, Number(e.target.value) || 0));
                            setP(prev => ({ ...prev, ivs: { ...prev.ivs, [key]: val } }));
                        }}
                        className="w-12 text-center bg-bg border border-border rounded text-xs py-0.5"
                    />
                </td>
                <td className="py-1.5 text-center">
                    <input
                        type="number"
                        min="0"
                        max="252"
                        step="4"
                        value={pState.evs[key] ?? 0}
                        onChange={(e) => {
                            const val = Math.max(0, Math.min(252, Number(e.target.value) || 0));
                            setP(prev => ({ ...prev, evs: { ...prev.evs, [key]: val } }));
                        }}
                        className="w-14 text-center bg-bg border border-border rounded text-xs py-0.5 font-mono"
                    />
                </td>
                <td className={`py-1.5 text-right font-bold text-xs font-mono ${natureColor}`}>
                    {calculated}
                </td>
            </tr>
        );
    };

    return (
        <div className="space-y-6">
            {/* Calculations Banner Card */}
            <div className="dmg-result elevation-2 flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl relative overflow-hidden border border-border">
                {result ? (
                    <div className="flex-1 space-y-2 z-10 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="text-3xl font-extrabold text-fg font-mono leading-none tracking-tight">
                                {result.minPct}% – {result.maxPct}%
                            </span>
                            <span className={`badge text-[10px] uppercase font-bold py-0.5 px-2 rounded ${result.koGuaranteed ? 'badge-danger bg-danger/10 text-danger border-danger/20' : 'badge-accent bg-warning/10 text-warning border-warning/20'
                                }`}>
                                {result.koText}
                            </span>
                        </div>

                        <p className="text-xs leading-relaxed text-fg/90 font-medium select-all bg-bg/40 p-2.5 rounded-lg border border-border font-mono">
                            {summaryText}
                        </p>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleCopyResult}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:text-primary/80 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                                </svg>
                                Copy calculation
                            </button>
                            <span className="text-[10px] text-muted font-mono">
                                ({result.minDamage}–{result.maxDamage} / {result.defenderHP} HP)
                            </span>
                        </div>

                        {/* Damage bar */}
                        <div className="dmg-bar mt-3" aria-hidden="true">
                            <div className="dmg-bar__fill" style={{ width: `${Math.min(100, result.maxPct)}%` }} />
                            <div className="dmg-bar__min" style={{ width: `${Math.min(100, result.minPct)}%` }} />
                        </div>

                        {/* 16 Roll list */}
                        <div className="mt-3 text-[11px] text-muted leading-tight font-mono select-none bg-surface/60 p-2 rounded border border-border">
                            <strong>Possible damage rolls:</strong> ({result.damageRolls.join(', ')})
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 text-center py-6 text-muted font-medium z-10 border border-dashed border-border rounded-xl">
                        {p1.pokemon && p2.pokemon ? 'Select an active move to compute damage rolls.' : 'Pick an attacker and defender to begin.'}
                    </div>
                )}

                {/* Toolbar Buttons inside banner card to save a row */}
                <div className="flex flex-row md:flex-col items-center gap-2 shrink-0 z-10 w-full md:w-auto justify-end">
                    <button
                        onClick={handleSwapRoles}
                        className="btn btn-secondary flex items-center gap-1.5 text-xs h-8 px-3 w-full justify-center md:w-28"
                        title="Swap Attacker & Defender Roles"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 3 21 7 17 11" />
                            <path d="M3 7h18" />
                            <path d="M7 21 3 17 7 13" />
                            <path d="M21 17H3" />
                        </svg>
                        Swap Roles
                    </button>
                    <button
                        onClick={handleResetAll}
                        className="btn btn-outline text-xs h-8 px-3 w-full justify-center md:w-28 hover:text-danger hover:border-danger/30"
                    >
                        Reset All
                    </button>
                </div>
            </div>

            {/* Mobile Tabs navigation */}
            <div className="lg:hidden flex border-b border-border bg-surface rounded-xl p-1 gap-1 mb-2">
                <button
                    onClick={() => setActiveTab('pokemon1')}
                    className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all ${activeTab === 'pokemon1' ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-fg'
                        }`}
                >
                    Attacker (P1)
                </button>
                <button
                    onClick={() => setActiveTab('field')}
                    className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all ${activeTab === 'field' ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-fg'
                        }`}
                >
                    Field & Presets
                </button>
                <button
                    onClick={() => setActiveTab('pokemon2')}
                    className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all ${activeTab === 'pokemon2' ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-fg'
                        }`}
                >
                    Defender (P2)
                </button>
            </div>

            {/* Three Column View Container */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

                {/* Attacker (Pokémon 1) */}
                <div className={`lg:col-span-4 bg-surface border border-border p-4 rounded-xl space-y-4 shadow-sm lg:block ${activeTab === 'pokemon1' ? 'block' : 'hidden'}`}>
                    <div className="flex items-center justify-between border-b border-border pb-2">
                        <span className="text-xs font-extrabold tracking-wider uppercase text-[#F08030] flex items-center gap-1.5">
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14.5 17.5 3 6V3h3l11.5 11.5" />
                                <path d="m13 19 6-6" />
                                <path d="m16 22 5-5" />
                                <path d="m19 21 2-2" />
                            </svg>
                            Pokémon 1 (Attacker)
                        </span>
                        <div className="flex gap-1">
                            {p1.types.map(t => <TypeBadge key={t} type={t} />)}
                        </div>
                    </div>

                    {/* Top Section: Sprite + Name/Level/Status inputs */}
                    <div className="flex gap-4 items-start">
                        {/* Big Sprite Container */}
                        <div className="w-20 h-20 bg-bg border border-border rounded-xl flex items-center justify-center relative overflow-hidden shrink-0 shadow-inner">
                            {p1.pokemon ? (
                                <img
                                    src={getPokemonDisplaySprite(p1.pokemon, { preferArtwork: true })}
                                    alt={p1.pokemon.name}
                                    className="w-16 h-16 object-contain"
                                    onError={(e) => {
                                        e.target.src = getPokemonDisplaySprite(p1.pokemon);
                                    }}
                                />
                            ) : (
                                <div className="text-muted/30">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                                    </svg>
                                </div>
                            )}
                        </div>

                        {/* Name & Basic Controls side-by-side */}
                        <div className="flex-1 min-w-0 space-y-2">
                            <PokemonPicker pokemons={allPokemons} value={p1.pokemon} onSelect={(p) => handleSelectPokemon('p1', p)} />

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="dmg-field__label">Level</label>
                                    <NumberCounter
                                        value={p1.level}
                                        onChange={(val) => setP1(prev => ({ ...prev, level: val }))}
                                        min={1}
                                        max={100}
                                        className="w-full"
                                    />
                                </div>
                                <div>
                                    <label className="dmg-field__label">Status</label>
                                    <select
                                        className="dmg-select text-xs"
                                        value={p1.status}
                                        onChange={(e) => setP1(prev => ({ ...prev, status: e.target.value }))}
                                    >
                                        <option value="healthy">Healthy</option>
                                        <option value="burned">Burned</option>
                                        <option value="poisoned">Poisoned</option>
                                        <option value="paralyzed">Paralyzed</option>
                                        <option value="asleep">Asleep</option>
                                        <option value="frozen">Frozen</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Active Attack Card */}
                    <div className="p-3 rounded-xl bg-primary-soft/10 border border-border flex flex-col justify-center">
                        <span className="text-[10px] font-extrabold text-[#F08030] uppercase tracking-wider mb-1 flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                            Active Attack
                        </span>
                        {activeMove && activeMove.name ? (
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-bold text-fg truncate capitalize">{prettify(activeMove.name)}</span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <TypeBadge type={activeMove.type} />
                                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-surface border border-border text-muted font-mono leading-none">
                                        BP {activeMove.power || 0}
                                    </span>
                                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-surface border border-border text-muted leading-none">
                                        {activeMove.category === 'physical' ? 'Phys' : (activeMove.category === 'special' ? 'Spec' : 'Stat')}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <span className="text-xs text-muted/80 italic">No move selected</span>
                        )}
                    </div>

                    {/* Terastallization Options */}
                    <div className="bg-bg/40 p-2.5 rounded-lg border border-border flex items-center justify-between gap-3">
                        <div className="flex items-center gap-1.5 shrink-0">
                            <ToggleSwitch
                                checked={p1.isTerastallized}
                                onChange={(val) => setP1(prev => ({ ...prev, isTerastallized: val }))}
                                label="Terastallize"
                                activeColor="bg-[#F08030]"
                            />
                        </div>
                        <div className="w-28 shrink-0">
                            <select
                                className="dmg-select text-xs py-1"
                                value={p1.teraType}
                                onChange={(e) => setP1(prev => ({ ...prev, teraType: e.target.value }))}
                                disabled={!p1.isTerastallized}
                            >
                                {TYPES.map(t => <option key={t} value={t}>{capitalize(t)}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Stats Table */}
                    <div className="bg-bg/25 p-2 rounded-lg border border-border">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border text-[10px] text-muted uppercase tracking-wider font-semibold">
                                    <th className="pb-1">Stat</th>
                                    <th className="pb-1 text-center">Base</th>
                                    <th className="pb-1 text-center">IVs</th>
                                    <th className="pb-1 text-center">EVs</th>
                                    <th className="pb-1 text-right">Stat</th>
                                </tr>
                            </thead>
                            <tbody>
                                {STAT_KEYS.map(key => renderStatsRow('p1', key, p1, setP1))}
                            </tbody>
                        </table>
                    </div>

                    {/* Ability / Item Selects */}
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        <div>
                            <label className="dmg-field__label">Ability</label>
                            <select
                                className="dmg-select text-xs capitalize"
                                value={p1.ability}
                                onChange={(e) => setP1(prev => ({ ...prev, ability: e.target.value }))}
                            >
                                {p1.abilitiesList.map(a => (
                                    <option key={a.name} value={a.name}>{capitalize(a.name)} {a.is_hidden ? '(H)' : ''}</option>
                                ))}
                                {p1.abilitiesList.length > 0 && <option disabled>────────────────────</option>}
                                {BATTLE_ABILITIES.map(a => (
                                    <option key={a.value} value={a.value}>{a.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="dmg-field__label">Held Item</label>
                            <select
                                className="dmg-select text-xs"
                                value={p1.item}
                                onChange={(e) => setP1(prev => ({ ...prev, item: e.target.value }))}
                            >
                                {itemsList.map((item, idx) => (
                                    <option key={`${item.value}-${idx}`} value={item.value}>{item.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Moves Section */}
                    <div className="space-y-2 mt-4 pt-3 border-t border-border">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-extrabold uppercase tracking-wider text-muted flex items-center gap-1.5">
                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#F08030]">
                                    <circle cx="12" cy="12" r="10" /><path d="m4.93 4.93 4.24 4.24" /><path d="m14.83 9.17 4.24-4.24" /><path d="m14.83 14.83 4.24 4.24" /><path d="m9.17 14.83-4.24 4.24" />
                                </svg>
                                Attacker Moveset
                            </span>
                            <span className="text-[10px] text-muted font-medium">Select active move</span>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                            {p1.moves.map((m, idx) => {
                                const isActive = p1.activeMoveIndex === idx;
                                return (
                                    <div
                                        key={idx}
                                        onClick={() => setP1(prev => ({ ...prev, activeMoveIndex: idx }))}
                                        className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all relative group ${isActive
                                            ? 'bg-primary-soft/30 border-primary ring-1 ring-primary shadow-sm'
                                            : 'bg-bg/15 border-border hover:bg-bg/30 hover:border-border-hover'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="radio"
                                                    name="active-move-selection"
                                                    checked={isActive}
                                                    onChange={() => setP1(prev => ({ ...prev, activeMoveIndex: idx }))}
                                                    className="accent-primary cursor-pointer w-3.5 h-3.5"
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                                <span className="text-xs font-bold text-fg/80">Move {idx + 1}</span>
                                            </div>
                                            {isActive ? (
                                                <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-success-soft text-success border border-success/20">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="text-[9px] text-muted font-semibold uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                                                    Use Move
                                                </span>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-12 gap-1.5 items-center">
                                            <div className="col-span-6" onClick={(e) => e.stopPropagation()}>
                                                <select
                                                    className="dmg-select text-xs py-1"
                                                    value={m.name}
                                                    onChange={(e) => handleMoveChange('p1', idx, e.target.value)}
                                                >
                                                    <option value="">(Select Move)</option>
                                                    {p1.movesPool?.map((move) => (
                                                        <option key={move.name} value={move.name}>
                                                            {capitalize(move.name)}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="col-span-2 flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                                                <span className="text-[9px] text-muted font-bold leading-none mb-1">Pwr</span>
                                                <input
                                                    type="number" min="0" max="250" value={m.power}
                                                    onChange={(e) => {
                                                        const val = Math.max(0, Math.min(250, Number(e.target.value) || 0));
                                                        setP1(prev => {
                                                            const newMoves = [...prev.moves];
                                                            newMoves[idx] = { ...newMoves[idx], power: val };
                                                            return { ...prev, activeMoveIndex: idx, moves: newMoves };
                                                        });
                                                    }}
                                                    className="dmg-number text-xs py-0.5 text-center leading-none"
                                                />
                                            </div>
                                            <div className="col-span-2 flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                                                <span className="text-[9px] text-muted font-bold leading-none mb-1">Type</span>
                                                <select
                                                    className="dmg-select text-xs py-0.5"
                                                    value={m.type}
                                                    onChange={(e) => {
                                                        setP1(prev => {
                                                            const newMoves = [...prev.moves];
                                                            newMoves[idx] = { ...newMoves[idx], type: e.target.value };
                                                            return { ...prev, activeMoveIndex: idx, moves: newMoves };
                                                        });
                                                    }}
                                                >
                                                    {TYPES.map(t => <option key={t} value={t}>{capitalize(t)}</option>)}
                                                </select>
                                            </div>
                                            <div className="col-span-2 flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                                                <span className="text-[9px] text-muted font-bold leading-none mb-1">Cat</span>
                                                <select
                                                    className="dmg-select text-xs py-0.5"
                                                    value={m.category}
                                                    onChange={(e) => {
                                                        setP1(prev => {
                                                            const newMoves = [...prev.moves];
                                                            newMoves[idx] = { ...newMoves[idx], category: e.target.value };
                                                            return { ...prev, activeMoveIndex: idx, moves: newMoves };
                                                        });
                                                    }}
                                                >
                                                    <option value="physical">Phys</option>
                                                    <option value="special">Spec</option>
                                                    <option value="status">Stat</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 mt-2.5" onClick={(e) => e.stopPropagation()}>
                                            <ToggleSwitch
                                                checked={m.isCritical}
                                                onChange={(val) => {
                                                    setP1(prev => {
                                                        const newMoves = [...prev.moves];
                                                        newMoves[idx] = { ...newMoves[idx], isCritical: val };
                                                        return { ...prev, activeMoveIndex: idx, moves: newMoves };
                                                    });
                                                }}
                                                label="Crit"
                                                activeColor="bg-[#F08030]"
                                            />

                                            <ToggleSwitch
                                                checked={m.isSpread}
                                                onChange={(val) => {
                                                    setP1(prev => {
                                                        const newMoves = [...prev.moves];
                                                        newMoves[idx] = { ...newMoves[idx], isSpread: val };
                                                        return { ...prev, activeMoveIndex: idx, moves: newMoves };
                                                    });
                                                }}
                                                label="Spread"
                                                activeColor="bg-[#F08030]"
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Field & Presets Settings (Center Column) */}
                <div className={`lg:col-span-4 bg-surface border border-border p-4 rounded-xl space-y-5 shadow-sm lg:block ${activeTab === 'field' ? 'block' : 'hidden'}`}>
                    <div className="border-b border-border pb-2">
                        <span className="text-xs font-extrabold tracking-wider uppercase text-primary flex items-center gap-1.5">
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M2 22h20" />
                                <path d="M5 22V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v15" />
                            </svg>
                            Field Conditions
                        </span>
                    </div>

                    {/* Singles/Doubles Format toggle */}
                    <div>
                        <label className="dmg-field__label">Format</label>
                        <div className="grid grid-cols-2 gap-1 bg-bg p-1 rounded-lg border border-border">
                            <button
                                onClick={() => setField(prev => ({ ...prev, format: 'singles' }))}
                                className={`py-1 text-xs font-bold rounded-md transition-all ${field.format === 'singles' ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-fg'
                                    }`}
                            >
                                Singles
                            </button>
                            <button
                                onClick={() => setField(prev => ({ ...prev, format: 'doubles' }))}
                                className={`py-1 text-xs font-bold rounded-md transition-all ${field.format === 'doubles' ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-fg'
                                    }`}
                            >
                                Doubles
                            </button>
                        </div>
                    </div>

                    {/* Level Presets */}
                    <div>
                        <label className="dmg-field__label">Level Presets (All)</label>
                        <div className="grid grid-cols-3 gap-1 bg-bg p-1 rounded-lg border border-border">
                            {[100, 50, 5].map((lvl) => (
                                <button
                                    key={lvl}
                                    onClick={() => {
                                        setP1(prev => ({ ...prev, level: lvl }));
                                        setP2(prev => ({ ...prev, level: lvl }));
                                    }}
                                    className="py-1 text-xs font-semibold rounded hover:bg-surface-raised transition-all border border-transparent hover:border-border"
                                >
                                    Lvl {lvl}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Weather Selector */}
                    <div>
                        <label className="dmg-field__label">Weather</label>
                        <div className="grid grid-cols-5 gap-1 text-[11px] font-semibold text-center select-none bg-bg p-1 rounded-lg border border-border">
                            {[
                                { val: 'none', label: 'None', color: 'hover:bg-neutral-500/10 active-none' },
                                { val: 'sun', label: 'Sun', color: 'hover:bg-yellow-500/10 active-sun' },
                                { val: 'rain', label: 'Rain', color: 'hover:bg-blue-500/10 active-rain' },
                                { val: 'sand', label: 'Sand', color: 'hover:bg-amber-700/10 active-sand' },
                                { val: 'snow', label: 'Snow', color: 'hover:bg-cyan-500/10 active-snow' }
                            ].map((w) => (
                                <button
                                    key={w.val}
                                    onClick={() => setField(prev => ({ ...prev, weather: w.val }))}
                                    className={`py-1 rounded border border-transparent transition-all ${w.color} ${field.weather === w.val ? 'bg-primary/20 text-primary border-primary/30 font-bold scale-[1.03]' : 'text-muted'
                                        }`}
                                >
                                    {w.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Terrain Selector */}
                    <div>
                        <label className="dmg-field__label">Terrain</label>
                        <div className="grid grid-cols-5 gap-1 text-[11px] font-semibold text-center select-none bg-bg p-1 rounded-lg border border-border">
                            {[
                                { val: 'none', label: 'None', color: 'hover:bg-neutral-500/10' },
                                { val: 'electric', label: 'Elec', color: 'hover:bg-yellow-400/10 active-electric' },
                                { val: 'grassy', label: 'Grass', color: 'hover:bg-green-500/10 active-grassy' },
                                { val: 'misty', label: 'Misty', color: 'hover:bg-pink-400/10 active-misty' },
                                { val: 'psychic', label: 'Psy', color: 'hover:bg-purple-500/10 active-psychic' }
                            ].map((t) => (
                                <button
                                    key={t.val}
                                    onClick={() => setField(prev => ({ ...prev, terrain: t.val }))}
                                    className={`py-1 rounded border border-transparent transition-all ${t.color} ${field.terrain === t.val ? 'bg-primary/20 text-primary border-primary/30 font-bold scale-[1.03]' : 'text-muted'
                                        }`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Attacker Modifiers */}
                    <div className="bg-bg/30 p-3 rounded-lg border border-border space-y-2">
                        <span className="text-[10px] font-bold text-[#F08030] uppercase tracking-wider">Attacker Side Modifiers</span>
                        <div className="grid grid-cols-1 gap-2 mt-1.5">
                            {[
                                { key: 'helpingHand', label: 'Helping Hand (Attacking)' },
                                { key: 'tailwind', label: 'Tailwind (Speed x2)' },
                                { key: 'battery', label: 'Battery (Special Dmg x1.3)' },
                                { key: 'powerSpot', label: 'Power Spot (Dmg x1.3)' },
                                { key: 'steelySpirit', label: 'Steely Spirit (Steel x1.5)' }
                            ].map((m) => (
                                <div key={m.key} className="flex items-center py-0.5">
                                    <ToggleSwitch
                                        checked={field.attackerSide[m.key]}
                                        onChange={(val) => setField(prev => ({
                                            ...prev,
                                            attackerSide: { ...prev.attackerSide, [m.key]: val }
                                        }))}
                                        label={m.label}
                                        activeColor="bg-[#F08030]"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Defender Modifiers */}
                    <div className="bg-bg/30 p-3 rounded-lg border border-border space-y-2.5">
                        <span className="text-[10px] font-bold text-[#6890F0] uppercase tracking-wider">Defender Side Modifiers</span>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 mt-1">
                            {[
                                { key: 'reflect', label: 'Reflect' },
                                { key: 'lightScreen', label: 'Light Screen' },
                                { key: 'auroraVeil', label: 'Aurora Veil' },
                                { key: 'friendGuard', label: 'Friend Guard' },
                                { key: 'stealthRock', label: 'Stealth Rock' }
                            ].map((m) => (
                                <div key={m.key} className="flex items-center">
                                    <ToggleSwitch
                                        checked={field.defenderSide[m.key]}
                                        onChange={(val) => setField(prev => ({
                                            ...prev,
                                            defenderSide: { ...prev.defenderSide, [m.key]: val }
                                        }))}
                                        label={m.label}
                                        activeColor="bg-[#6890F0]"
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Spikes Layer toggle */}
                        <div className="flex items-center justify-between border-t border-border pt-2 flex-wrap gap-1">
                            <span className="text-xs font-semibold text-muted">Spikes Layers</span>
                            <div className="flex bg-bg p-0.5 rounded border border-border text-[10px] font-bold">
                                {[0, 1, 2, 3].map((val) => (
                                    <button
                                        key={val}
                                        onClick={() => setField(prev => ({
                                            ...prev,
                                            defenderSide: { ...prev.defenderSide, spikes: val }
                                        }))}
                                        className={`px-2 py-0.5 rounded-sm ${field.defenderSide.spikes === val ? 'bg-[#6890F0] text-white shadow-sm' : 'text-muted hover:text-fg'
                                            }`}
                                    >
                                        {val}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Defender (Pokémon 2) */}
                <div className={`lg:col-span-4 bg-surface border border-border p-4 rounded-xl space-y-4 shadow-sm lg:block ${activeTab === 'pokemon2' ? 'block' : 'hidden'}`}>
                    <div className="flex items-center justify-between border-b border-border pb-2">
                        <span className="text-xs font-extrabold tracking-wider uppercase text-[#6890F0] flex items-center gap-1.5">
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                            Pokémon 2 (Defender)
                        </span>
                        <div className="flex gap-1">
                            {p2.types.map(t => <TypeBadge key={t} type={t} />)}
                        </div>
                    </div>

                    {/* Top Section: Sprite + Name/Level/Status inputs */}
                    <div className="flex gap-4 items-start">
                        {/* Big Sprite Container */}
                        <div className="w-20 h-20 bg-bg border border-border rounded-xl flex items-center justify-center relative overflow-hidden shrink-0 shadow-inner">
                            {p2.pokemon ? (
                                <img
                                    src={getPokemonDisplaySprite(p2.pokemon, { preferArtwork: true })}
                                    alt={p2.pokemon.name}
                                    className="w-16 h-16 object-contain"
                                    onError={(e) => {
                                        e.target.src = getPokemonDisplaySprite(p2.pokemon);
                                    }}
                                />
                            ) : (
                                <div className="text-muted/30">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                                    </svg>
                                </div>
                            )}
                        </div>

                        {/* Name & Basic Controls side-by-side */}
                        <div className="flex-1 min-w-0 space-y-2">
                            <PokemonPicker pokemons={allPokemons} value={p2.pokemon} onSelect={(p) => handleSelectPokemon('p2', p)} />

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="dmg-field__label">Level</label>
                                    <NumberCounter
                                        value={p2.level}
                                        onChange={(val) => setP2(prev => ({ ...prev, level: val }))}
                                        min={1}
                                        max={100}
                                        className="w-full"
                                    />
                                </div>
                                <div>
                                    <label className="dmg-field__label">Status</label>
                                    <select
                                        className="dmg-select text-xs"
                                        value={p2.status}
                                        onChange={(e) => setP2(prev => ({ ...prev, status: e.target.value }))}
                                    >
                                        <option value="healthy">Healthy</option>
                                        <option value="burned">Burned</option>
                                        <option value="poisoned">Poisoned</option>
                                        <option value="paralyzed">Paralyzed</option>
                                        <option value="asleep">Asleep</option>
                                        <option value="frozen">Frozen</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Target Health Card */}
                    <div className="p-3 rounded-xl bg-bg/50 border border-border flex flex-col justify-center">
                        <span className="text-[10px] font-extrabold text-[#6890F0] uppercase tracking-wider mb-1 flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#6890F0] animate-pulse" />
                            Target Health
                        </span>
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-xs font-bold text-fg shrink-0 font-mono">{p2.currentHp}% HP</span>
                            {/* Progress bar fill */}
                            <div className="h-2 w-full bg-surface rounded-full overflow-hidden border border-border" aria-hidden="true">
                                <div
                                    className={`h-full transition-all duration-300 ${p2.currentHp > 50 ? 'bg-success' : (p2.currentHp > 20 ? 'bg-warning' : 'bg-danger')
                                        }`}
                                    style={{ width: `${p2.currentHp}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Terastallization Options */}
                    <div className="bg-bg/40 p-2.5 rounded-lg border border-border flex items-center justify-between gap-3">
                        <div className="flex items-center gap-1.5 shrink-0">
                            <ToggleSwitch
                                checked={p2.isTerastallized}
                                onChange={(val) => setP2(prev => ({ ...prev, isTerastallized: val }))}
                                label="Terastallize"
                                activeColor="bg-[#6890F0]"
                            />
                        </div>
                        <div className="w-28 shrink-0">
                            <select
                                className="dmg-select text-xs py-1"
                                value={p2.teraType}
                                onChange={(e) => setP2(prev => ({ ...prev, teraType: e.target.value }))}
                                disabled={!p2.isTerastallized}
                            >
                                {TYPES.map(t => <option key={t} value={t}>{capitalize(t)}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Stats Table */}
                    <div className="bg-bg/25 p-2 rounded-lg border border-border">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border text-[10px] text-muted uppercase tracking-wider font-semibold">
                                    <th className="pb-1">Stat</th>
                                    <th className="pb-1 text-center">Base</th>
                                    <th className="pb-1 text-center">IVs</th>
                                    <th className="pb-1 text-center">EVs</th>
                                    <th className="pb-1 text-right">Stat</th>
                                </tr>
                            </thead>
                            <tbody>
                                {STAT_KEYS.map(key => renderStatsRow('p2', key, p2, setP2))}
                            </tbody>
                        </table>
                    </div>

                    {/* Ability / Item Selects */}
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        <div>
                            <label className="dmg-field__label">Ability</label>
                            <select
                                className="dmg-select text-xs capitalize"
                                value={p2.ability}
                                onChange={(e) => setP2(prev => ({ ...prev, ability: e.target.value }))}
                            >
                                {p2.abilitiesList.map(a => (
                                    <option key={a.name} value={a.name}>{capitalize(a.name)} {a.is_hidden ? '(H)' : ''}</option>
                                ))}
                                {p2.abilitiesList.length > 0 && <option disabled>────────────────────</option>}
                                {BATTLE_ABILITIES.map(a => (
                                    <option key={a.value} value={a.value}>{a.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="dmg-field__label">Held Item</label>
                            <select
                                className="dmg-select text-xs"
                                value={p2.item}
                                onChange={(e) => setP2(prev => ({ ...prev, item: e.target.value }))}
                            >
                                {itemsList.map((item, idx) => (
                                    <option key={`${item.value}-${idx}`} value={item.value}>{item.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Current HP Visual Slider */}
                    <div className="bg-bg/30 p-3 rounded-lg border border-border space-y-2 mt-3">
                        <div className="flex items-center justify-between text-xs font-semibold select-none">
                            <span className="text-muted">Defender Health</span>
                            <span className="font-mono text-fg">{p2.currentHp}%</span>
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="100"
                            value={p2.currentHp}
                            onChange={(e) => setP2(prev => ({ ...prev, currentHp: Number(e.target.value) }))}
                            className="w-full accent-primary bg-bg rounded-lg appearance-none cursor-pointer h-2 border border-border"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
