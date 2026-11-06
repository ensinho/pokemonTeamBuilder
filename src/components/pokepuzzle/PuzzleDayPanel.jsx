import React, { useEffect, useState } from 'react';
import { collection, doc, documentId, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { appId } from '../../constants/firebase';
import { callAuthedApi } from '../../services/apiClient';
import { useAuthStore } from '../../store/useAuthStore';
import { useFriendsStore } from '../../store/useFriendsStore';

/**
 * "Como foi o dia" and "Amigos hoje" under today's PokéPuzzle result
 * (2026-11-06, docs/plans/social-heart.md D1/D2). The result goes to the
 * server once (api/daily-puzzle.js POST), which answers with the day's
 * distribution; friends' colour grids are read from their rows. Nothing is
 * drawn until there is something to show — no loader flashing under a
 * result the trainer is reading.
 */
const MAX_FRIENDS = 6;
const BUCKETS = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'miss'];
const pad = (dayKey) => dayKey.split('-').map((part, i) => (i ? part.padStart(2, '0') : part)).join('-');

export function PuzzleDayPanel({ dayKey, rows, won, t }) {
    const userId = useAuthStore((s) => s.userId);
    const friends = useFriendsStore((s) => s.friends);
    const [bars, setBars] = useState(null);
    const [friendRows, setFriendRows] = useState([]);
    const day = pad(dayKey);
    const mine = won ? `g${rows.length}` : 'miss';

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
        const uids = (friends || []).map((f) => f.userId).filter(Boolean).slice(0, 30);
        if (!db || !uids.length) return undefined;
        let alive = true;
        getDocs(query(collection(db, `artifacts/${appId}/public/data/puzzleDays/${day}/players`), where(documentId(), 'in', uids)))
            .then((snap) => {
                if (!alive) return;
                setFriendRows(snap.docs.map((d) => ({ uid: d.id, ...d.data() })).slice(0, MAX_FRIENDS));
            })
            .catch(() => {});
        return () => { alive = false; };
    }, [friends, day]);

    if (!bars && !friendRows.length) return null;
    const peak = bars ? Math.max(1, ...bars.bars.map((b) => b.count)) : 1;

    return (
        <section className="puzzle-day" aria-label={t('pokepuzzle.day.title')}>
            {bars && (
                <div className="puzzle-day__dist">
                    <p className="puzzle-day__title">
                        {t('pokepuzzle.day.title')}
                        <span className="puzzle-day__total">{t('pokepuzzle.day.total', { n: bars.total })}</span>
                    </p>
                    <ol className="puzzle-day__bars" aria-label={t('pokepuzzle.day.barsLabel')}>
                        {bars.bars.filter((b) => b.key !== 'g7' && b.key !== 'g8' || b.count).map((b) => (
                            <li key={b.key} className={`puzzle-day__bar ${b.key === mine ? 'is-mine' : ''}`}>
                                <span className="puzzle-day__fill" style={{ blockSize: `${Math.max(6, (b.count / peak) * 100)}%` }} />
                                <span className="puzzle-day__share">{b.share}%</span>
                                <span className="puzzle-day__label">{b.key === 'miss' ? '×' : b.key.slice(1)}</span>
                            </li>
                        ))}
                    </ol>
                </div>
            )}
            {friendRows.length > 0 && (
                <div className="puzzle-day__friends">
                    <p className="puzzle-day__title">{t('pokepuzzle.day.friends')}</p>
                    <ul className="puzzle-day__grids">
                        {friendRows.map((f) => (
                            <li key={f.uid} className="puzzle-day__friend">
                                <span className="puzzle-day__grid" aria-hidden="true">
                                    {(f.rows || []).map((row, i) => (
                                        <span key={i} className="puzzle-day__row">
                                            {row.split('').map((c, j) => <span key={j} className={`puzzle-day__tile is-${c}`} />)}
                                        </span>
                                    ))}
                                </span>
                                <span className="puzzle-day__name">{f.name}</span>
                                <span className="puzzle-day__score">{f.won ? `${f.guesses}/8` : '×'}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </section>
    );
}

export default PuzzleDayPanel;
