import { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, doc, documentId, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { appId } from '../constants/firebase';
import { callAuthedApi } from '../services/apiClient';
import { useAuthStore } from '../store/useAuthStore';
import { useFriendsStore } from '../store/useFriendsStore';
import { leagueWeek, puzzleRecord, rankDay, rankWeek } from '../utils/puzzleStandings';

/**
 * The PokéPuzzle's day, together (components/pokepuzzle/PuzzleDayPanel.jsx
 * draws it). The result goes to the server once (api/daily-puzzle.js POST),
 * which answers with the distribution. Friends' rows are read from the day's
 * `players`; the league reads the same rows for the week's days, only once
 * `loadWeek()` is called.
 */
const MAX_PLAYERS = 30; // Firestore's `in` limit; the trainer is one of them.
const BUCKETS = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'miss'];
const pad = (dayKey) => dayKey.split('-').map((part, i) => (i ? part.padStart(2, '0') : part)).join('-');
const unpad = (dayKey) => dayKey.split('-').map((part, i) => (i ? String(Number(part)) : part)).join('-');

const readPlayers = (day, uids) => getDocs(query(
    collection(db, `artifacts/${appId}/public/data/puzzleDays/${day}/players`),
    where(documentId(), 'in', uids),
)).then((snap) => snap.docs.map((d) => ({ uid: d.id, ...d.data() })));

/**
 * Everything the panel shows, fetched once for the page: the phone's tabbed
 * panel and the desktop's three cards read the same object, so the result is
 * posted and the friends are read a single time. `rows` empty = no result yet
 * (nothing is fetched).
 */
export function usePuzzleDay({ dayKey, rows, won, t, history = null, pastDates = [], hints = 0 }) {
    const userId = useAuthStore((s) => s.userId);
    const displayName = useAuthStore((s) => s.displayName);
    const friends = useFriendsStore((s) => s.friends);
    const [weekWanted, setWeekWanted] = useState(false);
    const loadWeek = useCallback(() => setWeekWanted(true), []);
    const [bars, setBars] = useState(null);
    const [friendRows, setFriendRows] = useState([]);
    const [weekRows, setWeekRows] = useState(null);
    const day = pad(dayKey);
    const friendUids = useMemo(
        () => (friends || []).map((f) => f.userId).filter(Boolean).slice(0, MAX_PLAYERS - 1),
        [friends],
    );
    const friendKey = friendUids.join(',');

    useEffect(() => {
        if (!userId || !rows.length) return undefined;
        let alive = true;
        (async () => {
            const res = await callAuthedApi('/api/daily-puzzle', { day, rows }).catch(() => null);
            let dist = res?.ok ? res.payload?.distribution : null;
            if (!dist && db) {
                // The endpoint is away (a static deploy): read the counters directly.
                const snap = await getDoc(doc(db, `artifacts/${appId}/public/data/puzzleDays`, day)).catch(() => null);
                const data = snap?.exists() ? snap.data() : null;
                if (data) {
                    const total = BUCKETS.reduce((s, k) => s + (Number(data[k]) || 0), 0);
                    dist = { total, bars: BUCKETS.map((key) => ({ key, count: Number(data[key]) || 0, share: total ? Math.round(((Number(data[key]) || 0) / total) * 100) : 0 })) };
                }
            }
            if (alive && dist?.total) setBars(dist);
        })();
        return () => { alive = false; };
    }, [userId, day, rows]);

    useEffect(() => {
        if (!db || !friendUids.length || !rows.length) { setFriendRows([]); return undefined; }
        let alive = true;
        readPlayers(day, friendUids).then((list) => { if (alive) setFriendRows(list); }).catch(() => {});
        return () => { alive = false; };
        // friendKey stands for friendUids: the list is rebuilt on every store update.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [friendKey, day, rows.length]);

    // The trainer's own row is known here — it does not wait for the server.
    const me = useMemo(() => ({
        uid: userId || 'me',
        name: displayName || t('pokepuzzle.day.you'),
        won,
        guesses: rows.length,
        rows,
        isMe: true,
    }), [userId, displayName, won, rows, t]);
    const todayRanked = useMemo(
        () => rankDay([me, ...friendRows.filter((f) => f.uid !== me.uid)]),
        [me, friendRows],
    );

    // The league: the week's days before today, read once when the tab opens.
    const week = useMemo(() => leagueWeek(new Date(`${day}T12:00:00`)), [day]);
    useEffect(() => {
        if (!weekWanted || weekRows || !db || !userId || !friendUids.length || !rows.length) return undefined;
        let alive = true;
        const uids = [userId, ...friendUids];
        Promise.all(week.days.filter((d) => d !== day).map((d) => readPlayers(d, uids).catch(() => [])))
            .then((lists) => { if (alive) setWeekRows(lists); });
        return () => { alive = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [weekWanted, weekRows, userId, friendKey, week, day, rows.length]);
    const weekTable = useMemo(
        () => (weekRows ? rankWeek([...weekRows, todayRanked]) : null),
        [weekRows, todayRanked],
    );

    // The record: every saved day, oldest first, then today.
    const record = useMemo(() => {
        const days = [...pastDates].reverse().map((date) => {
            const entry = history?.get(date);
            if (!entry?.guesses?.length || (entry.gameStatus !== 'WON' && entry.gameStatus !== 'LOST')) return null;
            return { won: entry.gameStatus === 'WON', guesses: entry.guesses.length, hints: entry.hints?.length || 0 };
        });
        return puzzleRecord([...days, { won, guesses: rows.length, hints }]);
    }, [history, pastDates, won, rows.length, hints]);
    // This week as dots: won, missed, not played, today, still to come.
    const weekDots = useMemo(() => {
        const start = new Date(`${week.days[0]}T12:00:00`);
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const letter = t(`pokepuzzle.day.weekday.${i}`);
            if (key === day) return { key, letter, state: won ? 'today-won' : 'today-lost' };
            if (key > day) return { key, letter, state: 'ahead' };
            const entry = history?.get(unpad(key));
            const done = entry?.guesses?.length && (entry.gameStatus === 'WON' || entry.gameStatus === 'LOST');
            return { key, letter, state: !done ? 'missed' : entry.gameStatus === 'WON' ? 'won' : 'lost' };
        });
    }, [week, day, won, history, t]);

    return {
        won,
        guesses: rows.length,
        bars,
        todayRanked,
        week,
        weekTable,
        hasFriends: friendUids.length > 0,
        record,
        weekDots,
        meUid: me.uid,
        loadWeek,
    };
}

export default usePuzzleDay;
