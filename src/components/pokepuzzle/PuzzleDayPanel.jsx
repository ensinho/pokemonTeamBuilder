import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { betterThanShare, gapAbove, puzzleMedals } from '../../utils/puzzleStandings';

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
 * The data is `usePuzzleDay` (hooks/usePuzzleDay.js): one fetch for the
 * page. A phone draws it as `PuzzleDayPanel` (tabs); the desktop as three
 * `PuzzleDayCard`s. Nothing new is written (utils/puzzleStandings.js).
 */
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

/** A phone's panel: one card, the three readings behind tabs. */
export function PuzzleDayPanel({ data, t }) {
    const [tab, setTab] = useState('today');
    const { loadWeek } = data;
    useEffect(() => { if (tab === 'week') loadWeek(); }, [tab, loadWeek]);
    return <PuzzleDayView {...data} t={t} tab={tab} onTab={setTab} />;
}

/** One reading as its own card (desktop: Hoje under the board, Você and the league beside it). */
export function PuzzleDayCard({ data, t, section }) {
    const { loadWeek } = data;
    useEffect(() => { if (section === 'week') loadWeek(); }, [section, loadWeek]);
    return <PuzzleDayView {...data} t={t} tab={section} only />;
}

/**
 * The panel itself, given everything it shows — no fetching, so it can be
 * drawn with any day's numbers.
 */
export function PuzzleDayView({ t, tab, onTab, only = false, won, guesses, bars, todayRanked, week, weekTable, hasFriends, record, weekDots, meUid }) {
    const mine = won ? `g${guesses}` : 'miss';
    const medals = puzzleMedals(record);
    const peak = bars ? Math.max(1, ...bars.bars.map((b) => b.count)) : 1;
    const better = bars ? betterThanShare(bars.bars, mine) : null;
    const podium = todayRanked.length >= 3 ? [todayRanked[1], todayRanked[0], todayRanked[2]] : null;
    const rest = podium ? todayRanked.slice(3) : todayRanked;
    const gap = weekTable ? gapAbove(weekTable, meUid) : null;
    const tabs = ['today', 'week', 'you'];

    return (
        <section className={`puzzle-day ${only ? `puzzle-day--card puzzle-day--${tab}` : ''}`} aria-label={t(only ? `pokepuzzle.day.tabs.${tab}` : 'pokepuzzle.day.title')}>
            {!only && (
                <div className="tabs puzzle-day__tabs" role="tablist" aria-label={t('pokepuzzle.day.title')}>
                    {tabs.map((key) => (
                        <button key={key} type="button" role="tab" className="tabs__item" aria-selected={tab === key} onClick={() => onTab(key)}>
                            {t(`pokepuzzle.day.tabs.${key}`)}
                        </button>
                    ))}
                </div>
            )}

            {tab === 'today' && (
                <div className="puzzle-day__pane" role={only ? undefined : 'tabpanel'}>
                    {only && (
                        <p className="puzzle-day__title">
                            {t('pokepuzzle.day.title')}
                            {bars && <span className="puzzle-day__total">{t('pokepuzzle.day.total', { n: bars.total })}</span>}
                        </p>
                    )}
                    <p className="puzzle-day__lead">
                        {won
                            ? (better
                                ? t('pokepuzzle.day.better', { n: guesses, pct: better, total: bars.total })
                                // Nobody did worse (or nobody else played): no "better than 0%".
                                : bars ? t('pokepuzzle.day.solvedOf', { n: guesses, total: bars.total }) : t('pokepuzzle.day.solved', { n: guesses }))
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
                <div className="puzzle-day__pane" role={only ? undefined : 'tabpanel'}>
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
                <div className="puzzle-day__pane" role={only ? undefined : 'tabpanel'}>
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
