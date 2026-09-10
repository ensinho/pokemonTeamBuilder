import React from 'react';
import { useTranslation } from '../hooks/useTranslation';

/**
 * The "Show more (N left)" control under a progressively revealed list — see
 * `useProgressiveReveal`. Full width and thumb-height because it only ever
 * appears on a phone; the remaining count says how much scroll it will add.
 */
export function ShowMoreButton({ remaining, onClick, className = '' }) {
    const { t } = useTranslation();
    return (
        <button type="button" onClick={onClick} className={`show-more-button ${className}`}>
            {t('common.showMore', { count: remaining })}
        </button>
    );
}

export default ShowMoreButton;
