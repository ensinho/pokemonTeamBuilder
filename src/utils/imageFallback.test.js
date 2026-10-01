import { describe, it, expect } from 'vitest';
import { fallbackImage } from './imageFallback';

const brokenImg = (src) => ({ src, baseURI: 'https://app.test/builder' });
const fail = (img, handler) => handler({ currentTarget: img });

describe('fallbackImage', () => {
    it('swaps a broken image for the fallback', () => {
        const img = brokenImg('https://cdn.test/25.png');
        fail(img, fallbackImage('https://cdn.test/front/25.png'));
        expect(img.src).toBe('https://cdn.test/front/25.png');
    });

    it('does not reassign when the fallback itself fails', () => {
        const img = brokenImg('https://cdn.test/front/25.png');
        let writes = 0;
        const tracked = {
            baseURI: img.baseURI,
            get src() { return img.src; },
            set src(value) { writes += 1; img.src = value; },
        };
        const handler = fallbackImage('https://cdn.test/front/25.png');
        for (let i = 0; i < 5; i += 1) fail(tracked, handler);
        expect(writes).toBe(0);
    });

    it('stops after one swap when the fallback is broken too', () => {
        const img = brokenImg('https://cdn.test/art/25.png');
        const handler = fallbackImage('https://cdn.test/front/25.png');
        fail(img, handler);
        fail(img, handler);
        fail(img, handler);
        expect(img.src).toBe('https://cdn.test/front/25.png');
    });

    it('compares a relative fallback by its resolved URL', () => {
        const img = brokenImg('https://app.test/assets/ball.svg');
        let writes = 0;
        const tracked = { baseURI: img.baseURI, get src() { return img.src; }, set src(v) { writes += 1; img.src = v; } };
        fail(tracked, fallbackImage('/assets/ball.svg'));
        expect(writes).toBe(0);
    });

    it('treats a data URI fallback like any other URL', () => {
        const ball = 'data:image/svg+xml,%3Csvg%3E%3C/svg%3E';
        const img = brokenImg('https://cdn.test/25.png');
        const handler = fallbackImage(ball);
        fail(img, handler);
        img.src = ball;
        fail(img, handler);
        expect(img.src).toBe(ball);
    });

    it('ignores an event without an image or a missing fallback', () => {
        expect(() => fallbackImage('x')({})).not.toThrow();
        const img = brokenImg('https://cdn.test/25.png');
        fail(img, fallbackImage(null));
        expect(img.src).toBe('https://cdn.test/25.png');
    });
});
