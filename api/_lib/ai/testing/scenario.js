import { createMatch, apply, owes, requestOf, snapshot } from '../../challenge/engine.js';

/**
 * The format the scenarios were tuned under. Her dice are derived from the
 * battle seed and how many lines she has read (`index.js`, the decision tag),
 * so a ruleset with one header line fewer — Terastal Clause came off on
 * 2026-11-09 — rerolls every sampled estimate without changing her logic.
 * Several scenarios hold on their seed and not on most others (17 on 1 of 20,
 * measured that day — `docs/wounds.md` backlog), so they stay on this one.
 */
export const SCENARIO_FORMAT = 'gen9anythinggoes@@@!Team Preview,Sleep Clause Mod,Terastal Clause';

/**
 * A battle situation for an AI test, in a few lines:
 *
 *   const s = scenario({
 *     p1: 'Togekiss @ Leftovers\n…',      // the player
 *     p2: 'Garchomp @ Yache Berry\n…',    // Cynthia
 *     turns: [['move 4', 'move 3']],       // played first, as [p1, p2]
 *     set: { p1: { hpPct: 35 } },          // then poke the snapshot
 *     profile: 'world',
 *   });
 *   decide(s.input).choice
 *
 * `set` edits the active Pokémon of a side (hpPct, status, boosts) on the
 * battle before the snapshot is taken. The log isn't rewritten, which is fine:
 * HP, status and boosts are on screen, and the AI reads them from the snapshot.
 */
export const scenario = ({ p1, p2, turns = [], set = {}, profile = 'world', seed = [1, 2, 3, 4], championId = 'cynthia', format = SCENARIO_FORMAT }) => {
    const match = createMatch({ seed, teams: { p1, p2 }, names: { p1: 'Player', p2: 'Cynthia' }, format });
    for (const [p1Choice, p2Choice] of turns) {
        if (p2Choice && owes(match.battle, 'p2')) {
            const r = apply(match, 'p2', p2Choice);
            if (!r.ok) throw new Error(`scenario: p2 "${p2Choice}" refused: ${r.error}`);
        }
        if (p1Choice && owes(match.battle, 'p1')) {
            const r = apply(match, 'p1', p1Choice);
            if (!r.ok) throw new Error(`scenario: p1 "${p1Choice}" refused: ${r.error}`);
        }
    }
    for (const [side, edits] of Object.entries(set)) {
        const mon = match.battle.getSide(side).active[0];
        if (edits.hpPct !== undefined) mon.hp = Math.max(1, Math.round((mon.maxhp * edits.hpPct) / 100));
        if (edits.status !== undefined) mon.setStatus(edits.status, mon, null, true);
        if (edits.boosts) Object.assign(mon.boosts, edits.boosts);
        if (edits.item !== undefined) mon.item = edits.item;
    }
    return {
        match,
        input: {
            snapshot: snapshot(match.battle),
            request: requestOf(match.battle, 'p2'),
            p2Lines: [...match.lines.p2],
            seed,
            turn: match.battle.turn,
            profileKey: profile,
            championId,
        },
    };
};
