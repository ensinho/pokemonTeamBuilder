/**
 * Friend activity (2026-11-09, "Atividade dos amigos"): one timeline built
 * from documents the app can already read — nothing new is stored for it.
 *
 *   - the Champion boards   `public/data/challengeRanks/{day}[_blue]` (world-readable)
 *   - the PokéPuzzle rows   `public/data/puzzleDays/{day}/players/{uid}` (signed-in)
 *   - the Diário do dia     `forumTopics/diary-{day}/messages` (public)
 *   - forum topics          the topics listener the app already holds
 *   - friends' public cards `publicProfiles` (the streak) and the friendship's date
 *
 * Pure functions over plain data, so the wording, order and limits are tested
 * without Firestore. Views never re-derive an event — they word `kind`.
 */

export const CHAMPIONS = ['cynthia', 'blue'];
export const STREAK_MILESTONES = [7, 14, 30, 50, 100, 150, 200, 365, 500, 1000];
export const ACTIVITY_LIMIT = 30;
const NEW_FRIEND_DAYS = 7;
const TOPIC_DAYS = 2;
const DAY_MS = 86400000;

const ms = (iso) => {
    const value = Date.parse(iso || '');
    return Number.isFinite(value) ? value : 0;
};

const clip = (text, max = 90) => {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
};

/** A friend's place on each board of one champion's day. */
export function championEvents(ranks, champion, friendIds) {
    if (!ranks?.boards || !friendIds?.size) return [];
    const dayKey = ranks.dayKey || null;
    return ['daily', 'free'].flatMap((board) => (ranks.boards[board] || [])
        .map((entry, index) => ({ entry, place: index + 1 }))
        .filter(({ entry }) => entry?.uid && friendIds.has(entry.uid))
        .map(({ entry, place }) => ({
            id: `champion-${champion}-${board}-${dayKey}-${entry.uid}`,
            kind: 'champion',
            uid: entry.uid,
            name: entry.name || null,
            champion,
            board,
            place,
            turns: Number(entry.turns) || 0,
            dayKey,
            at: entry.at || null,
        })));
}

/** A friend's PokéPuzzle of one day: the colour grid only, never letters. */
export function puzzleEvents(rows, dayKey) {
    return (rows || []).filter((row) => row?.uid).map((row) => ({
        id: `puzzle-${dayKey}-${row.uid}`,
        kind: 'puzzle',
        uid: row.uid,
        name: row.name || null,
        won: row.won === true,
        guesses: Number(row.guesses) || (Array.isArray(row.rows) ? row.rows.length : 0),
        rows: Array.isArray(row.rows) ? row.rows.slice(0, 8) : [],
        dayKey,
        at: row.at || null,
    }));
}

/** What a Diário message carried, for the line's wording. */
const attachmentOf = (message) => (message.sharedPuzzle ? 'puzzle'
    : message.sharedChallenge ? 'challenge'
        : message.sharedTeam ? 'team'
            : null);

/** A friend's messages in a room (the Diário do dia). */
export function postEvents(messages, topicId, friendIds, dayKey = null) {
    if (!friendIds?.size) return [];
    return (messages || [])
        .filter((m) => m?.createdBy && friendIds.has(m.createdBy))
        .map((m) => ({
            id: `post-${topicId}-${m.id}`,
            kind: 'post',
            uid: m.createdBy,
            name: m.creatorName || null,
            topicId,
            dayKey,
            attachment: attachmentOf(m),
            text: clip(m.text),
            at: m.createdAt || null,
        }));
}

/** Topics a friend opened in the last two days. */
export function topicEvents(topics, friendIds, now = Date.now()) {
    if (!friendIds?.size) return [];
    return (topics || [])
        .filter((tp) => tp?.createdBy && friendIds.has(tp.createdBy) && now - ms(tp.createdAt) < TOPIC_DAYS * DAY_MS)
        .map((tp) => ({
            id: `topic-${tp.id}`,
            kind: 'topic',
            uid: tp.createdBy,
            name: tp.creatorName || null,
            topicId: tp.id,
            title: clip(tp.title, 70),
            at: tp.createdAt || null,
        }));
}

/**
 * From the friends' own cards: a streak that reached a milestone today, and a
 * friendship made this week. A streak has no hour, so it sits at the start of
 * its day — under the things that happened later that day.
 */
export function friendEvents(friends, { today, now = Date.now() } = {}) {
    return (friends || []).flatMap((friend) => {
        if (!friend?.userId) return [];
        const events = [];
        const streak = friend.streak || null;
        const count = Number(streak?.count) || 0;
        if (today && streak?.lastVisit === today && STREAK_MILESTONES.includes(count)) {
            events.push({
                id: `streak-${friend.userId}-${count}`,
                kind: 'streak',
                uid: friend.userId,
                name: friend.displayName || null,
                count,
                at: `${today}T00:00:00`,
            });
        }
        if (friend.since && now - ms(friend.since) < NEW_FRIEND_DAYS * DAY_MS) {
            events.push({
                id: `friend-${friend.userId}`,
                kind: 'friend',
                uid: friend.userId,
                name: friend.displayName || null,
                at: friend.since,
            });
        }
        return events;
    });
}

/** How a friend's puzzle compares with the trainer's own, when both played. */
export function compareGuesses(friend, mine) {
    if (!friend || !mine) return null;
    const score = (r) => (r.won ? r.guesses : 99);
    const a = score(friend);
    const b = score(mine);
    return a < b ? 'ahead' : a > b ? 'behind' : 'tied';
}

/**
 * Every source merged into one timeline: newest first, one entry per event,
 * never the trainer's own, each wearing the friend's current card (name,
 * avatar, frame) when the friend list knows it.
 */
export function buildFriendActivity({
    friends = [],
    selfUid = null,
    ranks = {},
    puzzles = [],
    posts = [],
    topics = [],
    today = null,
    myPuzzle = null,
    now = Date.now(),
    limit = ACTIVITY_LIMIT,
} = {}) {
    const byId = new Map((friends || []).filter((f) => f?.userId).map((f) => [f.userId, f]));
    const friendIds = new Set(byId.keys());
    if (selfUid) friendIds.delete(selfUid);
    if (!friendIds.size) return [];

    const events = [
        ...Object.entries(ranks || {}).flatMap(([key, doc]) => {
            const champion = CHAMPIONS.find((c) => key.startsWith(c)) || 'cynthia';
            return championEvents(doc, champion, friendIds);
        }),
        ...(puzzles || []).flatMap(({ dayKey, rows }) => puzzleEvents(rows, dayKey).filter((e) => friendIds.has(e.uid))),
        ...(posts || []).flatMap(({ topicId, dayKey, messages }) => postEvents(messages, topicId, friendIds, dayKey)),
        ...topicEvents(topics, friendIds, now),
        ...friendEvents([...byId.values()].filter((f) => friendIds.has(f.userId)), { today, now }),
    ];

    const seen = new Set();
    return events
        .filter((e) => (seen.has(e.id) ? false : seen.add(e.id)))
        .map((e) => {
            const friend = byId.get(e.uid);
            const withFriend = friend ? { ...e, name: friend.displayName || e.name, profile: friend } : e;
            return e.kind === 'puzzle' && today && e.dayKey === today && myPuzzle
                ? { ...withFriend, vsMe: compareGuesses(e, myPuzzle) }
                : withFriend;
        })
        .sort((a, b) => ms(b.at) - ms(a.at) || a.id.localeCompare(b.id))
        .slice(0, limit);
}

/** The friends who played today (a puzzle, a Champion, a Diário post), most recent first. */
export function friendsActiveToday(events, todayKeys = []) {
    const days = new Set(todayKeys.filter(Boolean));
    const seen = new Set();
    const out = [];
    (events || []).forEach((e) => {
        if (seen.has(e.uid) || !['puzzle', 'champion', 'post'].includes(e.kind)) return;
        const isToday = e.dayKey ? days.has(e.dayKey) : days.has(String(e.at || '').slice(0, 10));
        if (!isToday) return;
        seen.add(e.uid);
        out.push(e.profile || { userId: e.uid, displayName: e.name });
    });
    return out;
}

/** The day's crowd, summed from the counters already public. */
export function centerCounts({ puzzleDay = null, ranks = {} } = {}) {
    const champions = Object.values(ranks || {}).reduce((sum, doc) => sum
        + (Number(doc?.played?.daily) || 0) + (Number(doc?.played?.free) || 0), 0);
    const wins = Object.values(ranks || {}).reduce((sum, doc) => sum
        + (Number(doc?.wins?.daily) || 0) + (Number(doc?.wins?.free) || 0), 0);
    return {
        puzzle: Number(puzzleDay?.total) || 0,
        champions,
        championWins: wins,
    };
}
