import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import '../../styles/pokegear.css';
import { useModalA11y } from '../../hooks/useModalA11y';
import { useTranslation } from '../../hooks/useTranslation';
import { useInboxStore, selectUnread } from '../../store/useInboxStore';
import { useNotificationSettings } from '../../hooks/useNotificationSettings';
import { describeInboxEntry } from '../../utils/inboxEntry';
import { formatForumTime } from '../../utils/forumTime';
import { AvatarSprite } from '../AvatarSprite';
import { Mascot } from '../Mascot';
import { Switch } from '../Switch';
import { PokeballIcon } from '../icons';

/**
 * The Pokégear (2026-11-06, docs/plans/social-heart.md A3): what happened to
 * you while you were away — replies, mentions, comments and reactions on your
 * posts, friend requests, a friend passing you on a Champion board. One list,
 * newest first; unread rows carry a dot. A tap goes there and marks it read.
 * At the foot, the one switch that matters here: be told on the phone.
 */
export function PokegearDialog() {
    const { t, language } = useTranslation();
    const navigate = useNavigate();
    const entries = useInboxStore((s) => s.entries);
    const hasLoaded = useInboxStore((s) => s.hasLoaded);
    const unread = useInboxStore(selectUnread);
    const close = useInboxStore((s) => s.close);
    const markRead = useInboxStore((s) => s.markRead);
    const markAllRead = useInboxStore((s) => s.markAllRead);
    const dialogRef = useModalA11y(close);
    const notifications = useNotificationSettings();

    const go = (entry) => {
        const { to } = describeInboxEntry(entry);
        if (!entry.read) markRead(entry.id);
        close();
        navigate(to);
    };

    return (
        <div className="modal-scrim">
            <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="pokegear-title" tabIndex={-1} className="modal-panel modal-panel--sm pokegear">
                <div className="modal-header">
                    <h2 id="pokegear-title" className="modal-title">{t('pokegear.title')}</h2>
                    {unread > 0 && (
                        <button type="button" className="btn btn-ghost btn-sm" onClick={markAllRead}>{t('pokegear.markAll')}</button>
                    )}
                    <button type="button" className="modal-close" onClick={close} aria-label={t('pokegear.close')}>
                        <X aria-hidden="true" />
                    </button>
                </div>

                <div className="modal-body pokegear__body custom-scrollbar">
                    {hasLoaded && entries.length === 0 ? (
                        <div className="pokegear__empty">
                            <Mascot size="lg" mood="feliz" />
                            <p className="pokegear__empty-title">{t('pokegear.emptyTitle')}</p>
                            <p className="pokegear__empty-sub">{t('pokegear.emptySub')}</p>
                        </div>
                    ) : (
                        <ul className="pokegear__list">
                            {entries.map((entry) => {
                                const d = describeInboxEntry(entry);
                                return (
                                    <li key={entry.id}>
                                        <button type="button" className={`pokegear-row ${entry.read ? '' : 'is-unread'}`} onClick={() => go(entry)}>
                                            <span className="pokegear-row__avatar">
                                                <AvatarSprite
                                                    trainerSprite={entry.fromSprite}
                                                    pokemonId={entry.fromAvatar}
                                                    alt=""
                                                    fallback={<PokeballIcon className="w-4 h-4 text-muted" />}
                                                />
                                            </span>
                                            <span className="pokegear-row__text">
                                                <span className="pokegear-row__line">
                                                    {t(d.key, d.params)}
                                                    {d.reaction && <span className="pokegear-row__reaction"> {t(`forum.react.${d.reaction}`)}</span>}
                                                </span>
                                                {entry.snippet && <span className="pokegear-row__snippet">“{entry.snippet}”</span>}
                                                <span className="pokegear-row__time">{formatForumTime(entry.createdAt, language)}</span>
                                            </span>
                                            {!entry.read && <span className="pokegear-row__dot" aria-label={t('pokegear.unread')} />}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                {notifications.supported && notifications.enabled && (
                    <div className="modal-footer modal-footer--ruled pokegear__footer">
                        <Switch
                            variant="row"
                            size="sm"
                            checked={notifications.socialEnabled}
                            onChange={notifications.toggleSocial}
                            label={t('pokegear.pushLabel')}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

export default PokegearDialog;
