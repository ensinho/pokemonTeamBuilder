/**
 * Pure helpers for the team being edited in the builder: whether it differs
 * from what was last saved, and what to call it when the user never named it.
 */

// Key-order-independent serialisation: Firestore does not keep a map's key
// order, so a plain JSON.stringify of a reloaded team would differ from the
// one that was saved even when nothing changed.
const stable = (value) => {
    if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
    if (value && typeof value === 'object') {
        return `{${Object.keys(value).sort()
            .filter((k) => value[k] !== undefined)
            .map((k) => `${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;
    }
    return JSON.stringify(value ?? null);
};

/**
 * Identity of a team as the user would judge "did I change anything": its
 * name, and each member's species and build, in slot order.
 */
export const teamSignature = (name, members = []) => stable({
    name: String(name || '').trim(),
    members: (members || []).map((m) => ({ id: m?.id ?? null, build: m?.customization || {} })),
});

/** Identity of one member's build (item, moves, EVs…), key-order independent. */
export const buildSignature = (customization) => stable(customization || {});

/** "iron-valiant" → "Iron Valiant". */
export const prettyPokemonName = (name = '') => String(name)
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

/**
 * `base`, or `base 2`, `base 3`… — the first one not already taken
 * (case-insensitive, ignoring surrounding spaces).
 */
export const uniqueTeamName = (base, takenNames = []) => {
    const taken = new Set((takenNames || []).map((n) => String(n || '').trim().toLowerCase()));
    const trimmed = String(base || '').trim();
    if (!taken.has(trimmed.toLowerCase())) return trimmed;
    for (let i = 2; ; i += 1) {
        const candidate = `${trimmed} ${i}`;
        if (!taken.has(candidate.toLowerCase())) return candidate;
    }
};
