import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lightbulb, Puzzle } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { STATUS_BY_CODE, puzzleShareHints, puzzleShareScore } from '../utils/pokePuzzleShare';

/** No board is worth more rows than this, whatever the payload claims. */
const MAX_ROWS = 10;

/**
 * A shared PokéPuzzle board inside a forum message.
 *
 * Renders the grid the sharer actually played — greens, yellows and blanks —
 * and nothing else: the payload carries no answer, no guesses and no letters,
 * so reading the thread can never spoil the day's puzzle for anyone.
 *
 * Every attempt is drawn, taken or not, so the card holds one shape in the feed
 * and a score reads off the board: "1/8" is one filled row above seven empty
 * ones. Drawing only the rows played made a win on the first guess render as a
 * single lonely stripe.
 *
 * Reuses the shared-team card's shell so a thread keeps one visual language for
 * "somebody attached something".
 */
export function PuzzleShareCard({ puzzle }) {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const rows = puzzle?.rows;
    if (!rows?.length) return null;

    const columns = rows[0].length;
    if (!columns) return null;

    // maxAttempts comes back from Firestore, written by whoever posted, so it
    // becomes a row count only after clamping: without this a bogus payload
    // would render an unbounded grid in the middle of the feed.
    const attemptRows = Math.min(
        Math.max(Number(puzzle.maxAttempts) || rows.length, rows.length),
        MAX_ROWS,
    );
    const pendingRows = attemptRows - rows.length;
    // Letter hints the sharer took travel with the board (2026-11-11).
    const hints = puzzleShareHints(puzzle);
    const hintsLabel = hints === 1 ? t('pokepuzzle.hint.usedOne') : t('pokepuzzle.hint.usedMany', { n: hints });

    const title = puzzle.mode === 'free'
        ? t('forum.puzzleTitleFree')
        : (puzzle.puzzleNumber
            ? t('forum.puzzleTitleDailyNumbered', { number: puzzle.puzzleNumber })
            : t('forum.puzzleTitleDaily'));

    return (
        <div className="forum-team-share-card forum-team-share-card--puzzle">
            <div className="forum-team-share-header">
                <h5 className="forum-team-share-title flex items-center gap-1">
                    <Puzzle className="w-3.5 h-3.5 text-primary shrink-0" />
                    {title}
                </h5>
                <span className="flex items-center gap-1 shrink-0">
                    {hints > 0 && (
                        <span className="badge" title={hintsLabel} aria-label={hintsLabel}>
                            <Lightbulb className="w-3 h-3" aria-hidden="true" />
                            {hints}
                        </span>
                    )}
                    <span className={`badge ${puzzle.won ? 'badge--success' : ''}`}>
                        {puzzleShareScore(puzzle)}
                    </span>
                </span>
            </div>

            <div className="puzzle-share-body">
                <div
                    className="puzzle-share-grid"
                    role="img"
                    aria-label={t('forum.puzzleGridLabel', { score: puzzleShareScore(puzzle) })}
                >
                    {rows.map((row, rowIndex) => (
                        <div key={rowIndex} className="puzzle-share-grid__row">
                            {row.split('').map((code, cellIndex) => (
                                <span
                                    key={cellIndex}
                                    className={`puzzle-share-grid__cell is-${STATUS_BY_CODE[code] || 'absent'}`}
                                />
                            ))}
                        </div>
                    ))}
                    {Array.from({ length: pendingRows }, (_, rowIndex) => (
                        <div key={`pending-${rowIndex}`} className="puzzle-share-grid__row">
                            {Array.from({ length: columns }, (_, cellIndex) => (
                                <span key={cellIndex} className="puzzle-share-grid__cell is-pending" />
                            ))}
                        </div>
                    ))}
                </div>

                <button
                    type="button"
                    onClick={() => navigate('/pokepuzzle')}
                    className="btn btn-ghost puzzle-share-play h-7 px-2.5 text-xs font-bold shrink-0"
                >
                    {t('forum.puzzlePlay')}
                </button>
            </div>
        </div>
    );
}
