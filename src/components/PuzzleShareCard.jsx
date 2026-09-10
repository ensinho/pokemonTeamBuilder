import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Puzzle } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { STATUS_BY_CODE, puzzleShareScore } from '../utils/pokePuzzleShare';

/**
 * A shared PokéPuzzle board inside a forum message.
 *
 * Renders the grid the sharer actually played — greens, yellows and blanks —
 * and nothing else: the payload carries no answer, no guesses and no letters,
 * so reading the thread can never spoil the day's puzzle for anyone.
 *
 * Reuses the shared-team card's shell so a thread keeps one visual language for
 * "somebody attached something".
 */
export function PuzzleShareCard({ puzzle }) {
    const { t } = useTranslation();
    const navigate = useNavigate();

    if (!puzzle?.rows?.length) return null;

    const title = puzzle.mode === 'free'
        ? t('forum.puzzleTitleFree')
        : (puzzle.puzzleNumber
            ? t('forum.puzzleTitleDailyNumbered', { number: puzzle.puzzleNumber })
            : t('forum.puzzleTitleDaily'));

    return (
        <div className="forum-team-share-card">
            <div className="forum-team-share-header">
                <h5 className="forum-team-share-title flex items-center gap-1">
                    <Puzzle className="w-3.5 h-3.5 text-primary shrink-0" />
                    {title}
                    <span className={`badge ml-1 ${puzzle.won ? 'badge-success' : 'badge-outline'}`}>
                        {puzzleShareScore(puzzle)}
                    </span>
                </h5>
                <button
                    type="button"
                    onClick={() => navigate('/pokepuzzle')}
                    className="btn btn-primary h-7 px-2.5 text-xs font-bold"
                >
                    {t('forum.puzzlePlay')}
                </button>
            </div>

            <div className="puzzle-share-grid" role="img" aria-label={t('forum.puzzleGridLabel', { score: puzzleShareScore(puzzle) })}>
                {puzzle.rows.map((row, rowIndex) => (
                    <div key={rowIndex} className="puzzle-share-grid__row">
                        {row.split('').map((code, cellIndex) => (
                            <span
                                key={cellIndex}
                                className={`puzzle-share-grid__cell is-${STATUS_BY_CODE[code] || 'absent'}`}
                            />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}
