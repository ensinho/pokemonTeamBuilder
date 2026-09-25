import { describe, it, expect } from 'vitest';
import { TRANSLATIONS } from './translations';

const guidePages = (language) => Object.entries(TRANSLATIONS[language].guide)
    .filter(([, value]) => value && Array.isArray(value.tips));

describe('page guides', () => {
    // Two points, every page (Enzo, 2026-09-24): the popover is a glance, and
    // a third tip was always the one nobody needed.
    it('give every page exactly two tips', () => {
        for (const language of ['en', 'pt']) {
            for (const [page, guide] of guidePages(language)) {
                expect(guide.tips, `${language}.guide.${page}`).toHaveLength(2);
            }
        }
    });

    it('cover the same pages in both languages', () => {
        const en = guidePages('en').map(([page]) => page).sort();
        const pt = guidePages('pt').map(([page]) => page).sort();
        expect(pt).toEqual(en);
    });
});
