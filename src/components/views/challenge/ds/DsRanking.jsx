import { useState } from 'react';

import { useTranslation } from '../../../../hooks/useTranslation';

const BOARDS = ['daily', 'free'];

/**
 * The day's ranking, a BW menu: two boards — the Time do dia (everyone had the
 * same team: the fair one) and own teams — each the top of the day by score,
 * then the quicker win. Your row is marked; the counts say how many played
 * and how many won. Written only by the server (api/_lib/challenge/ranking.js).
 *
 * Two homes: a menu over the screen (with VOLTAR, `onClose`) where there is no
 * room beside it, and a desktop's side rail (no `onClose`), where it also
 * carries your record (`stats`) — the Pokétch's counter, which a desktop lacks.
 */
export function DsRanking({ ranks, defaultBoard = 'daily', onClose, inputRef, stats = null }) {
    const { t } = useTranslation();
    const [board, setBoard] = useState(BOARDS.includes(defaultBoard) ? defaultBoard : 'daily');
    const list = ranks?.boards?.[board] || [];
    const mine = ranks?.mine?.[board] || null;

    if (inputRef) {
        inputRef.current = {
            onAction: (action) => {
                if (action === 'b') onClose?.();
                else if (action === 'left' || action === 'right') setBoard((current) => (current === 'daily' ? 'free' : 'daily'));
            },
        };
    }

    return (
        <div className="ds-panel ds-ranking">
            <p className="ds-panel__title ds-ranking__title">{t('challenge.ranking.title')}</p>
            <div className="ds-ranking__tabs" role="tablist" aria-label={t('challenge.ranking.title')}>
                {BOARDS.map((key) => (
                    <button
                        key={key}
                        type="button"
                        role="tab"
                        aria-selected={board === key}
                        className={`ds-ranking__tab ${board === key ? 'is-on' : ''}`}
                        onClick={() => setBoard(key)}
                    >
                        {t(`challenge.ranking.${key}`)}
                    </button>
                ))}
            </div>
            {list.length ? (
                <ol className="ds-ranking__list">
                    {list.map((entry, index) => (
                        // A board is replaced whole, never reordered in place.
                        <li key={`${index}-${entry.name}`} className={`ds-ranking__row ${entry.me ? 'is-me' : ''}`}>
                            <span className="ds-ranking__place">{index + 1}</span>
                            <span className="ds-ranking__name">{entry.name}</span>
                            <span className="ds-ranking__turns">{t('challenge.ranking.turns', { n: entry.turns })}</span>
                            <span className="ds-ranking__score">{entry.score}</span>
                        </li>
                    ))}
                </ol>
            ) : (
                <p className="ds-panel__body ds-ranking__empty">{t('challenge.ranking.empty')}</p>
            )}
            <p className="ds-ranking__counts">
                {t('challenge.ranking.counts', { wins: ranks?.wins?.[board] || 0, played: ranks?.played?.[board] || 0 })}
                {mine ? ` · ${t('challenge.ranking.you', { place: mine })}` : ''}
            </p>
            {stats && (
                <dl className="ds-ranking__record" aria-label={t('challenge.rail.record')}>
                    <div><dt>{t('challenge.poketch.streak')}</dt><dd>{stats.streak ?? 0}</dd></div>
                    <div><dt>{t('challenge.poketch.wins')}</dt><dd>{stats.wins ?? 0}</dd></div>
                    <div><dt>{t('challenge.poketch.played')}</dt><dd>{stats.played ?? 0}</dd></div>
                </dl>
            )}
            {onClose && <button type="button" className="bw-cancel" onClick={onClose}>{t('challenge.command.back')}</button>}
        </div>
    );
}
