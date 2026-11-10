import { describe, it, expect } from 'vitest';
import { boostMultiplier, fieldConditions, readBattleField, parseCondition, hpTone, sideConditions } from './battleState';

describe('parseCondition', () => {
    it('reads real HP with a maximum', () => {
        expect(parseCondition('137/186')).toMatchObject({ current: 137, max: 186, pct: 73.7, fainted: false });
    });

    // The opponent's HP arrives as a percentage out of 100, which is why `pct` is
    // the only figure comparable across sides.
    it('reads an opponent percentage', () => {
        expect(parseCondition('74/100')).toMatchObject({ current: 74, max: 100, pct: 74 });
    });

    it('reads a status suffix', () => {
        expect(parseCondition('120/186 par')).toMatchObject({ current: 120, status: 'par' });
        expect(parseCondition('80/100 tox')).toMatchObject({ status: 'tox' });
    });

    it('recognises a fainted Pokémon', () => {
        expect(parseCondition('0 fnt')).toMatchObject({ pct: 0, fainted: true });
        expect(parseCondition('0/186 fnt')).toMatchObject({ fainted: true });
    });

    it('returns null for junk', () => {
        expect(parseCondition('')).toBeNull();
        expect(parseCondition('nonsense')).toBeNull();
        expect(parseCondition(undefined)).toBeNull();
    });
});

describe('hpTone', () => {
    it('is high above 50%, mid down to 20%, low below', () => {
        expect(hpTone(100)).toBe('high');
        expect(hpTone(51)).toBe('high');
        expect(hpTone(50)).toBe('mid');
        expect(hpTone(21)).toBe('mid');
        expect(hpTone(20)).toBe('low');
        expect(hpTone(0)).toBe('low');
    });
});

describe('readBattleField', () => {
    const opening = [
        '|player|p1|Enzo||',
        '|player|p2|Amigo||',
        '|poke|p1|Charizard, L50, M|',
        '|poke|p1|Garchomp, L50, F|',
        '|poke|p2|Blastoise, L50, F|',
        '|request|{"side":{"id":"p1","name":"Enzo","pokemon":[]}}',
    ];

    it('reads player names and the team-preview roster', () => {
        const field = readBattleField(opening);
        expect(field.sides.p1.name).toBe('Enzo');
        expect(field.sides.p2.name).toBe('Amigo');
        expect(field.sides.p1.roster.map((mon) => mon.species)).toEqual(['Charizard', 'Garchomp']);
        expect(field.sides.p1.roster[0]).toMatchObject({ level: 50, gender: 'M' });
    });

    // Display names can collide, so the side must come from the request payload.
    it('takes the viewer\'s side from the request, not from names', () => {
        expect(readBattleField(opening).mySide).toBe('p1');
        expect(readBattleField([
            '|player|p1|Same||', '|player|p2|Same||',
            '|request|{"side":{"id":"p2","name":"Same","pokemon":[]}}',
        ]).mySide).toBe('p2');
    });

    it('defaults the perspective to p1 when no request has arrived', () => {
        const field = readBattleField(['|player|p1|Enzo||', '|player|p2|Amigo||']);
        expect(field.mySide).toBeNull();
        expect(field.mine.name).toBe('Enzo');
    });

    it('tracks the active Pokémon on each side', () => {
        const field = readBattleField([
            ...opening,
            '|switch|p1a: Charizard|Charizard, L50, M|153/153',
            '|switch|p2a: Blastoise|Blastoise, L50, F|100/100',
        ]);
        expect(field.mine.active).toMatchObject({ species: 'Charizard', level: 50, gender: 'M' });
        expect(field.mine.active.hp).toMatchObject({ current: 153, max: 153, pct: 100 });
        expect(field.theirs.active.species).toBe('Blastoise');
    });

    it('applies damage and healing to the right side', () => {
        const field = readBattleField([
            ...opening,
            '|switch|p1a: Charizard|Charizard, L50, M|153/153',
            '|switch|p2a: Blastoise|Blastoise, L50, F|100/100',
            '|-damage|p1a: Charizard|33/153',
            '|-damage|p2a: Blastoise|74/100',
            '|-heal|p2a: Blastoise|80/100',
        ]);
        expect(field.mine.active.hp.current).toBe(33);
        expect(field.theirs.active.hp.pct).toBe(80);
    });

    it('carries status on and off', () => {
        const withStatus = readBattleField([
            ...opening,
            '|switch|p1a: Charizard|Charizard, L50, M|153/153',
            '|-status|p1a: Charizard|brn',
        ]);
        expect(withStatus.mine.active.status).toBe('brn');

        const cured = readBattleField([
            ...opening,
            '|switch|p1a: Charizard|Charizard, L50, M|153/153',
            '|-status|p1a: Charizard|brn',
            '|-curestatus|p1a: Charizard|brn',
        ]);
        expect(cured.mine.active.status).toBeNull();
    });

    it('counts faints and zeroes the bar', () => {
        const field = readBattleField([
            ...opening,
            '|switch|p1a: Charizard|Charizard, L50, M|153/153',
            '|-damage|p1a: Charizard|0 fnt',
            '|faint|p1a: Charizard',
        ]);
        expect(field.mine.active).toMatchObject({ fainted: true });
        expect(field.mine.active.hp.pct).toBe(0);
        expect(field.mine.faintedCount).toBe(1);
    });

    it('replaces the active Pokémon on a switch', () => {
        const field = readBattleField([
            ...opening,
            '|switch|p1a: Charizard|Charizard, L50, M|153/153',
            '|-damage|p1a: Charizard|0 fnt',
            '|faint|p1a: Charizard',
            '|switch|p1a: Garchomp|Garchomp, L50, F|183/183',
        ]);
        expect(field.mine.active).toMatchObject({ species: 'Garchomp', fainted: false });
        expect(field.mine.active.hp.pct).toBe(100);
        // The faint still counted.
        expect(field.mine.faintedCount).toBe(1);
    });

    it('tracks the turn and the weather', () => {
        const field = readBattleField([...opening, '|turn|1', '|-weather|RainDance', '|turn|2']);
        expect(field.turn).toBe(2);
        expect(field.weather).toBe('RainDance');
        expect(readBattleField(['|-weather|none']).weather).toBeNull();
    });

    it('reports the outcome from the viewer\'s perspective', () => {
        const won = readBattleField([...opening, '|win|Enzo']);
        expect(won).toMatchObject({ ended: true, winner: 'Enzo', iWon: true });

        const lost = readBattleField([...opening, '|win|Amigo']);
        expect(lost).toMatchObject({ ended: true, iWon: false });

        expect(readBattleField([...opening, '|tie'])).toMatchObject({ ended: true, iWon: false });
    });

    it('shrugs off an empty or noisy log', () => {
        expect(readBattleField()).toMatchObject({ turn: 0, ended: false });
        expect(readBattleField(['garbage', '', '|switch|broken'])).toMatchObject({ turn: 0 });
        expect(readBattleField(['|request|{oops']).mySide).toBeNull();
    });
});

describe('stat stages (the HP boxes\' buff chips)', () => {
    // Lines from a real @pkmn/sim run (Swords Dance, Topsy-Turvy, Baton Pass, Psych Up, Heart Swap, Belly Drum, Haze).
    const open = [
        '|switch|p1a: Scizor|Scizor, L50, M|145/145',
        '|switch|p2a: Malamar|Malamar, L50, F|161/161',
    ];
    const boostsOf = (lines) => {
        const field = readBattleField([...open, ...lines]);
        return { p1: field.sides.p1.active.boosts, p2: field.sides.p2.active.boosts };
    };

    it('adds and subtracts stages, dropping a stat that returns to zero', () => {
        expect(boostsOf(['|-boost|p1a: Scizor|atk|2', '|-unboost|p1a: Scizor|def|1']).p1).toEqual({ atk: 2, def: -1 });
        expect(boostsOf(['|-boost|p1a: Scizor|atk|2', '|-unboost|p1a: Scizor|atk|2']).p1).toEqual({});
    });

    it('clamps at six and reads -setboost', () => {
        expect(boostsOf(['|-boost|p1a: Scizor|atk|4', '|-boost|p1a: Scizor|atk|4']).p1).toEqual({ atk: 6 });
        expect(boostsOf(['|-setboost|p1a: Scizor|atk|6|[from] move: Belly Drum']).p1).toEqual({ atk: 6 });
    });

    it('inverts, copies, swaps and clears', () => {
        const start = ['|-boost|p1a: Scizor|atk|2', '|-boost|p2a: Malamar|spa|1', '|-boost|p2a: Malamar|spd|1'];
        expect(boostsOf([...start, '|-invertboost|p1a: Scizor|[from] move: Topsy-Turvy']).p1).toEqual({ atk: -2 });
        expect(boostsOf([...start, '|-copyboost|p1a: Scizor|p2a: Malamar|[from] move: Psych Up'])).toEqual({ p1: { spa: 1, spd: 1 }, p2: { spa: 1, spd: 1 } });
        expect(boostsOf([...start, '|-swapboost|p1a: Scizor|p2a: Malamar|[from] move: Heart Swap'])).toEqual({ p1: { spa: 1, spd: 1 }, p2: { atk: 2 } });
        expect(boostsOf([...start, '|-swapboost|p1a: Scizor|p2a: Malamar|atk, spa|[from] move: Power Swap'])).toEqual({ p1: { spa: 1 }, p2: { atk: 2, spd: 1 } });
        expect(boostsOf([...start, '|-clearallboost'])).toEqual({ p1: {}, p2: {} });
        expect(boostsOf([...start, '|-unboost|p2a: Malamar|atk|1', '|-clearnegativeboost|p2a: Malamar']).p2).toEqual({ spa: 1, spd: 1 });
        expect(boostsOf([...start, '|-unboost|p2a: Malamar|atk|1', '|-clearpositiveboost|p2a: Malamar|p1a: Scizor|move: Spectral Thief']).p2).toEqual({ atk: -1 });
    });

    it('a switch clears them; Baton Pass hands them on; a faint clears them', () => {
        const boosted = ['|-boost|p1a: Scizor|atk|2'];
        expect(boostsOf([...boosted, '|switch|p1a: Mew|Mew, L50|175/175']).p1).toEqual({});
        expect(boostsOf([...boosted, '|switch|p1a: Mew|Mew, L50|175/175|[from] Baton Pass']).p1).toEqual({ atk: 2 });
        expect(boostsOf([...boosted, '|faint|p1a: Scizor']).p1).toEqual({});
    });

    it('says what a stage is worth', () => {
        expect(boostMultiplier('atk', 2)).toBe(2);
        expect(boostMultiplier('atk', -1)).toBeCloseTo(2 / 3);
        expect(boostMultiplier('accuracy', 1)).toBeCloseTo(4 / 3);
        expect(boostMultiplier('spe', 0)).toBe(1);
    });
});

// Lines as @pkmn/sim prints them (captured from a real gen9customgame run).
describe('hazards, screens, volatiles and the field (the HUD\'s condition chips)', () => {
    const OPENING = [
        '|player|p1|A', '|player|p2|B',
        '|switch|p1a: Mew|Mew, L50|207/207',
        '|switch|p2a: Blissey|Blissey, L50, F|362/362',
    ];
    const read = (lines) => readBattleField([...OPENING, ...lines]);
    const ids = (list) => list.map((chip) => (chip.count ? `${chip.id}:${chip.count}` : chip.id));
    const chips = (lines) => {
        const field = read(lines);
        return { p1: ids(sideConditions(field.sides.p1)), p2: ids(sideConditions(field.sides.p2)), field: fieldConditions(field) };
    };

    it('reads a side\'s hazards, with Spikes\' layers, and its screens', () => {
        const out = chips([
            '|-sidestart|p2: B|move: Stealth Rock',
            '|-sidestart|p2: B|Spikes',
            '|-sidestart|p2: B|Spikes',
            '|-sidestart|p2: B|move: Toxic Spikes',
            '|-sidestart|p1: A|Reflect',
            '|-sidestart|p1: A|move: Light Screen',
        ]);
        expect(out.p2).toEqual(['stealthrock', 'spikes:2', 'toxicspikes']);
        expect(out.p1).toEqual(['reflect', 'lightscreen']);
    });

    it('ends them, and Court Change trades the sides', () => {
        const set = ['|-sidestart|p2: B|move: Stealth Rock', '|-sidestart|p1: A|move: Sticky Web', '|-sidestart|p1: A|Reflect'];
        expect(chips([...set, '|-sideend|p1: A|Sticky Web|[from] move: Rapid Spin|[of] p1a: Mew', '|-sideend|p1: A|Reflect'])).toMatchObject({ p1: [], p2: ['stealthrock'] });
        expect(chips([...set, '|-swapsideconditions'])).toMatchObject({ p1: ['stealthrock'], p2: ['reflect', 'stickyweb'] });
    });

    it('hazards outlive the Pokémon; its volatiles leave with it', () => {
        const out = chips([
            '|-sidestart|p2: B|move: Stealth Rock',
            '|-start|p2a: Blissey|move: Leech Seed',
            '|-start|p2a: Blissey|confusion',
            '|switch|p2a: Chansey|Chansey, L50, F|300/300',
        ]);
        expect(out.p2).toEqual(['stealthrock']);
    });

    it('reads the volatiles, Perish Song\'s count, and their end', () => {
        const lines = [
            '|-start|p1a: Mew|Substitute',
            '|-start|p2a: Blissey|move: Leech Seed',
            '|-start|p2a: Blissey|move: Taunt',
            '|-start|p2a: Blissey|perish3',
            '|-start|p2a: Blissey|perish2',
            '|-start|p2a: Blissey|typechange|Water',
        ];
        expect(chips(lines)).toMatchObject({ p1: ['substitute'], p2: ['leechseed', 'taunt', 'perish:2'] });
        expect(chips([...lines, '|-end|p1a: Mew|Substitute', '|-end|p2a: Blissey|move: Taunt']))
            .toMatchObject({ p1: [], p2: ['leechseed', 'perish:2'] });
        expect(chips([...lines, '|faint|p2a: Blissey']).p2).toEqual([]);
    });

    it('Baton Pass hands on the Substitute, not the Taunt', () => {
        const out = chips([
            '|-start|p1a: Mew|Substitute',
            '|-start|p1a: Mew|move: Taunt',
            '|switch|p1a: Gengar|Gengar, L50, M|167/167|[from] Baton Pass',
        ]);
        expect(out.p1).toEqual(['substitute']);
    });

    it('reads the weather, the terrain and the rooms', () => {
        const set = [
            '|-weather|RainDance|[from] ability: Drizzle|[of] p2a: Pelipper',
            '|-weather|RainDance|[upkeep]',
            '|-fieldstart|move: Trick Room|[of] p2a: Blissey',
            '|-fieldstart|move: Electric Terrain',
        ];
        expect(chips(set).field).toEqual(['rain', 'electricterrain', 'trickroom']);
        expect(chips([...set, '|-fieldend|move: Trick Room', '|-fieldend|move: Electric Terrain', '|-weather|none']).field).toEqual([]);
        expect(chips(['|-weather|Snowscape']).field).toEqual(['snow']);
    });
});
