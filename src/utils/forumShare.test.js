import { describe, it, expect } from 'vitest';
import { topicPath, topicUrl } from './forumShare';

describe('topicPath', () => {
    it('points at a topic, and optionally at one comment', () => {
        expect(topicPath('abc')).toBe('/feed?topic=abc');
        expect(topicPath('abc', 'm1')).toBe('/feed?topic=abc&c=m1');
    });

    it('encodes ids', () => {
        expect(topicPath('a b&c')).toBe('/feed?topic=a+b%26c');
    });
});

describe('topicUrl', () => {
    it('builds the Vercel URL (base "/")', () => {
        expect(topicUrl('abc', { origin: 'https://pokemonbuilder.app', base: '/' }))
            .toBe('https://pokemonbuilder.app/feed?topic=abc');
    });

    it('keeps the GitHub Pages base path', () => {
        expect(topicUrl('abc', { origin: 'https://x.github.io', base: '/pokemonTeamBuilder/', commentId: 'm' }))
            .toBe('https://x.github.io/pokemonTeamBuilder/feed?topic=abc&c=m');
    });
});
