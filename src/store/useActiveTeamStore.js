import { create } from 'zustand';
import { db } from '../services/firebase';
import { doc, collection, setDoc } from 'firebase/firestore';
import { appId } from '../constants/firebase';
import { getPokemonArtworkSpriteUrl, getPokemonFrontSpriteUrl, getTeamPokemonDisplaySprite } from '../utils/pokemonSprites';
import { resolvePokemonDetail } from '../services/pokemonDataCache';
import { analyzeTeam } from '../utils/teamAnalysis';
import { buildShowdownExportText as buildShowdownText } from '../utils/showdownExport';
import { competitivePresetFor } from '../utils/loadCompetitivePreset';
import { useAuthStore } from './useAuthStore';
import { useToastStore } from './useToastStore';
import { usePokedexStore } from './usePokedexStore';
import { useFirestoreTeamsStore } from './useFirestoreTeamsStore';
import { useLanguageStore } from './useLanguageStore';
import { megaDisplayName } from '../hooks/useMegaStones';

// Monotonic counter so instanceIds stay unique even when several members are
// created within the same millisecond (e.g. the randomizer building 6 at once).
let teamMemberSeq = 0;

// Build a fully-formed team member from a resolved Pokémon record. When a
// competitive `preset` patch is supplied, the member arrives pre-filled with the
// most-used meta build (item / ability / nature / Tera / moves / EVs); otherwise
// it gets the blank default. Shared by handleAddPokemon and handleRandomizeTeam.
const createTeamMember = (fullPokemon, preset = null) => {
    const base = {
        item: '',
        nature: 'serious',
        teraType: fullPokemon.types?.[0] || 'normal',
        isShiny: false,
        ability: fullPokemon.abilities?.[0]?.name || 'unknown',
        moves: [],
        evs: { hp: 0, attack: 0, defense: 0, 'special-attack': 0, 'special-defense': 0, speed: 0 },
        ivs: { hp: 31, attack: 31, defense: 31, 'special-attack': 31, 'special-defense': 31, speed: 31 },
    };
    const customization = preset
        ? {
            ...base,
            item: preset.item ?? base.item,
            ability: preset.ability || base.ability,
            nature: preset.nature || base.nature,
            teraType: preset.teraType || base.teraType,
            moves: preset.moves?.length ? preset.moves.slice(0, 4) : base.moves,
            evs: preset.evs ? { ...base.evs, ...preset.evs } : base.evs,
        }
        : base;
    return {
        ...fullPokemon,
        instanceId: `${fullPokemon.id}-${Date.now()}-${teamMemberSeq++}`,
        customization,
    };
};

let cachedMegaStones = null;
const getMegaStones = async () => {
    if (cachedMegaStones) return cachedMegaStones;
    try {
        const basePath = import.meta.env.BASE_URL || '/';
        const url = `${basePath}data/mega-stones.json`.replace(/([^:])\/{2,}/g, '$1/');
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            cachedMegaStones = data?.byStone || {};
            return cachedMegaStones;
        }
    } catch (e) {
        console.error("Failed to load mega stones in store", e);
    }
    return {};
};

const serializeTeamPokemon = (pokemon, megaStones = null) => {
    const item = pokemon?.customization?.item;
    const mega = (item && megaStones) ? megaStones[item] : null;
    const isMega = mega && mega.baseId === pokemon.id;
    
    const spriteId = isMega ? mega.spriteId : pokemon.id;
    const displayName = isMega ? megaDisplayName(mega.form) : pokemon.name;

    return {
        id: pokemon.id,
        name: displayName,
        sprite: getPokemonArtworkSpriteUrl(spriteId),
        shinySprite: getPokemonArtworkSpriteUrl(spriteId, { shiny: true }),
        animatedSprite: getPokemonFrontSpriteUrl(spriteId),
        animatedShinySprite: getPokemonFrontSpriteUrl(spriteId, { shiny: true }),
        instanceId: pokemon.instanceId,
        customization: pokemon.customization || {},
    };
};

export const useActiveTeamStore = create((set, get) => ({
    currentTeam: [],
    teamName: '',
    editingTeamId: null,
    teamAnalysis: { strengths: new Set(), weaknesses: {}, defensiveCoverage: {} },
    suggestedPokemonIds: new Set(),
    editingTeamMember: null,
    isRandomizing: false,

    // Share Modal state
    shareModal: { isOpen: false, shareUrl: '', pokemons: [], defaultTitle: '' },

    setTeamName: (name) => set({ teamName: name }),
    setEditingTeamId: (id) => set({ editingTeamId: id }),
    setEditingTeamMember: (member) => set({ editingTeamMember: member }),
    closeShareModal: () => set({ shareModal: { isOpen: false, shareUrl: '', pokemons: [], defaultTitle: '' } }),

    setCurrentTeam: (team) => {
        set({ currentTeam: team });
        get().recalculateAnalysis();
    },

    recalculateAnalysis: () => {
        const { currentTeam } = get();
        const pokemonsList = usePokedexStore.getState().pokemons;
        set(analyzeTeam(currentTeam, pokemonsList));
    },

    handleAddPokemon: async (pokemon) => {
        const { currentTeam } = get();
        if (currentTeam.length >= 6) {
            useToastStore.getState().showToast("Your team is full (6 Pokémon)!", 'warning');
            return;
        }

        // Kick off the competitive-set lookup in parallel with the detail resolve
        // so a freshly added member arrives pre-filled with the most-used build.
        const setPromise = competitivePresetFor(pokemon.id).catch(() => null);

        // The Pokédex/Team Builder list now carries only lightweight index data
        // (no abilities/moves/stats). Lazily resolve the full record on add so the
        // member — and the editor modal — have everything they need.
        let fullPokemon = pokemon;
        if (!pokemon.abilities?.length || !pokemon.moves?.length) {
            const resolved = await resolvePokemonDetail(pokemon.id);
            if (!resolved) {
                useToastStore.getState().showToast("Couldn't load this Pokémon's data. Try again.", 'error');
                return;
            }
            // Keep any list-provided fields (e.g. derived sprites) but layer the fat data on top.
            fullPokemon = { ...pokemon, ...resolved };
        }

        const set_ = await setPromise;
        set({ currentTeam: [...currentTeam, createTeamMember(fullPokemon, set_)] });
        get().recalculateAnalysis();
    },

    // Fill the team with up to `count` random distinct Pokémon drawn from `pool`
    // (the list the picker currently shows, so it respects the active game/type/
    // search filters). Full records are resolved lazily, in parallel.
    handleRandomizeTeam: async (pool, count = 6) => {
        if (get().isRandomizing) return;
        const seen = new Set();
        const candidates = [];
        for (const p of Array.isArray(pool) ? pool : []) {
            if (p && p.id != null && !seen.has(p.id)) {
                seen.add(p.id);
                candidates.push(p);
            }
        }
        if (candidates.length === 0) {
            useToastStore.getState().showToast('No Pokémon available to randomize.', 'warning');
            return;
        }

        // Partial Fisher–Yates: pick `count` distinct entries without a full shuffle.
        const picks = [];
        for (let i = 0; i < count && candidates.length > 0; i += 1) {
            const j = Math.floor(Math.random() * candidates.length);
            picks.push(candidates.splice(j, 1)[0]);
        }

        set({ isRandomizing: true });
        try {
            const resolved = await Promise.all(picks.map(async (pokemon) => {
                const setPromise = competitivePresetFor(pokemon.id).catch(() => null);
                let full = pokemon;
                if (!pokemon.abilities?.length || !pokemon.moves?.length) {
                    const detail = await resolvePokemonDetail(pokemon.id);
                    if (detail) full = { ...pokemon, ...detail };
                }
                return createTeamMember(full, await setPromise);
            }));
            set({ currentTeam: resolved, editingTeamId: null });
            get().recalculateAnalysis();
            useToastStore.getState().showToast(`Randomized a team of ${resolved.length}!`, 'success');
        } catch (_) {
            useToastStore.getState().showToast('Could not randomize a team. Try again.', 'error');
        } finally {
            set({ isRandomizing: false });
        }
    },

    handleRemoveFromTeam: (instanceId) => {
        set((state) => ({
            currentTeam: state.currentTeam.filter(p => p.instanceId !== instanceId)
        }));
        get().recalculateAnalysis();
    },

    handleReorderTeam: (fromIndex, toIndex) => {
        set((state) => {
            const prev = state.currentTeam;
            if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return {};
            if (fromIndex >= prev.length || toIndex >= prev.length) return {};
            const next = prev.slice();
            const [moved] = next.splice(fromIndex, 1);
            next.splice(toIndex, 0, moved);
            return { currentTeam: next };
        });
    },

    handleClearTeam: () => {
        set({ currentTeam: [], teamName: '', editingTeamId: null });
        get().recalculateAnalysis();
    },

    handleUpdateTeamMember: (instanceId, newCustomization) => {
        set((state) => ({
            currentTeam: state.currentTeam.map(member =>
                member.instanceId === instanceId ? { ...member, customization: newCustomization } : member
            )
        }));
        get().recalculateAnalysis();
    },

    handleSaveTeam: async (savedTeams) => {
        const { currentTeam, teamName, editingTeamId } = get();
        const userId = useAuthStore.getState().userId;

        if (!db || !userId) {
            useToastStore.getState().showToast("Database connection not ready.", 'error');
            return;
        }
        if (currentTeam.length === 0) {
            useToastStore.getState().showToast("Your team is empty!", 'warning');
            return;
        }
        if (!teamName.trim()) {
            useToastStore.getState().showToast("Please name your team.", 'warning');
            return;
        }

        if (savedTeams && savedTeams.some(team => team.name === teamName && team.id !== editingTeamId)) {
            useToastStore.getState().showToast("A team with this name already exists.", "warning");
            return;
        }

        const megaStones = await getMegaStones();
        const teamId = editingTeamId || doc(collection(db, `artifacts/${appId}/users/${userId}/teams`)).id;
        const existingTeam = savedTeams?.find(t => t.id === editingTeamId);
        const teamData = {
            name: teamName,
            pokemons: currentTeam.map(pokemon => serializeTeamPokemon(pokemon, megaStones)),
            isFavorite: existingTeam?.isFavorite || false,
            createdAt: existingTeam?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        try {
            await setDoc(doc(db, `artifacts/${appId}/users/${userId}/teams`, teamId), teamData);
            useToastStore.getState().showToast(`Team "${teamName}" saved!`, 'success');
            useFirestoreTeamsStore.getState().setActiveTeamId(teamId);
            // Keep the roster on screen so the save doesn't feel like the team vanished.
            // Switch into edit mode for the just-saved team (button becomes "Update team").
            set({ editingTeamId: teamId });
        } catch (e) {
            useToastStore.getState().showToast("Error saving team.", 'error');
        }
    },

    buildShowdownExportText: (teamMembers) => buildShowdownText(teamMembers),

    copyTextToClipboard: async (text, successMessage) => {
        try {
            await navigator.clipboard.writeText(text);
            if (successMessage) {
                useToastStore.getState().showToast(successMessage, 'success');
            }
        } catch {
            try {
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                ta.remove();
                if (successMessage) {
                    useToastStore.getState().showToast(successMessage, 'success');
                }
            } catch {
                useToastStore.getState().showToast('Failed to copy team.', 'error');
            }
        }
    },

    handleExportToShowdown: async () => {
        const { currentTeam, buildShowdownExportText, copyTextToClipboard, teamName } = get();
        if (currentTeam.length === 0) {
            useToastStore.getState().showToast('Your team is empty!', 'warning');
            return;
        }
        const exportText = buildShowdownExportText(currentTeam);
        
        // Show redirecting toast first
        const lang = useLanguageStore.getState().language;
        const teamNameText = teamName ? ` "${teamName}"` : '';
        const msg = lang === 'pt'
            ? `Time${teamNameText} copiado! Redirecionando para o Pokémon Showdown em 2 segundos...`
            : `Team${teamNameText} copied! Redirecting to Pokémon Showdown in 2 seconds...`;
        useToastStore.getState().showToast(msg, 'success');

        await copyTextToClipboard(exportText, null);

        // Redirect after a 2 second delay so user sees the toast on the page
        setTimeout(() => {
            window.open('https://play.pokemonshowdown.com/teambuilder', '_blank');
        }, 2000);
    },

    shareTeamByData: async (teamMembers, providedName = 'Unnamed Team') => {
        const isAuthReady = useAuthStore.getState().isAuthReady;
        if (!db || !isAuthReady) {
            useToastStore.getState().showToast('Database not ready.', 'error');
            return;
        }
        if (teamMembers.length === 0) {
            useToastStore.getState().showToast('Cannot share an empty team!', 'warning');
            return;
        }

        const megaStones = await getMegaStones();
        const safeName = providedName || 'Unnamed Team';
        const snippetPokemons = teamMembers.map((member) => {
            const item = member?.customization?.item;
            const mega = (item && megaStones) ? megaStones[item] : null;
            const isMega = mega && mega.baseId === member.id;
            const name = isMega ? megaDisplayName(mega.form) : member.name;
            const spriteId = isMega ? mega.spriteId : member.id;

            return {
                ...member,
                id: member.id,
                name: name,
                types: member.types || [],
                sprite: isMega 
                    ? getPokemonFrontSpriteUrl(spriteId, { shiny: member.customization?.isShiny || member.isShiny })
                    : (getTeamPokemonDisplaySprite(member) || ''),
                artworkSprite: getPokemonArtworkSpriteUrl(spriteId, { shiny: member.customization?.isShiny || member.isShiny }),
                customization: member.customization || {},
            };
        });

        set({ shareModal: { isOpen: true, shareUrl: '', pokemons: snippetPokemons, defaultTitle: safeName } });

        const teamId = doc(collection(db, `artifacts/${appId}/public/data/teams`)).id;
        const teamData = {
            name: safeName,
            pokemons: teamMembers.map(pokemon => serializeTeamPokemon(pokemon, megaStones)),
            createdAt: new Date().toISOString(),
        };

        try {
            await setDoc(doc(db, `artifacts/${appId}/public/data/teams`, teamId), teamData);
            const basePath = `${import.meta.env.BASE_URL || '/'}`.replace(/\/$/, '');
            const builderPath = `${basePath}/builder`.replace(/\/{2,}/g, '/');
            const shareUrl = new URL(builderPath, window.location.origin);
            shareUrl.searchParams.set('team', teamId);
            set((state) => {
                if (state.shareModal.isOpen) {
                    return { shareModal: { ...state.shareModal, shareUrl: shareUrl.toString() } };
                }
                return {};
            });
        } catch {
            set({ shareModal: { isOpen: false, shareUrl: '', pokemons: [], defaultTitle: '' } });
            useToastStore.getState().showToast('Could not generate share link.', 'error');
        }
    },

    handleShareTeam: async () => {
        const { currentTeam, teamName, shareTeamByData } = get();
        await shareTeamByData(currentTeam, teamName || 'Unnamed Team');
    }
}));
