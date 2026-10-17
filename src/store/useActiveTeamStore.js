import { create } from 'zustand';
import { db } from '../services/firebase';
import { doc, collection, setDoc } from 'firebase/firestore';
import { appId } from '../constants/firebase';
import { getPokemonArtworkSpriteUrl, getPokemonFrontSpriteUrl, getTeamPokemonDisplaySprite } from '../utils/pokemonSprites';
import { resolvePokemonDetail, resolvePokemonDetailByName } from '../services/pokemonDataCache';
import { ensureSpeciesIndex, getSpeciesIndex } from '../services/speciesIndex';
import { analyzeTeam } from '../utils/teamAnalysis';
import { buildShowdownExportText as buildShowdownText } from '../utils/showdownExport';
import { buildTeamMembers } from '../utils/teamImport';
import { newInstanceId, serializeTeam } from '../utils/teamSerialization';
import { speciesIdOf, wouldDuplicateSpecies } from '../utils/teamUniqueness';
import { convertSpread } from '../utils/statPoints';
import { isPlaythroughMode } from '../constants/regulations';
import { competitivePresetFor } from '../utils/loadCompetitivePreset';
import { markJourney, useAuthStore } from './useAuthStore';
import { toast } from './useToastStore';
import { t } from '../utils/translate';
import { navigateTo } from '../utils/navigation';
import { usePokedexStore } from './usePokedexStore';
import { useFirestoreTeamsStore } from './useFirestoreTeamsStore';
import { useThemeStore } from './useThemeStore';
import { megaDisplayName } from '../hooks/useMegaStones';
import { teamSignature, buildSignature, prettyPokemonName, uniqueTeamName } from '../utils/teamDraft';

export const SHOWDOWN_TEAMBUILDER_URL = 'https://play.pokemonshowdown.com/teambuilder';

// A toast action that takes the user to the builder is noise when they are
// already on it ("Abrir construtor" while looking at the builder).
const isOnBuilder = () => typeof window !== 'undefined' && /\/builder\/?$/.test(window.location.pathname);
const openBuilderAction = () => (isOnBuilder() ? [] : [{ label: t('toast.openBuilder'), onClick: () => navigateTo('/builder') }]);

// Clipboard write with the execCommand fallback (older Safari, insecure
// contexts). Resolves true on success — callers decide what to say.
const writeClipboard = async (text) => {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            const ok = document.execCommand('copy');
            ta.remove();
            return ok !== false;
        } catch {
            return false;
        }
    }
};

// Build a fully-formed team member from a resolved Pokémon record. When a
// competitive `preset` patch is supplied, the member arrives pre-filled with the
// most-used meta build (item / ability / nature / Tera / moves / EVs); otherwise
// it gets the blank default. Shared by handleAddPokemon and handleRandomizeTeam.
//
// `scale` is the spread scale of the team it joins: a Pokémon added to a Stat
// Points team (an imported Pokémon Champions one) is built in Stat Points too,
// so the paste never mixes 252s with a 66-point budget.
const createTeamMember = (fullPokemon, preset = null, scale = 'ev') => {
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
    // The preset is mined per base species, so it can name an ability or a move
    // this exact Pokémon does not have — Mold Breaker is Mega Gyarados's, and a
    // paste of "Gyarados @ Gyaradosite / Ability: Mold Breaker" is rejected by
    // Showdown. Keep only what the resolved record confirms; with no record to
    // check against (still the list entry), take the preset as it is.
    const ownAbilities = new Set((fullPokemon.abilities || []).map((a) => a?.name).filter(Boolean));
    const learnable = new Set((fullPokemon.moves || []).map((m) => m?.name).filter(Boolean));
    const presetAbility = [preset?.ability, ...(preset?.abilities || [])]
        .find((ability) => ability && (ownAbilities.size === 0 || ownAbilities.has(ability)));
    const presetMoves = (preset?.moves || []).filter((move) => learnable.size === 0 || learnable.has(move)).slice(0, 4);
    const customization = preset
        ? {
            ...base,
            item: preset.item ?? base.item,
            ability: presetAbility || base.ability,
            nature: preset.nature || base.nature,
            teraType: preset.teraType || base.teraType,
            moves: presetMoves.length ? presetMoves : base.moves,
            evs: preset.evs ? { ...base.evs, ...preset.evs } : base.evs,
        }
        : base;
    if (scale === 'sp') {
        customization.evs = convertSpread(customization.evs, 'ev', 'sp');
        customization.evScale = 'sp';
    }
    return {
        ...fullPokemon,
        // What the Species Clause compares — a form counts as its base species.
        speciesId: speciesIdOf(fullPokemon, getSpeciesIndex().baseIdOf) ?? fullPokemon.id,
        instanceId: newInstanceId(fullPokemon.id),
        customization,
    };
};

// A team is in Stat Points when every member already on it is.
const teamScale = (team) => (team.length > 0 && team.every((m) => m?.customization?.evScale === 'sp') ? 'sp' : 'ev');

// Adds still resolving their full record (see handleAddPokemon). Saving waits
// for them, so a team saved right after a tap is not stored half-built.
const pendingAdds = new Set();

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

// Pre-Fairy (Gen 2–5) analysis, for playthroughs of older games. Per device,
// like the builder's other view settings.
const LEGACY_TYPES_KEY = 'ptb-legacy-types';
const readLegacyTypes = () => {
    try { return localStorage.getItem(LEGACY_TYPES_KEY) === '1'; } catch (_) { return false; }
};

// Species Clause (one of each species, forms and Megas included) is a
// competitive rule, so it holds only while the builder is paired with a
// regulation; playthrough mode allows repeats, as the games do. TeamBuilderView
// owns that choice (`tb-regulation`) and keeps this in step; the first read is
// for an import that lands before the builder has mounted.
const readSpeciesClause = () => {
    try { return !isPlaythroughMode(localStorage.getItem('tb-regulation')); } catch (_) { return true; }
};

export const useActiveTeamStore = create((set, get) => ({
    currentTeam: [],
    legacyTypes: readLegacyTypes(),
    speciesClause: readSpeciesClause(),
    teamName: '',
    editingTeamId: null,
    teamAnalysis: { strengths: new Set(), weaknesses: {}, defensiveCoverage: {} },
    suggestedPokemonIds: new Set(),
    editingTeamMember: null,
    isRandomizing: false,
    // teamSignature() of the team as it was last saved or loaded for editing.
    // The builder compares against it to say whether there is anything to
    // save ("Atualizar" used to be enabled with nothing changed).
    savedSignature: null,

    // Share Modal state
    shareModal: { isOpen: false, shareUrl: '', pokemons: [], defaultTitle: '' },

    setTeamName: (name) => set({ teamName: name }),
    // Loading a saved team ends with this call (after the roster and the name),
    // so that is the moment its baseline is taken.
    setEditingTeamId: (id) => set((state) => ({
        editingTeamId: id,
        savedSignature: id ? teamSignature(state.teamName, state.currentTeam) : null,
    })),
    setEditingTeamMember: (member) => set({ editingTeamMember: member }),
    closeShareModal: () => set({ shareModal: { isOpen: false, shareUrl: '', pokemons: [], defaultTitle: '' } }),

    setCurrentTeam: (team) => {
        set({ currentTeam: team });
        get().recalculateAnalysis();
    },

    recalculateAnalysis: () => {
        const { currentTeam, legacyTypes } = get();
        const pokemonsList = usePokedexStore.getState().pokemons;
        set(analyzeTeam(currentTeam, pokemonsList, { legacyTypes }));
    },

    setLegacyTypes: (on) => {
        const legacyTypes = Boolean(on);
        if (legacyTypes === get().legacyTypes) return;
        try { localStorage.setItem(LEGACY_TYPES_KEY, legacyTypes ? '1' : '0'); } catch (_) { /* ignore */ }
        set({ legacyTypes });
        get().recalculateAnalysis();
    },

    setSpeciesClause: (on) => set({ speciesClause: Boolean(on) }),

    handleAddPokemon: async (pokemon) => {
        if (get().currentTeam.length >= 6) {
            toast.warning(t('toast.teamFull'), {
                description: t('toast.teamFullDesc'),
                actions: openBuilderAction(),
            });
            return;
        }

        // Species Clause, competitive builder only. Checked against the slots
        // already filled — a placeholder from a tap still resolving counts, so a
        // double tap cannot slip a second one in. Kicking the index load here
        // keeps the form lookups warm.
        ensureSpeciesIndex();
        if (get().speciesClause && wouldDuplicateSpecies(get().currentTeam, pokemon, getSpeciesIndex().baseIdOf)) {
            toast.warning(t('toast.speciesClause'), {
                key: 'species-clause',
                description: t('toast.speciesClauseDesc'),
            });
            return;
        }

        // Kick off the competitive-set lookup in parallel with the detail resolve
        // so a freshly added member arrives pre-filled with the most-used build.
        const setPromise = competitivePresetFor(pokemon.id).catch(() => null);

        // Optimistic: the slot fills on the tap, from the list entry alone (it
        // already has id, name, types and sprite — all the slot and the type
        // analysis read). The full record and the preset land in place when they
        // resolve. Waiting for them first put a Firestore round-trip, sometimes a
        // PokéAPI one too, between the tap and any visible answer — a second or
        // more on a phone, which read as the tap not registering. It also
        // captured `currentTeam` before the await, so a second tap during that
        // wait overwrote the first Pokémon instead of adding beside it.
        const scale = teamScale(get().currentTeam);
        const placeholder = createTeamMember(pokemon, null, scale);
        const { instanceId } = placeholder;
        set((state) => ({ currentTeam: [...state.currentTeam, placeholder] }));
        get().recalculateAnalysis();

        const completion = (async () => {
            // The list carries only lightweight index data (no abilities/moves/
            // stats). Resolve the full record so the member — and the editor
            // modal — have everything they need.
            let fullPokemon = pokemon;
            if (!pokemon.abilities?.length || !pokemon.moves?.length) {
                const resolved = await resolvePokemonDetail(pokemon.id);
                if (!resolved) {
                    set((state) => ({ currentTeam: state.currentTeam.filter((m) => m.instanceId !== instanceId) }));
                    get().recalculateAnalysis();
                    toast.error(t('toast.pokemonLoadError'), {
                        actions: [{ label: t('toast.retry'), onClick: () => get().handleAddPokemon(pokemon) }],
                    });
                    return;
                }
                // Keep any list-provided fields (e.g. derived sprites) but layer the fat data on top.
                fullPokemon = { ...pokemon, ...resolved };
            }

            const complete = createTeamMember(fullPokemon, await setPromise, scale);
            set((state) => {
                const current = state.currentTeam.find((m) => m.instanceId === instanceId);
                // Removed, cleared or replaced by the randomizer while we waited.
                if (!current) return {};
                // Customised already (the editor opened on the placeholder): the
                // user's choices win over the preset.
                const customization = current.customization === placeholder.customization
                    ? complete.customization
                    : current.customization;
                const member = { ...complete, instanceId, customization };
                const patch = {
                    currentTeam: state.currentTeam.map((m) => (m.instanceId === instanceId ? member : m)),
                };
                if (state.editingTeamMember?.instanceId === instanceId) {
                    patch.editingTeamMember = {
                        ...state.editingTeamMember,
                        ...fullPokemon,
                        instanceId,
                        customization: state.editingTeamMember.customization,
                    };
                }
                return patch;
            });
            get().recalculateAnalysis();
        })();

        pendingAdds.add(completion);
        try {
            await completion;
        } finally {
            pendingAdds.delete(completion);
        }
    },

    // Fill the team with up to `count` random distinct Pokémon drawn from `pool`
    // (the list the picker currently shows, so it respects the active game/type/
    // search filters). Full records are resolved lazily, in parallel.
    handleRandomizeTeam: async (pool, count = 6) => {
        if (get().isRandomizing) return;
        const seen = new Set();
        let candidates = [];
        for (const p of Array.isArray(pool) ? pool : []) {
            if (p && p.id != null && !seen.has(p.id)) {
                seen.add(p.id);
                candidates.push(p);
            }
        }
        if (candidates.length === 0) {
            toast.warning(t('toast.teamRandomizeEmpty'));
            return;
        }

        set({ isRandomizing: true });
        try {
            // Partial Fisher–Yates: pick `count` distinct entries without a full
            // shuffle. Under the Species Clause the pool's forms and Megas are
            // entries of their own, so a pick also takes its species out.
            const { baseIdOf } = get().speciesClause ? await ensureSpeciesIndex() : {};
            const picks = [];
            while (picks.length < count && candidates.length > 0) {
                const j = Math.floor(Math.random() * candidates.length);
                const [pick] = candidates.splice(j, 1);
                picks.push(pick);
                if (baseIdOf) {
                    const species = speciesIdOf(pick, baseIdOf);
                    candidates = candidates.filter((c) => speciesIdOf(c, baseIdOf) !== species);
                }
            }

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
            toast.success(t('toast.teamRandomized', { count: resolved.length }), {
                actions: openBuilderAction(),
            });
        } catch (_) {
            toast.error(t('toast.teamRandomizeError'), {
                actions: [{ label: t('toast.retry'), onClick: () => get().handleRandomizeTeam(pool, count) }],
            });
        } finally {
            set({ isRandomizing: false });
        }
    },

    // Removing a member took its moves, EVs and item with it and could not be
    // taken back. It is reversible, so it acts at once and offers an undo that
    // puts the member back in the same slot — never a confirm.
    handleRemoveFromTeam: (instanceId) => {
        const index = get().currentTeam.findIndex((p) => p.instanceId === instanceId);
        if (index < 0) return;
        const member = get().currentTeam[index];
        set((state) => ({
            currentTeam: state.currentTeam.filter((p) => p.instanceId !== instanceId),
            editingTeamMember: state.editingTeamMember?.instanceId === instanceId ? null : state.editingTeamMember,
        }));
        get().recalculateAnalysis();

        toast.info(t('builder.memberRemoved', { name: prettyPokemonName(member.name) }), {
            key: `member-removed-${instanceId}`,
            actions: [{
                label: t('toast.undo'),
                onClick: () => {
                    set((state) => {
                        if (state.currentTeam.length >= 6) return {};
                        if (state.currentTeam.some((p) => p.instanceId === instanceId)) return {};
                        const next = state.currentTeam.slice();
                        next.splice(Math.min(index, next.length), 0, member);
                        return { currentTeam: next };
                    });
                    get().recalculateAnalysis();
                },
            }],
        });
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
        const { currentTeam, teamName, editingTeamId } = get();
        set({ currentTeam: [], teamName: '', editingTeamId: null });
        get().recalculateAnalysis();

        // Clearing is one tap on a small icon beside Save and Share, and it took
        // a whole unsaved team with it — no confirm, no way back. Asking first
        // would tax every deliberate clear to protect the accidental ones; an
        // undo protects the accidents and costs the deliberate ones nothing.
        if (currentTeam.length === 0 && !teamName) return;
        toast.info(t('toast.teamCleared'), {
            key: 'team-cleared',
            actions: [{
                label: t('toast.undo'),
                onClick: () => {
                    set({ currentTeam, teamName, editingTeamId });
                    get().recalculateAnalysis();
                },
            }],
        });
    },

    // The member editor commits on every way out — Done, ×, Escape, the scrim,
    // a phone's drag-down — because each of those used to throw the edits away
    // without a word. Keeping them is the safe default; the undo toast is the
    // way back for the times closing meant "never mind".
    handleUpdateTeamMember: (instanceId, newCustomization) => {
        const member = get().currentTeam.find((p) => p.instanceId === instanceId);
        if (!member) return false;
        const previous = member.customization;
        if (buildSignature(previous) === buildSignature(newCustomization)) return false;
        set((state) => ({
            currentTeam: state.currentTeam.map((p) =>
                p.instanceId === instanceId ? { ...p, customization: newCustomization } : p
            ),
        }));
        get().recalculateAnalysis();
        markJourney('memberEdited');

        toast.info(t('builder.memberUpdated', { name: prettyPokemonName(member.name) }), {
            // One shared key: a new edit refreshes this toast in place rather
            // than stacking one per edit (three would queue the export toast).
            key: 'member-edited',
            actions: [{
                label: t('toast.undo'),
                onClick: () => {
                    set((state) => ({
                        currentTeam: state.currentTeam.map((p) =>
                            p.instanceId === instanceId ? { ...p, customization: previous } : p
                        ),
                    }));
                    get().recalculateAnalysis();
                },
            }],
        });
        return true;
    },

    handleSaveTeam: async (savedTeams) => {
        if (pendingAdds.size) await Promise.allSettled([...pendingAdds]);
        const { currentTeam, teamName: typedName, editingTeamId } = get();
        const userId = useAuthStore.getState().userId;

        if (!db || !userId) {
            toast.error(t('toast.dbNotReady'), { description: t('toast.dbNotReadyDesc') });
            return;
        }
        if (currentTeam.length === 0) {
            toast.warning(t('toast.teamEmpty'), { description: t('toast.teamEmptyDesc') });
            return;
        }

        // An unnamed team gets a name instead of a warning: "Pikachu team",
        // numbered if that is taken. The field shows the same name as its
        // placeholder, so nothing here is a surprise.
        let name = typedName.trim();
        if (!name) {
            name = defaultTeamName(currentTeam, savedTeams, editingTeamId);
            set({ teamName: name });
        }
        const teamName = name;

        if (savedTeams && savedTeams.some(team => team.name === teamName && team.id !== editingTeamId)) {
            toast.warning(t('toast.teamNameTaken'));
            return;
        }

        const [megaStones, { baseIdOf }] = await Promise.all([getMegaStones(), ensureSpeciesIndex()]);
        const teamId = editingTeamId || doc(collection(db, `artifacts/${appId}/users/${userId}/teams`)).id;
        const existingTeam = savedTeams?.find(t => t.id === editingTeamId);
        const teamData = {
            name: teamName,
            pokemons: serializeTeam(currentTeam, megaStones, baseIdOf),
            isFavorite: existingTeam?.isFavorite || false,
            createdAt: existingTeam?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        try {
            await setDoc(doc(db, `artifacts/${appId}/users/${userId}/teams`, teamId), teamData);
            toast.success(t('toast.teamSaved', { name: teamName }), {
                description: t('toast.teamSavedDesc', { count: currentTeam.length }),
                actions: [{ label: t('toast.viewTeams'), onClick: () => navigateTo('/teams') }],
            });
            useFirestoreTeamsStore.getState().setActiveTeamId(teamId);
            // Keep the roster on screen so the save doesn't feel like the team vanished.
            // Switch into edit mode for the just-saved team (button becomes "Update team"),
            // with what was written as the new baseline for "unsaved changes".
            set({ editingTeamId: teamId, savedSignature: teamSignature(teamName, currentTeam) });
            // A guest's first save is when losing the anonymous account starts
            // to cost something — the moment to suggest one (once per device).
            useAuthStore.getState().nudgeSyncAfterSave?.();
        } catch (e) {
            toast.error(t('toast.teamSaveError'), {
                actions: [{ label: t('toast.retry'), onClick: () => get().handleSaveTeam(savedTeams) }],
            });
        }
    },

    buildShowdownExportText: (teamMembers) => buildShowdownText(teamMembers, {
        includeTeraType: useThemeStore.getState().showTeraType,
        // Names a member by its exact form even when all it kept was an id.
        entryById: getSpeciesIndex().entryById,
    }),

    copyTextToClipboard: async (text, successMessage) => {
        const ok = await writeClipboard(text);
        if (!ok) toast.error(t('toast.teamCopyError'));
        else if (successMessage) toast.success(successMessage);
        return ok;
    },

    // The one Showdown export (builder and saved teams alike). The success
    // toast waits for the clipboard to answer, and opening Showdown is the
    // toast's action: a click is a user gesture, so iOS lets the tab open —
    // the old window.open inside a 2s setTimeout had none and was blocked, and
    // its "copied!" toast fired before the copy had happened (or failed).
    exportTeamToShowdown: async (teamMembers, name = '') => {
        const members = Array.isArray(teamMembers) ? teamMembers : [];
        if (members.length === 0) {
            toast.warning(t('toast.teamEmpty'), { description: t('toast.teamEmptyDesc') });
            return false;
        }
        const ok = await writeClipboard(get().buildShowdownExportText(members));
        if (!ok) {
            toast.error(t('toast.teamCopyError'), {
                actions: [{ label: t('toast.retry'), onClick: () => get().exportTeamToShowdown(members, name) }],
            });
            return false;
        }
        markJourney('showdownExport');
        const trimmed = String(name || '').trim();
        toast.success(trimmed ? t('builder.exportCopiedNamed', { name: trimmed }) : t('builder.exportCopied'), {
            key: 'showdown-export',
            description: t('builder.exportCopiedDesc'),
            actions: [{
                label: t('builder.openShowdown'),
                onClick: () => window.open(SHOWDOWN_TEAMBUILDER_URL, '_blank', 'noopener,noreferrer'),
            }],
        });
        return true;
    },

    handleExportToShowdown: () => {
        const { currentTeam, teamName, exportTeamToShowdown } = get();
        return exportTeamToShowdown(currentTeam, teamName);
    },

    /**
     * Load someone else's team into the builder as a new one: a tournament
     * roster, a share link, a forum post. Each member is rebuilt from its full
     * record with its own instance id, and a tournament set (item, ability,
     * nature, moves and spread on the member itself, in Showdown's spelling)
     * keeps all of it. Tournament teams used to go through the saved-team
     * loader, which reads the `customization`/`instanceId` a set does not have.
     *
     * In a competitive builder a repeated species is dropped (first one wins)
     * and named in the toast. Returns whether anything loaded; navigation is the
     * caller's.
     */
    importTeam: async (team) => {
        const source = Array.isArray(team?.pokemons) ? team.pokemons.filter(Boolean) : [];
        if (source.length === 0) {
            toast.warning(t('toast.importEmpty'));
            return false;
        }

        const previous = {
            currentTeam: get().currentTeam,
            teamName: get().teamName,
            editingTeamId: get().editingTeamId,
            savedSignature: get().savedSignature,
        };

        try {
            const { list } = await ensureSpeciesIndex();
            const result = await buildTeamMembers(
                team,
                { pokemonIndex: list, resolveDetail: resolvePokemonDetail, resolveDetailByName: resolvePokemonDetailByName },
                { mode: 'import', speciesClause: get().speciesClause },
            );
            if (result.members.length === 0) throw new Error('No Pokémon could be resolved');

            const name = team.name || t('toast.importedTeamName');
            set({ currentTeam: result.members, teamName: name, editingTeamId: null, savedSignature: null });
            get().recalculateAnalysis();

            const notes = [];
            if (result.dropped.length > 0) {
                notes.push(t('toast.teamImportDropped', { names: result.dropped.map((m) => prettyPokemonName(m.name)).join(', ') }));
            }
            if (result.unresolved.length > 0) {
                notes.push(t('toast.teamImportPartial', { names: result.unresolved.join(', ') }));
            }
            toast.success(t('toast.teamImported', { name }), {
                key: 'team-imported',
                description: notes.join(' ') || undefined,
                // Importing replaces whatever was in the builder; if that was a
                // team, one tap puts it back.
                actions: previous.currentTeam.length > 0 ? [{
                    label: t('toast.undo'),
                    onClick: () => {
                        set(previous);
                        get().recalculateAnalysis();
                    },
                }] : [],
            });
            return true;
        } catch (_) {
            toast.error(t('toast.importFailed'), {
                actions: [{ label: t('toast.retry'), onClick: () => get().importTeam(team) }],
            });
            return false;
        }
    },

    shareTeamByData: async (teamMembers, providedName = 'Unnamed Team') => {
        const isAuthReady = useAuthStore.getState().isAuthReady;
        if (!db || !isAuthReady) {
            toast.error(t('toast.dbNotReady'), { description: t('toast.dbNotReadyDesc') });
            return;
        }
        if (teamMembers.length === 0) {
            toast.warning(t('toast.shareEmptyTeam'), { description: t('toast.teamEmptyDesc') });
            return;
        }

        const [megaStones, { baseIdOf }] = await Promise.all([getMegaStones(), ensureSpeciesIndex()]);
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
            pokemons: serializeTeam(teamMembers, megaStones, baseIdOf),
            createdAt: new Date().toISOString(),
        };

        try {
            await setDoc(doc(db, `artifacts/${appId}/public/data/teams`, teamId), teamData);
            markJourney('shareLink');
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
            toast.error(t('toast.shareLinkError'));
        }
    },

    handleShareTeam: async () => {
        const { currentTeam, teamName, shareTeamByData } = get();
        await shareTeamByData(currentTeam, teamName || 'Unnamed Team');
    }
}));

/** Showdown export for any roster (saved teams included). See the store action. */
export const exportTeamToShowdown = (teamMembers, name) => useActiveTeamStore.getState().exportTeamToShowdown(teamMembers, name);

/**
 * The name an unnamed team is saved under ("Pikachu team", numbered when that
 * is taken). The builder shows it as the name field's placeholder, so what the
 * save writes is never a surprise. Empty for an empty team.
 */
export function defaultTeamName(members = [], savedTeams = [], editingTeamId = null) {
    if (!members?.length) return '';
    const taken = (savedTeams || []).filter((team) => team.id !== editingTeamId).map((team) => team.name);
    return uniqueTeamName(t('builder.defaultTeamName', { name: prettyPokemonName(members[0].name) }), taken);
}

/** True when the team loaded for editing differs from what was last saved. */
export const selectIsTeamDirty = (state) => Boolean(state.editingTeamId)
    && teamSignature(state.teamName, state.currentTeam) !== state.savedSignature;
