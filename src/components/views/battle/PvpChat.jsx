import { useEffect, useRef, useState } from 'react';

import { useTranslation } from '../../../hooks/useTranslation';

/**
 * The battle's chat as a Black & White menu — beside the screen on a wide
 * desktop (a rail), over the field or on the bottom screen otherwise. Same
 * Firestore thread as before (`battles/{id}/chat`), same 500-character cap.
 */
export function PvpChat({ messages, userId, onSend, onClose = null, inRail = false }) {
    const { t } = useTranslation();
    const [draft, setDraft] = useState('');
    const endRef = useRef(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ block: 'nearest' });
    }, [messages.length]);

    const submit = async (event) => {
        event.preventDefault();
        const text = draft.trim();
        if (!text) return;
        setDraft('');
        const ok = await onSend(text);
        if (!ok) setDraft(text);
    };

    return (
        <div className={`ds-panel pvp-chat ${inRail ? 'is-rail' : ''}`}>
            <div className="pvp-chat__head">
                <p className="ds-panel__title">{t('battle.chatTitle')}</p>
                {onClose && <button type="button" className="bw-cancel" onClick={onClose}>{t('challenge.command.back')}</button>}
            </div>
            <ul className="pvp-chat__list" aria-live="polite">
                {messages.length === 0 && <li className="pvp-chat__empty">{t('battle.chatEmpty')}</li>}
                {messages.map((message) => (
                    <li key={message.id} className={`pvp-chat__row ${message.createdBy === userId ? 'is-mine' : ''}`}>
                        <span className="pvp-chat__author">{message.creatorName}</span>
                        <span className="pvp-chat__text">{message.text}</span>
                    </li>
                ))}
                <li ref={endRef} aria-hidden="true" />
            </ul>
            <form className="pvp-chat__composer" onSubmit={submit}>
                <input
                    type="text"
                    className="pvp-chat__input"
                    maxLength={500}
                    placeholder={t('battle.chatPlaceholder')}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    aria-label={t('battle.chatPlaceholder')}
                />
                <button type="submit" className="ds-go pvp-chat__send" disabled={!draft.trim()}>{t('battle.stage.send')}</button>
            </form>
        </div>
    );
}
