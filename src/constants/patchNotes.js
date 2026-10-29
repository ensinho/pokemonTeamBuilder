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
//
// The current release lays out side by side: the note marked `featured` is the
// large card on the left, the others stack at equal height on the right (one
// column on a phone, featured first). Keep it to one featured note and three
// side notes — the right column divides its height evenly between them. A
// release with no side notes gives the featured card the full width.
export const RELEASES = [
    {
        version: PATCH_NOTES_VERSION,
        month: '2026-10',
        // Both notes answer feedback sent through the footer: the default thanks.
        notes: [
            {
                key: 'team-compare',
                featured: true,
                icon: 'scale',
                visual: 'compare',
                title: 'patchNotes.compareTitle',
                description: 'patchNotes.compareDesc',
                cta: 'patchNotes.compareCta',
                path: '/teams',
            },
            { key: 'lazarus-gyms', icon: 'trophy', title: 'patchNotes.lazarusTitle', description: 'patchNotes.lazarusDesc', cta: 'patchNotes.lazarusCta', path: '/gyms?game=lazarus' },
        ],
    },
    {
        version: '1.18.0',
        month: '2026-10',
        // Not a suggestion-driven release, so it thanks in its own words.
        thanks: 'patchNotes.brandThanks',
        notes: [
            {
                key: 'pokemonbuilder-brand',
                featured: true,
                icon: 'sparkles',
                visual: 'brand',
                title: 'patchNotes.brandTitle',
                description: 'patchNotes.brandDesc',
                cta: 'patchNotes.brandCta',
                path: '/',
            },
            { key: 'neon-sticker-look', icon: 'flower', title: 'patchNotes.lookTitle', description: 'patchNotes.lookDesc', cta: 'patchNotes.lookCta', path: '/profile?tab=appearance' },
        ],
    },
    {
        version: '1.17.0',
        month: '2026-10',
        notes: [
            {
                key: 'friend-battles-console',
                featured: true,
                icon: 'swords',
                visual: 'versus',
                title: 'patchNotes.versusTitle',
                description: 'patchNotes.versusDesc',
                cta: 'patchNotes.versusCta',
                path: '/battles',
            },
            { key: 'battle-music', icon: 'sparkles', title: 'patchNotes.musicTitle', description: 'patchNotes.musicDesc', cta: 'patchNotes.musicCta', path: '/challenge' },
            { key: 'mega-evolution', icon: 'crown', title: 'patchNotes.megaTitle', description: 'patchNotes.megaDesc', cta: 'patchNotes.challengeCta', path: '/challenge' },
            { key: 'battle-cache', icon: 'key', title: 'patchNotes.battleCacheTitle', description: 'patchNotes.battleCacheDesc', cta: 'patchNotes.battleCacheCta', path: '/battles' },
        ],
    },
    {
        version: '1.16.0',
        month: '2026-10',
        notes: [
            {
                key: 'champion-challenge',
                featured: true,
                icon: 'crown',
                visual: 'challenge',
                title: 'patchNotes.challengeTitle',
                description: 'patchNotes.challengeDesc',
                cta: 'patchNotes.challengeCta',
                path: '/challenge',
            },
        ],
    },
    {
        version: '1.15.0',
        month: '2026-10',
        notes: [
            { key: 'reg-mc', title: 'patchNotes.regMcTitle' },
            { key: 'tournament-win-rates', title: 'patchNotes.tourTitle' },
            { key: 'champions-sets', title: 'patchNotes.champSetsTitle' },
            { key: 'balanced-suggestions', title: 'patchNotes.balanceTitle' },
        ],
    },
    {
        version: '1.14.0',
        month: '2026-10',
        notes: [
            { key: 'pre-fairy-chart', title: 'patchNotes.preFairyTitle' },
            { key: 'account-security', title: 'patchNotes.accountTitle' },
        ],
    },
    {
        version: '1.13.0',
        month: '2026-09',
        notes: [
            { key: 'material-layer', title: 'patchNotes.materialTitle' },
            { key: 'global-search', title: 'patchNotes.searchTitle' },
            { key: 'small-moments', title: 'patchNotes.delightTitle' },
            { key: 'puzzle-tab', title: 'patchNotes.dockTitle' },
        ],
    },
    {
        version: '1.12.0',
        month: '2026-09',
        notes: [
            { key: 'smogon-tiers', title: 'patchNotes.tiersTitle' },
            { key: 'builder-tier-filter', title: 'patchNotes.tierFilterTitle' },
        ],
    },
    {
        version: '1.11.0',
        month: '2026-09',
        notes: [{ key: 'puzzle-forum-share', title: 'patchNotes.puzzleShareTitle' }],
    },
    {
        version: '1.10.0',
        month: '2026-09',
        notes: [
            { key: 'forum-battle-invites', title: 'patchNotes.invitesTitle' },
            { key: 'feed-latest-message', title: 'patchNotes.latestTitle' },
        ],
    },
    {
        version: '1.9.0',
        month: '2026-09',
        notes: [
            { key: 'tera-toggle', title: 'patchNotes.teraTitle' },
            { key: 'patch-history', title: 'patchNotes.historyTitle' },
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
