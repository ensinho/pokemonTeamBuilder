import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

import { ChallengeShareCard } from './ChallengeShareCard';
import { buildChallengeShare } from '../utils/challengeShare';

const render = (share) => renderToStaticMarkup(
    <MemoryRouter>
        <ChallengeShareCard share={share} />
    </MemoryRouter>,
);

describe('ChallengeShareCard', () => {
    it('draws a shared win: the level, the figures, the curve, the place, a way in', () => {
        const html = render(buildChallengeShare({
            dayKey: '2026-10-15', difficulty: 'platinum', status: 'won', result: { turns: 18, remaining: 3, score: 1420 },
            streak: 4, place: 2, board: 'daily', curve: [0.5, 0.2, 0.9],
        }));
        expect(html).toContain('badge--success');
        expect(html).toMatch(/18/);
        expect(html).toMatch(/1420/);
        expect(html).toContain('challenge-share-spark');
        expect(html).toMatch(/[▁▂▃▄▅▆▇█]{3}/);
    });

    it('draws a forged payload clamped, never as markup', () => {
        const html = render({ v: 1, dayKey: '2026-10-15', difficulty: '<img src=x onerror=alert(1)>', won: true, turns: 1e9, remaining: 40, score: -3, spark: '<script>alert(1)</script>' });
        expect(html).not.toMatch(/<script|<img|onerror/);
        expect(html).toMatch(/999/); // turns clamped
        expect(html).not.toContain('challenge-share-spark'); // a bogus curve is dropped
    });

    it('draws nothing for something that is not a challenge result', () => {
        expect(render(null)).toBe('');
        expect(render({ v: 9 })).toBe('');
    });
});
