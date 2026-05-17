import React, { useCallback, useEffect, useRef, useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

import { appId } from '../constants/firebase';
import { AnchoredPopover } from './AnchoredPopover';
import { InfoIcon } from './icons';

const PAGE_GUIDE_TIPS = {
    home: {
        title: 'Home',
        tips: [
            'Your journey starts here — every great team has a story. What\'s yours today?',
            'The Pokémon of the Day is different every 24h. Some days it\'ll surprise you.',
            'The little companion in the greeting? That can be yours. Make it personal.',
        ],
    },
    builder: {
        title: 'Builder',
        tips: [
            'A team isn\'t six random picks — it\'s a statement. Feel the synergy as you build.',
            'Dig into each slot. Moves, item, nature — that\'s where good teams become great ones.',
            'Watch the summary bar shift as you add Pokémon. A well-balanced team has its own rhythm.',
        ],
    },
    allTeams: {
        title: 'Saved Teams',
        tips: [
            'Every team here was a moment of inspiration. Revisit them — past-you had good taste.',
            'Star the ones that feel special. Some teams deserve to be remembered.',
            '🎮 Rate your teams 1–6 in your head, then edit the worst one until it earns a higher spot.',
        ],
    },
    pokedex: {
        title: 'Pokédex',
        tips: [
            'Over a thousand Pokémon, and you only need six. The fun is in the choosing.',
            'Open any card and let the stats tell a story — sometimes the underdog surprises you.',
            'Star the ones that catch your eye. Your favourites say a lot about your style.',
        ],
    },
    favorites: {
        title: 'Favourite Pokémon',
        tips: [
            'This is your taste — unfiltered. Every star you gave meant something.',
            'Scroll through and notice a pattern. Your favourite type might be more obvious than you think.',
            'See someone here you\'ve never actually used? Maybe it\'s time.',
        ],
    },
    randomGenerator: {
        title: 'Random Generator',
        tips: [
            'Let go of the plan. Some of the best teams happen by accident.',
            'That Pokémon you\'d never pick yourself? Give it a chance — it might be your next favourite.',
            '🎮 Nuzlocke Draft: generate 12, pick only 6 — and never reroll. Play with what fate gives you.',
        ],
    },
};

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export function PageGuide({ colors, pageKey, db, userId, userEmail, displayName, showToast }) {
    const [isOpen, setIsOpen] = useState(false);
    const [suggestionEmail, setSuggestionEmail] = useState(userEmail || '');
    const [suggestionText, setSuggestionText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [sent, setSent] = useState(false);
    const triggerRef = useRef(null);
    const popoverRef = useRef(null);
    const guide = PAGE_GUIDE_TIPS[pageKey];

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
            showToast?.('Add a valid email so I can reply.', 'warning');
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
            showToast?.('Thanks for your feedback!', 'success');
        } catch (error) {
            console.error('Failed to submit page suggestion:', error);
            showToast?.('Could not send your suggestion. Try again.', 'error');
        } finally {
            setIsSending(false);
        }
    }, [db, userId, userEmail, displayName, suggestionEmail, suggestionText, isSending, pageKey, guide, showToast]);

    if (!guide) return null;

    const isSuggestionEmailValid = isValidEmail(suggestionEmail);

    return (
        <div className="inline-flex items-center">
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setIsOpen((value) => !value)}
                aria-label={`Guide for ${guide.title}`}
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
                    backgroundColor: colors.card,
                    border: `1px solid ${colors.primary}40`,
                }}
                role="dialog"
                ariaLabel={`${guide.title} guide`}
                viewportPadding={12}
                arrowStyle={{
                    backgroundColor: colors.card,
                    borderTop: `1px solid ${colors.primary}40`,
                    borderLeft: `1px solid ${colors.primary}40`,
                }}
            >
                <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary" aria-hidden="true">
                            <InfoIcon />
                        </span>
                        <h4 className="text-sm font-bold text-primary">
                            {guide.title} Guide
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
                    style={{ borderColor: colors.cardLight, backgroundColor: `${colors.background}99` }}
                >
                    {sent ? (
                        <p className="text-center text-xs font-semibold text-primary">
                            ✓ Thanks for your feedback!
                        </p>
                    ) : (
                        <>
                            <p className="mb-2 text-[11px] text-muted">
                                Have a suggestion about this page?
                            </p>
                            <form onSubmit={handleSendSuggestion} className="flex flex-col gap-2">
                                <input
                                    type="email"
                                    value={suggestionEmail}
                                    onChange={(event) => setSuggestionEmail(event.target.value.slice(0, 254))}
                                    placeholder="Your email"
                                    autoComplete="email"
                                    maxLength={254}
                                    className="w-full rounded-lg bg-surface-raised px-3 py-1.5 text-xs text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                />
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={suggestionText}
                                        onChange={(event) => setSuggestionText(event.target.value.slice(0, 500))}
                                        placeholder="Your idea..."
                                        maxLength={500}
                                        className="flex-1 rounded-lg bg-surface-raised px-3 py-1.5 text-xs text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!suggestionText.trim() || !isSuggestionEmailValid || isSending || !db || !userId}
                                        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                    >
                                        {isSending ? '...' : 'Send'}
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

export const pageGuideTips = PAGE_GUIDE_TIPS;