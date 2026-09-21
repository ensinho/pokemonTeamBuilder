import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';

/**
 * `public/push-sw.js` is a classic worker script — it can't be imported, so it
 * is evaluated here against a stand-in `self`. What is being pinned is the part
 * that decides what the tray actually shows: one entry per group, with a
 * running count, rather than one banner per push.
 */

let internals;

beforeAll(() => {
    const source = readFileSync(resolve(process.cwd(), 'public/push-sw.js'), 'utf8');
    const fakeSelf = { addEventListener: () => {}, registration: {}, clients: {} };
    // eslint-disable-next-line no-new-func
    new Function('self', source)(fakeSelf);
    internals = fakeSelf.__ptbPushInternals;
});

const payload = (overrides = {}) => internals.parsePushPayload(JSON.stringify({
    title: 'Sua vez!',
    body: 'Enzo está esperando sua jogada.',
    url: '/battles/b1',
    group: 'ptb-battles',
    groupTitle: '{{count}} batalhas esperando por você',
    groupBody: 'Toque para ver.',
    groupUrl: '/battles',
    ...overrides,
}));

describe('parsePushPayload', () => {
    it('always yields something showable, even from a malformed push', () => {
        // A subscription is `userVisibleOnly`: showing nothing costs the site
        // its permission, so a broken body must still render.
        const fallback = internals.parsePushPayload('not json');
        expect(fallback.title).toBeTruthy();
        expect(fallback.url).toBe('/');
    });
});

describe('buildNotification', () => {
    it('shows the battle itself when it is the only one waiting', () => {
        const { title, options } = internals.buildNotification(payload(), []);
        expect(title).toBe('Sua vez!');
        expect(options.data.url).toBe('/battles/b1');
        expect(options.tag).toBe('ptb-battles');
        expect(options.data.count).toBe(1);
    });

    it('collapses into one counted entry once something is already on screen', () => {
        const existing = [{ data: { count: 1, url: '/battles/b0' } }];
        const { title, options } = internals.buildNotification(payload(), existing);
        expect(title).toBe('2 batalhas esperando por você');
        // The summary can't point at one battle any more — it opens the list.
        expect(options.data.url).toBe('/battles');
        expect(options.data.count).toBe(2);
    });

    it('keeps counting across pushes, since the worker itself does not persist', () => {
        const existing = [{ data: { count: 4 } }];
        const { title, options } = internals.buildNotification(payload(), existing);
        expect(title).toBe('5 batalhas esperando por você');
        expect(options.data.count).toBe(5);
    });

    it('falls back to the single form when a payload has no group copy', () => {
        const { title } = internals.buildNotification(payload({ groupTitle: '' }), [{ data: { count: 2 } }]);
        expect(title).toBe('Sua vez!');
    });
});
