import { Teams, BattleStreams } from '@pkmn/sim';

/**
 * The turn resolver — the authority on what happens in a battle.
 *
 * Deliberately outside `src/`: `@pkmn/sim` is ~1 MB gzipped and must never reach
 * the browser. Vite only compiles `src/`, and Vercel bundles `api/` separately,
 * so this module ships to the serverless function alone.
 *
 * ## Why it replays from scratch every time
 *
 * The sim is deterministic: the same seed plus the same sequence of choices
 * produces byte-identical protocol output (verified by sha1 over independent
 * runs). So the *only* state that has to be persisted is the seed and the list of
 * choices — no serialized battle object, nothing version-fragile. Every call
 * rebuilds the battle from turn zero and replays.
 *
 * That is O(turns) per resolve, which for a battle of at most a few dozen turns
 * is milliseconds, and it buys three things worth far more than the cycles:
 * replays and spectating for free, no state-migration problem when the engine is
 * upgraded, and an audit trail where any party can recompute the same result.
 *
 * ## Why the per-side streams matter
 *
 * `getPlayerStreams` yields separate `p1` / `p2` / `omniscient` views. A player's
 * stream contains their own sets in full and the opponent's only as it becomes
 * public in-game — exactly how Showdown prevents set-sniffing. Verified: with p1
 * holding Choice Specs and p2 holding Light Ball, p1's stream never contains
 * "Light Ball". This is the entire reason turn resolution is server-side.
 */

/** How long to let the sim settle between writes. */
const DRAIN_MS = 5;

/** Hard ceiling on waiting for the streams to close — a hang guard, not a timing
 *  assumption. Normal completion is a couple of milliseconds. */
const MAX_DRAIN_MS = 2000;

const drain = () => new Promise((resolve) => setTimeout(resolve, DRAIN_MS));

/**
 * A seed the sim accepts: four 16-bit integers.
 *
 * Takes the randomness from the caller so this module stays pure and testable —
 * the endpoint passes `crypto.randomInt`, tests pass a fixed generator.
 */
export const makeSeed = (randomInt) => [0, 1, 2, 3].map(() => randomInt(0x10000));

export class BattleResolveError extends Error {
    constructor(message, code) {
        super(message);
        this.name = 'BattleResolveError';
        this.code = code;
    }
}

/** Showdown import text → packed team. Throws with a usable message if invalid. */
export const packTeam = (showdownText, label) => {
    let parsed;
    try {
        parsed = Teams.import(showdownText || '');
    } catch (err) {
        throw new BattleResolveError(`${label}'s team could not be parsed: ${err.message}`, 'badTeam');
    }
    if (!parsed || parsed.length === 0) {
        throw new BattleResolveError(`${label}'s team is empty.`, 'badTeam');
    }
    // A Pokémon with no moves can only Struggle — the client blocks this, but the
    // resolver is the authority and must not take its word for it.
    const moveless = parsed.find((mon) => !mon.moves || mon.moves.length === 0);
    if (moveless) {
        throw new BattleResolveError(`${label}'s ${moveless.species} has no moves.`, 'badTeam');
    }
    return Teams.pack(parsed);
};

/**
 * Replay a battle from its stored seed and choice history.
 *
 * @param {object}   input
 * @param {string}   input.format         e.g. 'gen9customgame'
 * @param {number[]} input.seed           the four-integer sim seed
 * @param {object}   input.teams          { p1: showdownText, p2: showdownText }
 * @param {object}   input.names          { p1, p2 } display names
 * @param {string[]} input.choices        flat history, e.g. ['>p1 team 1', '>p2 team 1', …]
 * @returns {Promise<{log: {p1: string[], p2: string[], omniscient: string[]}, turn: number, ended: boolean, winner: string|null, awaiting: {p1: boolean, p2: boolean}}>}
 */
export const replayBattle = async ({ format, seed, teams, names = {}, choices = [] }) => {
    if (!Array.isArray(seed) || seed.length !== 4) {
        throw new BattleResolveError('A battle needs a four-part seed.', 'badSeed');
    }

    const p1Team = packTeam(teams?.p1, names.p1 || 'Player 1');
    const p2Team = packTeam(teams?.p2, names.p2 || 'Player 2');

    const streams = BattleStreams.getPlayerStreams(new BattleStreams.BattleStream());
    const collected = { p1: [], p2: [], omniscient: [] };

    // Read all three views concurrently. Each `for await` ends when the stream
    // closes, so these settle on their own once the battle finishes.
    const readers = ['p1', 'p2', 'omniscient'].map(async (who) => {
        try {
            for await (const chunk of streams[who]) {
                if (chunk) collected[who].push(chunk);
            }
        } catch (err) {
            console.error(`Error reading ${who} stream:`, err);
        }
    });

    try {
        streams.omniscient.write([
            `>start ${JSON.stringify({ formatid: format, seed })}`,
            `>player p1 ${JSON.stringify({ name: names.p1 || 'Player 1', team: p1Team })}`,
            `>player p2 ${JSON.stringify({ name: names.p2 || 'Player 2', team: p2Team })}`,
        ].join('\n'));
        await drain();

        // Feed the history back in, one line at a time, letting the sim settle
        // between each so ordering matches a live game.
        for (const choice of choices) {
            if (!choice || typeof choice !== 'string') continue;
            streams.omniscient.write(choice);
            await drain();
        }

        // Closing the input ends the streams, which ends the readers.
        streams.omniscient.writeEnd();
    } catch (err) {
        console.error('Error writing to battle simulator stream:', err);
        throw new BattleResolveError(`Battle simulator error: ${err.message}`, 'simError');
    }

    await Promise.race([
        Promise.all(readers).catch((err) => console.error('Stream readers error:', err)),
        new Promise((resolve) => setTimeout(resolve, MAX_DRAIN_MS)),
    ]);

    const lines = (who) => collected[who].join('\n').split('\n').filter(Boolean);
    const omniscient = lines('omniscient');
    const p1 = lines('p1');
    const p2 = lines('p2');

    const state = readBattleState(omniscient);
    return {
        log: { p1, p2, omniscient },
        ...state,
        awaiting: state.ended
            ? { p1: false, p2: false }
            : { p1: owesChoice(p1), p2: owesChoice(p2) },
    };
};

/**
 * Does this side still owe a choice?
 *
 * Read from the side's own last `|request|`, which is the sim telling that player
 * what it wants. A request carrying `"wait":true` means "the other player is
 * deciding, sit tight"; anything else is a live prompt. Deriving it from the
 * protocol rather than tracking it separately keeps one source of truth.
 */
export const owesChoice = (sideLines = []) => {
    const requests = sideLines.filter((line) => line.startsWith('|request|'));
    if (requests.length === 0) return false;
    const last = requests[requests.length - 1].slice('|request|'.length);
    if (!last.trim()) return false;
    try {
        const payload = JSON.parse(last);
        if (payload.wait) return false;
        return Boolean(payload.teamPreview || payload.active || payload.forceSwitch);
    } catch {
        // An unparseable request is not something to guess about — treat it as
        // "no prompt" so a malformed line can't wedge the battle waiting forever.
        return false;
    }
};

/**
 * Derive the battle's position from its protocol log.
 *
 * The protocol is the source of truth here rather than any parallel bookkeeping —
 * two sources for one fact is how they drift apart.
 */
export const readBattleState = (omniscientLines = []) => {
    let turn = 0;
    let winner = null;
    let ended = false;

    for (const line of omniscientLines) {
        if (line.startsWith('|turn|')) {
            const parsed = Number.parseInt(line.slice('|turn|'.length), 10);
            if (Number.isInteger(parsed)) turn = parsed;
        } else if (line.startsWith('|win|')) {
            winner = line.slice('|win|'.length).trim();
            ended = true;
        } else if (line === '|tie' || line.startsWith('|tie|')) {
            // Exact match on purpose: `|tie` is a prefix of `|tier|`, the line
            // that names the format. `startsWith('|tie')` marks every battle as
            // finished before it begins.
            ended = true;
        }
    }

    return { turn, ended, winner };
};

/**
 * Append a turn's choices and replay.
 *
 * The choices arrive as `{ p1: 'move 1', p2: 'switch 2' }` and become protocol
 * lines. Both sides are appended together because a turn only resolves once both
 * have chosen — which is precisely what makes the battle atemporal.
 */
export const resolveTurn = async ({ format, seed, teams, names, choices = [], nextChoices }) => {
    const appended = [...choices];
    if (nextChoices?.p1) appended.push(`>p1 ${nextChoices.p1}`);
    if (nextChoices?.p2) appended.push(`>p2 ${nextChoices.p2}`);
    return replayBattle({ format, seed, teams, names, choices: appended });
};
