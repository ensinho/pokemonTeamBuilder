import { useActiveTeamStore } from '../store/useActiveTeamStore';

export function useActiveTeam() {
    const store = useActiveTeamStore();
    return {
        currentTeam: store.currentTeam,
        teamName: store.teamName,
        editingTeamId: store.editingTeamId,
        teamAnalysis: store.teamAnalysis,
        suggestedPokemonIds: store.suggestedPokemonIds,
        editingTeamMember: store.editingTeamMember,
        shareModal: store.shareModal,

        setTeamName: store.setTeamName,
        setEditingTeamId: store.setEditingTeamId,
        setEditingTeamMember: store.setEditingTeamMember,
        closeShareModal: store.closeShareModal,
        setCurrentTeam: store.setCurrentTeam,
        recalculateAnalysis: store.recalculateAnalysis,
        handleAddPokemon: store.handleAddPokemon,
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
    };
}
