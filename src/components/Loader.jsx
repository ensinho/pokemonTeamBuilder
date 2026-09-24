import React from 'react';
import { PokeballIcon } from './icons';
import { useTranslation } from '../hooks/useTranslation';

/**
 * The loading state: a Poké Ball rocking the way it does after a throw
 * (interactions.css). Replaces the stock `border-b-2 animate-spin` ring and the
 * Poké Balls that were spun like a wheel.
 *
 * - `size`: 'xs' | 'sm' | 'md' (default) | 'lg'.
 * - `label`: shown under the ball; without one the status is announced to
 *   screen readers only ("Loading…").
 * - `block`: centre it in a padded block, for a view with nothing else yet.
 */
export function Loader({ size = 'md', label, block = false, className = '' }) {
    const { t } = useTranslation();
    const text = label || t('common.loading');
    const classes = ['loader', size !== 'md' && `loader--${size}`, className].filter(Boolean).join(' ');

    const loader = (
        <span className={classes} role="status">
            <PokeballIcon className="loader__ball" />
            {label
                ? <span className="loader__label">{text}</span>
                : <span className="sr-only">{text}</span>}
        </span>
    );

    return block ? <div className="loader-block">{loader}</div> : loader;
}
