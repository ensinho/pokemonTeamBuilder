import React, { useEffect, useMemo, useState } from 'react';
import '../../styles/tools-views.css';
import { resolvePokemonDetail, getMoveDetails } from '../../services/pokemonDataCache';
import { calcDamage, calcStat, NATURE_MODIFIERS, natureMultiplier } from '../../utils/damageCalc';
import { useReferenceStore } from '../../store/useReferenceStore';
import { useTranslation } from '../../hooks/useTranslation';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { PokemonPicker } from '../PokemonPicker';
import { SpriteSelect } from '../SpriteSelect';
import { useToastStore } from '../../store/useToastStore';
import { TypeBadge } from '../TypeBadge';
import { getPokemonDisplaySprite } from '../../utils/pokemonSprites';
import { itemSpriteUrl } from '../../utils/itemSuggestions';
import { useBattleItems } from '../../hooks/useBattleItems';
import { useMegaStones } from '../../hooks/useMegaStones';
import { competitivePresetFor } from '../../utils/loadCompetitivePreset';

const NATURES = Object.keys(NATURE_MODIFIERS);
const TYPES = [
    'normal', 'fire', 'water', 'grass', 'electric', 'ice', 'fighting', 'poison',
    'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'
];

// Damaging moves that hit all adjacent targets — take the 0.75x spread penalty
// in doubles. Used both when a move is picked and when the meta set is applied.
const SPREAD_MOVES = [
    'earthquake', 'blizzard', 'rock-slide', 'dazzling-gleam', 'hyper-voice',
    'heat-wave', 'make-it-rain', 'muddy-water', 'discharge', 'lava-plume',
    'surf', 'bulldoze', 'eruption', 'water-spout', 'sludge-wave', 'icy-wind',
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

const WEATHERS = [
    { v: 'none', l: 'None' }, { v: 'sun', l: 'Sun' }, { v: 'rain', l: 'Rain' },
    { v: 'sand', l: 'Sand' }, { v: 'snow', l: 'Snow' },
];
const TERRAINS = [
    { v: 'none', l: 'None' }, { v: 'electric', l: 'Electric' }, { v: 'grassy', l: 'Grassy' },
    { v: 'misty', l: 'Misty' }, { v: 'psychic', l: 'Psychic' },
];

const capitalize = (s = '') => s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
const prettify = (s = '') => s.replace(/-/g, ' ');

const NATURE_OPTIONS = NATURES.map((n) => {
    const mod = NATURE_MODIFIERS[n];
    const label = mod.plus
        ? `${capitalize(n)} (+${STAT_LABELS[mod.plus]} / −${STAT_LABELS[mod.minus]})`
        : `${capitalize(n)} (Neutral)`;
    return { value: n, label };
}).sort((a, b) => a.label.localeCompare(b.label));

// Compact effectiveness label for a move's roll, e.g. 2 → "2×", 0.25 → "¼×".
const effectivenessLabel = (e) => {
    if (e === 0) return 'Immune';
    if (e === 0.25) return '¼×';
    if (e === 0.5) return '½×';
    if (e === 2) return '2×';
    if (e === 4) return '4×';
    if (e !== 1) return `${e}×`;
    return '';
};

const SESSION_KEY = 'damage-calc-state';

const loadSessionState = () => {
    try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

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
    const handleDecrement = () => onChange(Math.max(min, value - step));
    const handleIncrement = () => onChange(Math.min(max, value + step));

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

const emptyMove = () => ({ name: '', power: 0, type: 'normal', category: 'physical', isSpread: false, isCritical: false });
const emptyMoveset = () => [emptyMove(), emptyMove(), emptyMove(), emptyMove()];
const emptyEvs = () => ({ hp: 0, attack: 0, defense: 0, 'special-attack': 0, 'special-defense': 0, speed: 0 });

// Turn a move detail record into the calculator's move shape.
const moveFromDetails = (details, prevCritical = false) => ({
    name: details.name,
    power: details.power || 0,
    type: details.type || 'normal',
    category: details.damage_class === 'special' ? 'special' : (details.damage_class === 'status' ? 'status' : 'physical'),
    isSpread: SPREAD_MOVES.includes((details.name || '').toLowerCase()),
    isCritical: prevCritical,
});

// Build the attacker/defender payload calcDamage expects from a Pokémon state.
const sideParams = (p) => ({
    baseStats: p.baseStats, types: p.types, evs: p.evs, ivs: p.ivs,
    nature: p.nature, level: p.level, ability: p.ability, item: p.item,
    status: p.status, isTerastallized: p.isTerastallized, teraType: p.teraType,
});

// Damage `move` deals from `atk` to `def`. `fieldObj` supplies weather / terrain /
// side modifiers. Returns null for status or zero-power moves.
const computeMatchup = (atk, def, move, fieldObj) => {
    if (!atk?.pokemon || !def?.pokemon || !move?.name || !move.power) return null;
    const defenderMaxHP = calcStat({ base: def.baseStats.hp, statKey: 'hp', level: def.level, ev: def.evs.hp, iv: def.ivs.hp });
    const currentHPVal = Math.max(1, Math.round((def.currentHp / 100) * defenderMaxHP));
    return calcDamage({
        level: atk.level,
        movePower: move.power, moveType: move.type, moveCategory: move.category,
        moveName: move.name, isSpread: move.isSpread,
        attacker: sideParams(atk),
        defender: { ...sideParams(def), currentHp: currentHPVal },
        field: fieldObj,
        isCritical: move.isCritical || false,
    });
};

// A copy-paste-ready Showdown-style calc line for one move in one direction.
const matchupSummary = (atk, def, move, r, fieldObj) => {
    if (!r) return '';
    const phys = move.category === 'physical';
    const atkVal = atk.evs[phys ? 'attack' : 'special-attack'] || 0;
    const defVal = def.evs[phys ? 'defense' : 'special-defense'] || 0;
    const atkStat = phys ? 'Atk' : 'SpA';
    const defStat = phys ? 'Def' : 'SpD';
    const sign = (nature, key) => {
        const m = natureMultiplier(nature, key);
        return m > 1 ? '+' : (m < 1 ? '-' : '');
    };
    const weather = fieldObj.weather && fieldObj.weather !== 'none' ? ` in ${capitalize(fieldObj.weather)}` : '';
    const terrain = fieldObj.terrain && fieldObj.terrain !== 'none' ? ` on ${capitalize(fieldObj.terrain)} Terrain` : '';
    return `Lvl ${atk.level} ${capitalize(atk.nature)} ${capitalize(atk.pokemon.name)} ${atkVal}${sign(atk.nature, phys ? 'attack' : 'special-attack')} ${atkStat} ${capitalize(move.name)} vs. ${def.evs.hp || 0} HP / ${defVal}${sign(def.nature, phys ? 'defense' : 'special-defense')} ${defStat} ${capitalize(def.nature)} ${capitalize(def.pokemon.name)}${weather}${terrain}: ${r.minDamage}-${r.maxDamage} (${r.minPct}% - ${r.maxPct}%) -- ${r.koText}`;
};

const initialPokemonState = (isAttacker) => ({
    pokemon: null,
    isMega: false,
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
    moves: emptyMoveset(),
    activeMoveIndex: 0,
    currentHp: 100, // percentage
    movesPool: [],
    baseStats: { hp: 100, attack: 100, defense: 100, 'special-attack': 100, 'special-defense': 100, speed: 100 }
});

export function DamageCalculatorView() {
    useTranslation();
    useDocumentMeta({
        title: 'Damage Calculator',
        description: 'Calculate exact Pokémon damage ranges for any matchup, factoring stats, items, abilities, weather, and Tera type.',
        path: '/damage-calculator',
    });
    const allPokemons = useReferenceStore((s) => s.pokemonIndex);
    const fetchPokemonIndex = useReferenceStore((s) => s.fetchPokemonIndex);
    const items = useReferenceStore((s) => s.items);
    const fetchReferenceData = useReferenceStore((s) => s.fetchReferenceData);
    const battleItems = useBattleItems();
    const megaByStone = useMegaStones();

    useEffect(() => {
        fetchPokemonIndex();
        fetchReferenceData();
    }, [fetchPokemonIndex, fetchReferenceData]);

    // Mega form id (the index entry's id, === the stone's spriteId) → its stone.
    // A Mega form has no learnset of its own on the API, so we treat it as its
    // pre-Mega species holding the stone: base moves/abilities, Mega stats/types.
    const megaByFormId = useMemo(() => {
        const map = new Map();
        for (const [slug, info] of Object.entries(megaByStone || {})) {
            if (info?.spriteId) map.set(info.spriteId, { slug, ...info });
        }
        return map;
    }, [megaByStone]);

    const [restored] = useState(loadSessionState);
    const [p1, setP1] = useState(() => (restored?.p1 ? { ...initialPokemonState(true), ...restored.p1 } : initialPokemonState(true)));
    const [p2, setP2] = useState(() => (restored?.p2 ? { ...initialPokemonState(false), ...restored.p2 } : initialPokemonState(false)));
    const [activeTab, setActiveTab] = useState('pokemon1'); // mobile: 'pokemon1' | 'damage' | 'pokemon2'
    const [showField, setShowField] = useState(false);

    const initialFieldState = {
        format: 'singles',
        weather: 'none',
        terrain: 'none',
        attackerSide: { helpingHand: false, tailwind: false, battery: false, powerSpot: false, steelySpirit: false },
        defenderSide: { reflect: false, lightScreen: false, auroraVeil: false, friendGuard: false, stealthRock: false, spikes: 0 },
    };
    const [field, setField] = useState(() => (restored?.field ? { ...initialFieldState, ...restored.field } : initialFieldState));

    // Persist the setup for the session. movesPool is dropped (huge + re-hydrated).
    useEffect(() => {
        try {
            const strip = ({ movesPool: _pool, ...rest }) => rest;
            sessionStorage.setItem(SESSION_KEY, JSON.stringify({ p1: strip(p1), p2: strip(p2), field }));
        } catch {
            // storage full/unavailable — persistence is best-effort
        }
    }, [p1, p2, field]);

    // Restore the moves pool for Pokémon revived from the session snapshot.
    useEffect(() => {
        const rehydratePool = async (pState, setP) => {
            if (!pState.pokemon || pState.movesPool?.length) return;
            const detail = await resolvePokemonDetail(pState.pokemon.id);
            if (!detail) return;
            const sortedMoves = [...(detail.moves || [])].sort((a, b) => a.name.localeCompare(b.name));
            setP(prev => ({
                ...prev,
                abilitiesList: detail.abilities?.length ? detail.abilities : prev.abilitiesList,
                movesPool: sortedMoves,
            }));
        };
        rehydratePool(p1, setP1);
        rehydratePool(p2, setP2);
        // mount-only: re-runs are driven by handleSelectPokemon, not state changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Held-in-battle items only (no mulch / fossils / TMs), each with a sprite —
    // the same curated list the team editor uses. Falls back to the full reference
    // item list if the baked battle-items dataset hasn't loaded yet.
    const itemOptions = useMemo(
        () => (battleItems.length
            ? battleItems
            : (items || []).map((i) => ({ slug: i.name, name: capitalize(i.name) }))),
        [battleItems, items],
    );

    // Handle full detail fetching + competitive-set auto-fill on selection.
    const handleSelectPokemon = async (side, pokemon) => {
        const setP = side === 'p1' ? setP1 : setP2;
        if (!pokemon) {
            setP(initialPokemonState(side === 'p1'));
            return;
        }

        // A Mega form carries its Mega stats/types in the index entry but no
        // learnset — resolve moves/abilities/usage from the pre-Mega species and
        // auto-equip the stone, mirroring how the Team Builder handles Megas.
        const mega = megaByFormId.get(pokemon.id) || null;
        const setSourceId = mega ? mega.baseId : pokemon.id;

        // Optimistic paint from the lightweight index entry.
        setP(prev => ({
            ...prev,
            pokemon,
            isMega: !!mega,
            baseStats: pokemon.baseStats || prev.baseStats,
            types: (mega ? mega.types : pokemon.types) || [],
            teraType: (mega ? mega.types?.[0] : pokemon.types?.[0]) || 'normal',
            isTerastallized: false,
            ability: '',
            abilitiesList: [],
            item: mega ? mega.slug : '',
            movesPool: [],
            moves: emptyMoveset(),
            activeMoveIndex: 0,
        }));

        // Fetch the fat detail (moves/abilities/stats) and the most-used meta set
        // together so the Pokémon arrives configured like the metagame runs it.
        const [detail, preset] = await Promise.all([
            resolvePokemonDetail(setSourceId),
            competitivePresetFor(setSourceId).catch(() => null),
        ]);

        const sortedMoves = detail
            ? [...(detail.moves || [])].sort((a, b) => a.name.localeCompare(b.name))
            : [];
        const abilities = detail?.abilities || [];
        // Non-Mega picks take stats/types from the detail; Megas keep the index's
        // Mega values set above.
        const detailStats = (!mega && detail?.stats)
            ? {
                hp: detail.stats.find(s => s.name === 'hp')?.base_stat || 0,
                attack: detail.stats.find(s => s.name === 'attack')?.base_stat || 0,
                defense: detail.stats.find(s => s.name === 'defense')?.base_stat || 0,
                'special-attack': detail.stats.find(s => s.name === 'special-attack')?.base_stat || 0,
                'special-defense': detail.stats.find(s => s.name === 'special-defense')?.base_stat || 0,
                speed: detail.stats.find(s => s.name === 'speed')?.base_stat || 0,
            }
            : null;

        const presetAbility = preset?.ability || abilities[0]?.name || '';
        const presetEvs = preset?.evs ? { ...emptyEvs(), ...preset.evs } : null;

        setP(prev => ({
            ...prev,
            baseStats: detailStats || prev.baseStats,
            types: (!mega && detail?.types) ? detail.types : prev.types,
            teraType: preset?.teraType || (!mega && detail?.types?.[0]) || prev.teraType,
            abilitiesList: abilities,
            ability: presetAbility,
            item: mega ? mega.slug : (preset?.item || prev.item || ''),
            nature: preset?.nature || prev.nature,
            evs: presetEvs || prev.evs,
            movesPool: sortedMoves,
        }));

        // Resolve the meta set's moves (or a generic attack fallback) and drop
        // them into the four slots, making the first damaging move active.
        const presetMoveNames = (preset?.moves || []).slice(0, 4);
        if (presetMoveNames.length) {
            const resolved = await Promise.all(presetMoveNames.map(async (name) => {
                const poolEntry = sortedMoves.find(m => m.name === name);
                const md = await getMoveDetails(poolEntry?.url, name);
                return md ? moveFromDetails(md) : null;
            }));
            const filled = resolved.filter(Boolean);
            if (filled.length) {
                const moves = emptyMoveset();
                filled.forEach((mv, i) => { moves[i] = mv; });
                const firstDamaging = moves.findIndex(m => m.name && m.power > 0);
                setP(prev => ({ ...prev, moves, activeMoveIndex: firstDamaging >= 0 ? firstDamaging : 0 }));
                return;
            }
        }
        if (sortedMoves.length > 0) {
            const attackNames = ['tackle', 'scratch', 'pound', 'thunderbolt', 'blizzard', 'surf', 'earthquake'];
            const firstMoveName = sortedMoves.find(m => attackNames.includes(m.name))?.name || sortedMoves[0].name;
            handleMoveChange(side, 0, firstMoveName, sortedMoves);
        }
    };

    const handleMoveChange = async (side, idx, moveName, poolOverride) => {
        const setP = side === 'p1' ? setP1 : setP2;
        const currentP = side === 'p1' ? p1 : p2;
        const mPool = poolOverride || currentP.movesPool;

        if (!moveName) {
            setP(prev => {
                const newMoves = [...prev.moves];
                newMoves[idx] = emptyMove();
                return { ...prev, moves: newMoves };
            });
            return;
        }

        const poolEntry = mPool?.find(m => m.name === moveName);
        const details = await getMoveDetails(poolEntry?.url, moveName);
        if (details) {
            setP(prev => {
                const newMoves = [...prev.moves];
                newMoves[idx] = moveFromDetails(details, prev.moves[idx]?.isCritical || false);
                return { ...prev, moves: newMoves };
            });
        }
    };

    const patchMove = (setP, idx, patch) => setP(prev => {
        const moves = [...prev.moves];
        moves[idx] = { ...moves[idx], ...patch };
        return { ...prev, moves };
    });

    const handleSwap = () => {
        setP1(p2);
        setP2(p1);
        useToastStore.getState().showToast('Swapped Pokémon.', 'info');
    };

    const handleResetAll = () => {
        setP1(initialPokemonState(true));
        setP2(initialPokemonState(false));
        setField(initialFieldState);
        try {
            sessionStorage.removeItem(SESSION_KEY);
        } catch {
            // ignore storage errors
        }
        useToastStore.getState().showToast('Reset all values.', 'info');
    };

    const copyRow = (atk, def, move, r, fieldObj) => {
        const text = matchupSummary(atk, def, move, r, fieldObj);
        if (!text) return;
        navigator.clipboard.writeText(text);
        useToastStore.getState().showToast('Calculation copied!', 'success');
    };

    // vgcmulticalc-style two-way damage: every move each Pokémon carries, resolved
    // against the other. Reverse direction keeps weather / terrain / format but
    // drops the side modifiers (screens, hazards, Helping Hand belong to the
    // Pokémon-1-attacks-Pokémon-2 setup exposed in the field bar).
    const reverseField = useMemo(
        () => ({ format: field.format, weather: field.weather, terrain: field.terrain, attackerSide: {}, defenderSide: {} }),
        [field.format, field.weather, field.terrain]
    );
    const matrix12 = useMemo(
        () => p1.moves.map((m, i) => ({ move: m, index: i, result: computeMatchup(p1, p2, m, field) })),
        [p1, p2, field]
    );
    const matrix21 = useMemo(
        () => p2.moves.map((m, i) => ({ move: m, index: i, result: computeMatchup(p2, p1, m, reverseField) })),
        [p2, p1, reverseField]
    );

    // Who moves first (raw Speed stat, halved by paralysis).
    const speedInfo = useMemo(() => {
        if (!p1.pokemon || !p2.pokemon) return null;
        const spd = (p) => {
            let s = calcStat({ base: p.baseStats.speed, statKey: 'speed', level: p.level, ev: p.evs.speed, iv: p.ivs.speed, nature: p.nature });
            if (p.status === 'paralyzed') s = Math.floor(s * 0.5);
            return s;
        };
        const s1 = spd(p1);
        const s2 = spd(p2);
        return { s1, s2, faster: s1 > s2 ? 1 : (s2 > s1 ? 2 : 0) };
    }, [p1, p2]);

    // ── Render helpers ──────────────────────────────────────────────────────
    const renderStatsRow = (key, pState, setP) => {
        const natureMod = natureMultiplier(pState.nature, key);
        const natureColor = natureMod === 1.1 ? 'text-[#F87171]' : (natureMod === 0.9 ? 'text-[#60A5FA]' : 'text-fg');
        const calculated = calcStat({
            base: pState.baseStats?.[key] || 0,
            iv: pState.ivs[key] ?? 31,
            ev: pState.evs[key] ?? 0,
            level: pState.level,
            nature: pState.nature,
            statKey: key,
        });

        return (
            <tr key={key} className="border-b border-border last:border-0">
                <td className="py-1 font-semibold text-muted text-[11px]">{STAT_LABELS[key]}</td>
                <td className="py-1 text-center text-[11px] font-medium text-fg/70">{pState.baseStats?.[key] || 0}</td>
                <td className="py-1 text-center">
                    <input
                        type="number" min="0" max="31"
                        value={pState.ivs[key] ?? 31}
                        onChange={(e) => {
                            const val = Math.max(0, Math.min(31, Number(e.target.value) || 0));
                            setP(prev => ({ ...prev, ivs: { ...prev.ivs, [key]: val } }));
                        }}
                        className="w-11 text-center bg-bg border border-border rounded text-[11px] py-0.5"
                    />
                </td>
                <td className="py-1 text-center">
                    <input
                        type="number" min="0" max="252" step="4"
                        value={pState.evs[key] ?? 0}
                        onChange={(e) => {
                            const val = Math.max(0, Math.min(252, Number(e.target.value) || 0));
                            setP(prev => ({ ...prev, evs: { ...prev.evs, [key]: val } }));
                        }}
                        className="w-12 text-center bg-bg border border-border rounded text-[11px] py-0.5 font-mono"
                    />
                </td>
                <td className={`py-1 text-right font-bold text-[11px] font-mono ${natureColor}`}>{calculated}</td>
            </tr>
        );
    };

    // A full, editable Pokémon card — identical for both sides (symmetric layout).
    const renderPokemonCard = (side, pState, setP, accent) => {
        const accentBg = side === 'p1' ? 'bg-[#F08030]' : 'bg-[#6890F0]';
        const moveOpts = (pState.movesPool || []).map((mv) => ({ slug: mv.name, name: capitalize(mv.name) }));
        return (
            <div className="bg-surface border border-border rounded-xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-2">
                    <span className="text-xs font-extrabold tracking-wider uppercase flex items-center gap-1.5" style={{ color: accent }}>
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: accent }} />
                        {side === 'p1' ? 'Pokémon 1' : 'Pokémon 2'}
                        {pState.isMega && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-surface-raised text-muted border border-border">MEGA</span>}
                    </span>
                    <div className="flex gap-1">{pState.types.map(tp => <TypeBadge key={tp} type={tp} />)}</div>
                </div>

                {/* Sprite + picker + level/status */}
                <div className="flex gap-3 items-start">
                    <div className="w-16 h-16 bg-bg border border-border rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
                        {pState.pokemon ? (
                            <img
                                src={getPokemonDisplaySprite(pState.pokemon, { preferArtwork: true })}
                                alt={pState.pokemon.name}
                                className="w-14 h-14 object-contain"
                                onError={(e) => { e.target.src = getPokemonDisplaySprite(pState.pokemon); }}
                            />
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted/30"><circle cx="12" cy="12" r="10" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                        )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                        <PokemonPicker pokemons={allPokemons} value={pState.pokemon} onSelect={(p) => handleSelectPokemon(side, p)} />
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="dmg-field__label">Level</label>
                                <NumberCounter value={pState.level} onChange={(v) => setP(prev => ({ ...prev, level: v }))} min={1} max={100} className="w-full" />
                            </div>
                            <div>
                                <label className="dmg-field__label">Status</label>
                                <select className="dmg-select text-xs" value={pState.status} onChange={(e) => setP(prev => ({ ...prev, status: e.target.value }))}>
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

                {/* Tera */}
                <div className="bg-bg/40 p-2 rounded-lg border border-border flex items-center justify-between gap-3">
                    <ToggleSwitch checked={pState.isTerastallized} onChange={(v) => setP(prev => ({ ...prev, isTerastallized: v }))} label="Terastallize" activeColor={accentBg} />
                    <select
                        className="dmg-select text-xs py-1 w-28"
                        value={pState.teraType}
                        onChange={(e) => setP(prev => ({ ...prev, teraType: e.target.value }))}
                        disabled={!pState.isTerastallized}
                    >
                        {TYPES.map(tp => <option key={tp} value={tp}>{capitalize(tp)}</option>)}
                    </select>
                </div>

                {/* Nature + stats */}
                <div className="bg-bg/25 p-2 rounded-lg border border-border">
                    <div className="flex items-center justify-between gap-2 pb-1.5 mb-1 border-b border-border">
                        <label className="dmg-field__label mb-0 shrink-0">Nature</label>
                        <select className="dmg-select text-xs py-1 max-w-[13rem]" value={pState.nature} onChange={(e) => setP(prev => ({ ...prev, nature: e.target.value }))}>
                            {NATURE_OPTIONS.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
                        </select>
                    </div>
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-[9px] text-muted uppercase tracking-wider font-semibold">
                                <th className="pb-1">Stat</th><th className="pb-1 text-center">Base</th>
                                <th className="pb-1 text-center">IVs</th><th className="pb-1 text-center">EVs</th>
                                <th className="pb-1 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody>{STAT_KEYS.map(key => renderStatsRow(key, pState, setP))}</tbody>
                    </table>
                </div>

                {/* Ability + Item */}
                <div className="grid grid-cols-2 gap-2 items-start">
                    <div>
                        <label className="dmg-field__label">Ability</label>
                        <select className="dmg-select text-xs capitalize" value={pState.ability} onChange={(e) => setP(prev => ({ ...prev, ability: e.target.value }))}>
                            {pState.ability && !pState.abilitiesList.some(a => a.name === pState.ability) && !BATTLE_ABILITIES.some(a => a.value === pState.ability) && (
                                <option value={pState.ability}>{capitalize(pState.ability)}</option>
                            )}
                            {pState.abilitiesList.map(a => <option key={a.name} value={a.name}>{capitalize(a.name)} {a.is_hidden ? '(H)' : ''}</option>)}
                            {pState.abilitiesList.length > 0 && <option disabled>────────────</option>}
                            {BATTLE_ABILITIES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="dmg-field__label">Held Item</label>
                        <SpriteSelect
                            value={pState.item}
                            onChange={(slug) => setP(prev => ({ ...prev, item: slug }))}
                            options={itemOptions}
                            getSprite={itemSpriteUrl}
                            placeholder="No Item"
                            noneLabel="No Item"
                            searchPlaceholder="Search items…"
                            buttonClassName="!py-1.5 text-xs"
                        />
                    </div>
                </div>

                {/* Moves */}
                <div className="pt-2 border-t border-border space-y-2">
                    <label className="dmg-field__label">Moves</label>
                    {pState.moves.map((m, idx) => (
                        <div key={idx} className="space-y-1">
                            <div className="flex items-center gap-1.5">
                                <div className="flex-1 min-w-0">
                                    <SpriteSelect
                                        value={m.name}
                                        onChange={(slug) => handleMoveChange(side, idx, slug)}
                                        options={moveOpts}
                                        placeholder="Empty slot"
                                        noneLabel="Empty slot"
                                        searchPlaceholder="Search moves…"
                                        buttonClassName="!py-1 text-xs capitalize"
                                    />
                                </div>
                                {m.name && m.power > 0 && (
                                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-1 rounded bg-surface-raised border border-border text-muted font-mono leading-none shrink-0">{m.power}</span>
                                )}
                                {m.name && <TypeBadge type={m.type} />}
                            </div>
                            {m.name && (
                                <div className="flex items-center gap-4 pl-1">
                                    <ToggleSwitch checked={m.isCritical} onChange={(v) => patchMove(setP, idx, { isCritical: v })} label="Crit" activeColor={accentBg} />
                                    <ToggleSwitch checked={m.isSpread} onChange={(v) => patchMove(setP, idx, { isSpread: v })} label="Spread" activeColor={accentBg} />
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Remaining HP (used as the target when the other Pokémon attacks it) */}
                <div className="bg-bg/30 p-2.5 rounded-lg border border-border space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold select-none">
                        <span className="text-muted">Remaining HP</span>
                        <span className="font-mono text-fg">{pState.currentHp}%</span>
                    </div>
                    <input
                        type="range" min="1" max="100" value={pState.currentHp}
                        onChange={(e) => setP(prev => ({ ...prev, currentHp: Number(e.target.value) }))}
                        className="w-full accent-primary bg-bg rounded-lg appearance-none cursor-pointer h-2 border border-border"
                    />
                </div>
            </div>
        );
    };

    // One direction of the live damage list — attacker's full moveset vs target.
    const renderMatchupColumn = (attacker, defender, matrix, accent, fieldObj) => {
        const hasMoves = matrix.some(e => e.move.name);
        return (
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <img
                        src={getPokemonDisplaySprite(attacker.pokemon, { preferArtwork: true })}
                        alt="" aria-hidden="true"
                        className="w-6 h-6 object-contain shrink-0"
                        onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                    />
                    <span className="text-xs font-bold text-fg truncate capitalize">{prettify(attacker.pokemon.name)}</span>
                    <span className="text-[10px] text-muted shrink-0">→ {prettify(defender.pokemon.name)}</span>
                </div>
                {hasMoves ? matrix.map((entry) => {
                    const { move, result: r, index } = entry;
                    if (!move.name) return null;
                    const eff = r ? effectivenessLabel(r.effectiveness) : '';
                    const effColor = r && r.effectiveness > 1 ? 'text-success' : (r && r.effectiveness < 1 ? 'text-danger' : 'text-muted');
                    return (
                        <button
                            key={index}
                            type="button"
                            onClick={() => copyRow(attacker, defender, move, r, fieldObj)}
                            disabled={!r}
                            title={r ? 'Click to copy this calc' : undefined}
                            className={`w-full text-left bg-bg/30 border border-border rounded-lg p-2 transition-colors ${r ? 'hover:border-border-hover cursor-pointer' : 'cursor-default'}`}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <TypeBadge type={move.type} />
                                    <span className="text-xs font-semibold text-fg truncate capitalize">{prettify(move.name)}</span>
                                    {eff && <span className={`text-[9px] font-extrabold ${effColor}`}>{eff}</span>}
                                </div>
                                {r ? (
                                    <span className="text-xs font-extrabold font-mono shrink-0" style={{ color: accent }}>{r.minPct}–{r.maxPct}%</span>
                                ) : (
                                    <span className="text-[10px] font-bold uppercase text-muted shrink-0">{move.category === 'status' ? 'Status' : '—'}</span>
                                )}
                            </div>
                            {r && (
                                <>
                                    <div className="dmg-bar mt-1.5" aria-hidden="true">
                                        <div className="dmg-bar__fill" style={{ width: `${Math.min(100, r.maxPct)}%` }} />
                                        <div className="dmg-bar__min" style={{ width: `${Math.min(100, r.minPct)}%` }} />
                                    </div>
                                    <div className="flex items-center justify-between mt-1">
                                        <span className={`text-[10px] font-bold uppercase ${r.koGuaranteed ? 'text-danger' : 'text-muted'}`}>{r.koText}</span>
                                        <span className="text-[9px] text-muted font-mono">{r.minDamage}–{r.maxDamage} / {r.defenderHP}</span>
                                    </div>
                                </>
                            )}
                        </button>
                    );
                }) : (
                    <p className="text-xs text-muted/70 italic py-1">No moves loaded.</p>
                )}
            </div>
        );
    };

    const bothPicked = p1.pokemon && p2.pokemon;

    return (
        <div className="dmg-calc space-y-4">
            {/* ── FIELD BAR ─────────────────────────────────────────────── */}
            <div className="bg-surface border border-border rounded-xl px-3 py-2.5 shadow-sm">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    {/* Format */}
                    <div className="inline-flex bg-bg border border-border rounded-lg p-0.5">
                        {['singles', 'doubles'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setField(prev => ({ ...prev, format: f }))}
                                className={`px-3 py-1 text-xs font-bold rounded-md capitalize transition-all ${field.format === f ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-fg'}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>

                    {/* Weather */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Weather</span>
                        <div className="inline-flex bg-bg border border-border rounded-lg p-0.5 gap-0.5">
                            {WEATHERS.map((w) => (
                                <button
                                    key={w.v}
                                    onClick={() => setField(prev => ({ ...prev, weather: w.v }))}
                                    className={`px-2 py-1 text-[11px] font-semibold rounded-md transition-all ${field.weather === w.v ? 'bg-primary/20 text-primary font-bold' : 'text-muted hover:text-fg'}`}
                                >
                                    {w.l}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Terrain */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Terrain</span>
                        <div className="inline-flex bg-bg border border-border rounded-lg p-0.5 gap-0.5">
                            {TERRAINS.map((tr) => (
                                <button
                                    key={tr.v}
                                    onClick={() => setField(prev => ({ ...prev, terrain: tr.v }))}
                                    className={`px-2 py-1 text-[11px] font-semibold rounded-md transition-all ${field.terrain === tr.v ? 'bg-primary/20 text-primary font-bold' : 'text-muted hover:text-fg'}`}
                                >
                                    {tr.l}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="ml-auto flex items-center gap-2">
                        <button
                            onClick={() => setShowField(v => !v)}
                            className={`btn btn-outline flex items-center gap-1.5 text-xs h-8 px-3 ${showField ? 'text-primary border-border' : ''}`}
                            title="Screens, hazards and side boosts"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
                            Field
                        </button>
                        <button onClick={handleSwap} className="btn btn-secondary flex items-center gap-1.5 text-xs h-8 px-3" title="Swap the two Pokémon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3 21 7 17 11" /><path d="M3 7h18" /><path d="M7 21 3 17 7 13" /><path d="M21 17H3" /></svg>
                            Swap
                        </button>
                        <button onClick={handleResetAll} className="btn btn-outline flex items-center gap-1.5 text-xs h-8 px-3 hover:text-danger hover:border-danger" title="Clear everything">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                            Reset
                        </button>
                    </div>
                </div>

                {/* Advanced field — screens / hazards / boosts */}
                {showField && (
                    <div className="mt-3 pt-3 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <span className="text-[10px] font-bold text-[#F08030] uppercase tracking-wider">Pokémon 1 side (boosts)</span>
                            <div className="grid grid-cols-1 gap-1.5">
                                {[
                                    { key: 'helpingHand', label: 'Helping Hand (×1.5)' },
                                    { key: 'battery', label: 'Battery (Special ×1.3)' },
                                    { key: 'powerSpot', label: 'Power Spot (×1.3)' },
                                    { key: 'steelySpirit', label: 'Steely Spirit (Steel ×1.5)' },
                                ].map((m) => (
                                    <ToggleSwitch
                                        key={m.key}
                                        checked={field.attackerSide[m.key]}
                                        onChange={(v) => setField(prev => ({ ...prev, attackerSide: { ...prev.attackerSide, [m.key]: v } }))}
                                        label={m.label}
                                        activeColor="bg-[#F08030]"
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <span className="text-[10px] font-bold text-[#6890F0] uppercase tracking-wider">Pokémon 2 side (screens / hazards)</span>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                                {[
                                    { key: 'reflect', label: 'Reflect' },
                                    { key: 'lightScreen', label: 'Light Screen' },
                                    { key: 'auroraVeil', label: 'Aurora Veil' },
                                    { key: 'friendGuard', label: 'Friend Guard' },
                                    { key: 'stealthRock', label: 'Stealth Rock' },
                                ].map((m) => (
                                    <ToggleSwitch
                                        key={m.key}
                                        checked={field.defenderSide[m.key]}
                                        onChange={(v) => setField(prev => ({ ...prev, defenderSide: { ...prev.defenderSide, [m.key]: v } }))}
                                        label={m.label}
                                        activeColor="bg-[#6890F0]"
                                    />
                                ))}
                            </div>
                            <div className="flex items-center justify-between pt-1">
                                <span className="text-[11px] font-semibold text-muted">Spikes</span>
                                <div className="flex bg-bg p-0.5 rounded border border-border text-[10px] font-bold">
                                    {[0, 1, 2, 3].map((v) => (
                                        <button
                                            key={v}
                                            onClick={() => setField(prev => ({ ...prev, defenderSide: { ...prev.defenderSide, spikes: v } }))}
                                            className={`px-2 py-0.5 rounded-sm ${field.defenderSide.spikes === v ? 'bg-[#6890F0] text-white' : 'text-muted hover:text-fg'}`}
                                        >
                                            {v}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Mobile tabs ───────────────────────────────────────────── */}
            <div className="lg:hidden flex bg-surface rounded-xl p-1 gap-1 border border-border">
                {[
                    { key: 'pokemon1', label: 'Pokémon 1' },
                    { key: 'damage', label: '⚡ Damage' },
                    { key: 'pokemon2', label: 'Pokémon 2' },
                ].map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all ${activeTab === tab.key ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-fg'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ── BODY: P1 | live damage | P2 ───────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                <div className={`lg:col-span-4 ${activeTab === 'pokemon1' ? 'block' : 'hidden'} lg:block`}>
                    {renderPokemonCard('p1', p1, setP1, '#F08030')}
                </div>

                {/* Live damage (centerpiece) */}
                <div className={`lg:col-span-4 ${activeTab === 'damage' ? 'block' : 'hidden'} lg:block`}>
                    <div className="bg-surface border border-border rounded-xl p-4 shadow-sm space-y-4 lg:sticky lg:top-4">
                        <div className="flex items-center justify-between border-b border-border pb-2">
                            <span className="text-xs font-extrabold tracking-wider uppercase text-fg flex items-center gap-1.5">
                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                                Live Damage
                            </span>
                            {speedInfo && (
                                <span className="text-[10px] font-bold" title="Raw Speed stat (paralysis halves it)">
                                    {speedInfo.faster === 0
                                        ? <span className="text-muted">Speed tie ({speedInfo.s1})</span>
                                        : <span style={{ color: speedInfo.faster === 1 ? '#F08030' : '#6890F0' }}>⚡ P{speedInfo.faster} first ({speedInfo.s1} / {speedInfo.s2})</span>}
                                </span>
                            )}
                        </div>

                        {bothPicked ? (
                            <>
                                {renderMatchupColumn(p1, p2, matrix12, '#F08030', field)}
                                <div className="border-t border-dashed border-border" />
                                {renderMatchupColumn(p2, p1, matrix21, '#6890F0', reverseField)}
                                <p className="text-[10px] text-muted/70 leading-tight pt-1">
                                    Tap any move to copy its calc. The Pokémon 2 → 1 side uses weather / terrain / format only.
                                </p>
                            </>
                        ) : (
                            <div className="text-center py-10 text-muted text-sm border border-dashed border-border rounded-xl">
                                Pick two Pokémon to see damage both ways.
                            </div>
                        )}
                    </div>
                </div>

                <div className={`lg:col-span-4 ${activeTab === 'pokemon2' ? 'block' : 'hidden'} lg:block`}>
                    {renderPokemonCard('p2', p2, setP2, '#6890F0')}
                </div>
            </div>
        </div>
    );
}
