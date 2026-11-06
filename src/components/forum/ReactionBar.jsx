import React, { useState } from 'react';
import { typeColors } from '../../constants/types';
import { REACTION_KINDS, myReaction, nextReaction, summarizeReactions } from '../../utils/forumReactions';

/**
 * Battle-text reactions under a post or comment (2026-11-06). At rest: the
 * kinds someone used, as small battle boxes with their count, and one
 * "Reagir" trigger — nothing at all when there are none but the trigger.
 * Open: the four lines in a row, in place (no popover over the thread).
 * Tapping your own takes it back. `inline`: it lives in the action row (a
 * comment's Like · Reply · Share), so a post with no reactions costs no line.
 */
export function ReactionBar({ reactions, userId, onReact, t, inline = false }) {
    const [open, setOpen] = useState(false);
    const summary = summarizeReactions(reactions, userId);
    const mine = myReaction(reactions, userId);
    const pick = (kind) => {
        onReact(nextReaction(mine, kind));
        setOpen(false);
    };

    return (
        <div className={`reactions ${inline ? 'reactions--inline' : ''}`}>
            {summary.map((k) => (
                <button
                    key={k.id}
                    type="button"
                    className={`reaction-chip ${k.mine ? 'is-mine' : ''}`}
                    style={{ '--react': typeColors[k.tone] }}
                    aria-pressed={k.mine}
                    aria-label={`${t(`forum.react.${k.id}`)} · ${k.count}`}
                    onClick={() => pick(k.id)}
                >
                    <span className="reaction-chip__text">{t(`forum.react.${k.id}`)}</span>
                    <span className="reaction-chip__count">{k.count}</span>
                </button>
            ))}
            <button
                type="button"
                className={`reaction-trigger ${open ? 'is-open' : ''}`}
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
                onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
            >
                {t('forum.react.trigger')}
            </button>
            {open && (
                <div className="reaction-picker" role="group" aria-label={t('forum.react.trigger')}>
                    {REACTION_KINDS.map((k) => (
                        <button
                            key={k.id}
                            type="button"
                            className={`reaction-option ${mine === k.id ? 'is-mine' : ''}`}
                            style={{ '--react': typeColors[k.tone] }}
                            aria-pressed={mine === k.id}
                            onClick={() => pick(k.id)}
                            onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
                        >
                            {t(`forum.react.${k.id}`)}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default ReactionBar;
