// Game-version metadata shared by every Pokédex detail surface (desktop panel,
// mobile screen). Lived inside PokemonDetailPanel until the mobile screen
// needed the same labels — two copies of a colour table is how a "Gen IX" chip
// ends up two different reds on two screens of the same app.

export const VERSION_CONFIG = {
    red: { label: 'Red', color: '#ef4444' }, blue: { label: 'Blue', color: '#3b82f6' }, yellow: { label: 'Yellow', color: '#eab308' },
    gold: { label: 'Gold', color: '#d97706' }, silver: { label: 'Silver', color: '#9ca3af' }, crystal: { label: 'Crystal', color: '#22d3ee' },
    ruby: { label: 'Ruby', color: '#b91c1c' }, sapphire: { label: 'Sapphire', color: '#1d4ed8' }, emerald: { label: 'Emerald', color: '#059669' },
    firered: { label: 'FireRed', color: '#ea580c' }, leafgreen: { label: 'LeafGreen', color: '#16a34a' },
    diamond: { label: 'Diamond', color: '#60a5fa' }, pearl: { label: 'Pearl', color: '#f472b6' }, platinum: { label: 'Platinum', color: '#9ca3af' },
    heartgold: { label: 'HeartGold', color: '#d97706' }, soulsilver: { label: 'SoulSilver', color: '#9ca3af' },
    black: { label: 'Black', color: '#1f2937' }, white: { label: 'White', color: '#7f8c8d' },
    'black-2': { label: 'Black 2', color: '#111827' }, 'white-2': { label: 'White 2', color: '#bdc3c7' },
    x: { label: 'X', color: '#2563eb' }, y: { label: 'Y', color: '#dc2626' },
    'omega-ruby': { label: 'Omega Ruby', color: '#b91c1c' }, 'alpha-sapphire': { label: 'Alpha Sapphire', color: '#1d4ed8' },
    sun: { label: 'Sun', color: '#f97316' }, moon: { label: 'Moon', color: '#6366f1' },
    'ultra-sun': { label: 'Ultra Sun', color: '#ea580c' }, 'ultra-moon': { label: 'Ultra Moon', color: '#4f46e5' },
    'lets-go-pikachu': { label: "Let's Go Pikachu", color: '#eab308' }, 'lets-go-eevee': { label: "Let's Go Eevee", color: '#b45309' },
    sword: { label: 'Sword', color: '#06b6d4' }, shield: { label: 'Shield', color: '#db2777' },
    'brilliant-diamond': { label: 'Brilliant Diamond', color: '#60a5fa' }, 'shining-pearl': { label: 'Shining Pearl', color: '#f472b6' },
    'legends-arceus': { label: 'Legends: Arceus', color: '#1e3a8a' }, scarlet: { label: 'Scarlet', color: '#be123c' }, violet: { label: 'Violet', color: '#6d28d9' },
};

export const VERSION_GROUPS = [
    { id: 'red-blue-yellow', name: 'Gen I (Red / Blue / Yellow)', versions: ['red', 'blue', 'yellow'] },
    { id: 'gold-silver-crystal', name: 'Gen II (Gold / Silver / Crystal)', versions: ['gold', 'silver', 'crystal'] },
    { id: 'ruby-sapphire-emerald', name: 'Gen III (Ruby / Sapphire / Emerald)', versions: ['ruby', 'sapphire', 'emerald'] },
    { id: 'firered-leafgreen', name: 'Gen III (FireRed / LeafGreen)', versions: ['firered', 'leafgreen'] },
    { id: 'diamond-pearl-platinum', name: 'Gen IV (Diamond / Pearl / Platinum)', versions: ['diamond', 'pearl', 'platinum'] },
    { id: 'heartgold-soulsilver', name: 'Gen IV (HeartGold / SoulSilver)', versions: ['heartgold', 'soulsilver'] },
    { id: 'black-white', name: 'Gen V (Black / White / Black 2 / White 2)', versions: ['black', 'white', 'black-2', 'white-2'] },
    { id: 'x-y', name: 'Gen VI (X / Y)', versions: ['x', 'y'] },
    { id: 'omega-ruby-alpha-sapphire', name: 'Gen VI (Omega Ruby / Alpha Sapphire)', versions: ['omega-ruby', 'alpha-sapphire'] },
    { id: 'sun-moon-ultra-sun-ultra-moon', name: 'Gen VII (Sun / Moon / Ultra Sun / Ultra Moon)', versions: ['sun', 'moon', 'ultra-sun', 'ultra-moon'] },
    { id: 'lets-go', name: "Gen VII (Let's Go Pikachu / Eevee)", versions: ['lets-go-pikachu', 'lets-go-eevee'] },
    { id: 'sword-shield', name: 'Gen VIII (Sword / Shield)', versions: ['sword', 'shield'] },
    { id: 'brilliant-diamond-shining-pearl', name: 'Gen VIII (Brilliant Diamond / Shining Pearl)', versions: ['brilliant-diamond', 'shining-pearl'] },
    { id: 'legends-arceus', name: 'Gen VIII (Legends: Arceus)', versions: ['legends-arceus'] },
    { id: 'scarlet-violet', name: 'Gen IX (Scarlet / Violet)', versions: ['scarlet', 'violet'] },
];

export const formatLocationName = (name) => {
    if (!name) return '';
    return name.replace(/-area$/i, '').split('-').map((word) => {
        const lower = word.toLowerCase();
        if (/^b?\d+f$/.test(lower)) return lower.toUpperCase();
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
};

// "tm05" → "5" (the TM column already says TM), "hm03" → "HM03".
export const formatTmName = (tmName) => {
    if (!tmName) return '—';
    const match = tmName.match(/^(tm|hm|tr)(\d+)$/i);
    if (match) {
        const [, type, num] = match;
        if (type.toLowerCase() === 'tm') return num;
        return `${type.toUpperCase()}${num}`;
    }
    return tmName.toUpperCase();
};

export const formatVersionLabel = (versionName) => (
    VERSION_CONFIG[versionName]?.label
    || String(versionName || '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
);
