import React, { useMemo } from 'react';
import { RATINGS, tallyRatings } from '../../utils/teamRating';
import { getPokemonArtworkSpriteUrl } from '../../utils/pokemonSprites';

/**
 * The community's verdict on a shared team (2026-11-06, social-heart B4),
 * as an evolution line: the stage most replies chose steps forward, the
 * others stay small and faded — the onboarding's level device, reused.
 */
export function RatingVerdict({ messages, t }) {
    const tally = useMemo(() => tallyRatings(messages), [messages]);
    if (!tally.total) return null;
    return (
        <div className="rating-verdict" aria-label={t('forum.rating.verdictLabel', { n: tally.total })}>
            <ol className="rating-verdict__line">
                {RATINGS.map((r) => (
                    <li key={r.id} className={`rating-verdict__stage ${tally.top === r.id ? 'is-top' : ''}`}>
                        <img src={getPokemonArtworkSpriteUrl(r.art)} alt="" width={64} height={64} loading="lazy" decoding="async" />
                        <span className="rating-verdict__name">{t(`forum.rating.${r.id}`)}</span>
                        <span className="rating-verdict__count">{tally[r.id]}</span>
                    </li>
                ))}
            </ol>
            <p className="rating-verdict__caption">{t('forum.rating.caption', { n: tally.total })}</p>
        </div>
    );
}

export default RatingVerdict;
