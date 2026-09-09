import { PATCH_NOTES_VERSION } from './theme';

// The release ledger — every version that shipped a "what's new" entry, newest
// first. The modal renders the first one in full (icon, illustration, CTA) and
// the rest as a compact history, which is what "let me re-read the
// announcements" needs: the current release plus what came before it.
//
// The current release takes its number from PATCH_NOTES_VERSION so the two can
// never disagree — that constant is what gates the modal, so it stays the single
// source of truth. `patchNotes.test.js` fails if a release is added without one.
//
// `month` is 'YYYY-MM'; it is formatted per language at render time, so a new
// release needs no new date copy. `visual` and `icon` are looked up in
// PatchNotesModal — the ledger stays data, not JSX.
export const RELEASES = [
    {
        version: PATCH_NOTES_VERSION,
        month: '2026-09',
        notes: [
            {
                key: 'tera-toggle',
                icon: 'sparkles',
                visual: 'tera',
                title: 'patchNotes.teraTitle',
                description: 'patchNotes.teraDesc',
                cta: 'patchNotes.teraCta',
                path: '/profile',
            },
            {
                key: 'patch-history',
                icon: 'flower',
                visual: 'history',
                title: 'patchNotes.historyTitle',
                description: 'patchNotes.historyDesc',
                cta: 'patchNotes.historyCta',
                expandsHistory: true,
            },
        ],
    },
    {
        version: '1.8.0',
        month: '2026-09',
        notes: [
            { key: 'champions-dex', title: 'patchNotes.championsTitle' },
            { key: 'playthrough-mode', title: 'patchNotes.playthroughTitle' },
            { key: 'new-games', title: 'patchNotes.newGamesTitle' },
        ],
    },
    {
        version: '1.7.3',
        month: '2026-06',
        notes: [{ key: 'cores-suggestions', title: 'patchNotes.synergyTitle' }],
    },
    {
        version: '1.7.2',
        month: '2026-06',
        notes: [{ key: 'pokepuzzle', title: 'patchNotes.pokepuzzleTitle' }],
    },
    {
        version: '1.7.0',
        month: '2026-06',
        notes: [{ key: 'chat-feed', title: 'patchNotes.feedTitle' }],
    },
    {
        version: '1.6.0',
        month: '2026-06',
        notes: [
            { key: 'active-team', title: 'patchNotes.activeTeamTitle' },
            { key: 'locations', title: 'patchNotes.locationsTitle' },
        ],
    },
];

export const CURRENT_RELEASE = RELEASES[0];
export const PAST_RELEASES = RELEASES.slice(1);

/**
 * '2026-09' → "September 2026" / "Setembro de 2026". Formatted rather than
 * translated so shipping a release never means writing a date string twice.
 */
export function formatReleaseMonth(month, language = 'en') {
    const [year, m] = String(month || '').split('-').map(Number);
    if (!year || !m) return '';
    const locale = language === 'pt' ? 'pt-BR' : 'en-US';
    const label = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' })
        .format(new Date(Date.UTC(year, m - 1, 1)));
    return label.charAt(0).toUpperCase() + label.slice(1);
}
