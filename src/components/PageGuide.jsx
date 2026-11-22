/* eslint-disable react-refresh/only-export-components */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ArrowRight, ChevronDown, ChevronUp, MessageSquarePlus, X } from 'lucide-react';

import { appId } from '../constants/firebase';
import { AnchoredPopover } from './AnchoredPopover';
import { Mascot } from './Mascot';
import { useTranslation } from '../hooks/useTranslation';
import { getTable } from '../i18n/catalog';
import { useOnboardingStore } from '../store/useOnboardingStore';
import '../styles/page-guide.css';

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export function PageGuide({ pageKey, db, userId, userEmail, displayName, showToast }) {
    const { t, language } = useTranslation();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [showSuggest, setShowSuggest] = useState(false);
    const [suggestionEmail, setSuggestionEmail] = useState(userEmail || '');
    const [suggestionText, setSuggestionText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [sent, setSent] = useState(false);
    const triggerRef = useRef(null);
    const popoverRef = useRef(null);

    const guide = getTable(language)?.guide?.[pageKey] || getTable('en')?.guide?.[pageKey];

    useEffect(() => {
        if (!isOpen) return undefined;

        setSuggestionEmail(userEmail || '');
        setSuggestionText('');
        setSent(false);
        setShowSuggest(false);

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
        if (!db || !userId || isSending) return;
        if (!text) {
            showToast?.(t('guide.ideaWarning'), 'warning');
            return;
        }
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

    const titleText = t('guide.titleText', { page: guide.title });
    const ariaLabelText = t('guide.ariaLabel', { page: guide.title });

    const quickAction = pageKey === 'home'
        ? {
            label: t('guide.quickAction.profile'),
            onClick: () => {
                setIsOpen(false);
                useOnboardingStore.getState().open('guide', { entry: 'redo' });
            },
        }
        : pageKey !== 'journeys'
            ? {
                label: t('guide.quickAction.journeys'),
                onClick: () => {
                    setIsOpen(false);
                    navigate('/journeys');
                },
            }
            : null;

    return (
        <div className="page-guide">
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setIsOpen((value) => !value)}
                aria-label={ariaLabelText}
                aria-expanded={isOpen}
                className={`page-guide__trigger touch-target ${isOpen ? 'is-open' : ''}`}
            >
                <Mascot size="xs" mood={isOpen ? 'curioso' : undefined} />
            </button>

            <AnchoredPopover
                isOpen={isOpen}
                anchorRef={triggerRef}
                popoverRef={popoverRef}
                className="page-guide__popover"
                role="dialog"
                ariaLabel={ariaLabelText}
                viewportPadding={12}
            >
                <header className="page-guide__head">
                    <div className="page-guide__identity">
                        <Mascot size="xs" mood="curioso" />
                        <h4 className="page-guide__title">{titleText}</h4>
                    </div>
                    <button
                        type="button"
                        className="page-guide__close"
                        onClick={() => setIsOpen(false)}
                        aria-label={t('common.close')}
                    >
                        <X aria-hidden="true" />
                    </button>
                </header>

                <div className="page-guide__body">
                    <ul className="page-guide__tips">
                        {guide.tips.map((tip, index) => (
                            <li key={index} className="page-guide__tip">
                                <span className="page-guide__bullet" aria-hidden="true">{index + 1}</span>
                                <span>{tip}</span>
                            </li>
                        ))}
                    </ul>

                    {quickAction && (
                        <button type="button" className="page-guide__action" onClick={quickAction.onClick}>
                            <span>{quickAction.label}</span>
                            <ArrowRight aria-hidden="true" />
                        </button>
                    )}
                </div>

                <div className="page-guide__foot">
                    {sent ? (
                        <p className="page-guide__sent" role="status">{t('guide.successMsg')}</p>
                    ) : (
                        <>
                            <button
                                type="button"
                                className="page-guide__suggest-toggle"
                                aria-expanded={showSuggest}
                                onClick={() => setShowSuggest((v) => !v)}
                            >
                                <span className="inline-flex items-center gap-1.5">
                                    <MessageSquarePlus aria-hidden="true" />
                                    {t('guide.suggestionToggle')}
                                </span>
                                {showSuggest ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
                            </button>
                            {showSuggest && (
                                <form onSubmit={handleSendSuggestion} className="page-guide__form">
                                    <input
                                        type="email"
                                        value={suggestionEmail}
                                        onChange={(event) => setSuggestionEmail(event.target.value.slice(0, 254))}
                                        placeholder={t('guide.emailPlaceholder')}
                                        autoComplete="email"
                                        maxLength={254}
                                        className="page-guide__input"
                                    />
                                    <div className="page-guide__row">
                                        <input
                                            type="text"
                                            value={suggestionText}
                                            onChange={(event) => setSuggestionText(event.target.value.slice(0, 500))}
                                            placeholder={t('guide.ideaPlaceholder')}
                                            maxLength={500}
                                            className="page-guide__input"
                                        />
                                        <button
                                            type="submit"
                                            disabled={isSending || !db || !userId}
                                            className="btn btn-primary btn-sm"
                                        >
                                            {isSending ? t('guide.sendingBtn') : t('guide.sendBtn')}
                                        </button>
                                    </div>
                                </form>
                            )}
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
    journeys: true,
    feed: true,
    challenge: true,
};
