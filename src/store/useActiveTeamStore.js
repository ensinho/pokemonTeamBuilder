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
import { newInstanceId, serializeTeam, withUniqueInstanceIds } from '../utils/teamSerialization';
import { dedupeBySpecies, findDuplicateSpecies, speciesIdOf, wouldDuplicateSpecies } from '../utils/teamUniqueness';
import { convertSpread } from '../utils/evBudget';
import { competitivePresetFor } from '../utils/loadCompetitivePreset';
import { useAuthStore } from './useAuthStore';
import { toast } from './useToastStore';
import { t } from '../utils/translate';
import { navigateTo } from '../utils/navigation';
import { usePokedexStore } from './usePokedexStore';
import { useFirestoreTeamsStore } from './useFirestoreTeamsStore';
import { useLanguageStore } from './useLanguageStore';
import { useThemeStore } from './useThemeStore';
import { megaDisplayName } from '../hooks/useMegaStones';
import { settleWrite } from '../utils/firestoreWrite';

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
    const presetEvs = preset?.evs ? { ...base.evs, ...preset.evs } : base.evs;
    // The preset is mined per base species, so it can name an ability or a move
    // this exact Pokémon does not have — Mold Breaker is Mega Gyarados's, and a
    // paste of "Gyarados @ Gyaradosite / Ability: Mold Breaker" is rejected by
    // Showdown. Keep only what the resolved record confirms; with no record to
    // check against (it failed to load), take the preset as it is.
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
            evs: presetEvs,
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

const duplicateNames = (groups) => groups.map((group) => group.names[0]).filter(Boolean).join(', ');

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

const EMPTY_SHARE_MODAL = { isOpen: false, shareUrl: '', linkStatus: 'idle', requestId: 0, pokemons: [], source: [], defaultTitle: '' };
let shareRequestSeq = 0;

export const useActiveTeamStore = create((set, get) => ({
    currentTeam: [],
    teamName: '',
    editingTeamId: null,
    teamAnalysis: { strengths: new Set(), weaknesses: {}, defensiveCoverage: {} },
    suggestedPokemonIds: new Set(),
    editingTeamMember: null,
    isRandomizing: false,

    // Share Modal state
    shareModal: EMPTY_SHARE_MODAL,

    setTeamName: (name) => set({ teamName: name }),
    setEditingTeamId: (id) => set({ editingTeamId: id }),
    setEditingTeamMember: (member) => set({ editingTeamMember: member }),
    closeShareModal: () => set({ shareModal: EMPTY_SHARE_MODAL }),

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
        if (get().currentTeam.length >= 6) {
            toast.warning(t('toast.teamFull'), {
                description: t('toast.teamFullDesc'),
                actions: [{ label: t('toast.openBuilder'), onClick: () => navigateTo('/builder') }],
            });
            return;
        }

        // Species Clause: one of each. Checked before anything is fetched, and
        // against the slots already filled — a placeholder from a tap that is
        // still resolving counts, so a double tap cannot slip a second one in.
        // Kicking the index load here keeps form lookups warm for the save.
        ensureSpeciesIndex();
        if (wouldDuplicateSpecies(get().currentTeam, pokemon, getSpeciesIndex().baseIdOf)) {
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
        // Claimed before the first await, or a second click starts a second roll.
        set({ isRandomizing: true });
        try {
            // One per species, not one per id: the pool lists a Pokémon's regional
            // forms and Megas as entries of their own. Shuffling *before* the
            // dedupe is what lets a form win its species' slot at all.
            const { baseIdOf } = await ensureSpeciesIndex();
            const shuffled = (Array.isArray(pool) ? pool : []).filter((p) => p && p.id != null);
            for (let i = shuffled.length - 1; i > 0; i -= 1) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            const picks = dedupeBySpecies(shuffled, baseIdOf).unique.slice(0, count);
            if (picks.length === 0) {
                toast.warning(t('toast.teamRandomizeEmpty'));
                return;
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
                actions: [{ label: t('toast.openBuilder'), onClick: () => navigateTo('/builder') }],
            });
        } catch (_) {
            toast.error(t('toast.teamRandomizeError'), {
                actions: [{ label: t('toast.retry'), onClick: () => get().handleRandomizeTeam(pool, count) }],
            });
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

    handleUpdateTeamMember: (instanceId, newCustomization) => {
        set((state) => ({
            currentTeam: state.currentTeam.map(member =>
                member.instanceId === instanceId ? { ...member, customization: newCustomization } : member
            )
        }));
        get().recalculateAnalysis();
    },

    handleSaveTeam: async (savedTeams) => {
        if (pendingAdds.size) await Promise.allSettled([...pendingAdds]);
        const { currentTeam, teamName, editingTeamId } = get();
        const userId = useAuthStore.getState().userId;

        if (!db || !userId) {
            toast.error(t('toast.dbNotReady'), { description: t('toast.dbNotReadyDesc') });
            return;
        }
        if (currentTeam.length === 0) {
            toast.warning(t('toast.teamEmpty'), { description: t('toast.teamEmptyDesc') });
            return;
        }
        if (!teamName.trim()) {
            toast.warning(t('toast.teamNameRequired'));
            return;
        }

        if (savedTeams && savedTeams.some(team => team.name === teamName && team.id !== editingTeamId)) {
            toast.warning(t('toast.teamNameTaken'));
            return;
        }

        // Species Clause, enforced where a team becomes permanent. Adding already
        // refuses a repeat; this catches a team that was loaded with one (saved
        // before the rule existed) and is being saved again unfixed.
        const { baseIdOf } = await ensureSpeciesIndex();
        const duplicates = findDuplicateSpecies(currentTeam, baseIdOf);
        if (duplicates.length > 0) {
            toast.warning(t('toast.teamHasDuplicates'), {
                key: 'team-duplicates',
                description: t('toast.teamHasDuplicatesDesc', { names: duplicateNames(duplicates) }),
            });
            return;
        }

        const megaStones = await getMegaStones();
        const teamId = editingTeamId || doc(collection(db, `artifacts/${appId}/users/${userId}/teams`)).id;
        const existingTeam = savedTeams?.find(t => t.id === editingTeamId);
        const teamData = {
            name: teamName,
            pokemons: serializeTeam(currentTeam, megaStones, baseIdOf),
            isFavorite: existingTeam?.isFavorite || false,
            createdAt: existingTeam?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const retry = [{ label: t('toast.retry'), onClick: () => get().handleSaveTeam(savedTeams) }];
        try {
            // Offline the team is saved on this device the moment setDoc runs;
            // settleWrite says so instead of waiting on an ack that won't come.
            const outcome = await settleWrite(
                setDoc(doc(db, `artifacts/${appId}/users/${userId}/teams`, teamId), teamData),
                { onLateError: () => toast.error(t('toast.teamSaveError'), { actions: retry }) },
            );
            toast.success(t('toast.teamSaved', { name: teamName }), {
                description: outcome === 'queued'
                    ? t('toast.savedOnDevice')
                    : t('toast.teamSavedDesc', { count: currentTeam.length }),
                actions: [{ label: t('toast.viewTeams'), onClick: () => navigateTo('/teams') }],
            });
            useFirestoreTeamsStore.getState().setActiveTeamId(teamId);
            // Keep the roster on screen so the save doesn't feel like the team vanished.
            // Switch into edit mode for the just-saved team (button becomes "Update team").
            set({ editingTeamId: teamId });
        } catch (e) {
            toast.error(t('toast.teamSaveError'), { actions: retry });
        }
    },

    buildShowdownExportText: (teamMembers) => buildShowdownText(teamMembers, {
        includeTeraType: useThemeStore.getState().showTeraType,
        // Names a member by its exact form even when all it kept was an id.
        entryById: getSpeciesIndex().entryById,
    }),

    copyTextToClipboard: async (text, successMessage) => {
        try {
            await navigator.clipboard.writeText(text);
            if (successMessage) {
                toast.success(successMessage);
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
                    toast.success(successMessage);
                }
            } catch {
                toast.error(t('toast.teamCopyError'));
            }
        }
    },

    // Copy a team as a Showdown paste and open the teambuilder. One path for the
    // team in the builder and for any saved team, so both name their Pokémon the
    // same way.
    exportMembersToShowdown: async (teamMembers, teamName = '') => {
        const members = (Array.isArray(teamMembers) ? teamMembers : []).filter(Boolean);
        if (members.length === 0) {
            toast.warning(t('toast.teamEmpty'), { description: t('toast.teamEmptyDesc') });
            return;
        }
        // Only waits when the index has not loaded yet: the clipboard write has
        // to stay inside the click's activation window, and a saved member that
        // kept nothing but its id needs the index to be named correctly.
        if (!getSpeciesIndex().ready) await ensureSpeciesIndex();
        const exportText = get().buildShowdownExportText(members);

        // Show redirecting toast first
        const lang = useLanguageStore.getState().language;
        const teamNameText = teamName ? ` "${teamName}"` : '';
        const msg = lang === 'pt'
            ? `Time${teamNameText} copiado! Redirecionando para o Pokémon Showdown em 2 segundos...`
            : `Team${teamNameText} copied! Redirecting to Pokémon Showdown in 2 seconds...`;
        toast.success(msg);

        await get().copyTextToClipboard(exportText, null);

        // Redirect after a 2 second delay so user sees the toast on the page
        setTimeout(() => {
            window.open('https://play.pokemonshowdown.com/teambuilder', '_blank');
        }, 2000);
    },

    handleExportToShowdown: async () => {
        const { currentTeam, teamName, exportMembersToShowdown } = get();
        await exportMembersToShowdown(currentTeam, teamName);
    },

    /**
     * Load a team into the builder — the one entry point for every source.
     *
     * `mode: 'import'` (a tournament team, a share link, a forum post) makes a
     * new team out of someone else's: fresh instance ids, no `editingTeamId`, a
     * repeated species dropped and named. `mode: 'edit'` opens the user's own
     * saved team and keeps its identity so "Update team" overwrites it.
     *
     * Returns whether anything was loaded; navigation is the caller's.
     */
    importTeam: async (team, { mode = 'import' } = {}) => {
        const source = Array.isArray(team?.pokemons) ? team.pokemons.filter(Boolean) : [];
        if (source.length === 0) {
            toast.warning(t('toast.importEmpty'));
            return false;
        }

        const previous = {
            currentTeam: get().currentTeam,
            teamName: get().teamName,
            editingTeamId: get().editingTeamId,
        };

        let result;
        try {
            const { list, baseIdOf } = await ensureSpeciesIndex();
            result = await buildTeamMembers(
                team,
                { pokemonIndex: list, resolveDetail: resolvePokemonDetail, resolveDetailByName: resolvePokemonDetailByName },
                { mode },
            );
            if (result.members.length === 0) throw new Error('No Pokémon could be resolved');

            const name = team.name || t('toast.importedTeamName');
            set({
                currentTeam: result.members,
                teamName: name,
                editingTeamId: mode === 'edit' ? (team.id || null) : null,
            });
            get().recalculateAnalysis();

            if (mode === 'edit') {
                // A team saved before the Species Clause can still hold a repeat.
                // It opens as it is — hiding or trimming someone's own team would
                // be worse — and says what has to change before it can be saved.
                const duplicates = findDuplicateSpecies(result.members, baseIdOf);
                if (duplicates.length > 0) {
                    toast.warning(t('toast.teamHasDuplicates'), {
                        key: 'team-duplicates',
                        description: t('toast.teamHasDuplicatesDesc', { names: duplicateNames(duplicates) }),
                    });
                }
                return true;
            }

            const notes = [];
            if (result.dropped.length > 0) {
                notes.push(t('toast.teamImportDropped', { names: result.dropped.map((m) => m.name).join(', ') }));
            }
            if (result.unresolved.length > 0) {
                notes.push(t('toast.teamImportPartial', { names: result.unresolved.join(', ') }));
            }
            const hadTeam = previous.currentTeam.length > 0;
            toast.success(t('toast.teamImported', { name }), {
                key: 'team-imported',
                description: notes.join(' ') || undefined,
                // Importing replaces whatever was in the builder; if that was a
                // team, one tap puts it back.
                actions: hadTeam ? [{
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
                actions: [{ label: t('toast.retry'), onClick: () => get().importTeam(team, { mode }) }],
            });
            return false;
        }
    },

    // Write the public copy a share link points at. Separate from opening the
    // modal so a failed write can be retried without rebuilding the image.
    createShareLink: async () => {
        const { shareModal } = get();
        if (!shareModal.isOpen || shareModal.linkStatus === 'pending') return;
        const { requestId, source, defaultTitle } = shareModal;
        const settle = (patch) => set((state) => (
            // Closed, or reopened for another team, while this write was in flight.
            state.shareModal.isOpen && state.shareModal.requestId === requestId
                ? { shareModal: { ...state.shareModal, ...patch } }
                : {}
        ));

        settle({ linkStatus: 'pending' });
        try {
            if (!db || !useAuthStore.getState().isAuthReady) throw new Error('Firestore not ready');
            const [megaStones, { baseIdOf }] = await Promise.all([getMegaStones(), ensureSpeciesIndex()]);
            const teamId = doc(collection(db, `artifacts/${appId}/public/data/teams`)).id;
            await setDoc(doc(db, `artifacts/${appId}/public/data/teams`, teamId), {
                name: String(defaultTitle || 'Unnamed Team').slice(0, 100),
                pokemons: serializeTeam(source, megaStones, baseIdOf),
                createdAt: new Date().toISOString(),
            });
            const basePath = `${import.meta.env.BASE_URL || '/'}`.replace(/\/$/, '');
            const builderPath = `${basePath}/builder`.replace(/\/{2,}/g, '/');
            const shareUrl = new URL(builderPath, window.location.origin);
            shareUrl.searchParams.set('team', teamId);
            settle({ shareUrl: shareUrl.toString(), linkStatus: 'ready' });
        } catch (_) {
            // The image is drawn in the browser and needs none of this, so the
            // modal stays open: a failed link used to close it and take the
            // picture — which had worked — down with it.
            settle({ linkStatus: 'error' });
            toast.warning(t('toast.shareLinkError'), { key: 'share-link', description: t('toast.shareLinkErrorDesc') });
        }
    },

    shareTeamByData: async (teamMembers, providedName = 'Unnamed Team') => {
        const members = withUniqueInstanceIds((Array.isArray(teamMembers) ? teamMembers : []).filter(Boolean));
        if (members.length === 0) {
            toast.warning(t('toast.shareEmptyTeam'), { description: t('toast.teamEmptyDesc') });
            return;
        }

        const [megaStones, { baseIdOf }] = await Promise.all([getMegaStones(), ensureSpeciesIndex()]);

        // A shared team is a public one: the Species Clause applies.
        const duplicates = findDuplicateSpecies(members, baseIdOf);
        if (duplicates.length > 0) {
            toast.warning(t('toast.shareHasDuplicates'), {
                key: 'team-duplicates',
                description: t('toast.teamHasDuplicatesDesc', { names: duplicateNames(duplicates) }),
            });
            return;
        }

        const safeName = providedName || 'Unnamed Team';
        const snippetPokemons = members.map((member) => {
            const item = member?.customization?.item;
            const mega = (item && megaStones) ? megaStones[item] : null;
            const isMega = mega && mega.baseId === member.id;
            const name = isMega ? megaDisplayName(mega.form) : member.name;
            const spriteId = isMega ? mega.spriteId : member.id;

            return {
                ...member,
                id: member.id,
                name: name,
                types: (isMega && mega?.types) ? mega.types : (member.types || []),
                sprite: isMega 
                    ? getPokemonFrontSpriteUrl(spriteId, { shiny: member.customization?.isShiny || member.isShiny })
                    : (getTeamPokemonDisplaySprite(member) || ''),
                artworkSprite: getPokemonArtworkSpriteUrl(spriteId, { shiny: member.customization?.isShiny || member.isShiny }),
                customization: member.customization || {},
            };
        });

        shareRequestSeq += 1;
        set({
            shareModal: {
                isOpen: true,
                shareUrl: '',
                linkStatus: 'idle',
                requestId: shareRequestSeq,
                pokemons: snippetPokemons,
                // The members as the builder holds them — what the link and a
                // forum post store. `pokemons` above is dressed for the picture.
                source: members,
                defaultTitle: safeName,
            },
        });
        await get().createShareLink();
    },

    handleShareTeam: async () => {
        const { currentTeam, teamName, shareTeamByData } = get();
        await shareTeamByData(currentTeam, teamName || 'Unnamed Team');
    }
}));
