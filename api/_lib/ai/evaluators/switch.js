import { hpPctOf } from '../estimate.js';

/**
 * How well one of her Pokémon matches up against the player's active:
 *
 *   M(x) = 0.6·(best hit x deals) − 0.8·(best hit x takes) + 10·[x moves first]
 *
 * `threatMoves` narrows "the hit x takes" to a move the player keeps repeating
 * (the "repeated move becomes the main threat" adaptation).
 */
export const matchup = (ctx, mon, threatMoves) => {
    const { est, foe } = ctx;
    const deals = est.bestMoveAgainst(mon, foe);
    const takes = est.threatOf(foe, mon, threatMoves);
    const first = est.actsFirst(mon, deals.moveId, foe, takes.moveId) === 1 ? 1 : 0;
    // Damage taken can't exceed what the Pokémon has left.
    const taken = Math.min(takes.exp, hpPctOf(mon));
    return { score: 0.6 * deals.exp - 0.8 * taken + 10 * first, deals, takes, first };
};

/** Entry hazard damage on her side, as % of the incoming Pokémon's HP. */
export const hazardDamage = (ctx, mon) => {
    const conditions = mon.side.sideConditions;
    let pct = 0;
    if (conditions.stealthrock) pct += 12.5 * 2 ** ctx.battle.dex.getEffectiveness('Rock', mon);
    if (conditions.spikes && mon.isGrounded()) pct += [0, 12.5, 16.7, 25][conditions.spikes.layers || 1];
    return pct;
};

/**
 * A voluntary switch to bench slot `option.slot`:
 *
 *   M(j) − M(active) − 15 − 10·(recent switches) − (entry hazards on j)
 *
 * Considered only when staying is bad: the active is knocked out before it
 * acts, or the matchup gap is over 40. The ace never switches out and never
 * comes in while anyone else can (personality); each profile caps how often
 * she switches at all.
 */
export const evaluateSwitch = (ctx, option) => {
    const { me, foe, profile, personality, memory, est, threatMoves } = ctx;
    const incoming = me.side.pokemon[option.slot];
    if (!incoming || incoming.fainted) return { score: -Infinity, reason: 'unavailable' };
    if (me.species.name === personality.aceSpecies) return { score: -Infinity, reason: 'the ace stays' };
    const othersStanding = me.side.pokemon.filter((mon) => !mon.fainted && mon !== me && mon.species.name !== personality.aceSpecies).length;
    if (incoming.species.name === personality.aceSpecies && othersStanding > 0) return { score: -Infinity, reason: 'the ace comes last' };
    if (memory.myVoluntarySwitches >= profile.switching.max) return { score: -Infinity, reason: 'switch budget spent' };

    const stay = matchup(ctx, me, threatMoves);
    const go = matchup(ctx, incoming, threatMoves);
    const koBeforeActing = stay.takes.ko > 0.5 && est.actsFirst(foe, stay.takes.moveId, me, stay.deals.moveId) === 1;
    const gap = go.score - stay.score;
    const allowed = profile.switching.mode === 'koOnly' ? koBeforeActing : (koBeforeActing || gap > 40);
    if (!allowed) return { score: -Infinity, reason: 'staying is fine' };

    const score = gap - 15 - 10 * memory.recentMySwitches - hazardDamage(ctx, incoming);
    return {
        score,
        parts: { stay: stay.score, go: go.score, koBeforeActing, hazards: hazardDamage(ctx, incoming) },
        reason: koBeforeActing ? 'escape a KO' : 'better matchup',
    };
};
