import { useEffect, useMemo, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';

import {
    getPokemonEncountersData,
    getStaticPokemonDetail,
    getPokemonApiData,
    getEvolutionChainData,
    getPokemonSpeciesData,
    getMoveDetails,
    getMachineDetails,
} from '../services/pokemonDataCache';
import { POKEBALL_PLACEHOLDER_URL } from '../constants/theme';
import { VERSION_GROUPS, formatLocationName } from '../constants/pokemonVersions';
import { buildPokemonForms, formDisplayName } from '../utils/pokemonForms';
import { sanitizeSpriteUrl } from '../utils/pokemonSprites';

const displayNameFromApi = (apiData) =>
    apiData?.id > 1025 ? formDisplayName(apiData.name, apiData.species?.name) : apiData?.name;

/**
 * Everything the Pokédex detail surfaces need for one Pokémon: the detail
 * cascade (Firestore mirror -> static detail -> PokéAPI), species, encounters,
 * evolution chain, forms, resolved moves, plus the derived display values.
 *
 * It exists because there are now two surfaces — the desktop panel
 * (PokemonDetailPanel) and the mobile screen (MobilePokemonDetailView) — and
 * `docs/wounds.md` already lists "duplicated resolve-fat-detail cascades" as a
 * dispattern. The two differ in layout only; the data is this hook.
 *
 * Sprite/version selection lives here too (showShiny, customSelectedSprite,
 * locationsVersionFilter, selectedMoveVersion) because the fetches depend on it.
 */
export function usePokemonDetailData({
    pokemonId,
    db,
    pokemonDetailsCache = {},
    setPokemonDetailsCache,
    language = 'en',
}) {
    const [selectedPokemon, setSelectedPokemon] = useState(pokemonId ? { id: pokemonId } : null);
    const [selectedPokemonDetails, setSelectedPokemonDetails] = useState(null);
    const [fullApiData, setFullApiData] = useState(null);
    const [speciesData, setSpeciesData] = useState(null);
    const [encounters, setEncounters] = useState([]);
    const [isEncountersLoading, setIsEncountersLoading] = useState(false);
    const [locationsVersionFilter, setLocationsVersionFilter] = useState('all');
    const [showShiny, setShowShiny] = useState(false);
    const [evolutionDetails, setEvolutionDetails] = useState([]);
    const [forms, setForms] = useState([]);

    const [resolvedMoves, setResolvedMoves] = useState({ levelUp: [], machine: [], other: [] });
    const [selectedMoveVersion, setSelectedMoveVersion] = useState('');
    const [isMovesLoading, setIsMovesLoading] = useState(false);
    const [customSelectedSprite, setCustomSelectedSprite] = useState(null);

    // Re-seed when the route id changes.
    useEffect(() => {
        setSelectedPokemon(pokemonId ? { id: pokemonId } : null);
        setShowShiny(false);
        setCustomSelectedSprite(null);
    }, [pokemonId]);

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
        if (customSelectedSprite) return sanitizeSpriteUrl(customSelectedSprite);
        if (!selectedPokemonDetails) return POKEBALL_PLACEHOLDER_URL;
        const url = showShiny
            ? (selectedPokemonDetails.animatedShinySprite || selectedPokemonDetails.shinySprite || selectedPokemonDetails.sprite)
            : (selectedPokemonDetails.animatedSprite || selectedPokemonDetails.sprite);
        return sanitizeSpriteUrl(url);
    }, [selectedPokemonDetails, showShiny, customSelectedSprite]);

    const formattedId = useMemo(() => (selectedPokemonDetails?.id ? String(selectedPokemonDetails.id).padStart(4, '0') : ''), [selectedPokemonDetails]);
    const pokemonGenus = useMemo(() => speciesData?.genera?.find((g) => g.language.name === 'en')?.genus || '', [speciesData]);
    // Pokédex flavor text — prefer the UI language, fall back to English (PokéAPI
    // rarely ships pt). Clean soft-hyphen word breaks and collapse the line breaks
    // old-gen entries carry mid-sentence.
    const pokedexDescription = useMemo(() => {
        const entries = speciesData?.flavor_text_entries;
        if (!entries?.length) return '';
        const langName = language === 'pt' ? 'pt' : 'en';
        const entry = entries.find((e) => e.language?.name === langName)
            || entries.find((e) => e.language?.name === 'en')
            || entries[0];
        return String(entry?.flavor_text || '')
            .replace(/[­]\s*/g, '')
            .replace(/[\n\f\r]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }, [speciesData, language]);
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

    return {
        // Raw records
        selectedPokemon,
        selectedPokemonDetails,
        fullApiData,
        speciesData,
        encounters,
        evolutionDetails,
        forms,

        // Loading flags
        isEncountersLoading,
        isMovesLoading,

        // Sprite selection
        spriteToShow,
        showShiny,
        setShowShiny,
        customSelectedSprite,
        setCustomSelectedSprite,
        pokemonGenerationSprites,

        // Locations
        availableVersions,
        locationsVersionFilter,
        setLocationsVersionFilter,
        filteredGroupedEncounters,

        // Moves
        availableMoveVersions,
        selectedMoveVersion,
        setSelectedMoveVersion,
        resolvedMoves,

        // Derived display values
        typeDefenses,
        formattedId,
        pokemonGenus,
        pokedexDescription,
        heightInM,
        heightInFt,
        weightInKg,
        weightInLbs,
        evYield,
        genderText,
        eggGroups,
        baseFriendshipText,
        growthRateText,
        eggCyclesText,
        catchRateText,
    };
}
