// Display helpers shared by the Meta / usage / tournament views. Plain
// functions, apart from the components in views/metaShared.jsx, so that file
// exports components only (fast refresh).

// Pretty-print a Showdown/slug name for display.
export const pretty = (s = '') => String(s).replace(/-/g, ' ');

// Percentage of a count over a total, clamped to a whole number 0–100.
export const pctOf = (count, total) => (total > 0 ? Math.round((count / total) * 100) : 0);

// Format a compact usage EV spread ({hp,atk,def,spa,spd,spe}) → "4 HP / 252 Atk / 252 Spe".
const EV_SHORT = { hp: 'HP', atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe' };
const EV_KEYS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
export const formatUsageSpread = (evs = {}) =>
    EV_KEYS.filter((k) => (evs[k] || 0) > 0).map((k) => `${evs[k]} ${EV_SHORT[k]}`).join(' / ');
