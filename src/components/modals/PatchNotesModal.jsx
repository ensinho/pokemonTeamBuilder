import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { PATCH_NOTES_VERSION } from '../../constants/theme';
import { useModalA11y } from '../../hooks/useModalA11y';
import { ChartColumnIcon, CloseIcon, DownloadIcon, FlowerIcon, HeartIcon, MapPinIcon, PokeballIcon, MessageIcon } from '../icons';
import { useTranslation } from '../../hooks/useTranslation';

const SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';

const LikeFeedbackVisual = ({ t }) => (
    <div
        className="flex items-center justify-center gap-2 rounded-md bg-bg p-3"
        aria-hidden="true"
    >
        <span className="text-[10px] text-muted">
            {t('patchNotes.developedBy')}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-primary bg-primary px-2 py-0.5 text-[10px] font-semibold text-white">
            <HeartIcon className="w-3 h-3 shrink-0" />
            <span>1</span>
        </span>
        <span className="text-[9px] text-muted underline">
            {t('patchNotes.haveSuggestion')}
        </span>
    </div>
);

const ChatFeedVisual = ({ colors, t }) => {
    const teamPokemonIds = [1, 4, 7, 25, 133, 143]; // Bulbasaur, Charmander, Squirtle, Pikachu, Eevee, Snorlax

    return (
        <div className="rounded-md bg-bg p-3 text-left" aria-hidden="true">
            <div className="flex items-start gap-2">
                <div
                    className="w-6 h-6 rounded-full flex items-center justify-center overflow-hidden shrink-0 border"
                    style={{ backgroundColor: colors.primary + '12', borderColor: colors.primary + '33' }}
                >
                    <img
                        src={`${SPRITE_BASE}/25.png`}
                        alt=""
                        className="w-6 h-6 object-contain"
                    />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1 mb-0.5">
                        <span className="text-[10px] font-bold text-fg">@AshKetchum</span>
                        <span className="text-[7px] text-muted">now</span>
                    </div>
                    <p className="text-[9px] text-fg leading-tight">
                        Check out my Gen I starter dream team! ⚡
                    </p>

                    <div
                        className="mt-1.5 rounded-md p-1.5 flex items-center justify-between gap-2 border"
                        style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.02)',
                            borderColor: 'rgba(255, 255, 255, 0.06)'
                        }}
                    >
                        <div className="min-w-0 flex-1">
                            <h4 className="text-[8px] font-bold text-fg truncate">Gen I Starters</h4>
                            <div className="flex gap-0.5 mt-0.5">
                                {teamPokemonIds.map((id, idx) => (
                                    <div
                                        key={idx}
                                        className="w-4 h-4 rounded bg-surface border border-border flex items-center justify-center overflow-hidden shrink-0"
                                    >
                                        <img
                                            src={`${SPRITE_BASE}/${id}.png`}
                                            alt=""
                                            className="w-3.5 h-3.5 object-contain"
                                            style={{ imageRendering: 'pixelated' }}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div
                            className="text-[7px] font-bold px-1.5 py-0.5 rounded text-white shrink-0"
                            style={{ backgroundColor: colors.primary }}
                        >
                            {t('common.import') || 'Import'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const MoreInfoVisual = ({ colors, t }) => {
    const tabs = [
        t('patchNotes.statsData'),
        t('patchNotes.locations'),
        t('patchNotes.moves'),
        t('patchNotes.sprites')
    ];
    const stats = [
        { name: 'HP', value: 45, max: 255 },
        { name: 'ATK', value: 49, max: 255 },
        { name: 'DEF', value: 49, max: 255 },
    ];

    return (
        <div className="rounded-md bg-bg p-2" aria-hidden="true">
            <div className="flex border-b mb-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                {tabs.map((tab, i) => (
                    <span
                        key={tab}
                        className="text-[7px] font-bold px-2 pb-1.5 whitespace-nowrap"
                        style={i === 0 ? {
                            borderBottom: `2px solid ${colors.primary}`,
                            color: colors.primary,
                            marginBottom: '-1px',
                        } : {
                            color: 'rgba(255,255,255,0.3)',
                        }}
                    >
                        {tab}
                    </span>
                ))}
            </div>
            <div className="space-y-1 px-1">
                {stats.map((stat) => (
                    <div key={stat.name} className="flex items-center gap-2">
                        <span className="text-[7px] text-muted w-6 shrink-0">{stat.name}</span>
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                            <div
                                className="h-full rounded-full"
                                style={{ width: `${(stat.value / stat.max) * 100}%`, backgroundColor: colors.primary }}
                            />
                        </div>
                        <span className="text-[8px] font-bold text-fg w-5 text-right">{stat.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export function PatchNotesModal({ onClose, colors, isInstallable, isIOS, onInstall }) {
    const { t } = useTranslation();
    const dialogRef = useModalA11y(onClose);
    const navigate = useNavigate();
    const goTo = useCallback((path) => {
        onClose();
        navigate(path);
    }, [navigate, onClose]);

    const notes = [
        {
            key: 'chat-feed',
            Icon: MessageIcon,
            title: t('patchNotes.chatFeedTitle'),
            description: t('patchNotes.chatFeedDesc'),
            cta: t('patchNotes.chatFeedCta'),
            path: '/',
            Visual: ChatFeedVisual,
        },
        {
            key: 'like',
            Icon: HeartIcon,
            title: t('patchNotes.likeTitle'),
            description: t('patchNotes.likeDesc'),
            cta: t('patchNotes.likeCta'),
            path: '/',
            Visual: LikeFeedbackVisual,
        },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" onClick={onClose} role="presentation">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="patch-notes-title"
                tabIndex={-1}
                className="relative flex w-full max-w-lg max-h-[95vh] flex-col rounded-2xl bg-surface shadow-xl animate-fade-in focus:outline-none"
                style={{ '--scrollbar-track-color': colors.card, '--scrollbar-thumb-color': colors.primary, '--scrollbar-thumb-border-color': colors.card }}
                onClick={(event) => event.stopPropagation()}
            >
                <button onClick={onClose} type="button" aria-label={t('patchNotes.closeLabel')} className="absolute top-4 right-4 text-muted hover:text-fg transition-colors z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg p-1">
                    <CloseIcon />
                </button>

                <div className="shrink-0 border-b border-surface-raised px-5 pb-4 pt-5 text-center">
                    <div className="flex items-center justify-center gap-4 mb-2">
                        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
                            <FlowerIcon />
                        </div>
                        <h2 id="patch-notes-title" className="text-2xl font-extrabold tracking-tight text-fg md:text-3xl">
                            {t('patchNotes.whatsNew')}
                        </h2>
                    </div>
                    <p className="mt-1 text-sm text-muted">
                        Version {PATCH_NOTES_VERSION} • June 2026
                    </p>
                </div>

                <div className="space-y-4 px-5 py-4 overflow-y-auto custom-scrollbar flex-1 min-h-0">
                    {notes.map((note) => {
                        const { key, title, description, cta, path } = note;
                        const NoteIcon = note.Icon;
                        const NoteVisual = note.Visual;
                        return (
                            <button
                                key={key}
                                type="button"
                                onClick={() => goTo(path)}
                                className="w-full rounded-xl bg-surface-raised p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                aria-label={`${title} – ${cta}`}
                            >
                                <div className="mb-3 overflow-hidden rounded-lg bg-surface">
                                    <NoteVisual colors={colors} t={t} />
                                </div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary-soft text-primary" aria-hidden="true">
                                        <NoteIcon className="w-4 h-4" />
                                    </span>
                                    <h3 className="font-bold text-primary">{title}</h3>
                                </div>
                                <p className="text-sm text-fg">
                                    {description}
                                </p>
                                <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                                    {cta}
                                    <span aria-hidden="true">→</span>
                                </span>
                            </button>
                        );
                    })}
                </div>

                <div className="shrink-0 border-t border-surface-raised px-5 pb-5 pt-4">
                    {(isInstallable || isIOS) && (
                        <div
                            className="mb-4 flex items-center gap-3 rounded-xl p-3"
                            style={{ backgroundColor: colors.primary + '18', border: `1px solid ${colors.primary}35` }}
                        >
                            <div
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
                                style={{ backgroundColor: colors.primary }}
                            >
                                <DownloadIcon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                                <p className="text-sm font-bold text-fg">{t('patchNotes.addToHome')}</p>
                                <p className="text-xs text-muted">
                                    {isIOS
                                        ? t('patchNotes.iosInstallHint')
                                        : t('patchNotes.installHint')}
                                </p>
                            </div>
                            {isInstallable && (
                                <button
                                    type="button"
                                    onClick={onInstall}
                                    className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-bold text-white transition-opacity hover:opacity-90 active:opacity-75"
                                    style={{ backgroundColor: colors.primary }}
                                >
                                    {t('patchNotes.installBtn')}
                                </button>
                            )}
                        </div>
                    )}
                    <div className="text-center">
                        <button
                            onClick={onClose}
                            className="rounded-lg bg-primary px-8 py-3 font-bold text-white transition-colors hover:opacity-90"
                        >
                            {t('patchNotes.gotIt')}
                        </button>
                        <p className="mt-3 text-xs text-muted">
                            {t('patchNotes.madeBy')}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
