import React from 'react';
import { Link } from 'react-router-dom';
import { typeColors } from '../../constants/types';

/**
 * A Badge Case shared on the forum (2026-11-06, social-heart B5): the eight
 * gems of the trainer's game, lit for the badges they won, and the next
 * leader — others answer with tips for that gym.
 */
export function BadgeCaseCard({ share, t }) {
    const slots = Array.isArray(share?.slots) ? share.slots.slice(0, 8) : [];
    if (!slots.length) return null;
    const won = slots.filter((s) => s.won).length;
    return (
        <div className="badge-case-card">
            <div className="badge-case-card__head">
                <strong>{share.label}</strong>
                <span>{t('badgeCase.count', { n: won, total: slots.length })}</span>
            </div>
            <ol className="badge-case-card__gems" aria-hidden="true">
                {slots.map((s, i) => (
                    <li key={i} className={`badge-case-card__gem ${s.won ? 'is-won' : ''}`} style={{ '--gem': typeColors[s.type] || 'var(--color-primary)' }} />
                ))}
            </ol>
            {share.next && (
                <p className="badge-case-card__next">
                    {t('badgeCase.nextLabel')} <strong>{share.next}</strong>
                    {' · '}<Link to={`/gyms?game=${encodeURIComponent(share.game)}`} className="badge-case__link">{t('badgeCase.study')}</Link>
                </p>
            )}
        </div>
    );
}

export default BadgeCaseCard;
