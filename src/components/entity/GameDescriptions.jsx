import React, { useMemo, useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { formatVersionGroup } from '../../utils/gameVersions';

// Enough to answer "what does the game say today" and the wording before it.
const PREVIEW = 3;

/**
 * What each game calls a move, ability or item. Newest games first — the
 * current wording is the one being looked up — and only the latest few until
 * asked, so a description reworded eight times is not a column taller than
 * everything beside it.
 */
export function GameDescriptions({ groups = [] }) {
    const { t } = useTranslation();
    const [expanded, setExpanded] = useState(false);
    const newestFirst = useMemo(() => [...groups].reverse(), [groups]);

    if (!newestFirst.length) return null;
    const rows = expanded ? newestFirst : newestFirst.slice(0, PREVIEW);
    const hiddenCount = newestFirst.length - PREVIEW;

    return (
        <section className="edv-section">
            <h2 className="edv-section__title">{t('db.gameDescriptions')}</h2>
            <dl className="edv-games">
                {rows.map((group) => (
                    <div key={group.text} className="edv-games__row">
                        <dt>{group.versions.map(formatVersionGroup).join(' · ')}</dt>
                        <dd>{group.text}</dd>
                    </div>
                ))}
            </dl>
            {hiddenCount > 0 && (
                <button
                    type="button"
                    className="btn btn-ghost btn-sm edv-games__more"
                    aria-expanded={expanded}
                    onClick={() => setExpanded((value) => !value)}
                >
                    {expanded ? t('db.olderGamesHide') : t('db.olderGamesShow', { count: hiddenCount })}
                </button>
            )}
        </section>
    );
}

export default GameDescriptions;
