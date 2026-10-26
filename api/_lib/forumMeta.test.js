import { describe, it, expect, afterEach } from 'vitest';
import { escapeHtml, topicIdFromUrl, topicMetaFromDoc, fetchTopicMeta } from './forumMeta.js';

const doc = (fields) => ({
    fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, { stringValue: v }])),
});

describe('topicIdFromUrl', () => {
    it('reads the topic of a feed link', () => {
        expect(topicIdFromUrl('/feed?topic=abc123')).toBe('abc123');
        expect(topicIdFromUrl('/feed/?topic=abc&c=m1')).toBe('abc');
    });

    it('ignores other pages and ids that are not Firestore ids', () => {
        expect(topicIdFromUrl('/builder?topic=abc')).toBeNull();
        expect(topicIdFromUrl('/feed')).toBeNull();
        expect(topicIdFromUrl('/feed?topic=a/b')).toBeNull();
        expect(topicIdFromUrl('/feed?topic=%22%3E%3Cscript%3E')).toBeNull();
    });
});

describe('topicMetaFromDoc', () => {
    it('builds a title and a description from the post', () => {
        const meta = topicMetaFromDoc(doc({ title: 'Best Platinum team?', bodyPreview: 'Empoleon,  Luxray\nand Garchomp' }));
        expect(meta.title).toBe('Best Platinum team? | PokeBuilder Forum');
        expect(meta.description).toBe('Empoleon, Luxray and Garchomp');
    });

    it('falls back to the author when the post has no text', () => {
        expect(topicMetaFromDoc(doc({ title: 'T', creatorName: 'Ash' })).description).toContain('@Ash');
    });

    it('clips long text and refuses a topic with no title', () => {
        expect(topicMetaFromDoc(doc({ title: 'x'.repeat(200) })).title.length).toBeLessThan(130);
        expect(topicMetaFromDoc(doc({ bodyPreview: 'no title' }))).toBeNull();
        expect(topicMetaFromDoc(null)).toBeNull();
    });
});

describe('escapeHtml', () => {
    it('neutralises markup and attribute breaks', () => {
        expect(escapeHtml('"><script>alert(1)</script>&\'')).toBe('&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;&amp;&#39;');
    });
});

describe('fetchTopicMeta', () => {
    // Assigning undefined to process.env stores the string "undefined".
    const restore = (key, value) => { if (value === undefined) delete process.env[key]; else process.env[key] = value; };
    const saved = process.env.FIREBASE_PROJECT_ID;
    const savedVite = process.env.VITE_FIREBASE_PROJECT_ID;
    afterEach(() => {
        restore('FIREBASE_PROJECT_ID', saved);
        restore('VITE_FIREBASE_PROJECT_ID', savedVite);
    });

    it('reads the topic document over REST', async () => {
        process.env.FIREBASE_PROJECT_ID = 'proj';
        let asked = '';
        const fetchImpl = async (url) => {
            asked = url;
            return { ok: true, json: async () => doc({ title: 'Hello' }) };
        };
        const meta = await fetchTopicMeta('t1', { fetchImpl });
        expect(asked).toContain('/projects/proj/databases/(default)/documents/artifacts/');
        expect(asked).toContain('/public/data/forumTopics/t1');
        expect(meta.title).toContain('Hello');
    });

    it('resolves null on a miss, an error or a timeout', async () => {
        process.env.FIREBASE_PROJECT_ID = 'proj';
        expect(await fetchTopicMeta('t', { fetchImpl: async () => ({ ok: false }) })).toBeNull();
        expect(await fetchTopicMeta('t', { fetchImpl: async () => { throw new Error('down'); } })).toBeNull();
        const hang = (url, { signal }) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('aborted'))));
        expect(await fetchTopicMeta('t', { fetchImpl: hang, timeoutMs: 20 })).toBeNull();
    });

    it('does nothing without a project id', async () => {
        process.env.FIREBASE_PROJECT_ID = '';
        process.env.VITE_FIREBASE_PROJECT_ID = '';
        expect(await fetchTopicMeta('t', { fetchImpl: async () => { throw new Error('should not be called'); } })).toBeNull();
    });
});
