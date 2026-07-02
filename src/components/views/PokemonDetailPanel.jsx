import React, { useEffect, useMemo, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import {
    MapPin, Star, Sparkles, ChevronRight, Compass, Footprints, Waves, Fish, Gift, Music,
    Hammer, Activity, AlertCircle, Swords, Image as ImageIcon, Database, Zap, HandFist, Plus, ChevronLeft, Trophy,
} from 'lucide-react';

import '../../styles/team-builder-view.css';
import '../../styles/locations-view.css';
import { typeColors, typeIcons } from '../../constants/types';
import { TypeBadge } from '../TypeBadge';
import { StatBar } from '../StatBar';
import { AbilityChip } from '../AbilityChip';
import { useTranslation } from '../../hooks/useTranslation';
import {
    getPokemonEncountersData,
    getStaticPokemonDetail,
    getPokemonApiData,
    getEvolutionChainData,
    getPokemonSpeciesData,
    getMoveDetails,
    getMachineDetails,
} from '../../services/pokemonDataCache';
import { POKEBALL_PLACEHOLDER_URL } from '../../constants/theme';
import { buildPokemonForms, formDisplayName } from '../../utils/pokemonForms';
import { SmogonCompetitivePanel } from './SmogonCompetitivePanel';

// ── Shared helpers (mirrors PokedexView's detail panel) ──────────────────────
const displayNameFromApi = (apiData) =>
    apiData?.id > 1025 ? formDisplayName(apiData.name, apiData.species?.name) : apiData?.name;

const METHOD_ICON_MAP = {
    walk: Footprints, surf: Waves, 'old-rod': Fish, 'good-rod': Fish, 'super-rod': Fish,
    gift: Gift, headbutt: Compass, 'rock-smash': Hammer, pokeflute: Music,
};

const PhysicalIcon = () => (
    <svg className="w-5 h-4 inline-block text-[#ef4444]" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l1.5 4.5 4.5-1.5-1.5 4.5 4.5 1.5-4.5 1.5 1.5 4.5-4.5-1.5-1.5 4.5-1.5-4.5-4.5 1.5 1.5-4.5-4.5-1.5 4.5-1.5-1.5-4.5 4.5 1.5z" />
    </svg>
);
const SpecialIcon = () => (
    <svg className="w-5 h-4 inline-block text-[#3b82f6]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
);
const StatusIcon = () => (
    <svg className="w-5 h-4 inline-block text-[#9ca3af]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="8" /><path d="M12 4a8 8 0 0 1 0 16" fill="currentColor" opacity="0.3" /><circle cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
);

const formatTmName = (tmName) => {
    if (!tmName) return '—';
    const match = tmName.match(/^(tm|hm|tr)(\d+)$/i);
    if (match) {
        const [, type, num] = match;
        if (type.toLowerCase() === 'tm') return num;
        return `${type.toUpperCase()}${num}`;
    }
    return tmName.toUpperCase();
};

const VERSION_CONFIG = {
    red: { label: 'Red', color: '#ef4444' }, blue: { label: 'Blue', color: '#3b82f6' }, yellow: { label: 'Yellow', color: '#eab308' },
    gold: { label: 'Gold', color: '#d97706' }, silver: { label: 'Silver', color: '#9ca3af' }, crystal: { label: 'Crystal', color: '#22d3ee' },
    ruby: { label: 'Ruby', color: '#b91c1c' }, sapphire: { label: 'Sapphire', color: '#1d4ed8' }, emerald: { label: 'Emerald', color: '#059669' },
    firered: { label: 'FireRed', color: '#ea580c' }, leafgreen: { label: 'LeafGreen', color: '#16a34a' },
    diamond: { label: 'Diamond', color: '#60a5fa' }, pearl: { label: 'Pearl', color: '#f472b6' }, platinum: { label: 'Platinum', color: '#9ca3af' },
    heartgold: { label: 'HeartGold', color: '#d97706' }, soulsilver: { label: 'SoulSilver', color: '#9ca3af' },
    black: { label: 'Black', color: '#1f2937' }, white: { label: 'White', color: '#7f8c8d' },
    'black-2': { label: 'Black 2', color: '#111827' }, 'white-2': { label: 'White 2', color: '#bdc3c7' },
    x: { label: 'X', color: '#2563eb' }, y: { label: 'Y', color: '#dc2626' },
    'omega-ruby': { label: 'Omega Ruby', color: '#b91c1c' }, 'alpha-sapphire': { label: 'Alpha Sapphire', color: '#1d4ed8' },
    sun: { label: 'Sun', color: '#f97316' }, moon: { label: 'Moon', color: '#6366f1' },
    'ultra-sun': { label: 'Ultra Sun', color: '#ea580c' }, 'ultra-moon': { label: 'Ultra Moon', color: '#4f46e5' },
    'lets-go-pikachu': { label: "Let's Go Pikachu", color: '#eab308' }, 'lets-go-eevee': { label: "Let's Go Eevee", color: '#b45309' },
    sword: { label: 'Sword', color: '#06b6d4' }, shield: { label: 'Shield', color: '#db2777' },
    'brilliant-diamond': { label: 'Brilliant Diamond', color: '#60a5fa' }, 'shining-pearl': { label: 'Shining Pearl', color: '#f472b6' },
    'legends-arceus': { label: 'Legends: Arceus', color: '#1e3a8a' }, scarlet: { label: 'Scarlet', color: '#be123c' }, violet: { label: 'Violet', color: '#6d28d9' },
};

const VERSION_GROUPS = [
    { id: 'red-blue-yellow', name: 'Gen I (Red / Blue / Yellow)', versions: ['red', 'blue', 'yellow'] },
    { id: 'gold-silver-crystal', name: 'Gen II (Gold / Silver / Crystal)', versions: ['gold', 'silver', 'crystal'] },
    { id: 'ruby-sapphire-emerald', name: 'Gen III (Ruby / Sapphire / Emerald)', versions: ['ruby', 'sapphire', 'emerald'] },
    { id: 'firered-leafgreen', name: 'Gen III (FireRed / LeafGreen)', versions: ['firered', 'leafgreen'] },
    { id: 'diamond-pearl-platinum', name: 'Gen IV (Diamond / Pearl / Platinum)', versions: ['diamond', 'pearl', 'platinum'] },
    { id: 'heartgold-soulsilver', name: 'Gen IV (HeartGold / SoulSilver)', versions: ['heartgold', 'soulsilver'] },
    { id: 'black-white', name: 'Gen V (Black / White / Black 2 / White 2)', versions: ['black', 'white', 'black-2', 'white-2'] },
    { id: 'x-y', name: 'Gen VI (X / Y)', versions: ['x', 'y'] },
    { id: 'omega-ruby-alpha-sapphire', name: 'Gen VI (Omega Ruby / Alpha Sapphire)', versions: ['omega-ruby', 'alpha-sapphire'] },
    { id: 'sun-moon-ultra-sun-ultra-moon', name: 'Gen VII (Sun / Moon / Ultra Sun / Ultra Moon)', versions: ['sun', 'moon', 'ultra-sun', 'ultra-moon'] },
    { id: 'lets-go', name: "Gen VII (Let's Go Pikachu / Eevee)", versions: ['lets-go-pikachu', 'lets-go-eevee'] },
    { id: 'sword-shield', name: 'Gen VIII (Sword / Shield)', versions: ['sword', 'shield'] },
    { id: 'brilliant-diamond-shining-pearl', name: 'Gen VIII (Brilliant Diamond / Shining Pearl)', versions: ['brilliant-diamond', 'shining-pearl'] },
    { id: 'legends-arceus', name: 'Gen VIII (Legends: Arceus)', versions: ['legends-arceus'] },
    { id: 'scarlet-violet', name: 'Gen IX (Scarlet / Violet)', versions: ['scarlet', 'violet'] },
];

const formatLocationName = (name) => {
    if (!name) return '';
    return name.replace(/-area$/i, '').split('-').map((word) => {
        const lower = word.toLowerCase();
        if (/^b?\d+f$/.test(lower)) return lower.toUpperCase();
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
};

/**
 * The full Pokédex detail experience (Data / Locations / Moves / Sprites tabs),
 * self-contained: give it a `pokemonId` and it loads everything itself. Mirrors
 * PokedexView's detail panel exactly so the /pokemon/:id page and the Pokédex
 * share the same components, organization and styles.
 */
export function PokemonDetailPanel({
    pokemonId,
    colors,
    favoritePokemons,
    onToggleFavoritePokemon,
    onAdd,
    currentTeam = [],
    onNavigate,
    db,
    pokemonDetailsCache = {},
    setPokemonDetailsCache,
    backLabel,
    onBack,
}) {
    const { t, language } = useTranslation();

    const [selectedPokemon, setSelectedPokemon] = useState(pokemonId ? { id: pokemonId } : null);
    const [selectedPokemonDetails, setSelectedPokemonDetails] = useState(null);
    const [fullApiData, setFullApiData] = useState(null);
    const [speciesData, setSpeciesData] = useState(null);
    const [encounters, setEncounters] = useState([]);
    const [isEncountersLoading, setIsEncountersLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('data'); // 'data' | 'locations' | 'moves' | 'sprites'
    const [locationsVersionFilter, setLocationsVersionFilter] = useState('all');
    const [showShiny, setShowShiny] = useState(false);
    const [evolutionDetails, setEvolutionDetails] = useState([]);
    const [forms, setForms] = useState([]);
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 1024);

    const [resolvedMoves, setResolvedMoves] = useState({ levelUp: [], machine: [], other: [] });
    const [selectedMoveVersion, setSelectedMoveVersion] = useState('');
    const [isMovesLoading, setIsMovesLoading] = useState(false);
    const [customSelectedSprite, setCustomSelectedSprite] = useState(null);

    // Re-seed when the route id changes.
    useEffect(() => {
        setSelectedPokemon(pokemonId ? { id: pokemonId } : null);
        setActiveTab('data');
        setShowShiny(false);
        setCustomSelectedSprite(null);
    }, [pokemonId]);

    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    // Load details + encounters for the selected Pokémon.
    useEffect(() => {
        if (!selectedPokemon) return undefined;
        let cancelled = false;
        (async () => {
            setIsEncountersLoading(true);
            setEncounters([]);
            setEvolutionDetails([]);
            setForms([]);
            setFullApiData(null);
            setSpeciesData(null);
            setCustomSelectedSprite(null);
            setLocationsVersionFilter('all');
            try {
                let details = null;
                if (pokemonDetailsCache && pokemonDetailsCache[selectedPokemon.id]) {
                    details = pokemonDetailsCache[selectedPokemon.id];
                } else if (selectedPokemon.stats && selectedPokemon.abilities) {
                    details = selectedPokemon;
                    setPokemonDetailsCache?.((prev) => ({ ...prev, [selectedPokemon.id]: selectedPokemon }));
                } else {
                    if (db) {
                        const docRef = doc(db, 'artifacts/pokemonTeamBuilder/pokemons', String(selectedPokemon.id));
                        const docSnap = await getDoc(docRef);
                        if (docSnap.exists()) details = docSnap.data();
                    }
                    if (!details) details = await getStaticPokemonDetail(selectedPokemon.id);
                    if (!details) {
                        const apiData = await getPokemonApiData(selectedPokemon.id);
                        if (apiData) {
                            // Carry stats + abilities so the Base Stats panel and the
                            // abilities row render for forms/megas with no Firestore/static
                            // doc (e.g. excadrill-mega) — otherwise those panels stay empty.
                            details = {
                                id: apiData.id,
                                name: displayNameFromApi(apiData),
                                types: apiData.types?.map((ty) => ty.type?.name).filter(Boolean) || [],
                                sprite: apiData.sprites?.other?.['official-artwork']?.front_default || apiData.sprites?.front_default,
                                stats: apiData.stats?.map((s) => ({ name: s.stat?.name, base_stat: s.base_stat })).filter((s) => s.name) || [],
                                abilities: apiData.abilities?.map((a) => ({ name: a.ability?.name, url: a.ability?.url, is_hidden: a.is_hidden })).filter((a) => a.name) || [],
                            };
                        }
                    }
                    if (details) setPokemonDetailsCache?.((prev) => ({ ...prev, [selectedPokemon.id]: details }));
                }

                if (cancelled) return;
                setSelectedPokemonDetails(details || selectedPokemon);

                const apiData = await getPokemonApiData(selectedPokemon.id);
                if (cancelled) return;
                setFullApiData(apiData);

                // Forms/megas (id > 1025) have no species of their own — their `/pokemon`
                // payload points at the BASE species (e.g. excadrill-mega → species 530).
                // Fetching /pokemon-species/{formId} 404s, so resolve via the reported
                // species url and tolerate a miss so the rest of the panel still loads.
                let specData = null;
                try {
                    specData = await getPokemonSpeciesData(apiData?.species?.url || selectedPokemon.id);
                } catch (_) {
                    specData = null;
                }
                if (cancelled) return;
                setSpeciesData(specData);

                const encounterData = await getPokemonEncountersData(selectedPokemon.id);
                if (cancelled) return;
                setEncounters(encounterData || []);
            } catch (err) {
                console.error('Failed to load details and encounters data', err);
            } finally {
                if (!cancelled) setIsEncountersLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [selectedPokemon, db, pokemonDetailsCache, setPokemonDetailsCache]);

    // Evolution chain.
    useEffect(() => {
        if (!selectedPokemonDetails) { setEvolutionDetails([]); return undefined; }
        let cancelled = false;
        (async () => {
            try {
                let chainUrl = selectedPokemonDetails.evolution_chain_url;
                if (!chainUrl) {
                    const species = speciesData || await getPokemonSpeciesData(selectedPokemonDetails.id);
                    chainUrl = species?.evolution_chain?.url || null;
                }
                if (!chainUrl) { setEvolutionDetails([]); return; }
                const data = await getEvolutionChainData(chainUrl);
                const chain = [];
                let evoData = data.chain;
                do {
                    chain.push({ name: evoData.species.name, url: evoData.species.url });
                    evoData = evoData.evolves_to[0];
                } while (!!evoData && Object.prototype.hasOwnProperty.call(evoData, 'evolves_to'));

                const detailsPromises = chain.map(async (evo) => {
                    const id = evo.url.split('/').filter(Boolean).pop();
                    if (pokemonDetailsCache && pokemonDetailsCache[id]) return pokemonDetailsCache[id];
                    const staticDetail = await getStaticPokemonDetail(id);
                    if (staticDetail) { setPokemonDetailsCache?.((prev) => ({ ...prev, [id]: staticDetail })); return staticDetail; }
                    if (!db) return { name: evo.name, id: Number(id), sprite: POKEBALL_PLACEHOLDER_URL };
                    const docRef = doc(db, 'artifacts/pokemonTeamBuilder/pokemons', id);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) { const d = docSnap.data(); setPokemonDetailsCache?.((prev) => ({ ...prev, [id]: d })); return d; }
                    return { name: evo.name, id: Number(id), sprite: POKEBALL_PLACEHOLDER_URL };
                });
                const resolved = await Promise.all(detailsPromises);
                if (!cancelled) setEvolutionDetails(resolved);
            } catch (error) {
                console.error('Failed to fetch evolution chain', error);
            }
        })();
        return () => { cancelled = true; };
    }, [selectedPokemonDetails, speciesData, db, pokemonDetailsCache, setPokemonDetailsCache]);

    // Alternate forms / megas.
    useEffect(() => {
        if (!speciesData?.varieties?.length) { setForms([]); return undefined; }
        let cancelled = false;
        (async () => {
            try {
                const built = await buildPokemonForms(speciesData, { fetchPokemon: getPokemonApiData });
                if (!cancelled) setForms(built);
            } catch (err) {
                if (!cancelled) setForms([]);
            }
        })();
        return () => { cancelled = true; };
    }, [speciesData]);

    const availableMoveVersions = useMemo(() => {
        if (!fullApiData || !fullApiData.moves) return [];
        const versions = new Set();
        fullApiData.moves.forEach((m) => m.version_group_details.forEach((vgd) => versions.add(vgd.version_group.name)));
        return Array.from(versions).sort();
    }, [fullApiData]);

    useEffect(() => {
        if (availableMoveVersions.length > 0) {
            const preferred = ['scarlet-violet', 'legends-arceus', 'sword-shield', 'sun-moon', 'x-y', 'black-white', 'heartgold-soulsilver', 'platinum'];
            const found = preferred.find((p) => availableMoveVersions.includes(p));
            setSelectedMoveVersion(found || availableMoveVersions[availableMoveVersions.length - 1]);
        } else {
            setSelectedMoveVersion('');
        }
    }, [availableMoveVersions]);

    useEffect(() => {
        if (!fullApiData || !selectedMoveVersion) { setResolvedMoves({ levelUp: [], machine: [], other: [] }); return undefined; }
        let cancelled = false;
        (async () => {
            setIsMovesLoading(true);
            try {
                const filteredMoves = [];
                fullApiData.moves.forEach((m) => {
                    const d = m.version_group_details.find((vgd) => vgd.version_group.name === selectedMoveVersion);
                    if (d) filteredMoves.push({ name: m.move.name, url: m.move.url, learnMethod: d.move_learn_method.name, level: d.level_learned_at });
                });
                const promises = filteredMoves.map(async (fm) => {
                    const md = await getMoveDetails(fm.url, fm.name);
                    let tmName = '';
                    if (fm.learnMethod === 'machine' && md?.machines) {
                        const machEntry = md.machines.find((mach) => mach.version_group.name === selectedMoveVersion);
                        if (machEntry?.machine?.url) {
                            try { const machDetails = await getMachineDetails(machEntry.machine.url); tmName = machDetails?.item?.name || ''; } catch (_) { /* skip */ }
                        }
                    }
                    return { ...fm, type: md?.type || 'normal', power: md?.power, accuracy: md?.accuracy, damageClass: md?.damage_class || 'physical', pp: md?.pp, tmName };
                });
                const resolved = await Promise.all(promises);
                if (cancelled) return;
                const levelUp = resolved.filter((m) => m.learnMethod === 'level-up').sort((a, b) => a.level - b.level);
                const machine = resolved.filter((m) => m.learnMethod === 'machine').sort((a, b) => a.name.localeCompare(b.name));
                // Catch-all for every other learn method (egg, tutor, and the "train"
                // method the Champions/mega data uses). Without this, those moves were
                // dropped — which is why mega forms with a train-only moveset showed
                // "No Moves Found" despite the API returning a full list.
                const other = resolved.filter((m) => m.learnMethod !== 'level-up' && m.learnMethod !== 'machine').sort((a, b) => a.name.localeCompare(b.name));
                setResolvedMoves({ levelUp, machine, other });
            } catch (err) {
                console.error('Failed to resolve moves', err);
            } finally {
                if (!cancelled) setIsMovesLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [fullApiData, selectedMoveVersion]);

    const handleSelectPokemon = (pokemon) => { if (pokemon?.id != null) onNavigate?.(pokemon.id); };

    // ── Derived data ─────────────────────────────────────────────────────────
    const typeDefenses = useMemo(() => {
        if (!selectedPokemonDetails) return {};
        const defendingTypes = selectedPokemonDetails.types || [];
        const effectiveness = {};
        const ALL = ['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'];
        const chart = {
            normal: { Fighting: 2, Ghost: 0 },
            fire: { Fire: 0.5, Water: 2, Grass: 0.5, Ice: 0.5, Ground: 2, Bug: 0.5, Rock: 2, Steel: 0.5, Fairy: 0.5 },
            water: { Fire: 0.5, Water: 0.5, Electric: 2, Grass: 2, Ice: 0.5, Steel: 0.5 },
            electric: { Electric: 0.5, Ground: 2, Flying: 0.5, Steel: 0.5 },
            grass: { Fire: 2, Water: 0.5, Electric: 0.5, Grass: 0.5, Ice: 2, Poison: 2, Ground: 0.5, Flying: 2, Bug: 2 },
            ice: { Fire: 2, Ice: 0.5, Fighting: 2, Rock: 2, Steel: 2 },
            fighting: { Flying: 2, Psychic: 2, Bug: 0.5, Rock: 0.5, Dark: 0.5, Fairy: 2 },
            poison: { Grass: 0.5, Fighting: 0.5, Poison: 0.5, Ground: 2, Psychic: 2, Bug: 0.5, Fairy: 0.5 },
            ground: { Water: 2, Electric: 0, Grass: 2, Ice: 2, Poison: 0.5, Rock: 0.5 },
            flying: { Electric: 2, Grass: 0.5, Ice: 2, Fighting: 0.5, Ground: 0, Bug: 0.5, Rock: 2 },
            psychic: { Fighting: 0.5, Psychic: 0.5, Bug: 2, Ghost: 2, Dark: 2 },
            bug: { Fire: 2, Grass: 0.5, Fighting: 0.5, Ground: 0.5, Flying: 2, Rock: 2 },
            rock: { Fire: 0.5, Water: 2, Grass: 2, Fighting: 2, Poison: 0.5, Ground: 2, Flying: 0.5, Steel: 2 },
            ghost: { Normal: 0, Fighting: 0, Poison: 0.5, Bug: 0.5, Ghost: 2, Dark: 2 },
            dragon: { Fire: 0.5, Water: 0.5, Electric: 0.5, Grass: 0.5, Ice: 2, Dragon: 2, Fairy: 2 },
            dark: { Fighting: 2, Psychic: 0, Bug: 2, Ghost: 0.5, Dark: 0.5, Fairy: 2 },
            steel: { Normal: 0.5, Fire: 2, Grass: 0.5, Ice: 0.5, Fighting: 2, Poison: 0, Ground: 2, Flying: 0.5, Psychic: 0.5, Bug: 0.5, Rock: 0.5, Dragon: 0.5, Steel: 0.5, Fairy: 0.5 },
            fairy: { Fighting: 0.5, Poison: 2, Bug: 0.5, Dragon: 0, Dark: 0.5, Steel: 2 },
        };
        ALL.forEach((attackType) => {
            const multiplier = defendingTypes.reduce((product, defendingType) => {
                const taken = chart[defendingType] || {};
                const key = attackType.charAt(0).toUpperCase() + attackType.slice(1);
                return product * (taken[key] ?? 1);
            }, 1);
            effectiveness[attackType] = multiplier;
        });
        return effectiveness;
    }, [selectedPokemonDetails]);

    const groupedEncounters = useMemo(() => {
        if (!encounters || encounters.length === 0) return [];
        const groups = VERSION_GROUPS.map((vg) => ({ ...vg, items: [] }));
        const otherGroup = { id: 'other', name: 'Other Versions', versions: [], items: [] };
        encounters.forEach((encounterItem) => {
            const locationName = formatLocationName(encounterItem.location_area.name);
            encounterItem.version_details.forEach((vd) => {
                const versionName = vd.version.name;
                const matchGroup = groups.find((g) => g.versions.includes(versionName));
                const details = vd.encounter_details.map((ed) => ({
                    method: ed.method.name.replace('-', ' '), methodKey: ed.method.name, chance: ed.chance, minLevel: ed.min_level, maxLevel: ed.max_level,
                }));
                const entry = { location: locationName, version: versionName, details };
                if (matchGroup) matchGroup.items.push(entry); else otherGroup.items.push(entry);
            });
        });
        const activeGroups = groups.filter((g) => g.items.length > 0);
        if (otherGroup.items.length > 0) activeGroups.push(otherGroup);
        return activeGroups.map((group) => {
            const aggregated = [];
            group.items.forEach((item) => {
                const existing = aggregated.find((agg) => agg.location === item.location);
                if (existing) {
                    if (!existing.versions.find((v) => v.name === item.version)) existing.versions.push({ name: item.version, details: item.details });
                } else {
                    aggregated.push({ location: item.location, versions: [{ name: item.version, details: item.details }] });
                }
            });
            return { ...group, locations: aggregated };
        });
    }, [encounters]);

    const availableVersions = useMemo(() => {
        if (!encounters || encounters.length === 0) return [];
        const set = new Set();
        encounters.forEach((item) => item.version_details.forEach((vd) => set.add(vd.version.name)));
        return Array.from(set).sort();
    }, [encounters]);

    const filteredGroupedEncounters = useMemo(() => {
        if (locationsVersionFilter === 'all') return groupedEncounters;
        return groupedEncounters.map((group) => ({
            ...group,
            locations: group.locations.map((loc) => ({ ...loc, versions: loc.versions.filter((v) => v.name === locationsVersionFilter) })).filter((loc) => loc.versions.length > 0),
        })).filter((group) => group.locations.length > 0);
    }, [groupedEncounters, locationsVersionFilter]);

    const pokemonGenerationSprites = useMemo(() => {
        if (!fullApiData || !fullApiData.sprites) return [];
        const versions = fullApiData.sprites.versions;
        if (!versions) return [];
        const genList = [
            { name: 'Generation 1', normal: versions['generation-i']?.['red-blue']?.front_default, shiny: null },
            { name: 'Generation 2', normal: versions['generation-ii']?.crystal?.front_default || versions['generation-ii']?.gold?.front_default, shiny: versions['generation-ii']?.crystal?.front_shiny || versions['generation-ii']?.gold?.front_shiny },
            { name: 'Generation 3', normal: versions['generation-iii']?.emerald?.front_default || versions['generation-iii']?.['ruby-sapphire']?.front_default, shiny: versions['generation-iii']?.emerald?.front_shiny || versions['generation-iii']?.['ruby-sapphire']?.front_shiny },
            { name: 'Generation 4', normal: versions['generation-iv']?.platinum?.front_default || versions['generation-iv']?.['diamond-pearl']?.front_default, shiny: versions['generation-iv']?.platinum?.front_shiny || versions['generation-iv']?.['diamond-pearl']?.front_shiny },
            { name: 'Generation 5', normal: versions['generation-v']?.['black-white']?.animated?.front_default || versions['generation-v']?.['black-white']?.front_default, shiny: versions['generation-v']?.['black-white']?.animated?.front_shiny || versions['generation-v']?.['black-white']?.front_shiny },
            { name: 'Generation 6', normal: versions['generation-vi']?.['x-y']?.front_default || versions['generation-vi']?.['omega-ruby-alpha-sapphire']?.front_default, shiny: versions['generation-vi']?.['x-y']?.front_shiny || versions['generation-vi']?.['omega-ruby-alpha-sapphire']?.front_shiny },
            { name: 'Generation 7', normal: versions['generation-vii']?.['ultra-sun-ultra-moon']?.front_default || versions['generation-vii']?.icons?.front_default, shiny: versions['generation-vii']?.['ultra-sun-ultra-moon']?.front_shiny },
            { name: 'Generation 8', normal: versions['generation-viii']?.['brilliant-diamond-shining-pearl']?.front_default || versions['generation-viii']?.icons?.front_default, shiny: null },
            { name: 'Generation 9', normal: versions['generation-ix']?.['scarlet-violet']?.front_default, shiny: null },
        ];
        return genList.filter((g) => g.normal);
    }, [fullApiData]);

    const spriteToShow = useMemo(() => {
        if (customSelectedSprite) return customSelectedSprite;
        if (!selectedPokemonDetails) return POKEBALL_PLACEHOLDER_URL;
        return showShiny
            ? (selectedPokemonDetails.animatedShinySprite || selectedPokemonDetails.shinySprite || selectedPokemonDetails.sprite)
            : (selectedPokemonDetails.animatedSprite || selectedPokemonDetails.sprite);
    }, [selectedPokemonDetails, showShiny, customSelectedSprite]);

    const formattedId = useMemo(() => (selectedPokemonDetails?.id ? String(selectedPokemonDetails.id).padStart(4, '0') : ''), [selectedPokemonDetails]);
    const pokemonGenus = useMemo(() => speciesData?.genera?.find((g) => g.language.name === 'en')?.genus || '', [speciesData]);
    const heightInM = useMemo(() => { const h = selectedPokemonDetails?.height || fullApiData?.height; return h ? h / 10 : 0; }, [selectedPokemonDetails, fullApiData]);
    const heightInFt = useMemo(() => { if (!heightInM) return ''; const ftTotal = heightInM * 3.28084; const ft = Math.floor(ftTotal); const inches = Math.round((ftTotal % 1) * 12); return `${ft}′${String(inches).padStart(2, '0')}″`; }, [heightInM]);
    const weightInKg = useMemo(() => { const w = selectedPokemonDetails?.weight || fullApiData?.weight; return w ? w / 10 : 0; }, [selectedPokemonDetails, fullApiData]);
    const weightInLbs = useMemo(() => (weightInKg ? (weightInKg * 2.20462).toFixed(1) : ''), [weightInKg]);
    const evYield = useMemo(() => {
        if (!fullApiData?.stats) return 'None';
        const STAT_MAP = { hp: 'HP', attack: 'Atk', defense: 'Def', 'special-attack': 'Sp. Atk', 'special-defense': 'Sp. Def', speed: 'Speed' };
        const evs = [];
        fullApiData.stats.forEach((s) => { if (s.effort > 0) evs.push(`${s.effort} ${STAT_MAP[s.stat.name] || s.stat.name}`); });
        return evs.join(', ') || 'None';
    }, [fullApiData]);
    const genderText = useMemo(() => {
        const gr = speciesData?.gender_rate;
        if (gr === undefined) return '';
        if (gr === -1) return 'Genderless';
        const femalePercent = (gr / 8) * 100;
        return `${100 - femalePercent}% male, ${femalePercent}% female`;
    }, [speciesData]);
    const eggGroups = useMemo(() => speciesData?.egg_groups?.map((g) => g.name).join(', ') || 'Unknown', [speciesData]);
    const baseFriendshipText = useMemo(() => {
        if (speciesData?.base_happiness === undefined) return '';
        const val = speciesData.base_happiness;
        let label = 'normal';
        if (val < 50) label = 'lower than normal';
        else if (val >= 100) label = 'higher than normal';
        return `${val} (${label})`;
    }, [speciesData]);
    const growthRateText = useMemo(() => (speciesData?.growth_rate?.name ? speciesData.growth_rate.name.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : ''), [speciesData]);
    const eggCyclesText = useMemo(() => {
        if (speciesData?.hatch_counter === undefined) return '';
        const cycles = speciesData.hatch_counter;
        return `${cycles} (${(cycles * 244).toLocaleString()}-${(cycles * 257).toLocaleString()} steps)`;
    }, [speciesData]);
    const catchRateText = useMemo(() => {
        if (speciesData?.capture_rate === undefined) return '';
        const rate = speciesData.capture_rate;
        return `${rate} (${((rate / 765) * 100).toFixed(1)}% with PokéBall, full HP)`;
    }, [speciesData]);

    const isOnTeam = selectedPokemonDetails && currentTeam.some((m) => m.id === selectedPokemonDetails.id);

    // ── Tab content (copied from PokedexView's renderDetailsContent) ───────────
    const renderDetailsContent = () => {
        // Competitive only needs the species id, so it renders even while the rest
        // of the Pokédex details are still loading.
        if (activeTab === 'competitive') {
            return <SmogonCompetitivePanel pokemonId={selectedPokemon?.id || pokemonId} />;
        }

        if (!selectedPokemonDetails) return null;

        if (activeTab === 'data') {
            return (
                <div className="flex-1 flex flex-col space-y-5 animate-scale-in">
                    <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1.3fr] gap-4 items-stretch">
                        <div className="text-center p-4 bg-surface rounded-xl border border-border flex flex-col justify-between items-center">
                            <div className="w-full flex-1 flex flex-col justify-center items-center py-2">
                                <div className="relative inline-block">
                                    <img src={spriteToShow} alt={selectedPokemonDetails.name} className="mx-auto h-28 w-28 sm:h-36 sm:w-36 image-pixelated hover:scale-105 transition-transform duration-300" />
                                    <button
                                        type="button"
                                        onClick={() => setShowShiny((value) => !value)}
                                        className={`absolute -bottom-2 -right-4 rounded-full p-1.5 transition-all duration-200 hover:scale-110 active:scale-95 border ${showShiny ? 'bg-accent text-bg border-accent' : 'bg-surface-raised text-fg border-border'}`}
                                        title={language === 'pt' ? 'Alternar Brilhante' : 'Toggle Shiny'}
                                    >
                                        <Sparkles className="w-4 h-4" />
                                    </button>
                                    {onToggleFavoritePokemon && (
                                        <button
                                            type="button"
                                            onClick={() => onToggleFavoritePokemon(selectedPokemonDetails.id)}
                                            className={`absolute -bottom-2 -left-4 rounded-full p-1.5 transition-all duration-200 hover:scale-110 active:scale-95 border ${favoritePokemons?.has(selectedPokemonDetails.id) ? 'bg-accent-soft text-accent border-accent-soft' : 'bg-surface-raised text-muted border-border'}`}
                                            title={favoritePokemons?.has(selectedPokemonDetails.id) ? t('common.remove') : (language === 'pt' ? 'Adicionar aos favoritos' : 'Add to favorites')}
                                        >
                                            <Star className={`w-4 h-4 ${favoritePokemons?.has(selectedPokemonDetails.id) ? 'fill-[#FBBF24] text-[#FBBF24]' : 'text-muted'}`} />
                                        </button>
                                    )}
                                </div>
                                <h3 className="mt-3.5 text-xl font-extrabold capitalize text-fg tracking-tight">
                                    {selectedPokemonDetails.name} <span className="text-muted font-normal text-base">#{selectedPokemonDetails.id}</span>
                                </h3>
                                {pokemonGenus && <p className="mt-0.5 text-sm text-muted">{pokemonGenus}</p>}
                                <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                                    {selectedPokemonDetails.types?.map((type) => <TypeBadge key={type} type={type} colors={colors} />)}
                                </div>
                            </div>
                        </div>

                        <div className="rounded-xl bg-surface p-4 border border-border flex flex-col justify-between">
                            <h4 className="mb-3 text-center text-xs font-bold uppercase tracking-wider text-muted">{t('pokedex.baseStats')}</h4>
                            <div className="space-y-2 flex-1 flex flex-col justify-center">
                                {selectedPokemonDetails.stats?.map((stat) => <StatBar key={stat.name} stat={stat.name} value={stat.base_stat} colors={colors} />)}
                            </div>
                        </div>
                    </div>

                    {evolutionDetails.length > 1 && (
                        <div className="rounded-xl bg-surface p-4 border border-border">
                            <h4 className="mb-3 text-center text-xs font-bold uppercase tracking-wider text-muted">{language === 'pt' ? 'Linha Evolutiva' : 'Evolution Line'}</h4>
                            <div className="overflow-x-auto custom-scrollbar pb-1">
                                <div className="flex min-w-max items-center gap-2 px-1 justify-center">
                                    {evolutionDetails.map((evo, index) => (
                                        <React.Fragment key={evo.name}>
                                            <button
                                                type="button"
                                                onClick={() => handleSelectPokemon(evo)}
                                                className={`min-w-[5.5rem] text-center p-2 rounded-xl transition-all border ${selectedPokemonDetails.id === evo.id ? 'bg-primary-soft border-primary' : 'bg-surface-raised border-border hover:bg-surface-raised/80 hover:border-border'}`}
                                            >
                                                <img src={evo.sprite || POKEBALL_PLACEHOLDER_URL} alt={evo.name} className="h-12 w-12 mx-auto image-pixelated" />
                                                <p className="text-xs font-bold text-fg capitalize mt-1 truncate max-w-[80px]">{evo.name}</p>
                                            </button>
                                            {index < evolutionDetails.length - 1 && <span className="text-muted text-base">➔</span>}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {forms.length > 0 && (
                        <div className="rounded-xl bg-surface p-4 border border-border">
                            <h4 className="mb-3 text-center text-xs font-bold uppercase tracking-wider text-muted">{language === 'pt' ? 'Formas & Megas' : 'Forms & Megas'}</h4>
                            <div className="overflow-x-auto custom-scrollbar pb-1">
                                <div className="flex min-w-max items-stretch gap-2 px-1 justify-center">
                                    {forms.map((form) => (
                                        <button
                                            key={form.id}
                                            type="button"
                                            onClick={() => handleSelectPokemon({ id: form.id })}
                                            title={form.displayName}
                                            className="w-[6.5rem] text-center p-2 rounded-xl transition-all border bg-surface-raised border-border hover:border-primary hover:bg-primary-soft"
                                        >
                                            <img src={form.sprite || POKEBALL_PLACEHOLDER_URL} alt={form.displayName} className="h-14 w-14 mx-auto image-pixelated" />
                                            <p className="text-[11px] font-bold text-fg capitalize mt-1 leading-tight line-clamp-2">{form.displayName}</p>
                                            {form.types?.length > 0 && (
                                                <div className="mt-1.5 flex flex-wrap justify-center gap-1">
                                                    {form.types.map((type) => <TypeBadge key={type} type={type} colors={colors} />)}
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                        <div className="flex flex-col gap-4">
                            <div className="rounded-xl bg-surface p-4 border border-border">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5 pb-2 mb-2 border-b border-border">
                                    <Database className="w-3.5 h-3.5 text-primary" />
                                    <span>{language === 'pt' ? 'Dados da Pokédex' : 'Pokédex Data'}</span>
                                </h4>
                                <table className="w-full text-xs text-fg">
                                    <tbody>
                                        <tr className="border-b border-border py-2.5 flex justify-between items-center">
                                            <td className="text-muted">{language === 'pt' ? 'Nº Nacional' : 'National ID'}</td>
                                            <td className="font-mono font-bold">#{formattedId || '----'}</td>
                                        </tr>
                                        <tr className="border-b border-border py-2.5 flex justify-between items-center">
                                            <td className="text-muted">{t('pokedex.typesFilterLabel')}</td>
                                            <td className="flex gap-1">{selectedPokemonDetails.types?.map((type) => <TypeBadge key={type} type={type} colors={colors} />)}</td>
                                        </tr>
                                        <tr className="border-b border-border py-2.5 flex justify-between items-center">
                                            <td className="text-muted">{language === 'pt' ? 'Espécie' : 'Species'}</td>
                                            <td className="font-bold capitalize">{pokemonGenus || t('common.loading')}</td>
                                        </tr>
                                        <tr className="border-b border-border py-2.5 flex justify-between items-center">
                                            <td className="text-muted">{t('pokedex.height')}</td>
                                            <td className="font-bold font-mono">{heightInM ? `${heightInM} m` : t('common.loading')} {heightInFt && <span className="text-muted font-normal text-[11px] font-sans">({heightInFt})</span>}</td>
                                        </tr>
                                        <tr className="border-b border-border py-2.5 flex justify-between items-center">
                                            <td className="text-muted">{t('pokedex.weight')}</td>
                                            <td className="font-bold font-mono">{weightInKg ? `${weightInKg} kg` : t('common.loading')} {weightInLbs && <span className="text-muted font-normal text-[11px] font-sans">({weightInLbs} lbs)</span>}</td>
                                        </tr>
                                        <tr className="py-2.5 flex justify-between items-start">
                                            <td className="text-muted py-1">{t('pokedex.abilities')}</td>
                                            <td className="font-bold text-right flex flex-col items-end space-y-1">
                                                {selectedPokemonDetails.abilities?.map((ab, idx) => (
                                                    <div key={idx} className="capitalize text-xs">
                                                        {ab.is_hidden ? (
                                                            <span className="text-muted font-normal text-[11px] inline-flex items-center gap-1">
                                                                <AbilityChip ability={ab} /> <span className="text-[10px] text-muted">{language === 'pt' ? '(oculta)' : '(hidden)'}</span>
                                                            </span>
                                                        ) : (
                                                            <span className="inline-block"><AbilityChip ability={ab} /></span>
                                                        )}
                                                    </div>
                                                ))}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <div className="rounded-xl bg-surface p-4 border border-border">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5 pb-2 mb-2 border-b border-border">
                                    <Zap className="w-3.5 h-3.5 text-primary" />
                                    <span>{language === 'pt' ? 'Treinamento' : 'Training'}</span>
                                </h4>
                                <table className="w-full text-xs text-fg">
                                    <tbody>
                                        <tr className="border-b border-border py-2 flex justify-between items-center"><td className="text-muted">{language === 'pt' ? 'Pontos de EV' : 'EV Yield'}</td><td className="font-bold font-mono text-right truncate max-w-[200px]">{evYield}</td></tr>
                                        <tr className="border-b border-border py-2 flex justify-between items-center"><td className="text-muted">{language === 'pt' ? 'Taxa de Captura' : 'Catch Rate'}</td><td className="font-bold font-mono text-right">{catchRateText || t('common.loading')}</td></tr>
                                        <tr className="border-b border-border py-2 flex justify-between items-center"><td className="text-muted">{language === 'pt' ? 'Amizade Base' : 'Base Friendship'}</td><td className="font-bold font-mono text-right">{baseFriendshipText || t('common.loading')}</td></tr>
                                        <tr className="border-b border-border py-2 flex justify-between items-center"><td className="text-muted">{language === 'pt' ? 'Exp. Base' : 'Base Exp.'}</td><td className="font-mono font-bold text-right">{fullApiData?.base_experience ?? t('common.loading')}</td></tr>
                                        <tr className="py-2 flex justify-between items-center"><td className="text-muted">{language === 'pt' ? 'Crescimento' : 'Growth Rate'}</td><td className="font-bold text-right">{growthRateText || t('common.loading')}</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4">
                            <div className="rounded-xl bg-surface p-4 border border-border">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5 pb-2 mb-2 border-b border-border">
                                    <HandFist className="w-3.5 h-3.5 text-primary" />
                                    <span>{t('pokedex.typeEffectivenessTitle')}</span>
                                </h4>
                                <p className="text-[11px] text-muted mb-4">{t('pokedex.typeEffectivenessSubtitle')}</p>
                                {(() => {
                                    const tiers = [
                                        { label: language === 'pt' ? '4×  Muito Fraco' : '4×  Super Weak', mult: 4, bg: 'bg-red-500/15', border: 'border-red-500/40', text: 'text-red-400', badge: 'bg-red-500/20 border-red-500/50 text-red-300' },
                                        { label: language === 'pt' ? '2×  Fraco' : '2×  Weak', mult: 2, bg: 'bg-orange-500/10', border: 'border-orange-500/35', text: 'text-orange-400', badge: 'bg-orange-500/20 border-orange-500/50 text-orange-300' },
                                        { label: language === 'pt' ? '½×  Resistente' : '½×  Resistant', mult: 0.5, bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', badge: 'bg-blue-500/15 border-blue-500/40 text-blue-300' },
                                        { label: language === 'pt' ? '¼×  Muito Resistente' : '¼×  Very Resistant', mult: 0.25, bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400', badge: 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300' },
                                        { label: language === 'pt' ? '0×  Imune' : '0×  Immune', mult: 0, bg: 'bg-surface-raised/60', border: 'border-border', text: 'text-muted', badge: 'bg-surface-raised border-border text-muted' },
                                    ];
                                    const groups = tiers.map((tier) => ({ ...tier, types: Object.entries(typeDefenses).filter(([, m]) => m === tier.mult).map(([ty]) => ty) })).filter((g) => g.types.length > 0);
                                    const neutralTypes = Object.entries(typeDefenses).filter(([, m]) => m === 1).map(([ty]) => ty);
                                    return (
                                        <div className="space-y-2.5">
                                            {groups.map((g) => (
                                                <div key={g.mult} className={`rounded-lg border ${g.border} ${g.bg} px-3 py-2.5`}>
                                                    <span className={`text-[10px] font-extrabold uppercase tracking-widest ${g.text} block mb-2`}>{g.label}</span>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {g.types.map((tName) => (
                                                            <span key={tName} className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-semibold capitalize ${g.badge}`}>
                                                                <img src={typeIcons[tName]} alt={tName} className="h-4 w-4 shrink-0" />{tName}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                            {neutralTypes.length > 0 && (
                                                <details className="group">
                                                    <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-wider text-muted/60 hover:text-muted transition-colors select-none list-none flex items-center gap-1.5 py-1">
                                                        <ChevronRight className="w-3 h-3 transition-transform group-open:rotate-90" />
                                                        {neutralTypes.length} {language === 'pt' ? 'tipos neutros' : 'neutral types'} (1×)
                                                    </summary>
                                                    <div className="flex flex-wrap gap-1.5 pt-2 pl-1">
                                                        {neutralTypes.map((tName) => (
                                                            <span key={tName} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-raised/40 px-2 py-1 text-xs font-semibold capitalize text-muted/70">
                                                                <img src={typeIcons[tName]} alt={tName} className="h-4 w-4 shrink-0 opacity-60" />{tName}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </details>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>

                            <div className="rounded-xl bg-surface p-4 border border-border">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5 pb-2 mb-2 border-b border-border">
                                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                                    <span>{language === 'pt' ? 'Cruzamento' : 'Breeding'}</span>
                                </h4>
                                <table className="w-full text-xs text-fg">
                                    <tbody>
                                        <tr className="border-b border-border py-2 flex justify-between items-center"><td className="text-muted">{language === 'pt' ? 'Grupos de Ovos' : 'Egg Groups'}</td><td className="font-bold text-right capitalize">{eggGroups}</td></tr>
                                        <tr className="border-b border-border py-2 flex justify-between items-center"><td className="text-muted">{language === 'pt' ? 'Gênero' : 'Gender Ratio'}</td><td className="font-bold font-mono text-right">{genderText || t('common.loading')}</td></tr>
                                        <tr className="py-2 flex justify-between items-center"><td className="text-muted">{language === 'pt' ? 'Ciclos de Ovo' : 'Egg Cycles'}</td><td className="font-bold font-mono text-right">{eggCyclesText || t('common.loading')}</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        if (activeTab === 'locations') {
            return (
                <div className="flex-1 flex flex-col space-y-4 animate-scale-in">
                    <div className="flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-primary" />
                        <h4 className="text-base font-bold text-fg">{t('pokedex.locationsTitle')}</h4>
                    </div>

                    {availableVersions.length > 0 && (
                        <div className="flex items-center justify-between gap-4 bg-surface p-3 rounded-xl border border-border">
                            <label htmlFor="pdp-locations-version-filter" className="text-xs font-bold text-muted uppercase tracking-wider">{t('pokedex.locationsVersionFilter')}:</label>
                            <div className="relative min-w-[150px]">
                                <select id="pdp-locations-version-filter" value={locationsVersionFilter} onChange={(e) => setLocationsVersionFilter(e.target.value)} className="team-builder-field team-builder-field--compact team-builder-select w-full">
                                    <option value="all">{language === 'pt' ? 'Todos os Jogos' : 'All Games'}</option>
                                    {availableVersions.map((vName) => {
                                        const conf = VERSION_CONFIG[vName] || { label: vName.replace('-', ' ') };
                                        return <option key={vName} value={vName}>{conf.label}</option>;
                                    })}
                                </select>
                            </div>
                        </div>
                    )}

                    {isEncountersLoading ? (
                        <div className="flex-1 flex items-center justify-center py-16"><div className="team-builder-spinner" aria-hidden="true"></div></div>
                    ) : filteredGroupedEncounters.length > 0 ? (
                        <div className="custom-scrollbar overflow-y-auto pr-1 flex-1 space-y-3">
                            {filteredGroupedEncounters.map((group) => (
                                <div key={group.id} className="locations-version-group border border-border bg-surface p-4 rounded-2xl">
                                    <h5 className="locations-version-group__title text-xs font-extrabold uppercase tracking-wider text-muted flex items-center gap-1.5 mb-3">
                                        <MapPin className="w-3.5 h-3.5" /><span>{group.name}</span>
                                    </h5>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                                        {group.locations.map((loc, idx) => (
                                            <div key={idx} className="locations-item border border-border p-3.5 rounded-xl bg-bg">
                                                <div className="flex items-center gap-2 border-b border-border pb-2 mb-3">
                                                    <MapPin className="w-4 h-4 text-primary shrink-0" />
                                                    <span className="font-extrabold text-fg text-sm truncate">{loc.location}</span>
                                                </div>
                                                <div className="space-y-2">
                                                    {loc.versions.map((ver) => {
                                                        const conf = VERSION_CONFIG[ver.name] || { label: ver.name.replace('-', ' '), color: '#7f8c8d' };
                                                        const distinctDetails = ver.details.reduce((acc, current) => {
                                                            const key = `${current.methodKey}-${current.minLevel}-${current.maxLevel}`;
                                                            if (!acc.has(key)) acc.set(key, current);
                                                            return acc;
                                                        }, new Map()).values();
                                                        return Array.from(distinctDetails).map((detail, dIdx) => {
                                                            const IconComp = METHOD_ICON_MAP[detail.methodKey] || Compass;
                                                            return (
                                                                <div key={`${ver.name}-${dIdx}`} className="flex flex-wrap items-center justify-between gap-3 py-1.5 px-3 rounded-lg bg-surface border border-border transition-colors">
                                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider border shrink-0 text-center" style={{ borderColor: `${conf.color}55`, backgroundColor: `${conf.color}18`, color: conf.color }}>{conf.label}</span>
                                                                        <span className="flex items-center gap-1.5 text-xs text-muted truncate">
                                                                            <IconComp className="w-3.5 h-3.5 text-muted shrink-0" /><span className="capitalize">{detail.method}</span>
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 shrink-0">
                                                                        <span className="text-[10px] font-mono font-semibold bg-bg px-2 py-0.5 rounded border border-border text-muted">{detail.minLevel === detail.maxLevel ? `Lv. ${detail.minLevel}` : `Lv. ${detail.minLevel}-${detail.maxLevel}`}</span>
                                                                        <span className="text-xs font-bold font-mono text-primary">{detail.chance}%</span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        });
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-12 bg-surface border border-border rounded-xl text-center px-4">
                            <AlertCircle className="w-10 h-10 text-muted mx-auto mb-3" />
                            <h5 className="font-bold text-fg mb-1">{language === 'pt' ? 'Não Encontrado na Natureza' : 'Not Found in the Wild'}</h5>
                            <p className="text-xs text-muted max-w-sm mx-auto">{t('pokedex.locationsEmpty')}</p>
                        </div>
                    )}
                </div>
            );
        }

        if (activeTab === 'moves') {
            return (
                <div className="flex-1 flex flex-col space-y-4 animate-scale-in">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-surface p-3 rounded-xl border border-border">
                        <h4 className="text-sm font-bold uppercase tracking-wider text-muted flex items-center gap-2"><Swords className="w-4 h-4 text-primary" /><span>{t('pokedex.movesTitle')}</span></h4>
                        {availableMoveVersions.length > 0 && (
                            <div className="relative min-w-[170px]">
                                <select value={selectedMoveVersion} onChange={(e) => setSelectedMoveVersion(e.target.value)} className="team-builder-field team-builder-field--compact team-builder-select w-full">
                                    {availableMoveVersions.map((vName) => <option key={vName} value={vName}>{vName.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>)}
                                </select>
                            </div>
                        )}
                    </div>

                    {isMovesLoading ? (
                        <div className="flex-1 flex items-center justify-center py-20"><div className="team-builder-spinner" aria-hidden="true"></div></div>
                    ) : (resolvedMoves.levelUp.length > 0 || resolvedMoves.machine.length > 0 || (resolvedMoves.other?.length > 0)) ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
                            {[{ key: 'levelUp', title: t('pokedex.movesLevelUp'), col: t('pokedex.movesHeaderLevel'), rows: resolvedMoves.levelUp },
                            { key: 'machine', title: t('pokedex.movesMachine'), col: t('pokedex.movesHeaderTm'), rows: resolvedMoves.machine },
                            { key: 'other', title: language === 'pt' ? 'Outros Movimentos' : 'Other Moves', col: language === 'pt' ? 'Método' : 'Method', rows: resolvedMoves.other || [] }].filter((block) => block.rows.length > 0).map((block) => (
                                <div key={block.key} className="rounded-xl bg-surface p-4 border border-border">
                                    <h5 className="text-xs font-extrabold uppercase tracking-wider text-muted mb-3 flex items-center gap-1.5 pb-2 border-b border-border"><ChevronRight className="w-3.5 h-3.5 text-primary" /><span>{block.title}</span></h5>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs border-collapse pokedex-moves-table">
                                            <thead>
                                                <tr className="border-b border-border text-muted">
                                                    <th className="pb-2 font-bold w-12">{block.col}</th>
                                                    <th className="pb-2 font-bold">{t('pokedex.movesHeaderName')}</th>
                                                    <th className="pb-2 font-bold text-center">{t('pokedex.movesHeaderType')}</th>
                                                    <th className="pb-2 font-bold text-center">{t('pokedex.movesHeaderClass')}</th>
                                                    <th className="pb-2 font-bold text-center">{t('pokedex.movesHeaderPower')}</th>
                                                    <th className="pb-2 font-bold text-center">{t('pokedex.movesHeaderAcc')}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {block.rows.map((m, idx) => (
                                                    <tr key={idx} className="border-b border-border hover:bg-bg/10">
                                                        <td className="py-2.5 font-bold font-mono text-muted">{block.key === 'levelUp' ? m.level : block.key === 'machine' ? (m.tmName ? formatTmName(m.tmName) : '—') : (m.learnMethod ? m.learnMethod.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '—')}</td>
                                                        <td className="py-2.5 font-bold capitalize text-fg">{m.name.replace('-', ' ')}</td>
                                                        <td className="py-2.5 text-center"><span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider text-white" style={{ backgroundColor: typeColors[m.type] }}>{m.type.slice(0, 3)}</span></td>
                                                        <td className="py-2 text-center"><span title={m.damageClass} className="inline-flex items-center justify-center">{m.damageClass === 'physical' ? <PhysicalIcon /> : m.damageClass === 'special' ? <SpecialIcon /> : <StatusIcon />}</span></td>
                                                        <td className="py-2.5 text-center font-bold font-mono text-fg">{m.power ?? '—'}</td>
                                                        <td className="py-2.5 text-center font-bold font-mono text-fg">{m.accuracy ? `${m.accuracy}%` : '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-12 bg-surface border border-border rounded-xl text-center px-4">
                            <AlertCircle className="w-10 h-10 text-muted mx-auto mb-3" />
                            <h5 className="font-bold text-fg mb-1">{language === 'pt' ? 'Nenhum movimento encontrado' : 'No Moves Found'}</h5>
                            <p className="text-xs text-muted max-w-sm mx-auto">{t('pokedex.movesEmpty')}</p>
                        </div>
                    )}
                </div>
            );
        }

        if (activeTab === 'sprites') {
            return (
                <div className="flex-1 flex flex-col space-y-4 animate-scale-in">
                    <div className="bg-surface p-3 rounded-xl border border-border">
                        <h4 className="text-sm font-bold uppercase tracking-wider text-muted flex items-center gap-2"><ImageIcon className="w-4 h-4 text-primary" /><span>{t('pokedex.spritesTitle')}</span></h4>
                        <p className="text-[10px] text-muted mt-1.5">{t('pokedex.spritesPreviewTitle')}</p>
                    </div>

                    {pokemonGenerationSprites.length > 0 ? (
                        isMobile ? (
                            <div className="pokedex-sprites-grid">
                                {pokemonGenerationSprites.map((g) => (
                                    <div key={g.name} className="pokedex-sprite-gen-card">
                                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted mb-2.5 block">{g.name}</span>
                                        <div className="flex items-center justify-center gap-3">
                                            {g.normal ? (
                                                <div className="flex flex-col items-center">
                                                    <img src={g.normal} alt={`${selectedPokemonDetails.name} ${g.name} normal`} onClick={() => setCustomSelectedSprite(g.normal)} className={`h-11 w-11 image-pixelated cursor-pointer hover:scale-110 active:scale-90 transition-transform ${customSelectedSprite === g.normal ? 'ring-2 ring-primary rounded-lg bg-primary/10' : ''}`} title={language === 'pt' ? 'Pré-visualizar Sprite Normal' : 'Preview Normal Sprite'} />
                                                    <span className="text-[9px] text-muted font-bold mt-1">Normal</span>
                                                </div>
                                            ) : <span className="text-muted text-[10px]">—</span>}
                                            {g.shiny ? (
                                                <div className="flex flex-col items-center">
                                                    <img src={g.shiny} alt={`${selectedPokemonDetails.name} ${g.name} shiny`} onClick={() => setCustomSelectedSprite(g.shiny)} className={`h-11 w-11 image-pixelated cursor-pointer hover:scale-110 active:scale-90 transition-transform ${customSelectedSprite === g.shiny ? 'ring-2 ring-primary rounded-lg bg-primary/10' : ''}`} title={language === 'pt' ? 'Pré-visualizar Sprite Brilhante' : 'Preview Shiny Sprite'} />
                                                    <span className="text-[9px] text-muted font-bold mt-1">Shiny</span>
                                                </div>
                                            ) : <span className="text-muted text-[10px]">—</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-xl border border-border bg-surface overflow-hidden">
                                <div className="overflow-x-auto custom-scrollbar pb-1">
                                    <table className="w-full text-center border-collapse text-xs">
                                        <thead>
                                            <tr className="border-b border-border bg-surface-raised">
                                                <th className="p-3 font-bold text-muted text-left">{t('pokedex.typesFilterLabel')}</th>
                                                {pokemonGenerationSprites.map((g) => <th key={g.name} className="p-3 font-bold text-muted min-w-[90px]">{g.name}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            <tr>
                                                <td className="p-3 font-bold text-muted text-left border-r border-border">Normal</td>
                                                {pokemonGenerationSprites.map((g) => (
                                                    <td key={g.name} className="p-2 border-r border-border hover:bg-bg/25 transition-colors">
                                                        {g.normal ? <img src={g.normal} alt={`${selectedPokemonDetails.name} ${g.name} normal`} onClick={() => setCustomSelectedSprite(g.normal)} className={`h-12 w-12 mx-auto image-pixelated cursor-pointer hover:scale-110 active:scale-90 transition-transform ${customSelectedSprite === g.normal ? 'ring-2 ring-primary rounded-lg bg-primary/10' : ''}`} title={language === 'pt' ? 'Pré-visualizar Sprite Normal' : 'Preview Normal Sprite'} /> : <span className="text-muted text-[10px]">➔</span>}
                                                    </td>
                                                ))}
                                            </tr>
                                            <tr>
                                                <td className="p-3 font-bold text-muted text-left border-r border-border">{language === 'pt' ? 'Brilhante' : 'Shiny'}</td>
                                                {pokemonGenerationSprites.map((g) => (
                                                    <td key={g.name} className="p-2 border-r border-border hover:bg-bg/25 transition-colors">
                                                        {g.shiny ? <img src={g.shiny} alt={`${selectedPokemonDetails.name} ${g.name} shiny`} onClick={() => setCustomSelectedSprite(g.shiny)} className={`h-12 w-12 mx-auto image-pixelated cursor-pointer hover:scale-110 active:scale-90 transition-transform ${customSelectedSprite === g.shiny ? 'ring-2 ring-primary rounded-lg bg-primary/10' : ''}`} title={language === 'pt' ? 'Pré-visualizar Sprite Brilhante' : 'Preview Shiny Sprite'} /> : <span className="text-muted text-[10px]">—</span>}
                                                    </td>
                                                ))}
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )
                    ) : (
                        <div className="py-12 bg-surface border border-border rounded-xl text-center px-4">
                            <AlertCircle className="w-10 h-10 text-muted mx-auto mb-3" />
                            <h5 className="font-bold text-fg mb-1">{language === 'pt' ? 'Nenhum Sprite Registrado' : 'No Sprites Recorded'}</h5>
                            <p className="text-xs text-muted max-w-sm mx-auto">{language === 'pt' ? 'Sprites específicos de geração não estão disponíveis para este Pokémon.' : 'Generation-specific sprites are not available for this Pokémon.'}</p>
                        </div>
                    )}
                </div>
            );
        }
        return null;
    };

    return (
        <section className="team-builder-panel p-5 md:p-6 relative flex flex-col font-mono">
            <div className="flex border-b border-border mb-4 overflow-x-auto whitespace-nowrap scrollbar-none gap-2 items-stretch">
                {onBack && (
                    <>
                        <button
                            type="button"
                            onClick={onBack}
                            className="pb-2.5 px-3 flex items-center gap-1.5 font-bold text-sm text-muted hover:text-primary transition-colors shrink-0"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            <span>{backLabel}</span>
                        </button>
                        <div className="w-px bg-border self-stretch mb-2.5 shrink-0" />
                    </>
                )}
                {[
                    { key: 'data', icon: <Activity className="w-4 h-4" />, label: t('pokedex.dataTab') },
                    { key: 'competitive', icon: <Trophy className="w-4 h-4" />, label: language === 'pt' ? 'Competitivo' : 'Competitive' },
                    { key: 'locations', icon: <MapPin className="w-4 h-4" />, label: t('pokedex.locationsTab') },
                    { key: 'moves', icon: <Swords className="w-4 h-4" />, label: t('pokedex.movesTab') },
                    { key: 'sprites', icon: <ImageIcon className="w-4 h-4" />, label: t('pokedex.spritesTab') },
                ].map((tb) => (
                    <button
                        key={tb.key}
                        type="button"
                        onClick={() => setActiveTab(tb.key)}
                        className={`pb-2.5 px-3 text-center font-bold text-sm border-b-2 transition-all flex items-center justify-center gap-2 shrink-0 ${activeTab === tb.key ? 'border-primary text-primary font-extrabold' : 'border-transparent text-muted hover:text-fg'}`}
                    >
                        {tb.icon}<span>{tb.label}</span>
                    </button>
                ))}
            </div>

            <div className="flex-1">{renderDetailsContent()}</div>
        </section>
    );
}
