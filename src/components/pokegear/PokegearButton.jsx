import React, { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { useInboxStore, selectUnread } from '../../store/useInboxStore';
import { useTranslation } from '../../hooks/useTranslation';

/**
 * The Pokégear's door in the header (2026-11-06). A bell — the convention —
 * with a dot for what is new; when something new arrives the bell swings once
 * (its own clapper, the creative direction's "motion inside the element").
 */
export function PokegearButton({ className = '' }) {
    const { t } = useTranslation();
    const unread = useInboxStore(selectUnread);
    const open = useInboxStore((s) => s.open);
    const previous = useRef(unread);
    const [ring, setRing] = useState(0);

    useEffect(() => {
        if (unread > previous.current) setRing((n) => n + 1);
        previous.current = unread;
    }, [unread]);

    return (
        <button
            type="button"
            className={`pokegear-button ${className}`}
            onClick={open}
            aria-label={unread ? t('pokegear.openUnread', { count: unread }) : t('pokegear.open')}
        >
            <Bell key={ring} className={`pokegear-button__bell ${ring ? 'is-ringing' : ''}`} aria-hidden="true" />
            {unread > 0 && <span className="pokegear-button__dot" aria-hidden="true">{unread > 9 ? '9+' : unread}</span>}
        </button>
    );
}

export default PokegearButton;
