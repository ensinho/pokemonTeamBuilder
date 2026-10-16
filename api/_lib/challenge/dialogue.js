/**
 * Cynthia's lines, as i18n keys — never as text. The server decides *when* she
 * speaks; `src/constants/translations.js` decides *what* she says, in each
 * language. The lines themselves are original (no game dialogue is copied).
 *
 * Each key is said at most once per battle: `said` (stored with the run's
 * secret state) is the memory of what she already said.
 *
 * `at` is the index into `newLines` after which the line plays, so the client
 * can slot it into its animation queue at the right moment.
 */

export const DIALOGUE_KEYS = {
    intro: 'challenge.cynthia.intro',
    firstLoss: 'challenge.cynthia.firstLoss',
    ace: 'challenge.cynthia.ace',
    lastOne: 'challenge.cynthia.lastOne',
    playerLow: 'challenge.cynthia.playerLow',
    superEffective: 'challenge.cynthia.superEffective',
    turned: 'challenge.cynthia.turned',
    confident: 'challenge.cynthia.confident',
    win: 'challenge.cynthia.win',
    lose: 'challenge.cynthia.lose',
};

const speciesOf = (details) => String(details || '').split(',')[0];

/**
 * @param {string[]} prevLines p1's lines already delivered
 * @param {string[]} newLines  p1's lines from this action
 * @param {{said: string[], aceSpecies: string, championName: string, winProb?: {before: ?number, after: ?number}}} ctx
 * @returns {{events: Array<{key: string, params?: object, at: number}>, said: string[]}}
 */
export const dialogueEvents = (prevLines, newLines, ctx) => {
    const said = new Set(ctx.said || []);
    const events = [];
    const all = [...prevLines, ...newLines];
    const offset = prevLines.length;
    const teamSize = { p1: 6, p2: 6 };
    const fainted = { p1: 0, p2: 0 };
    const p2Species = new Map();

    const say = (name, index, params) => {
        const key = DIALOGUE_KEYS[name];
        if (said.has(key)) return;
        said.add(key);
        if (index >= offset) events.push({ key, ...(params ? { params } : {}), at: Math.max(0, index - offset) });
    };

    all.forEach((line, index) => {
        const parts = line.split('|');
        const tag = parts[1];
        if (tag === 'teamsize') teamSize[parts[2]] = Number(parts[3]) || 6;
        if (tag === 'switch' || tag === 'drag') {
            const who = parts[2]?.slice(0, 2);
            if (who === 'p2') {
                const species = speciesOf(parts[3]);
                p2Species.set(parts[2].split(': ')[1], species);
                if (index === all.findIndex((l) => l.startsWith('|switch|p2a:'))) say('intro', index);
                if (species === ctx.aceSpecies) say('ace', index, { species });
            }
        }
        if (tag === 'faint') {
            const who = parts[2]?.slice(0, 2);
            if (who !== 'p1' && who !== 'p2') return;
            fainted[who] += 1;
            if (who === 'p2') {
                say('firstLoss', index, { species: p2Species.get(parts[2].split(': ')[1]) || '' });
                if (teamSize.p2 - fainted.p2 === 1) say('lastOne', index);
            } else if (teamSize.p1 - fainted.p1 === 1) {
                say('playerLow', index);
            }
        }
        if (tag === '-supereffective' && parts[2]?.startsWith('p2')) say('superEffective', index);
        if (tag === 'win') say(parts[2] === ctx.championName ? 'win' : 'lose', index);
    });

    const { before, after } = ctx.winProb || {};
    if (typeof before === 'number' && typeof after === 'number' && newLines.length) {
        if (before - after > 0.25) say('turned', all.length - 1);
        if (after > 0.85) say('confident', all.length - 1);
    }

    return { events: events.sort((a, b) => a.at - b.at), said: [...said] };
};
