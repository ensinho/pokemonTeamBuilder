import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { PATCH_NOTES_VERSION } from '../../constants/theme';
import { SHARE_BACKGROUNDS } from '../../assets/backgrounds';
import { useModalA11y } from '../../hooks/useModalA11y';
import { AccountIcon, CloseIcon, FlowerIcon, HeartIcon, ShareIcon } from '../icons';

const LikeFeedbackVisual = ({ colors }) => (
    <div
        className="rounded-md p-3 flex items-center justify-center gap-2"
        style={{ backgroundColor: colors.background }}
        aria-hidden="true"
    >
        <span className="text-[10px]" style={{ color: colors.textMuted }}>
            Developed by Enzo Esmeraldo
        </span>
        <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{
                backgroundColor: colors.primary,
                color: 'white',
                border: `1px solid ${colors.primary}`,
            }}
        >
            <HeartIcon className="w-3 h-3 shrink-0" />
            <span>1</span>
        </span>
        <span className="text-[9px] underline" style={{ color: colors.textMuted }}>
            Have a suggestion?
        </span>
    </div>
);

const SNIPPET_VISUAL_BG = SHARE_BACKGROUNDS[0]?.url || '';

const SnippetVisual = ({ colors }) => (
    <div
        className="rounded-md p-2"
        style={{ backgroundColor: colors.background }}
        aria-hidden="true"
    >
        <div
            className="relative rounded-md overflow-hidden p-2"
            style={{
                backgroundImage: `linear-gradient(135deg, rgba(0, 0, 0, 0.28) 0%, rgba(0, 0, 0, 0.42) 100%), url(${SNIPPET_VISUAL_BG})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                border: `1px solid ${colors.primary}44`,
            }}
        >
            <p className="text-[7px] font-bold uppercase tracking-wider text-white/90 mb-1">
                Team Snippet
            </p>
            <div className="flex items-end justify-between gap-2">
                <div className="flex -space-x-1">
                    {[0, 1, 2].map((index) => (
                        <span
                            key={index}
                            className="w-4 h-4 rounded-full border"
                            style={{ borderColor: 'rgba(255,255,255,0.7)', backgroundColor: 'rgba(255,255,255,0.2)' }}
                        />
                    ))}
                </div>
                <span className="w-4 h-4 rounded-sm" style={{ backgroundColor: '#fff' }} />
            </div>
        </div>
        <div className="mt-2 flex items-center gap-1.5">
            <span className="text-[8px] px-1.5 py-0.5 rounded font-bold text-white" style={{ backgroundColor: colors.primary }}>Share</span>
            <span className="text-[8px] px-1.5 py-0.5 rounded font-bold" style={{ backgroundColor: colors.cardLight, color: colors.text }}>Download</span>
        </div>
    </div>
);

const ProfileVisual = ({ colors }) => (
    <div
        className="rounded-md p-2 relative overflow-hidden"
        style={{
            backgroundImage: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 120%)`,
            color: '#fff',
        }}
        aria-hidden="true"
    >
        <div className="flex items-center gap-2">
            <div
                className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-extrabold"
                style={{ backgroundColor: 'rgba(255,255,255,0.22)' }}
            >
                T
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[7px] uppercase tracking-[0.18em] opacity-80 font-semibold">
                    Trainer Profile
                </p>
                <p className="text-[10px] font-extrabold leading-tight truncate">
                    Your Name
                </p>
            </div>
            <div
                className="rounded px-1.5 py-1 text-center"
                style={{ backgroundColor: 'rgba(0,0,0,0.25)' }}
            >
                <p className="text-[6px] uppercase opacity-80">Streak</p>
                <p className="text-[10px] font-extrabold leading-none">7d</p>
            </div>
        </div>
        <div className="flex gap-1 mt-1.5">
            {['#7d65e1', '#6353b3', '#38BDF8', '#CA8A04'].map((colorValue) => (
                <span
                    key={colorValue}
                    className="w-3 h-3 rounded-full border"
                    style={{ backgroundColor: colorValue, borderColor: 'rgba(255,255,255,0.6)' }}
                />
            ))}
        </div>
    </div>
);

export function PatchNotesModal({ onClose, colors }) {
    const dialogRef = useModalA11y(onClose);
    const navigate = useNavigate();
    const goTo = useCallback((path) => {
        onClose();
        navigate(path);
    }, [navigate, onClose]);

    const notes = [
        {
            key: 'snippet',
            Icon: ShareIcon,
            title: 'Team Snippet Sharing',
            description: 'Share your team as a polished image with custom title, background, QR code, and quick download/share actions.',
            cta: 'Open builder and tap Share',
            path: '/builder',
            Visual: SnippetVisual,
        },
        {
            key: 'profile',
            Icon: AccountIcon,
            title: 'Profile, Themes & Streak',
            description: 'New Profile screen with a trainer card, login streak, two new themes (Midnight, Solar) and cross-device sync of your preferences.',
            cta: 'Open your profile',
            path: '/profile',
            Visual: ProfileVisual,
        },
        {
            key: 'like',
            Icon: HeartIcon,
            title: 'Like the App + Send Suggestions',
            description: 'Found a bug or have an idea? Tap the heart in the footer to show some love or send a suggestion straight to me.',
            cta: 'Scroll to the footer',
            path: '/',
            Visual: LikeFeedbackVisual,
        },
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose} role="presentation">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="patch-notes-title"
                tabIndex={-1}
                className="rounded-2xl shadow-xl w-full max-w-lg max-h-[95vh] flex flex-col relative animate-fade-in focus:outline-none"
                style={{ backgroundColor: colors.card, '--scrollbar-track-color': colors.card, '--scrollbar-thumb-color': colors.primary, '--scrollbar-thumb-border-color': colors.card }}
                onClick={(event) => event.stopPropagation()}
            >
                <button onClick={onClose} type="button" aria-label="Close patch notes" className="absolute top-4 right-4 text-muted hover:text-fg transition-colors z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg p-1">
                    <CloseIcon />
                </button>

                <div className="text-center px-5 pt-5 pb-4 border-b shrink-0" style={{ borderColor: colors.cardLight }}>
                    <div className="flex items-center justify-center gap-4 mb-2">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full" style={{ backgroundColor: colors.primary + '20' }}>
                            <FlowerIcon />
                        </div>
                        <h2 id="patch-notes-title" className="text-2xl md:text-3xl font-extrabold tracking-tight" style={{ color: colors.text }}>
                            What's New!
                        </h2>
                    </div>
                    <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
                        Version {PATCH_NOTES_VERSION} • April 2026
                    </p>
                </div>

                <div className="space-y-4 px-5 py-4 overflow-y-auto custom-scrollbar flex-1 min-h-0">
                    {notes.map(({ key, Icon, title, description, cta, path, Visual }) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => goTo(path)}
                            className="w-full text-left p-4 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            style={{ backgroundColor: colors.cardLight }}
                            aria-label={`${title} – ${cta}`}
                        >
                            <div className="rounded-lg overflow-hidden mb-3" style={{ backgroundColor: colors.card }}>
                                <Visual colors={colors} />
                            </div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-md" style={{ color: colors.primary, backgroundColor: colors.primary + '1A' }} aria-hidden="true">
                                    <Icon className="w-4 h-4" />
                                </span>
                                <h3 className="font-bold" style={{ color: colors.primary }}>{title}</h3>
                            </div>
                            <p className="text-sm" style={{ color: colors.text }}>
                                {description}
                            </p>
                            <span className="inline-flex items-center gap-1 mt-2 text-xs font-semibold" style={{ color: colors.primary }}>
                                {cta}
                                <span aria-hidden="true">→</span>
                            </span>
                        </button>
                    ))}
                </div>

                <div className="text-center px-5 pt-4 pb-5 border-t shrink-0" style={{ borderColor: colors.cardLight }}>
                    <button
                        onClick={onClose}
                        className="px-8 py-3 rounded-lg font-bold text-white transition-colors hover:opacity-90"
                        style={{ backgroundColor: colors.primary }}
                    >
                        Got it, let's go!
                    </button>
                    <p className="text-xs mt-3" style={{ color: colors.textMuted }}>
                        Made by Enzo Esmeraldo -- hope you like it!
                    </p>
                </div>
            </div>
        </div>
    );
}