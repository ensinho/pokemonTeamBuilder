import { hpPctOf } from './estimate.js';

/**
 * A read-only summary of what the AI sees, for the trace and the tests. Her
 * own team in full (it is hers); the player's only as public or believed.
 */
const mine = (mon, index) => ({
    slot: index,
    species: mon.species.name,
    types: mon.getTypes(),
    hpPct: Math.round(hpPctOf(mon)),
    status: mon.status || '',
    boosts: { ...mon.boosts },
    moves: mon.moveSlots.map((slot) => slot.id),
    item: mon.item,
    ability: mon.ability,
});

export const buildView = (battle, knowledge, personality) => {
    const [p1, p2] = battle.sides;
    const me = p2.active[0];
    const foe = p1.active[0];
    const foeInfo = foe ? knowledge.foe.get(foe.species.name) : null;
    return {
        turn: battle.turn,
        field: {
            weather: battle.field.weather || '',
            terrain: battle.field.terrain || '',
            trickRoom: Boolean(battle.field.pseudoWeather.trickroom),
            sides: { me: Object.keys(p2.sideConditions), foe: Object.keys(p1.sideConditions) },
        },
        me: {
            active: me ? mine(me, p2.pokemon.indexOf(me)) : null,
            bench: p2.pokemon.filter((mon) => mon !== me && !mon.fainted).map((mon) => mine(mon, p2.pokemon.indexOf(mon))),
            aceSlot: p2.pokemon.findIndex((mon) => mon.species.name === personality.aceSpecies),
            faintedCount: p2.pokemon.filter((mon) => mon.fainted).length,
        },
        foe: {
            active: foe ? {
                species: foe.species.name,
                types: foe.getTypes(),
                hpPct: Math.round(hpPctOf(foe)),
                status: foe.status || '',
                boosts: { ...foe.boosts },
                revealed: {
                    moves: [...(foeInfo?.moves || [])],
                    item: foeInfo?.itemKnown ? foeInfo.item : undefined,
                    ability: foeInfo?.ability || undefined,
                },
            } : null,
            seenBench: knowledge.foeOrder.filter((species) => species !== foe?.species.name).map((species) => {
                const info = knowledge.foe.get(species);
                return { species, hpPct: info.hpPct, fainted: info.fainted, status: info.status };
            }),
            remaining: knowledge.foeRemaining,
        },
    };
};
