import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

// The mascot reads the trainer's persona for its tone; the real store boots Firebase.
vi.mock('../store/useAuthStore', () => ({ useAuthStore: (select) => select({ trainerProfile: null }) }));

import { Loader } from './Loader';

const html = (el) => renderToStaticMarkup(el);

describe('Loader', () => {
    it('is a scene of the mascot when a region waits, the Poké Ball beside content', () => {
        expect(html(<Loader />)).toContain('loader__mascot');
        expect(html(<Loader size="lg" scene="battle" block />)).toContain('loader--scene');
        expect(html(<Loader size="sm" scene="battle" />)).toContain('loader__ball');
        expect(html(<Loader size="xs" />)).not.toContain('mascot');
    });

    it('keeps the Poké Ball when asked (a game screen, an account being deleted)', () => {
        const ball = html(<Loader size="lg" scene="ball" />);
        expect(ball).toContain('loader__ball');
        expect(ball).not.toContain('mascot');
    });

    it('falls back to the capture scene for a name it does not know', () => {
        expect(html(<Loader scene="nope" />)).toContain('loader--scene');
    });

    it('always says what it is doing, the drawing stays decorative', () => {
        const out = html(<Loader size="lg" scene="battle" label="Entrando na sala da Cynthia…" />);
        expect(out).toContain('role="status"');
        expect(out).toContain('Entrando na sala da Cynthia…');
        expect(out).toMatch(/class="mascot[^"]*loader__mascot"[^>]*aria-hidden="true"/);
    });

    it('says nothing extra at first: the company arrives only once the wait runs on', () => {
        const out = html(<Loader size="lg" scene="pokedex" label="Abrindo a Pokédex…" />);
        expect(out).not.toContain('loader__aside');
    });
});
