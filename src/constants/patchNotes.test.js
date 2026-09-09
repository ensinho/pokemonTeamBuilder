import { describe, it, expect } from 'vitest';
import { PATCH_NOTES_VERSION } from './theme';
import { RELEASES, CURRENT_RELEASE, PAST_RELEASES, formatReleaseMonth } from './patchNotes';

const versionParts = (v) => String(v).split('.').map(Number);
const compare = (a, b) => {
    const [aMaj, aMin = 0, aPatch = 0] = versionParts(a);
    const [bMaj, bMin = 0, bPatch = 0] = versionParts(b);
    return (aMaj - bMaj) || (aMin - bMin) || (aPatch - bPatch);
};

describe('the release ledger', () => {
    it('leads with the version the modal is gated on', () => {
        expect(CURRENT_RELEASE.version).toBe(PATCH_NOTES_VERSION);
    });

    it('is ordered newest first', () => {
        for (let i = 1; i < RELEASES.length; i += 1) {
            expect(compare(RELEASES[i - 1].version, RELEASES[i].version)).toBeGreaterThan(0);
        }
    });

    it('lists no version twice', () => {
        const versions = RELEASES.map((r) => r.version);
        expect(new Set(versions).size).toBe(versions.length);
    });

    it('gives every release a month and at least one note', () => {
        for (const release of RELEASES) {
            expect(release.month).toMatch(/^\d{4}-\d{2}$/);
            expect(release.notes.length).toBeGreaterThan(0);
            for (const note of release.notes) {
                expect(note.key).toBeTruthy();
                expect(note.title).toMatch(/^patchNotes\./);
            }
        }
    });

    it('splits current from past without dropping anything', () => {
        expect([CURRENT_RELEASE, ...PAST_RELEASES]).toEqual(RELEASES);
    });

    it('gives the current release the illustration data the modal needs', () => {
        for (const note of CURRENT_RELEASE.notes) {
            expect(note.visual).toBeTruthy();
            expect(note.icon).toBeTruthy();
            expect(note.description).toMatch(/^patchNotes\./);
        }
    });
});

describe('formatReleaseMonth', () => {
    it('formats per language', () => {
        expect(formatReleaseMonth('2026-09', 'en')).toBe('September 2026');
        expect(formatReleaseMonth('2026-09', 'pt')).toBe('Setembro de 2026');
    });

    it('capitalises the portuguese month, which Intl lowercases', () => {
        expect(formatReleaseMonth('2026-06', 'pt')).toBe('Junho de 2026');
    });

    it('is not off by one month at a timezone boundary', () => {
        expect(formatReleaseMonth('2026-01', 'en')).toBe('January 2026');
        expect(formatReleaseMonth('2026-12', 'en')).toBe('December 2026');
    });

    it('returns empty for junk instead of throwing', () => {
        ['', null, undefined, 'nope', '2026'].forEach((v) => expect(formatReleaseMonth(v)).toBe(''));
    });
});
