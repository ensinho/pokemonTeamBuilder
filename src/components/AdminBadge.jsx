import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import '../styles/admin-badge.css';

/**
 * Minimalist tonal Gold badge for verified Firebase Custom Claim admins.
 * - `asLink`: renders as a 1-click shortcut to `/admin` (Sidebar / Profile).
 * - static (default): renders as an inline status pill (Forum topics & comments).
 */
export function AdminBadge({
    size = 'xs',
    asLink = false,
    onNavigate,
    className = '',
}) {
    const { t } = useTranslation();
    const label = t('admin.badgeLabel');
    const title = asLink ? t('admin.badgeTooltip') : label;
    const classes = [
        'admin-badge',
        `admin-badge--${size}`,
        asLink ? 'admin-badge--interactive' : '',
        className,
    ].filter(Boolean).join(' ');

    if (asLink) {
        return (
            <Link
                to="/admin"
                className={classes}
                title={title}
                aria-label={title}
                onClick={(event) => {
                    event.stopPropagation();
                    onNavigate?.();
                }}
            >
                <ShieldCheck aria-hidden="true" />
                <span>{label}</span>
            </Link>
        );
    }

    return (
        <span className={classes} title={title}>
            <ShieldCheck aria-hidden="true" />
            <span>{label}</span>
        </span>
    );
}
