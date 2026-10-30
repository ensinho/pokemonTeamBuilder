import { describe, expect, it } from 'vitest';
import { SITE_PAGES, SITE_PAGE_PATHS, sitePageContent } from './sitePages';
import { GUIDE_SLUGS } from './guideIndex';
import { STATIC_PAGES, pageMeta } from '../utils/seoPages';

// About, How it works, Privacy and Terms (2026-10-30): the pages that tell
// people and answer engines who runs the site and how. Two languages, one page.
const KEYS = Object.values(SITE_PAGE_PATHS);

describe('site pages', () => {
    it('has text for every page it routes, and every one is an indexed static page', () => {
        expect(Object.keys(SITE_PAGES).sort()).toEqual([...KEYS].sort());
        for (const [path, key] of Object.entries(SITE_PAGE_PATHS)) expect(STATIC_PAGES[path], path).toBe(key);
    });

    it('keeps English and Portuguese on the same structure and the same links', () => {
        for (const key of KEYS) {
            const en = sitePageContent(key, 'en');
            const pt = sitePageContent(key, 'pt');
            expect(pt.sections.length, key).toBe(en.sections.length);
            en.sections.forEach((section, i) => {
                const other = pt.sections[i];
                expect((other.paragraphs || []).length, `${key} §${i}`).toBe((section.paragraphs || []).length);
                expect((other.steps || []).length, `${key} §${i}`).toBe((section.steps || []).length);
                const targets = (s) => (s.links || []).map((l) => l.to || l.href);
                expect(targets(other), `${key} §${i}`).toEqual(targets(section));
            });
        }
    });

    it('links only to pages that exist, or out to a full URL', () => {
        const known = new Set([...Object.keys(STATIC_PAGES), ...GUIDE_SLUGS.map((s) => `/guides/${s}`)]);
        for (const key of KEYS) {
            for (const language of ['en', 'pt']) {
                for (const section of sitePageContent(key, language).sections) {
                    for (const link of section.links || []) {
                        if (link.href) expect(link.href, `${key}: ${link.href}`).toMatch(/^(https:\/\/|mailto:)/);
                        else expect(known.has(link.to), `${key}: ${link.to}`).toBe(true);
                    }
                }
            }
        }
    });

    it('dates every page and fits its description where a results page shows it', () => {
        for (const [path, key] of Object.entries(SITE_PAGE_PATHS)) {
            expect(SITE_PAGES[key].updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            for (const language of ['en', 'pt']) {
                const { description } = pageMeta(path, language);
                expect(description.length, `${key} ${language}`).toBeGreaterThanOrEqual(110);
                expect(description.length, `${key} ${language}`).toBeLessThanOrEqual(160);
            }
        }
    });
});
