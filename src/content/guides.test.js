import { describe, expect, it } from 'vitest';
import { GUIDES, guideContent } from './guides';
import { GUIDE_INDEX, GUIDE_SLUGS, guideMeta } from './guideIndex';
import { STATIC_PAGES } from '../utils/seoPages';

// The guides are read by people, by search engines and by AI assistants, in
// two languages (2026-10-30). These keep the two versions the same guide.
describe('guides', () => {
    it('has text for every guide in the index, and no text without an entry', () => {
        expect(Object.keys(GUIDES).sort()).toEqual([...GUIDE_SLUGS].sort());
    });

    it('keeps English and Portuguese on the same structure and the same links', () => {
        for (const slug of GUIDE_SLUGS) {
            const en = guideContent(slug, 'en');
            const pt = guideContent(slug, 'pt');
            expect(pt.sections.length, slug).toBe(en.sections.length);
            expect(pt.faq.length, slug).toBe(en.faq.length);
            en.sections.forEach((section, i) => {
                const other = pt.sections[i];
                expect((other.paragraphs || []).length, `${slug} §${i}`).toBe((section.paragraphs || []).length);
                expect((other.steps || []).length, `${slug} §${i}`).toBe((section.steps || []).length);
                expect((other.links || []).map((l) => l.to), `${slug} §${i}`).toEqual((section.links || []).map((l) => l.to));
            });
        }
    });

    it('asks its section headings as questions', () => {
        for (const slug of GUIDE_SLUGS) {
            for (const language of ['en', 'pt']) {
                for (const section of guideContent(slug, language).sections) {
                    expect(section.heading.endsWith('?'), `${slug} ${language}: ${section.heading}`).toBe(true);
                }
            }
        }
    });

    it('links only to pages that exist', () => {
        const known = new Set([...Object.keys(STATIC_PAGES), ...GUIDE_SLUGS.map((s) => `/guides/${s}`)]);
        for (const slug of GUIDE_SLUGS) {
            for (const language of ['en', 'pt']) {
                for (const section of guideContent(slug, language).sections) {
                    for (const link of section.links || []) expect(known.has(link.to), `${slug}: ${link.to}`).toBe(true);
                }
            }
        }
    });

    it('fits each title and description where a results page shows them', () => {
        for (const guide of GUIDE_INDEX) {
            for (const language of ['en', 'pt']) {
                const meta = guideMeta(guide.slug, language);
                expect(meta.description.length, `${guide.slug} ${language}`).toBeGreaterThanOrEqual(110);
                expect(meta.description.length, `${guide.slug} ${language}`).toBeLessThanOrEqual(160);
                expect(meta.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            }
        }
    });
});
