import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Image, Link2, MessageSquare } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { useActiveTeamStore } from '../store/useActiveTeamStore';

/**
 * The builder's three ways to share the team being built, as equals under
 * Save · Export (2026-10-24, Enzo: sharing was one item in the "more" menu):
 * the team's page link (`copyTeamLink`), the image snippet (`onImage`, the
 * store's shareTeamByData modal) and a forum post (the feed's composer,
 * opened with this team attached via `?compose=team`).
 */
export function TeamShareRow({ onImage, disabled = false, className = '' }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const copyTeamLink = useActiveTeamStore((s) => s.copyTeamLink);

    return (
        <div className={`tb-share-row ${className}`} role="group" aria-label={t('builder.shareActions')}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={copyTeamLink} disabled={disabled}>
                <Link2 aria-hidden="true" />
                <span>{t('builder.shareLink')}</span>
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onImage} disabled={disabled}>
                <Image aria-hidden="true" />
                <span>{t('builder.shareImage')}</span>
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('/feed?compose=team')} disabled={disabled}>
                <MessageSquare aria-hidden="true" />
                <span>{t('builder.shareForum')}</span>
            </button>
        </div>
    );
}
