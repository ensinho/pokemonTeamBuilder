import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import { useModalA11y } from '../../hooks/useModalA11y';
import { getPokemonArtworkSpriteUrl } from '../../utils/pokemonSprites';
import { useTranslation } from '../../hooks/useTranslation';

export function QuizCelebrationModal({ isOpen, onClose, onTryAnother, onCloseQuiz, pokemon, accuracy, totalCount }) {
    const { t } = useTranslation();
    const dialogRef = useModalA11y(isOpen ? onClose : undefined);
    const canvasRef = useRef(null);

    useEffect(() => {
        if (!isOpen || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrameId;

        const handleResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', handleResize);
        handleResize();

        // Premium Color Palette for Confetti
        const colors = [
            '#7d65e1', // primary
            '#FBBF24', // accent/gold
            '#34D399', // success
            '#60A5FA', // info
            '#F87171', // danger/coral
            '#c084fc', // purple
            '#EC4899', // pink
        ];

        // Confetti physics particle simulation
        const particles = Array.from({ length: 140 }, () => {
            const angle = Math.random() * Math.PI * 2;
            const speed = 3 + Math.random() * 9;
            return {
                x: canvas.width / 2 + (Math.random() - 0.5) * 60,
                y: canvas.height * 0.45 + (Math.random() - 0.5) * 60,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - (4 + Math.random() * 6), // push upwards initially
                radius: 4 + Math.random() * 6,
                color: colors[Math.floor(Math.random() * colors.length)],
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 8,
                opacity: 1,
                decay: 0.004 + Math.random() * 0.012,
                gravity: 0.12 + Math.random() * 0.08,
                shape: Math.random() > 0.4 ? 'circle' : 'square',
            };
        });

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            let alive = false;

            particles.forEach((p) => {
                if (p.opacity <= 0) return;

                p.x += p.vx;
                p.y += p.vy;
                p.vy += p.gravity;
                p.vx *= 0.985; // slight air friction
                p.rotation += p.rotationSpeed;
                p.opacity -= p.decay;

                if (p.opacity > 0) {
                    alive = true;
                    ctx.save();
                    ctx.translate(p.x, p.y);
                    ctx.rotate((p.rotation * Math.PI) / 180);
                    ctx.globalAlpha = p.opacity;
                    ctx.fillStyle = p.color;

                    if (p.shape === 'circle') {
                        ctx.beginPath();
                        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
                        ctx.fill();
                    } else {
                        ctx.fillRect(-p.radius, -p.radius, p.radius * 2, p.radius * 2);
                    }
                    ctx.restore();
                }
            });

            if (alive) {
                animationFrameId = requestAnimationFrame(animate);
            }
        };

        animate();

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const pokemonName = pokemon ? pokemon.displayName : 'Pokémon';
    const artworkUrl = pokemon ? getPokemonArtworkSpriteUrl(pokemon.id) : '';

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md p-4 animate-fade-in"
            onClick={onClose}
            role="presentation"
        >
            {/* Background Canvas for Confetti */}
            <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" />

            {/* Modal Body */}
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="celebration-title"
                tabIndex={-1}
                className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-primary/20 bg-surface/90 shadow-elevation-3 p-8 focus:outline-none text-center select-none backdrop-saturate-150 animate-scale-in"
                style={{
                    background: 'radial-gradient(circle at center, rgba(125, 101, 225, 0.08) 0%, var(--color-surface) 100%)',
                }}
                onClick={(event) => event.stopPropagation()}
            >
                {/* Background Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none z-0" />

                <div className="relative z-10 space-y-6">
                    {/* Badge */}
                    <div className="mx-auto inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/30 bg-accent-soft text-accent text-xs font-bold uppercase tracking-wider animate-pulse">
                        {t('quiz.celebrationBadge')}
                    </div>

                    <div className="space-y-2">
                        <h2 id="celebration-title" className="text-3xl font-extrabold text-fg tracking-tight">
                            {t('quiz.celebrationTitle')}
                        </h2>
                        <p className="text-sm text-muted max-w-sm mx-auto leading-relaxed">
                            {t('quiz.celebrationDesc')}
                        </p>
                    </div>

                    {/* Pokémon Sprite Card */}
                    {artworkUrl && (
                        <div className="relative group my-4 mx-auto w-40 h-40 flex items-center justify-center rounded-2xl bg-surface-raised/40 border border-border p-4 shadow-lg overflow-visible">
                            {/* Pulsing ring animation */}
                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-primary-soft/40 to-accent-soft/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                            <div className="absolute w-32 h-32 border-2 border-dashed border-primary/20 rounded-full animate-spin pointer-events-none" style={{ animationDuration: '25s' }} />
                            <div className="absolute w-28 h-28 border border-dotted border-accent/30 rounded-full animate-spin pointer-events-none" style={{ animationDuration: '12s', animationDirection: 'reverse' }} />

                            <img
                                src={artworkUrl}
                                alt={pokemonName}
                                className="w-32 h-32 object-contain image-pixelated sprite-fade relative z-10 transition-transform duration-300 hover:scale-110 cursor-pointer"
                                title={pokemonName}
                            />
                        </div>
                    )}

                    <div className="text-sm font-semibold text-fg">
                        {t('quiz.celebratedWith', { name: pokemonName })}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto bg-surface-raised/30 rounded-2xl p-4 border border-border">
                        <div className="text-center">
                            <span className="block text-xs text-muted uppercase font-bold tracking-wider mb-1">{t('quiz.totalGuessed')}</span>
                            <span className="text-lg font-black text-fg">{totalCount}</span>
                        </div>
                        <div className="text-center border-l border-border">
                            <span className="block text-xs text-muted uppercase font-bold tracking-wider mb-1">{t('quiz.accuracy')}</span>
                            <span className="text-lg font-black text-success">{accuracy}%</span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
                        <button
                            type="button"
                            onClick={() => {
                                onTryAnother?.();
                                onClose?.();
                            }}
                            className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-elevation-1 transition-all hover:scale-102 hover:shadow-lg hover:shadow-primary-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                            {t('quiz.tryAnotherGen')}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                onCloseQuiz?.();
                                onClose?.();
                            }}
                            className="inline-flex items-center justify-center rounded-xl border border-border bg-surface-raised px-5 py-3 text-sm font-semibold text-fg transition-all hover:scale-102 hover:bg-surface-raised/75 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                            {t('quiz.closeQuiz')}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
