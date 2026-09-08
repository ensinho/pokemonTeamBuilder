import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { PATCH_NOTES_VERSION } from '../../constants/theme';
import { useModalA11y } from '../../hooks/useModalA11y';
import { CloseIcon, DownloadIcon, FlowerIcon, HeartIcon, PokeballIcon, SparklesIcon } from '../icons';
import { useTranslation } from '../../hooks/useTranslation';
import { getGameLogo } from '../../assets/gameLogos';

const CHAMPIONS_LOGO = getGameLogo('champions');

const SPRITE_BASE = 'https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon';

// Champions Pokédex — the cover the user will look for in the picker, over the
// roster it unlocks. Same grammar as the other two visuals: tiles, then caption.
const ChampionsDexVisual = ({ language }) => {
    const pt = language === 'pt';
    return (
        <div className="flex h-[9.5rem] flex-col items-center justify-center gap-2.5 bg-bg p-3" aria-hidden="true">
            <span className="flex h-10 w-32 items-center justify-center rounded-md bg-surface-raised p-1.5">
                <img src={CHAMPIONS_LOGO} alt="" className="max-h-full max-w-full object-contain" />
            </span>
            <div className="flex items-center gap-2">
                {[3, 727, 149].map((id) => (
                    <span key={id} className="relative flex h-12 w-12 items-center justify-center rounded-lg bg-surface-raised">
                        <img
                            src={`${SPRITE_BASE}/${id}.png`}
                            alt=""
                            className="h-10 w-10 object-contain"
                            style={{ imageRendering: 'pixelated' }}
                        />
                        {id === 3 && (
                            <span className="absolute -bottom-1 rounded-full bg-primary px-1.5 text-[0.5rem] font-bold uppercase tracking-wide text-white">
                                Mega
                            </span>
                        )}
                    </span>
                ))}
            </div>
            <span className="font-mono text-[0.6rem] font-semibold tabular-nums text-muted">
                {pt ? '262 Pokémon · 208 espécies' : '262 Pokémon · 208 species'}
            </span>
        </div>
    );
};

// Playthrough mode — the whole point is what stops appearing, so show the same
// two cards with and without the meta pill.
const PlaythroughVisual = ({ t }) => (
    <div className="flex h-[9.5rem] flex-col items-center justify-center gap-2.5 bg-bg p-3" aria-hidden="true">
        <div className="flex items-center gap-2.5">
            {[25, 6].map((id) => (
                <span key={id} className="relative flex h-12 w-12 items-center justify-center rounded-lg bg-surface-raised">
                    <img src={`${SPRITE_BASE}/${id}.png`} alt="" className="h-10 w-10 object-contain" style={{ imageRendering: 'pixelated' }} />
                    <span className="absolute -bottom-1 rounded-full bg-primary px-1.5 text-[0.5rem] font-bold uppercase tracking-wide text-white">
                        Meta
                    </span>
                </span>
            ))}
            <span className="px-1 text-sm font-bold text-muted">→</span>
            {[25, 6].map((id) => (
                <span key={id} className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-raised">
                    <img src={`${SPRITE_BASE}/${id}.png`} alt="" className="h-10 w-10 object-contain" style={{ imageRendering: 'pixelated' }} />
                </span>
            ))}
        </div>
        <span className="rounded-full bg-surface-raised px-2.5 py-1 text-[0.62rem] font-bold text-muted">
            {t('builder.playthroughBadge')}
        </span>
    </div>
);

// The two games imported this release, side by side — each with its own
// starters so the pair reads as "two new games", not one entry with a footnote.
const NEW_GAMES = [
    { key: 'firered-leafgreen', label: 'FireRed / LeafGreen', count: 151, starters: [1, 4, 7] },
    { key: 'legends-za', label: 'Legends: Z-A', count: 412, starters: [650, 653, 656] },
];

const NewGamesVisual = ({ language }) => {
    const pt = language === 'pt';
    return (
        <div className="flex h-[9.5rem] flex-col items-center justify-center gap-2.5 bg-bg p-3" aria-hidden="true">
            <div className="flex w-full items-stretch justify-center gap-2">
                {NEW_GAMES.map((game) => (
                    <div key={game.key} className="flex flex-1 flex-col items-center gap-1.5 rounded-lg bg-surface-raised p-2">
                        <div className="flex items-center gap-1">
                            {game.starters.map((id) => (
                                <img
                                    key={id}
                                    src={`${SPRITE_BASE}/${id}.png`}
                                    alt=""
                                    className="h-8 w-8 object-contain"
                                    style={{ imageRendering: 'pixelated' }}
                                />
                            ))}
                        </div>
                        <span className="text-[0.68rem] font-bold leading-tight text-fg">{game.label}</span>
                        <span className="font-mono text-[0.55rem] font-semibold tabular-nums text-muted">
                            {game.count} Pokémon
                        </span>
                    </div>
                ))}
            </div>
            <span className="font-mono text-[0.6rem] font-semibold tabular-nums text-muted">
                {pt ? '2 jogos novos no seletor' : '2 new games in the picker'}
            </span>
        </div>
    );
};

export function PatchNotesModal({ onClose, colors, isInstallable, isIOS, onInstall }) {
    const { t, language } = useTranslation();
    const dialogRef = useModalA11y(onClose);
    const navigate = useNavigate();
    const goTo = useCallback((path) => {
        onClose();
        navigate(path);
    }, [navigate, onClose]);

    // This release only. Every entry here came from a suggestion in the footer
    // feedback box — when the list changes, bump PATCH_NOTES_VERSION in
    // constants/theme.js so the modal reopens for everyone.
    const notes = [
        {
            key: 'champions-dex',
            Icon: PokeballIcon,
            title: t('patchNotes.championsTitle'),
            description: t('patchNotes.championsDesc'),
            cta: t('patchNotes.championsCta'),
            path: '/builder',
            Visual: ChampionsDexVisual,
        },
        {
            key: 'playthrough-mode',
            Icon: SparklesIcon,
            title: t('patchNotes.playthroughTitle'),
            description: t('patchNotes.playthroughDesc'),
            cta: t('patchNotes.playthroughCta'),
            path: '/builder',
            Visual: PlaythroughVisual,
        },
        {
            key: 'new-games',
            Icon: PokeballIcon,
            title: t('patchNotes.newGamesTitle'),
            description: t('patchNotes.newGamesDesc'),
            cta: t('patchNotes.newGamesCta'),
            path: '/builder',
            Visual: NewGamesVisual,
        },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4" onClick={onClose} role="presentation">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="patch-notes-title"
                tabIndex={-1}
                className="relative flex w-full max-w-lg max-h-[95vh] flex-col rounded-2xl bg-surface shadow-xl animate-scale-in focus:outline-none"
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
                        {t('patchNotes.releaseLine', { version: PATCH_NOTES_VERSION })}
                    </p>
                </div>

                <div className="shrink-0 px-5 pt-4">
                    <div className="flex items-start gap-3 rounded-xl bg-surface-raised p-3">
                        <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary" aria-hidden="true">
                            <HeartIcon className="w-4 h-4" />
                        </span>
                        <p className="text-sm text-fg">{t('patchNotes.thanksBody')}</p>
                    </div>
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
                                className="w-full rounded-xl bg-surface-raised p-4 text-left transition-colors duration-150 hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                aria-label={`${title} – ${cta}`}
                            >
                                <div className="mb-3 overflow-hidden rounded-lg bg-surface">
                                    <NoteVisual colors={colors} t={t} language={language} />
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
