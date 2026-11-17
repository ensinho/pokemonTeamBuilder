/**
 * A topic's last line, in the reader's language (2026-11-17). A message that
 * is only an attachment leaves a fixed English stand-in in the topic's
 * `lastMessageText` (`useForumStore.sendMessage`: "PokéPuzzle result",
 * "Shared team: <name>"…), which a Portuguese reader saw as is in the feed and
 * the rooms. The stand-ins stay what is stored — old topics keep them — and
 * are read back here into `forum.preview.*`. Anything else is a person's own
 * words and is shown untouched.
 */

const FIXED = {
    'PokéPuzzle result': 'puzzle',
    'Champion Challenge result': 'challenge',
    'Tier list': 'tierList',
    'Quiz result': 'quiz',
    "The day's receipt": 'receipt',
    'Battle invite': 'invite',
};

const TEAM_PREFIX = 'Shared team: ';

export const forumPreviewText = (text, t) => {
    const line = String(text || '').trim();
    if (!line) return '';
    const key = FIXED[line];
    if (key) return t(`forum.preview.${key}`);
    if (line.startsWith(TEAM_PREFIX)) return t('forum.preview.team', { name: line.slice(TEAM_PREFIX.length) });
    return line;
};
