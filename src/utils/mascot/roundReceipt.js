/**
 * The mascot's round (2026-11-17, "Fantasminha de plantão" — Enzo: "EU AMEI").
 * While the trainer is away the day turns over; the next time they come back
 * he has "done the round" — compared what the device saw last time with what
 * is there now — and hands over a receipt (the dusk bot's routine receipt,
 * in this app's material). At the end of a day of four games he prints the
 * day's receipt, stamped in gold.
 *
 * Pure: a record and today's facts in, rows out. The record lives on the
 * device (`ptb:mascot:round`, a trainer key — `leaveSession` wipes it) and is
 * written by `hooks/useRound.js`. Nothing new is stored on a server.
 *
 * Rules (docs/modules/mascot.md, "O plantão"):
 * - a receipt is offered once a day, and only when there was a day before it
 *   (a brand-new trainer gets a baseline, not a receipt);
 * - rows are facts the app already holds — the day's four games, a friend
 *   who passed the trainer on a Champion board (the Pokégear's own entry),
 *   the streak, the trainer's team in the meta when a new month of usage
 *   lands; never a guess, never a guilt line;
 * - a row is a figure or an id, never text someone typed.
 */

import { DAILY_GAMES } from '../gamesToday.js';
import { hashSeed } from '../trainerCardPattern.js';

export const ROUND_KEY = 'ptb:mascot:round';
/** How many friends who passed the trainer one receipt names. */
export const MAX_PASSED = 2;
/** How many of the team's Pokémon one receipt follows in the meta. */
export const MAX_META = 2;

const isDay = (value) => typeof value === 'string' && /^\d{4}-\d{1,2}-\d{1,2}$/.test(value);
const isMonth = (value) => typeof value === 'string' && /^\d{4}-\d{2}$/.test(value);
const count = (value, max = 100000) => (Number.isInteger(value) && value >= 0 ? Math.min(value, max) : 0);

/** Species → usage rank, kept small (the team's six) and clean. */
const cleanRanks = (raw) => {
    if (!raw || typeof raw !== 'object') return {};
    return Object.fromEntries(Object.entries(raw)
        .filter(([key, rank]) => /^[a-z0-9-]{1,40}$/.test(key) && Number.isInteger(rank) && rank > 0 && rank < 10000)
        .slice(0, 12));
};

/**
 * The record, whatever was stored.
 * - `last`     what the device saw when the round was last taken (or first seen):
 *              `{ day, at, metaMonth, ranks }`
 * - `seenDay`  the day the morning receipt was opened
 * - `fullDays` days of four games, ever (no streak: a gap never takes any away)
 * - `lastFullDay` the last of them, so a day counts once
 * - `daySeen`  the day the day's receipt was opened
 */
export function normalizeRound(raw) {
    const v = raw && typeof raw === 'object' ? raw : {};
    const last = v.last && typeof v.last === 'object' && isDay(v.last.day)
        ? {
            day: v.last.day,
            at: Number.isFinite(v.last.at) ? v.last.at : 0,
            metaMonth: isMonth(v.last.metaMonth) ? v.last.metaMonth : null,
            ranks: cleanRanks(v.last.ranks),
        }
        : null;
    return {
        v: 1,
        last,
        seenDay: isDay(v.seenDay) ? v.seenDay : null,
        fullDays: count(v.fullDays),
        lastFullDay: isDay(v.lastFullDay) ? v.lastFullDay : null,
        daySeen: isDay(v.daySeen) ? v.daySeen : null,
    };
}

/** A trainer seen for the first time today: a baseline to compare with tomorrow. */
export function withBaseline(round, { dayKey, at }) {
    if (round.last) return round;
    return { ...round, last: { day: dayKey, at, metaMonth: null, ranks: {} } };
}

/** True when there is a morning receipt to hand over today. */
export const receiptReady = (round, dayKey) => Boolean(round?.last && round.last.day !== dayKey && round.seenDay !== dayKey);

/**
 * The morning receipt's rows.
 *
 * @param {object} round  the record (normalizeRound)
 * @param {object} today
 * @param {{ done: boolean }} today.challenge         the Champion of the day
 * @param {{ n: number, done: boolean }} today.puzzle the PokéPuzzle's number
 * @param {{ list: string, done: boolean }} today.quiz the day's category id
 * @param {{ theme: string, done: boolean }} today.tier the day's theme id
 * @param {Array<{ name: string, at: string }>} today.passed  Pokégear "passed you" entries
 * @param {number} today.streak
 * @param {string|null} today.metaMonth  the usage month on the site now
 * @param {object} today.ranks           team species → rank this month
 * @param {object} today.names           team species → display name
 * @returns {{ rows: object[], news: number, checked: number }}
 */
export function roundReceipt(round, today = {}) {
    const since = round?.last?.at || 0;
    const rows = [];
    const game = (id, done, params, fresh) => rows.push({
        id, params, value: done ? 'played' : fresh, news: !done,
    });
    game('challenge', Boolean(today.challenge?.done), {}, 'newTeam');
    if (today.puzzle) game('puzzle', Boolean(today.puzzle.done), { n: count(today.puzzle.n, 99999) }, 'open');
    if (today.quiz?.list) game('quiz', Boolean(today.quiz.done), { list: today.quiz.list }, 'open');
    if (today.tier?.theme) game('tier', Boolean(today.tier.done), { theme: today.tier.theme }, 'open');

    // A friend who passed the trainer on a board since the last round (newest first, once each).
    const seen = new Set();
    (today.passed || [])
        .filter((entry) => entry?.name && Date.parse(entry.at || '') > since)
        .sort((a, b) => String(b.at).localeCompare(String(a.at)))
        .forEach((entry) => {
            const name = String(entry.name).slice(0, 24);
            if (seen.has(name) || seen.size >= MAX_PASSED) return;
            seen.add(name);
            rows.push({ id: 'passed', params: { name }, value: 'passed', bold: true, news: true });
        });

    if (count(today.streak) >= 2) rows.push({ id: 'streak', params: { n: count(today.streak) }, value: 'streak', news: false });

    // The team in the meta: only when a new month of usage landed since last time.
    const before = round?.last;
    if (today.metaMonth && before?.metaMonth && today.metaMonth !== before.metaMonth) {
        Object.entries(cleanRanks(today.ranks))
            .filter(([key, rank]) => before.ranks[key] && before.ranks[key] !== rank)
            .sort((a, b) => Math.abs(before.ranks[b[0]] - b[1]) - Math.abs(before.ranks[a[0]] - a[1]))
            .slice(0, MAX_META)
            .forEach(([key, rank]) => rows.push({
                id: 'meta',
                params: { name: today.names?.[key] || key, from: before.ranks[key], to: rank },
                value: rank < before.ranks[key] ? 'up' : 'down',
                bold: true,
                news: true,
            }));
    }

    const news = rows.filter((row) => row.news).length;
    return { rows, news, checked: rows.length + count(today.friends) };
}

/** The round taken: today is the new baseline, and the morning receipt is spent. */
export function withRoundTaken(round, { dayKey, at, metaMonth = null, ranks = {} }) {
    return {
        ...round,
        last: { day: dayKey, at, metaMonth: isMonth(metaMonth) ? metaMonth : (round.last?.metaMonth || null), ranks: Object.keys(ranks).length ? cleanRanks(ranks) : (round.last?.ranks || {}) },
        seenDay: dayKey,
    };
}

/** A day of four games: counted once. */
export function withFullDay(round, dayKey) {
    if (!isDay(dayKey) || round.lastFullDay === dayKey) return round;
    return { ...round, fullDays: round.fullDays + 1, lastFullDay: dayKey };
}

/**
 * The day's receipt: one row per game, in the day's order.
 *
 * @param {{ challenge, pokepuzzle, quiz, tierList }} done   played today (useGamesToday)
 * @param {object} facts
 * @param {{ won: boolean, turns?: number }|null} facts.challenge
 * @param {{ solved: boolean, attempts: number }|null} facts.puzzle
 * @param {{ found: number, total: number }|null} facts.quiz
 * @param {string|null} facts.tier  the theme ranked today
 */
export function dayReceipt(done = {}, facts = {}) {
    const rows = DAILY_GAMES.map((key) => {
        if (!done[key]) return { id: key, value: 'open', params: {} };
        if (key === 'challenge') {
            const c = facts.challenge;
            if (!c) return { id: key, value: 'played', params: {} };
            return c.won && count(c.turns) ? { id: key, value: 'wonIn', params: { n: count(c.turns, 999) } } : { id: key, value: c.won ? 'won' : 'lost', params: {} };
        }
        if (key === 'pokepuzzle') {
            const p = facts.puzzle;
            return p && p.solved ? { id: key, value: 'solvedIn', params: { n: count(p.attempts, 99) } } : { id: key, value: p ? 'missed' : 'played', params: {} };
        }
        if (key === 'quiz') {
            const q = facts.quiz;
            return q && count(q.total) ? { id: key, value: 'named', params: { found: count(q.found, q.total), total: count(q.total) }, bold: q.found === q.total } : { id: key, value: 'played', params: {} };
        }
        return { id: key, value: 'ranked', params: { theme: facts.tier || null } };
    });
    const played = rows.filter((row) => row.value !== 'open').length;
    return { rows, played, total: DAILY_GAMES.length, complete: played === DAILY_GAMES.length };
}

/**
 * The receipt's code: twelve digits of the trainer's id, grouped in fours —
 * like the trainer card's pixel banner, no two trainers share one.
 */
export function trainerNumber(uid = '') {
    let digits = '';
    for (let i = 0; digits.length < 12; i += 1) digits += String(hashSeed(`${uid}#${i}`) % 10000).padStart(4, '0');
    return `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8, 12)}`;
}

/** The bars of that code: `[x, width]` pairs in units, and the total width. */
export function receiptBars(code = '') {
    const digits = String(code).replace(/\D/g, '') || '0';
    const bars = [];
    let x = 0;
    for (let i = 0; i < 44; i += 1) {
        const v = (Number(digits[i % digits.length]) * 7 + i * 3) % 10;
        const width = (v % 3) + 1;
        bars.push([x, width]);
        x += width + ((v >> 1) % 2) + 1;
    }
    return { bars, width: x };
}
