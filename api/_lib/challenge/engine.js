import { Battle, Teams, extractChannelMessages } from '@pkmn/sim';

import { FORMAT, LEVEL } from './constants.js';

/**
 * The challenge's battle engine: `@pkmn/sim`'s synchronous `Battle`, driven
 * one choice at a time.
 *
 * ## Why synchronous, when PvP uses streams
 *
 * The PvP resolver (`../battleResolver.js`) talks to `BattleStreams` and waits
 * a few milliseconds per write for the stream to settle — and the streams
 * discard the promises they create, which is how an unhandled rejection once
 * killed the whole function (wound 2026-07-27). Against a CPU there is one
 * process and nothing to wait for: `battle.choose()` resolves the turn on the
 * spot, so there are no timers and no promises at all.
 *
 * ## Why replay instead of storing the battle
 *
 * Only the seed, both teams and the ordered choice list are persisted. Every
 * request rebuilds the battle from those (~64 ms for 42 turns, log identical to
 * the live one), so the stored state is a few KB, the sim stays the single
 * authority, and an engine upgrade can't meet a serialized battle it doesn't
 * understand (`ENGINE_VERSION` is recorded per run).
 *
 * ## Two things the sim does that this file exists to absorb
 *
 *  - **Nothing is emitted until `sendUpdates()`.** The log and the next
 *    requests are buffered; `apply` flushes after every choice.
 *  - **`|t:|` lines carry `Date.now()`.** They make two runs of the same battle
 *    differ byte for byte, and no reader needs them, so they are dropped here.
 *
 * Each side's lines are its own channel (`extractChannelMessages`, channel 1 =
 * p1, 2 = p2): its own Pokémon exactly, the other's only as public. p1's lines go
 * to the player; p2's feed the AI and never leave the server.
 */

export class EngineError extends Error {
    constructor(message, code) {
        super(message);
        this.name = 'EngineError';
        this.code = code;
    }
}

const isNoise = (line) => line.startsWith('|t:|');

/** Showdown text → packed team with every Pokémon at the challenge level. */
export const packAtLevel = (showdownText) => {
    let sets;
    try {
        sets = Teams.import(String(showdownText || ''));
    } catch (err) {
        throw new EngineError(`Team could not be parsed: ${err.message}`, 'badTeam');
    }
    if (!sets?.length) throw new EngineError('Team is empty.', 'badTeam');
    for (const set of sets) set.level = LEVEL;
    return Teams.pack(sets);
};

/**
 * A fresh battle with both teams in, flushed to its first request.
 *
 * @param {{seed: number[], teams: {p1: string, p2: string}, names: {p1: string, p2: string}}} input
 * @returns {{battle: Battle, lines: {p1: string[], p2: string[]}, lastError: {p1: ?string, p2: ?string}}}
 */
export const createMatch = ({ seed, teams, names, format = FORMAT }) => {
    if (!Array.isArray(seed) || seed.length !== 4) throw new EngineError('A battle needs a four-part seed.', 'badSeed');
    const lines = { p1: [], p2: [] };
    const lastError = { p1: null, p2: null };

    const send = (type, data) => {
        const text = Array.isArray(data) ? data.join('\n') : String(data);
        if (type === 'update') {
            const channels = extractChannelMessages(text, [1, 2]);
            for (const line of channels[1]) if (!isNoise(line)) lines.p1.push(line);
            for (const line of channels[2]) if (!isNoise(line)) lines.p2.push(line);
            return;
        }
        if (type === 'sideupdate') {
            const cut = text.indexOf('\n');
            const side = text.slice(0, cut);
            const line = text.slice(cut + 1);
            if (side !== 'p1' && side !== 'p2') return;
            if (line.startsWith('|error|')) lastError[side] = line.slice('|error|'.length);
            lines[side].push(line);
        }
        // 'end' carries the full input log and both teams: never kept.
    };

    // A run replays under the format it was created with, even if FORMAT changes later.
    const battle = new Battle({ formatid: format, seed: [...seed], send });
    battle.setPlayer('p1', { name: names.p1, team: packAtLevel(teams.p1) });
    battle.setPlayer('p2', { name: names.p2, team: packAtLevel(teams.p2) });
    battle.sendUpdates();
    return { battle, lines, lastError };
};

/**
 * One choice for one side. The sim is the validator: an illegal choice returns
 * false and emits `|error|`, which comes back here as `{ok: false, error}` and
 * is removed from the side's lines — nothing about a refused choice is kept.
 */
export const apply = (match, side, choice) => {
    const { battle, lines, lastError } = match;
    const mark = lines[side].length;
    lastError[side] = null;
    let ok = false;
    try {
        ok = battle.choose(side, choice);
    } catch (err) {
        lastError[side] = err.message;
    }
    if (!ok) {
        lines[side].length = mark;
        return { ok: false, error: lastError[side] || 'Invalid choice' };
    }
    battle.sendUpdates();
    return { ok: true };
};

/**
 * Rebuild a battle from its stored inputs. Every recorded choice was legal when
 * it was made, so a refusal here means the engine or the data changed under the
 * run — reported, never papered over.
 *
 * @param {{seed, teams, names, choices: Array<{side: 'p1'|'p2', choice: string}>}} input
 */
export const replay = ({ seed, teams, names, choices = [], format = FORMAT }) => {
    const match = createMatch({ seed, teams, names, format });
    choices.forEach(({ side, choice }, index) => {
        const result = apply(match, side, choice);
        if (!result.ok) {
            throw new EngineError(`Replay diverged at choice ${index} (${side} "${choice}"): ${result.error}`, 'replayDiverged');
        }
    });
    return match;
};

/**
 * Does `side` still owe the sim a choice right now?
 *
 * Read from the sim, never assumed: after a faint only the fainted side is
 * asked to switch, and the other holds `{wait: true}` (the 2026-07-27 wound —
 * "never assume a round needs both players").
 */
export const owes = (battle, side) => {
    if (battle.ended) return false;
    const target = battle.getSide(side);
    const request = target.activeRequest;
    if (!request || request.wait) return false;
    return !target.isChoiceDone();
};

export const requestOf = (battle, side) => battle.getSide(side).activeRequest || null;

/**
 * A detached copy of the battle, for the AI to compute on.
 *
 * `toJSON()` returns the battle's `log` array *by reference*, and
 * `Battle.fromJSON` adopts it — so every clone built from a raw `toJSON()`
 * appends its imagined turns to the live battle's log, and the player is sent
 * lines from battles that never happened. Everything else in the JSON is
 * already a copy (checked), so copying the log is enough.
 */
export const snapshot = (battle) => {
    const json = battle.toJSON();
    json.log = json.log.slice();
    return json;
};

const averageHpPct = (side) => {
    const alive = side.pokemon.filter((mon) => !mon.fainted && mon.hp > 0);
    if (!alive.length) return 0;
    return Math.round((100 * alive.reduce((sum, mon) => sum + mon.hp / mon.maxhp, 0)) / alive.length);
};

/** Where the battle stands. `winner` is a side id; null while running or on a tie. */
export const outcome = (battle) => {
    const [p1, p2] = battle.sides;
    let winner = null;
    if (battle.ended) winner = battle.winner === p1.name ? 'p1' : battle.winner === p2.name ? 'p2' : null;
    return {
        ended: Boolean(battle.ended),
        winner,
        turns: battle.turn,
        remaining: { p1: p1.pokemonLeft, p2: p2.pokemonLeft },
        hpPct: { p1: averageHpPct(p1), p2: averageHpPct(p2) },
    };
};

/**
 * Display names for the protocol. They come back in `|win|`, so they must
 * differ — a player who names themselves "Cynthia" would otherwise make the
 * winner ambiguous.
 */
export const battleNames = (playerName, championName) => {
    const clean = String(playerName || '').replace(/[|\n\r]/g, '').trim().slice(0, 20) || 'Trainer';
    return { p1: clean.toLowerCase() === championName.toLowerCase() ? `${clean} (2)` : clean, p2: championName };
};
