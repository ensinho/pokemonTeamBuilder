import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Image, Link2, MessageSquare } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { useActiveTeamStore } from '../store/useActiveTeamStore';
import { Loader } from './Loader';

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
    // The publish behind Link takes a round-trip; the button keeps its label,
    // shows the wait inside and ignores repeat taps (the store guards too).
    const isSharingLink = useActiveTeamStore((s) => s.isSharingLink);

    return (
        <div className={`tb-share-row ${className}`} role="group" aria-label={t('builder.shareActions')}>
            <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={isSharingLink ? undefined : copyTeamLink}
                disabled={disabled}
                aria-busy={isSharingLink || undefined}
            >
                {isSharingLink ? <Loader size="xs" className="loader--inherit" /> : <Link2 aria-hidden="true" />}
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
