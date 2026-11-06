import { describe, expect, it } from 'vitest';
import { tallyRatings } from './teamRating';

describe('tallyRatings', () => {
    it('counts one verdict per trainer, their latest', () => {
        const t = tallyRatings([
            { createdBy: 'a', rating: 'train' },
            { createdBy: 'a', rating: 'ready' },
            { createdBy: 'b', rating: 'ready' },
            { createdBy: 'c', rating: 'almost' },
            { createdBy: 'd', text: 'no rating' },
        ]);
        expect(t).toEqual({ train: 0, almost: 1, ready: 2, total: 3, top: 'ready' });
        expect(tallyRatings([]).top).toBeNull();
    });
});
