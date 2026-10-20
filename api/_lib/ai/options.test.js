import { describe, expect, it } from 'vitest';

import { legalOptions } from './options.js';

const request = (active) => ({
    active: [{ moves: [{ move: 'Flare Blitz', id: 'flareblitz', pp: 24, maxpp: 24 }, { move: 'Roost', id: 'roost', pp: 8, maxpp: 8 }], ...active }],
    side: { pokemon: [{ details: 'Charizard, L50', condition: '153/153', active: true }, { details: 'Garchomp, L50', condition: '183/183', active: false }] },
});

describe('legalOptions', () => {
    it('Mega Evolves with any move when the sim allows it', () => {
        const moves = legalOptions(request({ canMegaEvo: true })).filter((o) => o.kind === 'move');
        expect(moves.map((o) => o.choice)).toEqual(['move 1 mega', 'move 2 mega']);
    });

    it('plain moves otherwise, and switches never carry it', () => {
        const options = legalOptions(request({}));
        expect(options.map((o) => o.choice)).toEqual(['move 1', 'move 2', 'switch 2']);
        expect(legalOptions(request({ canMegaEvo: true })).find((o) => o.kind === 'switch').choice).toBe('switch 2');
    });
});
