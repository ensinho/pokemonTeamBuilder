import { create } from 'zustand';
import { db } from '../services/firebase';
import { doc, collection, setDoc } from 'firebase/firestore';
import { appId } from '../constants/firebase';
import { getPokemonArtworkSpriteUrl, getPokemonFrontSpriteUrl, getTeamPokemonDisplaySprite } from '../utils/pokemonSprites';
import { resolvePokemonDetail } from '../services/pokemonDataCache';
import { analyzeTeam } from '../utils/teamAnalysis';
import { buildShowdownExportText as buildShowdownText } from '../utils/showdownExport';
import { useAuthStore } from './useAuthStore';
import { useToastStore } from './useToastStore';
import { usePokedexStore } from './usePokedexStore';
import { useFirestoreTeamsStore } from './useFirestoreTeamsStore';

const serializeTeamPokemon = (pokemon) => ({
    id: pokemon.id,
    name: pokemon.name,
    sprite: pokemon.sprite || getPokemonArtworkSpriteUrl(pokemon.id),
    shinySprite: pokemon.shinySprite || getPokemonArtworkSpriteUrl(pokemon.id, { shiny: true }),
    animatedSprite: pokemon.animatedSprite || getPokemonFrontSpriteUrl(pokemon.id),
    animatedShinySprite: pokemon.animatedShinySprite || getPokemonFrontSpriteUrl(pokemon.id, { shiny: true }),
    instanceId: pokemon.instanceId,
    customization: pokemon.customization,
});

export const useActiveTeamStore = create((set, get) => ({
    currentTeam: [],
    teamName: '',
    editingTeamId: null,
    teamAnalysis: { strengths: new Set(), weaknesses: {}, defensiveCoverage: {} },
    suggestedPokemonIds: new Set(),
    editingTeamMember: null,

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

        const newMember = {
            ...fullPokemon,
            instanceId: `${fullPokemon.id}-${Date.now()}`,
            customization: {
                item: '',
                nature: 'serious',
                teraType: fullPokemon.types?.[0] || 'normal',
                isShiny: false,
                ability: fullPokemon.abilities?.[0]?.name || 'unknown',
                moves: (fullPokemon.moves || []).slice(0, 4).map(m => m.name),
                evs: { hp: 0, attack: 0, defense: 0, 'special-attack': 0, 'special-defense': 0, speed: 0 },
                ivs: { hp: 31, attack: 31, defense: 31, 'special-attack': 31, 'special-defense': 31, speed: 31 }
            }
        };

        set({ currentTeam: [...currentTeam, newMember] });
        get().recalculateAnalysis();
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

        const teamId = editingTeamId || doc(collection(db, `artifacts/${appId}/users/${userId}/teams`)).id;
        const existingTeam = savedTeams?.find(t => t.id === editingTeamId);
        const teamData = {
            name: teamName,
            pokemons: currentTeam.map(serializeTeamPokemon),
            isFavorite: existingTeam?.isFavorite || false,
            createdAt: existingTeam?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        try {
            await setDoc(doc(db, `artifacts/${appId}/users/${userId}/teams`, teamId), teamData);
            useToastStore.getState().showToast(`Team "${teamName}" saved!`, 'success');
            useFirestoreTeamsStore.getState().setActiveTeamId(teamId);
            get().handleClearTeam();
        } catch (e) {
            useToastStore.getState().showToast("Error saving team.", 'error');
        }
    },

    buildShowdownExportText: (teamMembers) => buildShowdownText(teamMembers),

    copyTextToClipboard: async (text, successMessage) => {
        try {
            await navigator.clipboard.writeText(text);
            useToastStore.getState().showToast(successMessage, 'success');
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
                useToastStore.getState().showToast(successMessage, 'success');
            } catch {
                useToastStore.getState().showToast('Failed to copy team.', 'error');
            }
        }
    },

    handleExportToShowdown: async () => {
        const { currentTeam, buildShowdownExportText, copyTextToClipboard } = get();
        if (currentTeam.length === 0) {
            useToastStore.getState().showToast('Your team is empty!', 'warning');
            return;
        }
        const exportText = buildShowdownExportText(currentTeam);
        await copyTextToClipboard(exportText, 'Copied for Pokémon Showdown!');
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

        const safeName = providedName || 'Unnamed Team';
        const snippetPokemons = teamMembers.map((member) => ({
            id: member.id,
            name: member.name,
            sprite: getTeamPokemonDisplaySprite(member) || '',
        }));

        set({ shareModal: { isOpen: true, shareUrl: '', pokemons: snippetPokemons, defaultTitle: safeName } });

        const teamId = doc(collection(db, `artifacts/${appId}/public/data/teams`)).id;
        const teamData = {
            name: safeName,
            pokemons: teamMembers.map(serializeTeamPokemon),
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
