/**
 * The builder's unsaved work, kept across a reload.
 *
 * A team built but not yet saved used to live only in memory: a reload, a
 * crashed tab or a phone evicting the page threw it away. The store mirrors
 * the draft here (debounced) and restores it on boot.
 *
 * Only what the builder cannot rebuild is stored — each member's identity and
 * build, not its detail record (moves list, stats, abilities: tens of KB per
 * Pokémon). The store puts the light members on screen at once and layers the
 * detail records on as they resolve, the way an add does.
 */
import { teamSignature } from './teamDraft';
import { stripUndefined, withUniqueInstanceIds } from './teamSerialization';

export const BUILDER_DRAFT_KEY = 'ptbBuilderDraft';
const DRAFT_VERSION = 1;

/** True when the builder holds work that no saved team has: a team never
 *  saved, or a loaded one changed since. */
export const hasUnsavedDraft = (state) => {
    const members = state?.currentTeam || [];
    if (members.length === 0) return false;
    if (!state.editingTeamId) return true;
    return teamSignature(state.teamName, members) !== state.savedSignature;
};

const lightMember = (member) => stripUndefined({
    id: member?.id,
    name: member?.name,
    types: Array.isArray(member?.types) ? member.types : undefined,
    instanceId: member?.instanceId,
    speciesId: member?.speciesId,
    showdownName: member?.showdownName,
    apiName: member?.apiName,
    customization: member?.customization || {},
});

/** The stored form of the draft, or null when there is nothing worth keeping. */
export const encodeDraft = (state, ownerUid = null) => {
    if (!hasUnsavedDraft(state)) return null;
    return {
        v: DRAFT_VERSION,
        owner: ownerUid || null,
        savedAt: Date.now(),
        teamName: String(state.teamName || ''),
        editingTeamId: state.editingTeamId || null,
        savedSignature: state.savedSignature || null,
        members: state.currentTeam.map(lightMember).filter((m) => m.id != null),
    };
};

/**
 * The builder state a stored draft restores, or null when it is unusable or
 * belongs to another account. A draft with no owner, or a boot that does not
 * know its account yet, is accepted (the store re-checks once auth answers).
 */
export const decodeDraft = (raw, currentUid = null) => {
    let draft = raw;
    if (typeof raw === 'string') {
        try { draft = JSON.parse(raw); } catch (_) { return null; }
    }
    if (!draft || draft.v !== DRAFT_VERSION || !Array.isArray(draft.members)) return null;
    if (draft.owner && currentUid && draft.owner !== currentUid) return null;
    const members = withUniqueInstanceIds(draft.members.filter((m) => m && m.id != null));
    if (members.length === 0) return null;
    return {
        owner: draft.owner || null,
        currentTeam: members,
        teamName: typeof draft.teamName === 'string' ? draft.teamName : '',
        editingTeamId: draft.editingTeamId || null,
        savedSignature: draft.editingTeamId ? (draft.savedSignature || null) : null,
    };
};

/** A restored light member with its detail record layered under it: the
 *  member's own identity and build win, the record fills in the rest. */
export const withResolvedDetail = (member, detail) => (detail
    ? { ...detail, ...member, customization: member.customization }
    : member);
