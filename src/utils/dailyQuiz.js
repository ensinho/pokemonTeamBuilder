/**
 * The quiz of the day (2026-11-15, the games pass): one category a day, the
 * same for everyone on that calendar day, and the same Pokémon drawn from it
 * — so two trainers who post "8 de 10" in the Diário played the same ten.
 * Pure: a day number in (`gamesToday.js` `localDayNumber`), the category and
 * its names out. The run itself is the category quiz's own
 * (`useCategoryGuesserStore`), started with these names and stamped with
 * the day (`dailyDay`).
 *
 * Imports the whole category table, so only the quiz and the Jogos page load
 * it — never the Home.
 */

import { CATEGORY_LISTS } from '../data/categoryListsData.js';

/** How many Pokémon the day's quiz asks for: a couple of minutes, not a marathon. */
export const DAILY_QUIZ_SIZE = 10;

/** A category needs at least this many names to be a day's quiz. */
const MIN_NAMES = 6;

/** A stride through the eligible categories, so neighbours in the table are not neighbours in the week. */
const STRIDE = 29;

/** mulberry32: a small seeded generator, the same sequence on every device. */
function seeded(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const gcd = (a, b) => (b ? gcd(b, a % b) : a);

/** The categories a day can draw: enough names to be a game. */
export const dailyQuizPool = (lists = CATEGORY_LISTS) => lists.filter((list) => (list.pokemonNames || []).length >= MIN_NAMES);

/**
 * The day's quiz: `{ list, listId, names }`, or null with no categories.
 * `names` are at most `DAILY_QUIZ_SIZE`, drawn with the day as the seed and
 * kept in the table's own order.
 */
export function dailyQuizFor(dayNumber, lists = CATEGORY_LISTS) {
    const pool = dailyQuizPool(lists);
    if (!pool.length) return null;
    const day = Math.abs(Math.trunc(Number(dayNumber) || 0));
    // The stride must not share a factor with the pool's size, or days repeat early.
    let stride = STRIDE % pool.length || 1;
    while (gcd(stride, pool.length) !== 1) stride += 1;
    const list = pool[(day * stride) % pool.length];
    const all = [...new Set(list.pokemonNames)];
    if (all.length <= DAILY_QUIZ_SIZE) return { list, listId: list.id, names: all };
    const random = seeded(day * 2654435761 + all.length);
    const picked = all
        .map((name, index) => ({ name, index, roll: random() }))
        .sort((a, b) => a.roll - b.roll)
        .slice(0, DAILY_QUIZ_SIZE)
        .sort((a, b) => a.index - b.index)
        .map((entry) => entry.name);
    return { list, listId: list.id, names: picked };
}

/** A category by id, or null — for a quiz someone shared (`?list=`). */
export const quizListById = (id, lists = CATEGORY_LISTS) => lists.find((list) => list.id === id) || null;
