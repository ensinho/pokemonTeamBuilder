import { useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAuthStore } from '../store/useAuthStore';
import { useFriendsStore } from '../store/useFriendsStore';
import { useForumStore } from '../store/useForumStore';
import { useCenterPolling, useCenterStore } from '../store/useCenterStore';
import { buildFriendActivity, centerCounts, friendsActiveToday } from '../utils/friendActivity';
import { meadowRoster } from '../utils/meadow';
import { dayKeyAt } from '../utils/challengeDay';
import { localDayKey } from '../utils/dailyCheckin';
import { diaryTopicId } from '../utils/forumDiary';
import { currentWeekKey, weeklyTopicId } from '../utils/forumWeekly';

const NO_FRIENDS = [];

/**
 * The Centro Pokémon's day as one object: the crowd (counts), today's Diário
 * and Torneio topics, and the friends' timeline. Home's "Hoje no Centro" and
 * the Friends page's "Atividade" read the same thing (useCenterStore polls).
 */
export function useFriendActivity({ myPuzzle = null } = {}) {
    const uid = useAuthStore((s) => s.userId);
    const isAnonymous = useAuthStore((s) => s.isAnonymous);
    const friends = useFriendsStore((s) => s.friends);
    const { topics, initTopicsListener } = useForumStore(useShallow((s) => ({ topics: s.topics, initTopicsListener: s.initTopicsListener })));
    useEffect(() => { initTopicsListener(); }, [initTopicsListener]);

    const isGuest = !uid || isAnonymous;
    const realFriends = isGuest ? NO_FRIENDS : friends;
    const friendIds = useMemo(() => realFriends.map((f) => f.userId).filter(Boolean).sort(), [realFriends]);
    useCenterPolling(uid, friendIds);

    const { todayRanks, puzzleDay, ranks, puzzles, posts, isLoaded } = useCenterStore(useShallow((s) => ({
        todayRanks: s.todayRanks, puzzleDay: s.puzzleDay, ranks: s.ranks, puzzles: s.puzzles, posts: s.posts, isLoaded: s.isLoaded,
    })));

    // The days roll over while a tab stays open; the poll re-renders often enough to notice.
    const today = localDayKey();
    const braToday = dayKeyAt(Date.now());
    const myWon = myPuzzle?.won;
    const myGuesses = myPuzzle?.guesses;

    const events = useMemo(() => buildFriendActivity({
        friends: realFriends,
        selfUid: uid,
        ranks,
        puzzles,
        posts,
        topics,
        today,
        myPuzzle: myGuesses ? { won: Boolean(myWon), guesses: myGuesses } : null,
    }), [realFriends, uid, ranks, puzzles, posts, topics, today, myWon, myGuesses]);

    const activeToday = useMemo(() => friendsActiveToday(events, [today, braToday]), [events, today, braToday]);
    // The meadow (2026-11-17): every friend's day, not just the latest lines,
    // so a quiet friend's morning puzzle still wakes their ghost.
    const meadow = useMemo(() => meadowRoster({
        friends: realFriends,
        events: buildFriendActivity({ friends: realFriends, selfUid: uid, ranks, puzzles, posts, topics: [], today, limit: 1000 }),
        todayKeys: [today, braToday],
        max: 1000,
    }), [realFriends, uid, ranks, puzzles, posts, today, braToday]);
    const counts = useMemo(() => centerCounts({ puzzleDay, ranks: todayRanks }), [puzzleDay, todayRanks]);
    const diaryTopic = useMemo(() => topics.find((tp) => tp.id === diaryTopicId(braToday)) || null, [topics, braToday]);
    const weeklyTopic = useMemo(() => topics.find((tp) => tp.id === weeklyTopicId(currentWeekKey())) || null, [topics]);

    return {
        events,
        activeToday,
        meadow,
        counts,
        diaryTopic,
        diaryTopicId: diaryTopicId(braToday),
        weeklyTopic,
        isLoaded,
        isGuest,
        hasFriends: friendIds.length > 0,
        today,
        braToday,
    };
}
