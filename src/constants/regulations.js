// Competitive regulation ids come from public/data/usage-index.json. This is the
// one id that isn't a real format: it means "no regulation — playthrough mode",
// which turns the builder's meta layer off (suggestions, meta cores, threats).
//
// Distinct from `null`, which means "no explicit choice, use the default
// regulation" — the state a first-time user is in.
export const NO_REGULATION = 'none';

export const isPlaythroughMode = (regulationId) => regulationId === NO_REGULATION;
