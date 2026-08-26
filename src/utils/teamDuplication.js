// Naming rules for duplicated teams.
//
// Saving a team rejects duplicate names (`handleSaveTeam` in useActiveTeamStore),
// so a copy has to arrive with a name that is already free — otherwise the user's
// first "Update team" on the copy would bounce off that guard.

// Longest name we will hand back. The builder's name field is free-form, so the
// suffix is what could push a long name past anything reasonable — trim the base,
// never the suffix, so the copy stays recognisable as a copy.
const MAX_NAME_LENGTH = 60;

const COPY_WORD = { en: 'copy', pt: 'cópia' };

// "Zapdos (copy 3)" -> "Zapdos". Copying a copy should not stack suffixes.
const stripCopySuffix = (name, copyWord) => {
    const pattern = new RegExp(`\\s*\\(${copyWord}(?:\\s+\\d+)?\\)$`, 'i');
    let stripped = name;
    let previous;
    do {
        previous = stripped;
        stripped = stripped.replace(pattern, '');
    } while (stripped !== previous);
    return stripped;
};

const withSuffix = (base, copyWord, index) => {
    const suffix = index <= 1 ? ` (${copyWord})` : ` (${copyWord} ${index})`;
    const room = MAX_NAME_LENGTH - suffix.length;
    return `${base.slice(0, Math.max(1, room)).trim()}${suffix}`;
};

/**
 * A free name for a copy of `baseName`, given the names already taken.
 * "Rain Team" -> "Rain Team (copy)" -> "Rain Team (copy 2)" -> …
 * Comparison is case-insensitive because the save guard the user hits next is
 * exact-match: a differing-case collision would still read as a duplicate to them.
 */
export function buildDuplicateTeamName(baseName, existingNames = [], language = 'en') {
    const copyWord = COPY_WORD[language] || COPY_WORD.en;
    const taken = new Set(
        Array.from(existingNames)
            .filter((name) => typeof name === 'string')
            .map((name) => name.trim().toLowerCase()),
    );

    const trimmed = (baseName || '').trim();
    const base = stripCopySuffix(trimmed, copyWord).trim() || (language === 'pt' ? 'Time' : 'Team');

    for (let index = 1; index <= taken.size + 1; index += 1) {
        const candidate = withSuffix(base, copyWord, index);
        if (!taken.has(candidate.toLowerCase())) return candidate;
    }

    // Unreachable: the loop runs one more time than there are taken names.
    return withSuffix(base, copyWord, taken.size + 2);
}

/**
 * The Firestore payload for a copy. Deliberately field-by-field rather than a
 * spread of the source doc: `id` is the document key (never a field), and the
 * copy starts unpinned with its own timestamps so it sorts to the top of the
 * `updatedAt desc` list the user is looking at.
 */
export function buildDuplicateTeamPayload(team, name, now = new Date().toISOString()) {
    return {
        name,
        pokemons: Array.isArray(team?.pokemons) ? team.pokemons : [],
        isFavorite: false,
        createdAt: now,
        updatedAt: now,
    };
}
