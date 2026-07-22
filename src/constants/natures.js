// Nature → stat effect (the raised / lowered stat), so selectors can show what a
// nature actually does. Neutral natures have no effect. Keyed by lowercase slug
// (matching natures.json). Short stat labels match the app's EV/stat shorthand.

const NATURE_EFFECTS = {
    hardy: null, docile: null, bashful: null, quirky: null, serious: null,
    lonely: { up: 'Atk', down: 'Def' },
    brave: { up: 'Atk', down: 'Spe' },
    adamant: { up: 'Atk', down: 'SpA' },
    naughty: { up: 'Atk', down: 'SpD' },
    bold: { up: 'Def', down: 'Atk' },
    relaxed: { up: 'Def', down: 'Spe' },
    impish: { up: 'Def', down: 'SpA' },
    lax: { up: 'Def', down: 'SpD' },
    timid: { up: 'Spe', down: 'Atk' },
    hasty: { up: 'Spe', down: 'Def' },
    jolly: { up: 'Spe', down: 'SpA' },
    naive: { up: 'Spe', down: 'SpD' },
    modest: { up: 'SpA', down: 'Atk' },
    mild: { up: 'SpA', down: 'Def' },
    quiet: { up: 'SpA', down: 'Spe' },
    rash: { up: 'SpA', down: 'SpD' },
    calm: { up: 'SpD', down: 'Atk' },
    gentle: { up: 'SpD', down: 'Def' },
    sassy: { up: 'SpD', down: 'Spe' },
    careful: { up: 'SpD', down: 'SpA' },
};

export const natureEffect = (name = '') => NATURE_EFFECTS[name.toLowerCase()] || null;

export const ALL_NATURES = Object.keys(NATURE_EFFECTS).map((name) => ({
    name,
    url: `https://pokeapi.co/api/v2/nature/${name}/`
}));

// "Adamant (+Atk / −SpA)" or "Hardy (neutral)".
export const natureLabel = (name = '') => {
    const pretty = name.charAt(0).toUpperCase() + name.slice(1);
    const eff = natureEffect(name);
    return eff ? `${pretty} (+${eff.up} / −${eff.down})` : `${pretty} (—)`;
};

