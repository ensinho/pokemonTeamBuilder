import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

/**
 * Previous · "2 / 9" · next. Renders nothing for a single page, so a short
 * list carries no chrome. `label` names the list for screen readers.
 */
export function Pager({ page, pageCount, onChange, label, className = '' }) {
    const { t } = useTranslation();
    if (pageCount <= 1) return null;

    return (
        <nav className={`pager ${className}`} aria-label={label}>
            <button
                type="button"
                className="btn btn-ghost btn-sm btn-icon"
                onClick={() => onChange(page - 1)}
                disabled={page === 0}
                aria-label={t('common.previous')}
            >
                <ChevronLeft aria-hidden="true" />
            </button>
            <span className="pager__status figure" aria-live="polite">
                {page + 1} <span className="pager__of">/ {pageCount}</span>
            </span>
            <button
                type="button"
                className="btn btn-ghost btn-sm btn-icon"
                onClick={() => onChange(page + 1)}
                disabled={page >= pageCount - 1}
                aria-label={t('common.next')}
            >
                <ChevronRight aria-hidden="true" />
            </button>
        </nav>
    );
}

export default Pager;
