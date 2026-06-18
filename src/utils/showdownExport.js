/**
 * Pure Pokémon Showdown export formatting.
 *
 * Extracted from `useActiveTeamStore` so the format logic is testable in
 * isolation and reusable. No store/Firebase access — given team members in,
 * a Showdown paste string out.
 */

export const formatShowdownCase = (str = '') =>
    str.split('-').filter(Boolean).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

export const getDefaultCustomization = (pokemonData = {}) => ({
    item: '',
    nature: 'serious',
    teraType: pokemonData.types?.[0] || 'normal',
    isShiny: false,
    ability: pokemonData.abilities?.[0]?.name || 'unknown',
    moves: [],
    evs: { hp: 0, attack: 0, defense: 0, 'special-attack': 0, 'special-defense': 0, speed: 0 },
    ivs: { hp: 31, attack: 31, defense: 31, 'special-attack': 31, 'special-defense': 31, speed: 31 },
});

const STAT_MAP = { hp: 'HP', attack: 'Atk', defense: 'Def', 'special-attack': 'SpA', 'special-defense': 'SpD', speed: 'Spe' };

/**
 * Build a Pokémon Showdown paste from a list of team members.
 * @param {Array} teamMembers - members with optional `customization`
 * @returns {string} Showdown-formatted export text
 */
export const buildShowdownExportText = (teamMembers = []) => {
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
            .map(([key, val]) => `${val} ${STAT_MAP[key]}`)
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
};
