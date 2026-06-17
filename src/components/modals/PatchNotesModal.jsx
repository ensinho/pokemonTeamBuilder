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

const PokePuzzleVisual = ({ colors, t, language }) => {
    const [step, setStep] = React.useState(0); // 0: Silhouette/Empty, 1: Typing, 2: Flipping, 3: Revealed/Solved
    const [typedLetters, setTypedLetters] = React.useState([]);
    const targetName = 'GENGAR';
    const firstGuessName = 'PIKACH'; // 6 letters

    React.useEffect(() => {
        let timer;
        if (step === 0) {
            setTypedLetters([]);
            timer = setTimeout(() => {
                setStep(1);
            }, 1200);
        } else if (step === 1) {
            let charIndex = 0;
            const interval = setInterval(() => {
                if (charIndex <= targetName.length) {
                    setTypedLetters(targetName.slice(0, charIndex).split(''));
                    charIndex++;
                } else {
                    clearInterval(interval);
                    setStep(2);
                }
            }, 180);
            return () => clearInterval(interval);
        } else if (step === 2) {
            timer = setTimeout(() => {
                setStep(3);
            }, 1000);
        } else if (step === 3) {
            timer = setTimeout(() => {
                setStep(0);
            }, 3000);
        }
        return () => clearTimeout(timer);
    }, [step]);

    return (
        <div className="rounded-md bg-bg p-3 flex flex-col items-center justify-center gap-3 relative overflow-hidden h-[150px]" aria-hidden="true">
            <style>{`
                @keyframes mini-tile-flip {
                    0% { transform: rotateY(0deg); }
                    45% { transform: rotateY(90deg); }
                    55% { transform: rotateY(90deg); }
                    100% { transform: rotateY(0deg); }
                }
                .mini-tile-flip {
                    animation: mini-tile-flip 0.4s ease forwards;
                }
            `}</style>
            
            {/* Background decorative glow */}
            <div className="absolute inset-0 bg-gradient-to-b from-violet-900/10 to-transparent pointer-events-none" />
            
            <div className="flex w-full items-center justify-around gap-2 z-10">
                {/* Pokémon Silhouette / Reveal Frame */}
                <div className="relative w-16 h-16 rounded-xl border border-border bg-surface/50 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                    <img
                        src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/94.png"
                        alt="Gengar"
                        className="w-14 h-14 object-contain transition-all duration-700"
                        style={{
                            filter: step === 3 
                                ? 'none' 
                                : 'brightness(0) drop-shadow(0 0 4px rgba(124, 58, 237, 0.6))',
                            transform: step === 3 ? 'scale(1) rotate(0deg)' : 'scale(0.85) rotate(2deg)'
                        }}
                    />
                    {step !== 3 && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/10 text-white font-extrabold text-lg select-none">
                            ?
                        </div>
                    )}
                </div>

                {/* Guess Grid */}
                <div className="flex flex-col gap-1.5 flex-1 max-w-[180px]">
                    {/* Row 1: Previous Guess "PIKACH" (P:absent, I:absent, K:absent, A:present, C:absent, H:absent) */}
                    <div className="grid grid-cols-6 gap-1 w-full">
                        {firstGuessName.split('').map((char, idx) => {
                            const isPresent = char === 'A';
                            return (
                                <div 
                                    key={idx} 
                                    className="text-[10px] font-bold text-white flex items-center justify-center rounded w-full aspect-square border"
                                    style={{
                                        backgroundColor: isPresent ? '#f59e0b' : '#3b3954',
                                        borderColor: isPresent ? '#f59e0b' : '#4a4868'
                                    }}
                                >
                                    {char}
                                </div>
                            );
                        })}
                    </div>

                    {/* Row 2: Current Typing / Revealed Guess */}
                    <div className="grid grid-cols-6 gap-1 w-full">
                        {Array.from({ length: 6 }).map((_, idx) => {
                            const letter = typedLetters[idx] || '';
                            const isFilled = letter !== '';
                            
                            let bgColor = 'rgba(255, 255, 255, 0.03)';
                            let borderColor = 'rgba(255, 255, 255, 0.1)';
                            let textColor = 'var(--color-fg)';
                            let animationStyle = '';

                            if (isFilled && step === 1) {
                                borderColor = 'var(--color-muted)';
                            } else if (step >= 2) {
                                bgColor = '#10b981';
                                borderColor = '#10b981';
                                textColor = '#ffffff';
                                animationStyle = 'mini-tile-flip 0.4s ease forwards';
                            }

                            return (
                                <div 
                                    key={idx} 
                                    className="text-[10px] font-bold flex items-center justify-center rounded w-full aspect-square border"
                                    style={{
                                        backgroundColor: bgColor,
                                        borderColor: borderColor,
                                        color: textColor,
                                        animation: animationStyle,
                                        animationDelay: step === 2 ? `${idx * 100}ms` : '0ms'
                                    }}
                                >
                                    {letter}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Subtitle / Action State Banner */}
            <div className="text-[10px] font-bold z-10 flex items-center gap-1.5 h-4">
                {step === 0 && (
                    <span className="text-muted">
                        {t('pokepuzzle.homeTeaserSubtitle') || "Who's That Pokémon?"}
                    </span>
                )}
                {step === 1 && (
                    <span className="text-primary animate-pulse">
                        {language === 'pt' ? 'Digitando palpite...' : 'Typing guess...'}
                    </span>
                )}
                {step === 2 && (
                    <span className="text-warning">
                        {language === 'pt' ? 'Verificando resposta...' : 'Checking answer...'}
                    </span>
                )}
                {step === 3 && (
                    <span className="text-success animate-bounce flex items-center gap-1">
                        🎉 {language === 'pt' 
                            ? 'Acertou! Gengar em 2 tentativas!' 
                            : 'Correct! Gengar in 2 tries!'}
                    </span>
                )}
            </div>
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

    const notes = [
        {
            key: 'pokepuzzle',
            Icon: PokeballIcon,
            title: t('patchNotes.pokepuzzleTitle'),
            description: t('patchNotes.pokepuzzleDesc'),
            cta: t('patchNotes.pokepuzzleCta'),
            path: '/pokepuzzle',
            Visual: PokePuzzleVisual,
        },
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
