/* eslint-disable react-refresh/only-export-components */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

import { appId } from '../constants/firebase';
import { AnchoredPopover } from './AnchoredPopover';
import { InfoIcon } from './icons';
import { useTranslation } from '../hooks/useTranslation';
import { TRANSLATIONS } from '../constants/translations';

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export function PageGuide({ pageKey, db, userId, userEmail, displayName, showToast }) {
    const { t, language } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [suggestionEmail, setSuggestionEmail] = useState(userEmail || '');
    const [suggestionText, setSuggestionText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [sent, setSent] = useState(false);
    const triggerRef = useRef(null);
    const popoverRef = useRef(null);
    
    const guide = TRANSLATIONS[language]?.guide?.[pageKey] || TRANSLATIONS['en']?.guide?.[pageKey];

    useEffect(() => {
        if (!isOpen) return undefined;

        setSuggestionEmail(userEmail || '');
        setSuggestionText('');
        setSent(false);

        const handleOutside = (event) => {
            if (triggerRef.current?.contains(event.target) || popoverRef.current?.contains(event.target)) {
                return;
            }
            if (triggerRef.current || popoverRef.current) {
                setIsOpen(false);
            }
        };

        const handleEsc = (event) => {
            if (event.key === 'Escape') setIsOpen(false);
        };

        document.addEventListener('mousedown', handleOutside);
        document.addEventListener('touchstart', handleOutside);
        document.addEventListener('keydown', handleEsc);

        return () => {
            document.removeEventListener('mousedown', handleOutside);
            document.removeEventListener('touchstart', handleOutside);
            document.removeEventListener('keydown', handleEsc);
        };
    }, [isOpen, userEmail]);

    const handleSendSuggestion = useCallback(async (event) => {
        event.preventDefault();
        const text = suggestionText.trim();
        const normalizedEmail = suggestionEmail.trim().toLowerCase();
        if (!db || !userId || !text || isSending) return;
        if (!isValidEmail(normalizedEmail)) {
            showToast?.(t('guide.emailWarning'), 'warning');
            return;
        }

        setIsSending(true);
        try {
            const normalizedDisplayName = displayName?.trim() || null;
            await addDoc(collection(db, `artifacts/${appId}/suggestions`), {
                userId,
                userEmail: normalizedEmail,
                contactEmail: normalizedEmail,
                authEmail: userEmail || null,
                displayName: normalizedDisplayName,
                source: 'pageGuide',
                author: {
                    userId,
                    email: normalizedEmail,
                    authEmail: userEmail || null,
                    displayName: normalizedDisplayName,
                },
                text,
                page: pageKey,
                pageTitle: guide?.title ?? pageKey,
                createdAt: serverTimestamp(),
            });
            setSent(true);
            setSuggestionText('');
            showToast?.(t('guide.submitSuccess'), 'success');
        } catch (error) {
            console.error('Failed to submit page suggestion:', error);
            showToast?.(t('guide.submitError'), 'error');
        } finally {
            setIsSending(false);
        }
    }, [db, userId, userEmail, displayName, suggestionEmail, suggestionText, isSending, pageKey, guide, showToast, t]);

    if (!guide) return null;

    const isSuggestionEmailValid = isValidEmail(suggestionEmail);
    const titleText = t('guide.titleText', { page: guide.title });
    const ariaLabelText = t('guide.ariaLabel', { page: guide.title });

    return (
        <div className="inline-flex items-center">
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setIsOpen((value) => !value)}
                aria-label={ariaLabelText}
                aria-expanded={isOpen}
                className={`inline-flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200 hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${isOpen ? 'bg-primary-soft text-primary' : 'bg-transparent text-muted'}`}
            >
                <InfoIcon />
            </button>

            <AnchoredPopover
                isOpen={isOpen}
                anchorRef={triggerRef}
                popoverRef={popoverRef}
                className="w-[min(20rem,calc(100vw-1.5rem))] rounded-xl shadow-2xl flex flex-col"
                style={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid color-mix(in srgb, var(--color-primary) 25%, transparent)',
                }}
                role="dialog"
                ariaLabel={ariaLabelText}
                viewportPadding={12}
                arrowStyle={{
                    backgroundColor: 'var(--color-surface)',
                    borderTop: '1px solid color-mix(in srgb, var(--color-primary) 25%, transparent)',
                    borderLeft: '1px solid color-mix(in srgb, var(--color-primary) 25%, transparent)',
                }}
            >
                <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary" aria-hidden="true">
                            <InfoIcon />
                        </span>
                        <h4 className="text-sm font-bold text-primary">
                            {titleText}
                        </h4>
                    </div>
                    <ul className="space-y-2">
                        {guide.tips.map((tip, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm leading-snug text-fg">
                                <span className="mt-0.5 shrink-0 text-[10px] font-extrabold text-primary">✦</span>
                                <span>{tip}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div
                    className="px-4 py-3 rounded-b-xl border-t"
                    style={{ borderColor: 'var(--color-surface-raised)', backgroundColor: 'color-mix(in srgb, var(--color-bg) 60%, transparent)' }}
                >
                    {sent ? (
                        <p className="text-center text-xs font-semibold text-primary">
                            {t('guide.successMsg')}
                        </p>
                    ) : (
                        <>
                            <p className="mb-2 text-[11px] text-muted">
                                {t('guide.suggestionLabel')}
                            </p>
                            <form onSubmit={handleSendSuggestion} className="flex flex-col gap-2">
                                <input
                                    type="email"
                                    value={suggestionEmail}
                                    onChange={(event) => setSuggestionEmail(event.target.value.slice(0, 254))}
                                    placeholder={t('guide.emailPlaceholder')}
                                    autoComplete="email"
                                    maxLength={254}
                                    className="w-full rounded-lg bg-surface-raised px-3 py-1.5 text-xs text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                />
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={suggestionText}
                                        onChange={(event) => setSuggestionText(event.target.value.slice(0, 500))}
                                        placeholder={t('guide.ideaPlaceholder')}
                                        maxLength={500}
                                        className="flex-1 rounded-lg bg-surface-raised px-3 py-1.5 text-xs text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!suggestionText.trim() || !isSuggestionEmailValid || isSending || !db || !userId}
                                        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                    >
                                        {isSending ? t('guide.sendingBtn') : t('guide.sendBtn')}
                                    </button>
                                </div>
                            </form>
                        </>
                    )}
                </div>
            </AnchoredPopover>
        </div>
    );
}

export const pageGuideTips = {
    home: true,
    builder: true,
    allTeams: true,
    pokedex: true,
    favorites: true,
    generationQuiz: true,
    feed: true,
};