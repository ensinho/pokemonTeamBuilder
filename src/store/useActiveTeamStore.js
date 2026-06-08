import { create } from 'zustand';
import { db } from '../services/firebase';
import { doc, collection, setDoc } from 'firebase/firestore';
import { appId } from '../constants/firebase';
import { typeChart } from '../constants/types';
import { getPokemonArtworkSpriteUrl, getPokemonFrontSpriteUrl, getTeamPokemonDisplaySprite } from '../utils/pokemonSprites';
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

const formatShowdownCase = (str = '') =>
    str.split('-').filter(Boolean).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

const getDefaultCustomization = (pokemonData = {}) => ({
    item: '',
    nature: 'serious',
    teraType: pokemonData.types?.[0] || 'normal',
    isShiny: false,
    ability: pokemonData.abilities?.[0]?.name || 'unknown',
    moves: [],
    evs: { hp: 0, attack: 0, defense: 0, 'special-attack': 0, 'special-defense': 0, speed: 0 },
    ivs: { hp: 31, attack: 31, defense: 31, 'special-attack': 31, 'special-defense': 31, speed: 31 },
});

export const useActiveTeamStore = create((set, get) => ({
    currentTeam: [],
    teamName: '',
    editingTeamId: null,
    teamAnalysis: { strengths: new Set(), weaknesses: {} },
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

        if (currentTeam.length === 0) {
            set({
                teamAnalysis: { strengths: new Set(), weaknesses: {} },
                suggestedPokemonIds: new Set()
            });
            return;
        }

        const teamWeaknessCounts = {};
        const offensiveCoverage = new Set();

        currentTeam.flatMap(d => d.types || []).forEach(type => {
            Object.entries(typeChart[type]?.damageDealt || {}).forEach(([vs, mult]) => {
                if (mult > 1) offensiveCoverage.add(vs.toLowerCase());
            });
        });

        Object.keys(typeChart).forEach(attackingType => {
            const capitalizedAttackingType = attackingType.charAt(0).toUpperCase() + attackingType.slice(1);
            let weakCount = 0;
            let resistanceCount = 0;

            currentTeam.forEach(pokemon => {
                const multiplier = (pokemon.types || []).reduce((acc, pokemonType) => {
                    return acc * (typeChart[pokemonType]?.damageTaken[capitalizedAttackingType] ?? 1);
                }, 1);

                if (multiplier > 1) {
                    weakCount++;
                } else if (multiplier < 1) {
                    resistanceCount++;
                }
            });

            if (weakCount > 0 && weakCount >= currentTeam.length / 2 && weakCount > resistanceCount) {
                teamWeaknessCounts[attackingType] = weakCount;
            }
        });

        const weaknessTypes = Object.keys(teamWeaknessCounts);
        let suggestions = new Set();
        if (weaknessTypes.length > 0 && pokemonsList.length > 0) {
            const potentialSuggestions = pokemonsList.filter(p => {
                if (!p.types) return false;
                return weaknessTypes.some(weakType => {
                    const capitalizedWeakType = weakType.charAt(0).toUpperCase() + weakType.slice(1);
                    const typeMultiplier = p.types.reduce((multiplier, pokemonType) => {
                        return multiplier * (typeChart[pokemonType]?.damageTaken[capitalizedWeakType] ?? 1);
                    }, 1);
                    return typeMultiplier < 1;
                });
            });
            suggestions = new Set(potentialSuggestions.map(p => p.id).slice(0, 10));
        }

        set({
            teamAnalysis: { strengths: offensiveCoverage, weaknesses: teamWeaknessCounts },
            suggestedPokemonIds: suggestions
        });
    },

    handleAddPokemon: (pokemon) => {
        const { currentTeam } = get();
        if (currentTeam.length >= 6) {
            useToastStore.getState().showToast("Your team is full (6 Pokémon)!", 'warning');
            return;
        }

        const newMember = {
            ...pokemon,
            instanceId: `${pokemon.id}-${Date.now()}`,
            customization: {
                item: '',
                nature: 'serious',
                teraType: pokemon.types[0],
                isShiny: false,
                ability: pokemon.abilities[0].name,
                moves: pokemon.moves.slice(0, 4).map(m => m.name),
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

    buildShowdownExportText: (teamMembers) => {
        const statMap = { hp: 'HP', attack: 'Atk', defense: 'Def', 'special-attack': 'SpA', 'special-defense': 'SpD', speed: 'Spe' };

        return teamMembers.map((member) => {
            const baseCustomization = getDefaultCustomization(member);
            const savedCustomization = member.customization || {};
            const customization = {
                ...baseCustomization,
                ...savedCustomization,
                evs: { ...baseCustomization.evs, ...(savedCustomization.evs || {}) },
                ivs: { ...baseCustomization.ivs, ...(savedCustomization.ivs || {}) },
                moves: Array.isArray(savedCustomization.moves) ? savedCustomization.moves : baseCustomization.moves,
            };

            const evsString = Object.entries(customization.evs)
                .filter(([, val]) => Number(val) > 0)
                .map(([key, val]) => `${val} ${statMap[key]}`)
                .join(' / ');
            const ivsString = Number(customization.ivs.attack) === 0 ? 'IVs: 0 Atk' : '';

            return [
                `${formatShowdownCase(member.name || 'Unknown Pokemon')} @ ${formatShowdownCase(customization.item || 'Nothing')}`,
                `Ability: ${formatShowdownCase(customization.ability || 'Unknown')}`,
                'Level: 50',
                customization.isShiny ? 'Shiny: Yes' : null,
                `Tera Type: ${formatShowdownCase(customization.teraType || 'normal')}`,
                evsString ? `EVs: ${evsString}` : null,
                `${formatShowdownCase(customization.nature || 'serious')} Nature`,
                ivsString || null,
                ...customization.moves.filter(Boolean).map((move) => `- ${formatShowdownCase(move)}`),
            ].filter(Boolean).join('\n');
        }).join('\n\n');
    },

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
