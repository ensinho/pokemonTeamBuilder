import { buildBattleTeamText } from './battle';
import { competitivePresetFor } from './loadCompetitivePreset';

/**
 * Saved teams, checked for the Champion Challenge on the client — the server
 * checks again (`api/_lib/challenge/validateTeam.js`) and has the last word.
 */

/** `{text, errors: [{reason, name?}], missing: [names without moves]}` */
export const teamCheck = (members) => {
    if (!members.length) return { text: '', errors: [{ reason: 'empty' }], missing: [] };
    if (members.length > 6) return { text: '', errors: [{ reason: 'tooMany' }], missing: [] };
    const { text, errors } = buildBattleTeamText(members);
    return { text, errors, missing: errors.filter((e) => e.reason === 'noMoves').map((e) => e.name) };
};

/**
 * A member without moves borrows the most-used competitive build (moves, and
 * item/ability/nature/EVs where its own are empty) — for one battle only; the
 * saved team is never written.
 */
export const completeMember = async (member) => {
    if ((member.customization?.moves || []).filter(Boolean).length) return member;
    const preset = await competitivePresetFor(member.id).catch(() => null);
    if (!preset?.moves?.length) return member;
    const current = member.customization || {};
    return {
        ...member,
        customization: {
            ...current,
            moves: preset.moves,
            item: current.item || preset.item || '',
            ability: current.ability || preset.ability,
            nature: current.nature || preset.nature,
            evs: current.evs && Object.values(current.evs).some(Boolean) ? current.evs : (preset.evs || current.evs),
        },
    };
};
