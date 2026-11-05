import { useShallow } from 'zustand/react/shallow';
import { useActiveTeamStore } from '../store/useActiveTeamStore';

// Exactly these fields, compared shallowly: a bare useActiveTeamStore()
// re-rendered every holder (the whole AppLayout) on any store change —
// isSaving, nameError, isSharingLink — that none of them reads from here.
const selectActiveTeam = (store) => ({
        currentTeam: store.currentTeam,
        teamName: store.teamName,
        editingTeamId: store.editingTeamId,
        teamAnalysis: store.teamAnalysis,
        suggestedPokemonIds: store.suggestedPokemonIds,
        editingTeamMember: store.editingTeamMember,
        shareModal: store.shareModal,
        isRandomizing: store.isRandomizing,

        setTeamName: store.setTeamName,
        setEditingTeamId: store.setEditingTeamId,
        setEditingTeamMember: store.setEditingTeamMember,
        closeShareModal: store.closeShareModal,
        setCurrentTeam: store.setCurrentTeam,
        recalculateAnalysis: store.recalculateAnalysis,
        handleAddPokemon: store.handleAddPokemon,
        handleRandomizeTeam: store.handleRandomizeTeam,
        handleRemoveFromTeam: store.handleRemoveFromTeam,
        handleReorderTeam: store.handleReorderTeam,
        handleClearTeam: store.handleClearTeam,
        handleUpdateTeamMember: store.handleUpdateTeamMember,
        handleSaveTeam: store.handleSaveTeam,
        handleExportToShowdown: store.handleExportToShowdown,
        copyTextToClipboard: store.copyTextToClipboard,
        buildShowdownExportText: store.buildShowdownExportText,
        shareTeamByData: store.shareTeamByData,
        handleShareTeam: store.handleShareTeam,
        importTeam: store.importTeam,
});

export function useActiveTeam() {
    return useActiveTeamStore(useShallow(selectActiveTeam));
}
