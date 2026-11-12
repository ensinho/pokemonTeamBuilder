import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, doc, documentId, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { appId } from '../../constants/firebase';
import { callAuthedApi } from '../../services/apiClient';
import { useAuthStore } from '../../store/useAuthStore';
import { useFriendsStore } from '../../store/useFriendsStore';
import { betterThanShare, gapAbove, leagueWeek, puzzleMedals, puzzleRecord, rankDay, rankWeek } from '../../utils/puzzleStandings';

/**
 * Under today's PokéPuzzle result: three readings of it (2026-11-12; it was
 * "Como foi o dia" and a row of friends' grids, 2026-11-06).
 *
 * - **Hoje** — the day's distribution with the trainer's bar marked and said
 *   in words, and today's result among friends: a podium, then rows.
 * - **Semana** — a league among friends, Monday to Sunday: each day is worth
 *   8 points for the first guess down to 1 for the eighth.
 * - **Você** — the trainer's own record, the week as dots, and medals.
 *
 * The result goes to the server once (api/daily-puzzle.js POST), which
 * answers with the distribution. Friends' rows are read from the day's
 * `players`; the league reads the same rows for the week's days, only when
 * its tab is opened. Nothing new is written (utils/puzzleStandings.js).
 */
const MAX_PLAYERS = 30; // Firestore's `in` limit; the trainer is one of them.
const BUCKETS = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'miss'];
const pad = (dayKey) => dayKey.split('-').map((part, i) => (i ? part.padStart(2, '0') : part)).join('-');
const unpad = (dayKey) => dayKey.split('-').map((part, i) => (i ? String(Number(part)) : part)).join('-');

const readPlayers = (day, uids) => getDocs(query(
    collection(db, `artifacts/${appId}/public/data/puzzleDays/${day}/players`),
    where(documentId(), 'in', uids),
)).then((snap) => snap.docs.map((d) => ({ uid: d.id, ...d.data() })));

function MiniGrid({ rows }) {
    if (!rows?.length) return null;
    return (
        <span className="puzzle-day__grid" aria-hidden="true">
            {rows.map((row, i) => (
                <span key={i} className="puzzle-day__row">
                    {row.split('').map((c, j) => <span key={j} className={`puzzle-day__tile is-${c}`} />)}
                </span>
            ))}
        </span>
    );
}

const scoreOf = (player) => (player.won ? `${player.guesses}/8` : '×');

export function PuzzleDayPanel({ dayKey, rows, won, t, history = null, pastDates = [], hints = 0 }) {
    const userId = useAuthStore((s) => s.userId);
    const displayName = useAuthStore((s) => s.displayName);
    const friends = useFriendsStore((s) => s.friends);
    const [tab, setTab] = useState('today');
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
        if (!db || !friendUids.length) { setFriendRows([]); return undefined; }
        let alive = true;
        readPlayers(day, friendUids).then((list) => { if (alive) setFriendRows(list); }).catch(() => {});
        return () => { alive = false; };
        // friendKey stands for friendUids: the list is rebuilt on every store update.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [friendKey, day]);

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
        if (tab !== 'week' || weekRows || !db || !userId || !friendUids.length) return undefined;
        let alive = true;
        const uids = [userId, ...friendUids];
        Promise.all(week.days.filter((d) => d !== day).map((d) => readPlayers(d, uids).catch(() => [])))
            .then((lists) => { if (alive) setWeekRows(lists); });
        return () => { alive = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab, weekRows, userId, friendKey, week, day]);
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

    return (
        <PuzzleDayView
            t={t}
            tab={tab}
            onTab={setTab}
            won={won}
            guesses={rows.length}
            bars={bars}
            todayRanked={todayRanked}
            week={week}
            weekTable={weekTable}
            hasFriends={friendUids.length > 0}
            record={record}
            weekDots={weekDots}
            meUid={me.uid}
        />
    );
}

/**
 * The panel itself, given everything it shows — no fetching, so it can be
 * drawn with any day's numbers.
 */
export function PuzzleDayView({ t, tab, onTab, won, guesses, bars, todayRanked, week, weekTable, hasFriends, record, weekDots, meUid }) {
    const mine = won ? `g${guesses}` : 'miss';
    const medals = puzzleMedals(record);
    const peak = bars ? Math.max(1, ...bars.bars.map((b) => b.count)) : 1;
    const better = bars ? betterThanShare(bars.bars, mine) : null;
    const podium = todayRanked.length >= 3 ? [todayRanked[1], todayRanked[0], todayRanked[2]] : null;
    const rest = podium ? todayRanked.slice(3) : todayRanked;
    const gap = weekTable ? gapAbove(weekTable, meUid) : null;
    const tabs = ['today', 'week', 'you'];

    return (
        <section className="puzzle-day" aria-label={t('pokepuzzle.day.title')}>
            <div className="tabs puzzle-day__tabs" role="tablist" aria-label={t('pokepuzzle.day.title')}>
                {tabs.map((key) => (
                    <button key={key} type="button" role="tab" className="tabs__item" aria-selected={tab === key} onClick={() => onTab(key)}>
                        {t(`pokepuzzle.day.tabs.${key}`)}
                    </button>
                ))}
            </div>

            {tab === 'today' && (
                <div className="puzzle-day__pane" role="tabpanel">
                    <p className="puzzle-day__lead">
                        {won
                            ? (better !== null
                                ? t('pokepuzzle.day.better', { n: guesses, pct: better, total: bars.total })
                                : t('pokepuzzle.day.solved', { n: guesses }))
                            : (bars ? t('pokepuzzle.day.missed', { total: bars.total }) : t('pokepuzzle.day.missedAlone'))}
                    </p>
                    {bars && (
                        <ol className="puzzle-day__bars" aria-label={t('pokepuzzle.day.barsLabel')}>
                            {bars.bars.filter((b) => b.key !== 'g7' && b.key !== 'g8' || b.count).map((b) => (
                                <li key={b.key} className={`puzzle-day__bar ${b.key === mine ? 'is-mine' : ''}`}>
                                    <span className="puzzle-day__fill" style={{ blockSize: `${Math.max(6, (b.count / peak) * 100)}%` }} />
                                    <span className="puzzle-day__share">{b.share}%</span>
                                    <span className="puzzle-day__label">{b.key === 'miss' ? '×' : b.key.slice(1)}{b.key === mine ? ` · ${t('pokepuzzle.day.youShort')}` : ''}</span>
                                </li>
                            ))}
                        </ol>
                    )}
                    {todayRanked.length > 1 && (
                        <div className="puzzle-day__friends">
                            <p className="puzzle-day__title">{t('pokepuzzle.day.friends')}</p>
                            {podium && (
                                <ol className="puzzle-podium">
                                    {podium.map((player) => (
                                        <li key={player.uid} className={`puzzle-podium__step ${player.place === 1 ? 'is-first' : ''} ${player.isMe ? 'is-me' : ''}`}>
                                            <span className="puzzle-podium__place">#{player.place}</span>
                                            <MiniGrid rows={player.rows} />
                                            <span className="puzzle-podium__name">{player.isMe ? t('pokepuzzle.day.you') : player.name}</span>
                                            <span className="puzzle-podium__score">{scoreOf(player)}</span>
                                        </li>
                                    ))}
                                </ol>
                            )}
                            {rest.length > 0 && (
                                <ol className="puzzle-rank">
                                    {rest.map((player) => (
                                        <li key={player.uid} className={`puzzle-rank__row ${player.isMe ? 'is-me' : ''}`}>
                                            <span className="puzzle-rank__place">#{player.place}</span>
                                            <span className="puzzle-rank__name">{player.isMe ? t('pokepuzzle.day.you') : player.name}</span>
                                            <span className="puzzle-rank__score">{scoreOf(player)}</span>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </div>
                    )}
                </div>
            )}

            {tab === 'week' && (
                <div className="puzzle-day__pane" role="tabpanel">
                    <p className="puzzle-day__title">
                        {t('pokepuzzle.day.league')}
                        <span className="puzzle-day__total">
                            {week.daysLeft === 0 ? t('pokepuzzle.day.endsToday') : t('pokepuzzle.day.endsIn', { n: week.daysLeft })}
                        </span>
                    </p>
                    {!hasFriends ? (
                        <div className="puzzle-day__empty">
                            <p>{t('pokepuzzle.day.noFriends')}</p>
                            <Link to="/friends" className="btn btn-secondary btn-sm">{t('pokepuzzle.day.addFriends')}</Link>
                        </div>
                    ) : !weekTable ? (
                        <p className="puzzle-day__lead">{t('pokepuzzle.day.loading')}</p>
                    ) : (
                        <>
                            <ol className="puzzle-rank">
                                {weekTable.map((row) => (
                                    <li key={row.uid} className={`puzzle-rank__row ${row.uid === meUid ? 'is-me' : ''}`}>
                                        <span className="puzzle-rank__place">#{row.place}</span>
                                        <span className="puzzle-rank__name">{row.uid === meUid ? t('pokepuzzle.day.you') : row.name}</span>
                                        <span className="puzzle-rank__score">{t('pokepuzzle.day.points', { n: row.points })}</span>
                                    </li>
                                ))}
                            </ol>
                            <p className="puzzle-day__note">
                                {t('pokepuzzle.day.rule')}{' '}
                                {gap
                                    ? t('pokepuzzle.day.gap', { n: gap.points, name: gap.name })
                                    : (weekTable[0]?.uid === meUid && weekTable.length > 1 ? t('pokepuzzle.day.leading') : '')}
                            </p>
                        </>
                    )}
                </div>
            )}

            {tab === 'you' && (
                <div className="puzzle-day__pane" role="tabpanel">
                    <p className="puzzle-day__title">
                        {t('pokepuzzle.day.record')}
                        {record.streak > 1 && <span className="puzzle-day__streak">{t('pokepuzzle.day.streak', { n: record.streak })}</span>}
                    </p>
                    <ol className="puzzle-week" aria-label={t('pokepuzzle.day.weekLabel')}>
                        {weekDots.map((dot) => (
                            <li key={dot.key} className={`puzzle-week__dot is-${dot.state}`} aria-label={`${dot.key}: ${t(`pokepuzzle.day.dot.${dot.state}`)}`}>
                                {dot.letter}
                            </li>
                        ))}
                    </ol>
                    <dl className="puzzle-record">
                        <div><dd>{record.played}</dd><dt>{t('pokepuzzle.day.played')}</dt></div>
                        <div><dd>{record.winRate}%</dd><dt>{t('pokepuzzle.day.winRate')}</dt></div>
                        <div><dd>{record.average === null ? '—' : record.average.toLocaleString(undefined, { minimumFractionDigits: 1 })}</dd><dt>{t('pokepuzzle.day.average')}</dt></div>
                        <div><dd>{record.bestStreak}</dd><dt>{t('pokepuzzle.day.bestStreak')}</dt></div>
                    </dl>
                    <ul className="puzzle-medals">
                        {medals.map((medal) => (
                            <li key={medal.id} className={`puzzle-medal ${medal.earned ? 'is-earned' : ''}`}>
                                <i className="puzzle-medal__mark" aria-hidden="true" />
                                <span className="puzzle-medal__name">{t(`pokepuzzle.day.medal.${medal.id}.name`)}</span>
                                <span className="puzzle-medal__need">
                                    {medal.earned
                                        ? t(`pokepuzzle.day.medal.${medal.id}.need`)
                                        : t('pokepuzzle.day.progress', { have: Math.min(medal.have, medal.need), need: medal.need })}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </section>
    );
}

export default PuzzleDayPanel;
