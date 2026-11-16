/**
 * The tier list's themes (split from tierList.js on 2026-11-15 so the Home
 * and the Jogos page can name the theme of the day without loading the
 * board's rules). `ids` fill a tier board's pool; `cells` name a chart's
 * cells, each with the rule its Pokémon must meet. `art` is the National Dex
 * id the theme's card shows. Node-safe; tierList.js re-exports everything.
 */

import { TYPE_IDS } from './typeMatchups.js';

const GENERATIONS = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix'];

/**
 * The starting themes. `ids` fill a tier board's pool; `cells` name a
 * chart's cells, each with the rule its Pokémon must meet. `art` is the
 * National Dex id the template's card shows.
 */
export const TIER_TEMPLATES = [
    {
        id: 'starters',
        kind: 'tier',
        art: 7,
        ids: [1, 4, 7, 152, 155, 158, 252, 255, 258, 387, 390, 393, 495, 498, 501, 650, 653, 656, 722, 725, 728, 810, 813, 816, 906, 909, 912],
    },
    {
        id: 'types',
        kind: 'chart',
        art: 133,
        cells: TYPE_IDS.map((type) => ({ key: type, rule: { type } })),
    },
    {
        id: 'legendaries',
        kind: 'tier',
        art: 384,
        ids: [150, 249, 250, 382, 383, 384, 483, 484, 487, 643, 644, 646, 716, 717, 718, 791, 792, 800, 888, 889, 890, 1007, 1008, 1024],
    },
    {
        id: 'generations',
        kind: 'chart',
        art: 25,
        cells: GENERATIONS.map((gen, index) => ({ key: `gen${index + 1}`, rule: { generation: `generation-${gen}` } })),
    },
    {
        id: 'pseudo',
        kind: 'tier',
        art: 445,
        ids: [149, 248, 373, 376, 445, 635, 706, 784, 887, 998],
    },
    {
        id: 'eevee',
        kind: 'tier',
        art: 133,
        ids: [133, 134, 135, 136, 196, 197, 470, 471, 700],
    },
    {
        id: 'mythicals',
        kind: 'tier',
        art: 151,
        ids: [151, 251, 385, 386, 489, 490, 491, 492, 493, 494, 647, 648, 649, 719, 720, 721, 801, 802, 807, 808, 809, 893, 1025],
    },
    {
        id: 'pikaclones',
        kind: 'tier',
        art: 25,
        ids: [25, 311, 312, 417, 587, 702, 777, 877, 921],
    },
    // Five more themes (2026-11-15, the games pass): with a theme of the day
    // (`dailyTierTemplate`) eight came round again within the week.
    {
        id: 'finals',
        kind: 'tier',
        art: 6,
        ids: [3, 6, 9, 154, 157, 160, 254, 257, 260, 389, 392, 395, 497, 500, 503, 652, 655, 658, 724, 727, 730, 812, 815, 818, 908, 911, 914],
    },
    {
        id: 'fossils',
        kind: 'tier',
        art: 142,
        ids: [139, 141, 142, 346, 348, 409, 411, 565, 567, 697, 699, 880, 881, 882, 883],
    },
    {
        id: 'ultrabeasts',
        kind: 'tier',
        art: 798,
        ids: [793, 794, 795, 796, 797, 798, 799, 803, 804, 805, 806],
    },
    {
        id: 'paradox',
        kind: 'tier',
        art: 1005,
        ids: [984, 985, 986, 987, 988, 989, 990, 991, 992, 993, 994, 995, 1005, 1006, 1009, 1010, 1020, 1021, 1022, 1023],
    },
    {
        id: 'babies',
        kind: 'tier',
        art: 175,
        ids: [172, 173, 174, 175, 236, 238, 239, 240, 298, 360, 406, 433, 438, 439, 440, 446, 447, 458, 848],
    },
    {
        id: 'free',
        kind: 'tier',
        art: 132,
        ids: [],
    },
];

export const TEMPLATES_BY_ID = Object.fromEntries(TIER_TEMPLATES.map((template) => [template.id, template]));
export const DEFAULT_TEMPLATE_ID = TIER_TEMPLATES[0].id;

/** The themes a day can draw: every one that comes with its own Pokémon or cells. */
export const DAILY_TIER_TEMPLATES = TIER_TEMPLATES.filter((template) => template.id !== 'free');

/**
 * The tier list of the day (2026-11-15): one theme per calendar day, the
 * same for everyone (`gamesToday.js` `localDayNumber`), walking the themed
 * templates with a stride so a chart does not follow a chart. A reason to
 * come back, and the Diário do dia fills with lists of one subject.
 */
export function dailyTierTemplate(dayNumber) {
    const day = Math.abs(Math.trunc(Number(dayNumber) || 0));
    const count = DAILY_TIER_TEMPLATES.length;
    let stride = 5 % count || 1;
    const gcd = (a, b) => (b ? gcd(b, a % b) : a);
    while (gcd(stride, count) !== 1) stride += 1;
    return DAILY_TIER_TEMPLATES[(day * stride) % count];
}
