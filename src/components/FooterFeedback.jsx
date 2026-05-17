import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    doc,
    onSnapshot,
    setDoc,
    updateDoc,
    arrayUnion,
    arrayRemove,
    collection,
    addDoc,
    serverTimestamp,
} from 'firebase/firestore';
import { appId } from '../constants/firebase';
import { HeartIcon, CloseIcon } from './icons';
import { useModalA11y } from '../hooks/useModalA11y';

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

/**
 * Compact footer feedback: a small like pill (counter) and a tiny
 * "Have a suggestion?" text link that opens a modal with a textarea.
 */
export const FooterFeedback = ({ db, userId, userEmail, displayName, showToast }) => {
    const [likeCount, setLikeCount] = useState(0);
    const [hasLiked, setHasLiked] = useState(false);
    const [isToggling, setIsToggling] = useState(false);
    const [showSuggestionModal, setShowSuggestionModal] = useState(false);

    useEffect(() => {
        if (!db) return;
        const likesRef = doc(db, `artifacts/${appId}/feedback`, 'likes');
        const unsub = onSnapshot(
            likesRef,
            (snap) => {
                if (!snap.exists()) {
                    setLikeCount(0);
                    setHasLiked(false);
                    return;
                }
                const data = snap.data() || {};
                const ids = Array.isArray(data.userIds) ? data.userIds : [];
                setLikeCount(typeof data.count === 'number' ? data.count : ids.length);
                setHasLiked(userId ? ids.includes(userId) : false);
            },
            (err) => {
                console.error('Error listening to likes:', err);
            }
        );
        return () => unsub();
    }, [db, userId]);

    const handleToggleLike = useCallback(async () => {
        if (!db || !userId || isToggling) return;
        setIsToggling(true);
        const likesRef = doc(db, `artifacts/${appId}/feedback`, 'likes');
        const willLike = !hasLiked;
        // Optimistic UI
        setHasLiked(willLike);
        setLikeCount((c) => Math.max(0, c + (willLike ? 1 : -1)));
        try {
            if (willLike) {
                await setDoc(
                    likesRef,
                    {
                        userIds: arrayUnion(userId),
                        count: (likeCount || 0) + 1,
                        updatedAt: serverTimestamp(),
                    },
                    { merge: true }
                );
                // Thank-you toast with a random Pokémon sprite
                const randomId = Math.floor(Math.random() * 898) + 1;
                const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${randomId}.png`;
                const messages = [
                    'Thanks for the like!',
                    'You rock — thanks!',
                    'Appreciate the love!',
                    'Thank you, Trainer!',
                    'Gotta love that — thanks!',
                ];
                const message = messages[Math.floor(Math.random() * messages.length)];
                showToast?.(message, 'success', { spriteUrl });
            } else {
                await updateDoc(likesRef, {
                    userIds: arrayRemove(userId),
                    count: Math.max(0, (likeCount || 1) - 1),
                    updatedAt: serverTimestamp(),
                });
            }
        } catch (err) {
            console.error('Failed to toggle like:', err);
            setHasLiked(!willLike);
            setLikeCount((c) => Math.max(0, c + (willLike ? -1 : 1)));
            showToast?.('Could not save your like. Try again.', 'error');
        } finally {
            setIsToggling(false);
        }
    }, [db, userId, hasLiked, isToggling, likeCount, showToast]);

    return (
        <>
            <span className="inline-flex items-center gap-2 ml-2 align-middle">
                <button
                    type="button"
                    onClick={handleToggleLike}
                    disabled={!db || !userId || isToggling}
                    aria-pressed={hasLiked}
                    aria-label={hasLiked ? 'Remove your like' : 'Like this app'}
                    title={hasLiked ? 'You liked this' : 'Like this app'}
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold transition-all duration-200 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${hasLiked ? 'border-primary bg-primary text-white' : 'border-surface-raised bg-surface-raised text-fg'}`}
                >
                    <HeartIcon color="currentColor" />
                    <span>{likeCount}</span>
                </button>
                <button
                    type="button"
                    onClick={() => setShowSuggestionModal(true)}
                    className="rounded text-[11px] text-muted underline hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                    Have a suggestion?
                </button>
            </span>

            {showSuggestionModal && (
                <SuggestionModal
                    onClose={() => setShowSuggestionModal(false)}
                    db={db}
                    userId={userId}
                    userEmail={userEmail}
                    displayName={displayName}
                    showToast={showToast}
                />
            )}
        </>
    );
};

const SuggestionModal = ({ onClose, db, userId, userEmail, displayName, showToast }) => {
    const dialogRef = useModalA11y(onClose);
    const [contactEmail, setContactEmail] = useState(userEmail || '');
    const [suggestion, setSuggestion] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const emailRef = useRef(null);
    const textareaRef = useRef(null);

    useEffect(() => {
        if (userEmail) {
            textareaRef.current?.focus();
            return;
        }
        emailRef.current?.focus();
    }, [userEmail]);

    const handleSubmit = useCallback(
        async (e) => {
            e.preventDefault();
            const text = suggestion.trim();
            const normalizedEmail = contactEmail.trim().toLowerCase();
            if (!db || !userId || !text || isSubmitting) return;
            if (!isValidEmail(normalizedEmail)) {
                showToast?.('Add a valid email so I can reply.', 'warning');
                return;
            }
            if (text.length > 1000) {
                showToast?.('Suggestion is too long (max 1000 chars).', 'warning');
                return;
            }
            setIsSubmitting(true);
            try {
                const normalizedDisplayName = displayName?.trim() || null;
                await addDoc(collection(db, `artifacts/${appId}/suggestions`), {
                    userId,
                    userEmail: normalizedEmail,
                    contactEmail: normalizedEmail,
                    authEmail: userEmail || null,
                    displayName: normalizedDisplayName,
                    source: 'footer',
                    pageTitle: 'Footer',
                    author: {
                        userId,
                        email: normalizedEmail,
                        authEmail: userEmail || null,
                        displayName: normalizedDisplayName,
                    },
                    text,
                    createdAt: serverTimestamp(),
                    userAgent:
                        typeof navigator !== 'undefined' ? navigator.userAgent : null,
                });
                showToast?.('Thanks for your suggestion!', 'success');
                onClose();
            } catch (err) {
                console.error('Failed to submit suggestion:', err);
                showToast?.('Could not send your suggestion. Try again.', 'error');
            } finally {
                setIsSubmitting(false);
            }
        },
        [db, userId, userEmail, displayName, contactEmail, suggestion, isSubmitting, showToast, onClose]
    );

    const remaining = 1000 - suggestion.length;
    const isContactEmailValid = isValidEmail(contactEmail);

    return (
        <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={onClose}
            role="presentation"
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="suggestion-modal-title"
                tabIndex={-1}
                className="relative w-full max-w-md rounded-2xl border border-surface-raised bg-surface p-6 shadow-2xl animate-scale-in focus:outline-none"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    type="button"
                    aria-label="Close suggestion form"
                    className="absolute top-4 right-4 text-muted hover:text-fg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg p-1"
                >
                    <CloseIcon />
                </button>

                <h2
                    id="suggestion-modal-title"
                    className="mb-1 text-xl font-bold text-fg"
                >
                    Send a suggestion
                </h2>
                <p className="mb-4 text-sm text-muted">
                    Got an idea, bug or feature request? I'd love to hear it.
                </p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    <input
                        ref={emailRef}
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value.slice(0, 254))}
                        placeholder="Your email for replies"
                        autoComplete="email"
                        maxLength={254}
                        className="w-full rounded-lg border-2 border-surface-raised bg-surface-raised p-3 text-sm text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    />
                    <textarea
                        ref={textareaRef}
                        value={suggestion}
                        onChange={(e) =>
                            setSuggestion(e.target.value.slice(0, 1000))
                        }
                        placeholder="Type your suggestion here..."
                        rows={5}
                        className="w-full resize-y rounded-lg border-2 border-surface-raised bg-surface-raised p-3 text-sm text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    />
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-xs text-muted">
                            {remaining} characters left
                        </span>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-lg bg-surface-raised px-4 py-2 text-sm font-semibold text-fg transition-all hover:scale-[1.02] active:scale-95"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={
                                    !db ||
                                    !userId ||
                                    !isContactEmailValid ||
                                    !suggestion.trim() ||
                                    isSubmitting
                                }
                                className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition-all hover:scale-[1.02] hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                                {isSubmitting ? 'Sending...' : 'Send'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default FooterFeedback;
