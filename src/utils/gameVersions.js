// Human labels for PokéAPI version-group and generation slugs, used by the
// ability/move detail pages to render Bulbapedia-style game-description tables.

const VERSION_GROUP_LABELS = {
    'red-blue': 'Red / Blue',
    'yellow': 'Yellow',
    'gold-silver': 'Gold / Silver',
    'crystal': 'Crystal',
    'ruby-sapphire': 'Ruby / Sapphire',
    'emerald': 'Emerald',
    'firered-leafgreen': 'FireRed / LeafGreen',
    'colosseum': 'Colosseum',
    'xd': 'XD: Gale of Darkness',
    'diamond-pearl': 'Diamond / Pearl',
    'platinum': 'Platinum',
    'heartgold-soulsilver': 'HeartGold / SoulSilver',
    'black-white': 'Black / White',
    'black-2-white-2': 'Black 2 / White 2',
    'x-y': 'X / Y',
    'omega-ruby-alpha-sapphire': 'Omega Ruby / Alpha Sapphire',
    'sun-moon': 'Sun / Moon',
    'ultra-sun-ultra-moon': 'Ultra Sun / Ultra Moon',
    'lets-go-pikachu-lets-go-eevee': "Let's Go, Pikachu! / Eevee!",
    'sword-shield': 'Sword / Shield',
    'the-isle-of-armor': 'The Isle of Armor',
    'the-crown-tundra': 'The Crown Tundra',
    'brilliant-diamond-and-shining-pearl': 'Brilliant Diamond / Shining Pearl',
    'legends-arceus': 'Legends: Arceus',
    'scarlet-violet': 'Scarlet / Violet',
    'the-teal-mask': 'The Teal Mask',
    'the-indigo-disk': 'The Indigo Disk',
};

const titleCase = (slug = '') =>
    String(slug)
        .split('-')
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

export const formatVersionGroup = (slug) => VERSION_GROUP_LABELS[slug] || titleCase(slug);

// 'generation-iii' → 'III'
export const generationNumeral = (slug) =>
    String(slug || '').replace(/^generation-/, '').toUpperCase();
