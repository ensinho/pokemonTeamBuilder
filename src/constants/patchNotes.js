import { PATCH_NOTES_VERSION } from './theme';
import { SUPPORT_URL } from './support';

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
//
// `links` (a list from constants/social.js) makes a note a box holding one real
// link per entry.
// **Every current release carries the donation note** (`key: 'buy-me-a-coffee'`,
// `href: SUPPORT_URL`) — a fixed rule set by Enzo on 2026-11-11, enforced by
// patchNotes.test.js. As a side note it takes one of the three slots.
//
// `href` makes a note a link that leaves the site, drawn as a centred card with a
// real button. `thanks: false` drops the thank-you band for a release with
// nothing to thank anyone for.
export const RELEASES = [
    {
        version: PATCH_NOTES_VERSION,
        month: '2026-11',
        thanks: false,
        // The Home that answers (2026-11-12): the champions' day as 0/2 · 1/2 ·
        // 2/2 per champion, each row a link straight to that battle; the
        // banner's scenes; the Home by what the trainer came for. The CTA lands
        // on the Home itself — that is where it changed.
        notes: [
            {
                key: 'champions-day',
                featured: true,
                icon: 'crown',
                visual: 'championsDay',
                title: 'patchNotes.championsDayTitle',
                description: 'patchNotes.championsDayDesc',
                cta: 'patchNotes.championsDayCta',
                path: '/',
            },
            { key: 'hero-scenes', icon: 'sparkles', title: 'patchNotes.heroScenesTitle', description: 'patchNotes.heroScenesDesc', cta: 'patchNotes.heroScenesCta', path: '/' },
            { key: 'home-personas', icon: 'heart', title: 'patchNotes.homePersonasTitle', description: 'patchNotes.homePersonasDesc', cta: 'patchNotes.homePersonasCta', path: '/' },
            // Fixed rule (Enzo, 2026-11-11): every release asks for support.
            { key: 'buy-me-a-coffee', icon: 'coffee', title: 'patchNotes.supportTitle', description: 'patchNotes.supportShort', cta: 'patchNotes.supportCta', href: SUPPORT_URL },
        ],
    },
    {
        version: '1.24.0',
        month: '2026-11',
        thanks: false,
        // The mascot with a body (2026-11-11): the icon's ghost as a 3D bot,
        // everywhere he was, and now playing along in the games and the forum.
        // The featured visual introduces him gently: the line drawing gives
        // way to the body, which waves once.
        notes: [
            {
                key: 'mascot-3d',
                featured: true,
                icon: 'sparkles',
                visual: 'mascotBot',
                title: 'patchNotes.mascotBotTitle',
                description: 'patchNotes.mascotBotDesc',
                cta: 'patchNotes.mascotBotCta',
                path: '/profile?tab=appearance',
            },
            { key: 'mascot-games', icon: 'puzzle', title: 'patchNotes.mascotGamesTitle', description: 'patchNotes.mascotGamesDesc', cta: 'patchNotes.mascotGamesCta', path: '/pokepuzzle' },
            { key: 'mascot-forum', icon: 'message', title: 'patchNotes.mascotForumTitle', description: 'patchNotes.mascotForumDesc', cta: 'patchNotes.mascotForumCta', path: '/feed' },
            // Fixed rule (Enzo, 2026-11-11): every release asks for support.
            { key: 'buy-me-a-coffee', icon: 'coffee', title: 'patchNotes.supportTitle', description: 'patchNotes.supportShort', cta: 'patchNotes.supportCta', href: SUPPORT_URL },
        ],
    },
    {
        version: '1.23.0',
        month: '2026-11',
        thanks: false,
        // The desktop Pokédex entry rebuilt in the phone's language, and the
        // quick look a battle opens from ⌘K. The CTA lands on an entry, not the
        // list, so the first click shows what changed.
        notes: [
            {
                key: 'pokedex-desktop',
                featured: true,
                icon: 'pokeball',
                visual: 'pokedexDesk',
                title: 'patchNotes.pokedexDeskTitle',
                description: 'patchNotes.pokedexDeskDesc',
                cta: 'patchNotes.pokedexDeskCta',
                path: '/pokemon/445',
            },
            { key: 'battle-quick-look', icon: 'search', title: 'patchNotes.quickLookTitle', description: 'patchNotes.quickLookDesc', cta: 'patchNotes.quickLookCta', path: '/challenge' },
            { key: 'moves-table', icon: 'swords', title: 'patchNotes.movesTableTitle', description: 'patchNotes.movesTableDesc', cta: 'patchNotes.movesTableCta', path: '/pokemon/445?tab=moves' },
            // Fixed rule (Enzo, 2026-11-11): every release asks for support.
            { key: 'buy-me-a-coffee', icon: 'coffee', title: 'patchNotes.supportTitle', description: 'patchNotes.supportShort', cta: 'patchNotes.supportCta', href: SUPPORT_URL },
        ],
    },
    {
        version: '1.22.0',
        month: '2026-11',
        thanks: false,
        notes: [
            { key: 'social-profiles', title: 'patchNotes.socialTitle' },
            { key: 'buy-me-a-coffee', title: 'patchNotes.supportTitle' },
            { key: 'pokemon-center', title: 'patchNotes.centerTitle' },
            { key: 'tera-zmoves', title: 'patchNotes.gimmicksTitle' },
        ],
    },
    {
        version: '1.21.0',
        month: '2026-11',
        thanks: false,
        notes: [
            { key: 'champion-blue', title: 'patchNotes.blueTitle' },
            { key: 'challenge-boards', title: 'patchNotes.boardsTitle' },
            { key: 'challenge-share', title: 'patchNotes.challengeShareTitle' },
        ],
    },
    {
        version: '1.20.0',
        month: '2026-11',
        thanks: false,
        notes: [
            {
                key: 'buy-me-a-coffee',
                featured: true,
                icon: 'coffee',
                visual: 'support',
                title: 'patchNotes.supportTitle',
                description: 'patchNotes.supportBody',
                cta: 'patchNotes.supportCta',
                href: SUPPORT_URL,
            },
        ],
    },
    {
        version: '1.19.0',
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
