import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { useModalA11y } from '../../hooks/useModalA11y';
import {
    SHARE_BACKGROUNDS,
    DEFAULT_BACKGROUND_ID,
    SNIPPET_DIMENSIONS,
    getBackgroundById,
} from '../../assets/backgrounds';
import { CloseIcon, ShareIcon } from '../icons';
import { useTranslation } from '../../hooks/useTranslation';
import { useForumStore } from '../../store/useForumStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useActiveTeamStore } from '../../store/useActiveTeamStore';
import { getPokemonArtworkSpriteUrl, getPokemonFrontSpriteUrl } from '../../utils/pokemonSprites';

const serializeTeamPokemon = (pokemon) => ({
    id: pokemon.id,
    name: pokemon.name,
    sprite: pokemon.sprite || getPokemonArtworkSpriteUrl(pokemon.id),
    shinySprite: pokemon.shinySprite || getPokemonArtworkSpriteUrl(pokemon.id, { shiny: true }),
    animatedSprite: pokemon.animatedSprite || getPokemonFrontSpriteUrl(pokemon.id),
    animatedShinySprite: pokemon.animatedShinySprite || getPokemonFrontSpriteUrl(pokemon.id, { shiny: true }),
    instanceId: pokemon.instanceId,
    customization: pokemon.customization || {},
});

// Author/brand link baked into every shared snippet.
const BRAND_URL = 'https://github.com/ensinho/pokemonTeamBuilder';
const BRAND_LABEL = 'github.com/ensinho/pokemonTeamBuilder';
const BRAND_LOGO_URL = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname.includes('/pokemonTeamBuilder') ? '/pokemonTeamBuilder/' : '/'}LogoCuteGengarRounded.png`.replace(/([^:]\/)\/+/g, "$1")
    : '/LogoCuteGengarRounded.png';

// ---------------------------------------------------------------------------
// Image helpers
// ---------------------------------------------------------------------------

/** Load an image with CORS enabled only for external cross-origin URLs. */
const loadImage = (src) =>
    new Promise((resolve, reject) => {
        if (!src) return reject(new Error('Missing image src'));
        const img = new Image();
        const isExternal = src.startsWith('http') && typeof window !== 'undefined' && !src.startsWith(window.location.origin);
        if (isExternal) {
            img.crossOrigin = 'anonymous';
        }
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load ${src}`));
        img.src = src;
    });

/** Cover-fit a source image into a destination rectangle. */
const drawCover = (ctx, img, dx, dy, dw, dh) => {
    const sRatio = img.width / img.height;
    const dRatio = dw / dh;
    let sx = 0;
    let sy = 0;
    let sw = img.width;
    let sh = img.height;
    if (sRatio > dRatio) {
        sw = img.height * dRatio;
        sx = (img.width - sw) / 2;
    } else {
        sh = img.width / dRatio;
        sy = (img.height - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
};

const titleCase = (s = '') =>
    s
        .split(/[\s-_]+/)
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

// ---------------------------------------------------------------------------
// Snippet renderer — draws the team card onto a canvas at SNIPPET_DIMENSIONS
// ---------------------------------------------------------------------------

const renderSnippet = async ({ canvas, background, title, subtitle, pokemons, shareUrl }) => {
    const { width: W, height: H } = SNIPPET_DIMENSIONS;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    // Background image
    try {
        const bg = await loadImage(background.url);
        drawCover(ctx, bg, 0, 0, W, H);
    } catch {
        // Fallback gradient if background fails
        const g = ctx.createLinearGradient(0, 0, W, H);
        g.addColorStop(0, '#7d65e1');
        g.addColorStop(1, '#38BDF8');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
    }

    // Soft top + bottom vignette for legibility of text overlays
    const topVignette = ctx.createLinearGradient(0, 0, 0, H * 0.35);
    topVignette.addColorStop(0, 'rgba(0,0,0,0.55)');
    topVignette.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = topVignette;
    ctx.fillRect(0, 0, W, H * 0.35);

    const botVignette = ctx.createLinearGradient(0, H * 0.65, 0, H);
    botVignette.addColorStop(0, 'rgba(0,0,0,0)');
    botVignette.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = botVignette;
    ctx.fillRect(0, H * 0.65, W, H * 0.35);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 12;
    ctx.font = '700 64px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(title || 'My Pokémon Team', W / 2, 48, W - 96);

    if (subtitle) {
        ctx.font = '500 26px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillText(subtitle, W / 2, 124, W - 96);
    }
    ctx.shadowBlur = 0;

    // Sprite grid — up to 6 slots, 3 columns x 2 rows. Reserve room at the
    // bottom for the brand + QR footer strip.
    const FOOTER_H = 81;
    const slots = pokemons.slice(0, 6);
    const cols = 3;
    const rows = Math.max(1, Math.ceil(slots.length / cols));
    const gridTop = 200;
    const gridBottom = H - FOOTER_H;
    const gridHeight = gridBottom - gridTop;
    const cellW = W / cols;
    const cellH = gridHeight / rows;
    const spriteSize = Math.min(cellW, cellH) * 0.78;

    await Promise.all(
        slots.map(async (p, i) => {
            const cx = (i % cols) * cellW + cellW / 2;
            const cy = gridTop + Math.floor(i / cols) * cellH + cellH / 2;

            // Pokéball-ish circular plate behind sprite
            const r = spriteSize * 0.62;
            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.18)';
            ctx.fill();
            ctx.lineWidth = 4;
            ctx.strokeStyle = 'rgba(255,255,255,0.45)';
            ctx.stroke();
            ctx.restore();

            try {
                const img = await loadImage(p.sprite);
                ctx.drawImage(
                    img,
                    cx - spriteSize / 2,
                    cy - spriteSize / 2,
                    spriteSize,
                    spriteSize
                );
            } catch {
                // Skip silently — circle plate stays as placeholder
            }

            // Name caption
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.shadowColor = 'rgba(0,0,0,0.55)';
            ctx.shadowBlur = 8;
            ctx.font = '600 22px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
            ctx.fillText(titleCase(p.name), cx, cy + spriteSize / 2 + 6, cellW - 16);
            ctx.shadowBlur = 0;
        })
    );

    // ---- Footer strip (brand left, QR right) ----------------------------
    const footerY = H - FOOTER_H;
    // Subtle dark band so footer content always reads cleanly
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, footerY, W, FOOTER_H);

    // Brand favicon + link (bottom-left)
    const logoSize = 56;
    const logoX = 28;
    const logoY = footerY + (FOOTER_H - logoSize) / 2;
    let logo;
    const logoDomImg = document.querySelector('img[src*="LogoCuteGengar"]');
    if (logoDomImg && logoDomImg.complete && logoDomImg.naturalWidth > 0) {
        logo = logoDomImg;
    } else {
        try {
            logo = await loadImage(BRAND_LOGO_URL);
        } catch {
            // skip silently if logo can't load
        }
    }

    if (logo) {
        try {
            ctx.save();
            // round-mask the logo
            ctx.beginPath();
            ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
            ctx.restore();
        } catch (err) {
            console.error("Error drawing logo to snippet canvas:", err);
        }
    }

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 22px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Pokémon Team Builder', logoX + logoSize + 14, footerY + FOOTER_H / 2 - 12);
    ctx.fillStyle = 'rgba(255,255,255,0.78)';
    ctx.font = '500 16px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(BRAND_LABEL, logoX + logoSize + 14, footerY + FOOTER_H / 2 + 12);

    // QR code (bottom-right) — encodes the share URL when available, falls
    // back to the author link so the snippet still leads somewhere useful.
    const qrTarget = shareUrl || BRAND_URL;
    const qrSize = 64;
    const qrX = W - qrSize - 24;
    const qrY = footerY + (FOOTER_H - qrSize) / 2;
    let qrCanvas;
    try {
        qrCanvas = await QRCode.toCanvas(qrTarget, {
            margin: 1,
            width: qrSize,
            color: { dark: '#111111', light: '#ffffff' },
        });
    } catch (err) {
        console.error("Failed to generate QR code for canvas", err);
    }

    if (qrCanvas) {
        // White rounded plate behind the QR for contrast on busy backgrounds
        const pad = 6;
        ctx.fillStyle = '#ffffff';
        const rx = qrX - pad;
        const ry = qrY - pad;
        const rw = qrSize + pad * 2;
        const rh = qrSize + pad * 2;
        const radius = 8;
        ctx.beginPath();
        ctx.moveTo(rx + radius, ry);
        ctx.arcTo(rx + rw, ry, rx + rw, ry + rh, radius);
        ctx.arcTo(rx + rw, ry + rh, rx, ry + rh, radius);
        ctx.arcTo(rx, ry + rh, rx, ry, radius);
        ctx.arcTo(rx, ry, rx + rw, ry, radius);
        ctx.closePath();
        ctx.fill();

        ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);
    }
};

// ---------------------------------------------------------------------------
// Modal component
// ---------------------------------------------------------------------------

export const ShareSnippetModal = ({
    isOpen,
    onClose,
    pokemons = [],
    defaultTitle = '',
    shareUrl = '',
    showToast,
}) => {
    const { t, language } = useTranslation();
    const dialogRef = useModalA11y(isOpen ? onClose : undefined);
    const canvasRef = useRef(null);
    const [title, setTitle] = useState(defaultTitle || '');
    const [subtitle, setSubtitle] = useState('');
    const [backgroundId, setBackgroundId] = useState(DEFAULT_BACKGROUND_ID);
    const [isRendering, setIsRendering] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isPosting, setIsPosting] = useState(false);

    const background = useMemo(() => getBackgroundById(backgroundId), [backgroundId]);

    // Reset state whenever the modal opens
    useEffect(() => {
        if (isOpen) {
            setTitle(defaultTitle || t('modals.shareModalDefaultTitle'));
            setSubtitle(t('modals.shareModalDefaultSubtitle', { count: pokemons.length }));
            setBackgroundId(DEFAULT_BACKGROUND_ID);
            setPreviewUrl(null);
            useForumStore.getState().initTopicsListener();
        }
    }, [isOpen, defaultTitle, pokemons.length, t]);

    // Re-render canvas whenever inputs change
    useEffect(() => {
        if (!isOpen || !canvasRef.current) return;
        let cancelled = false;
        setIsRendering(true);
        renderSnippet({
            canvas: canvasRef.current,
            background,
            title,
            subtitle,
            pokemons,
            shareUrl,
        })
            .then(() => {
                if (cancelled || !canvasRef.current) return;
                try {
                    setPreviewUrl(canvasRef.current.toDataURL('image/png'));
                } catch {
                    // canvas tainted — preview won't update but download/share via blob may still fail
                    setPreviewUrl(null);
                }
            })
            .catch(() => {
                /* render failures are non-fatal */
            })
            .finally(() => {
                if (!cancelled) setIsRendering(false);
            });
        return () => {
            cancelled = true;
        };
    }, [isOpen, background, title, subtitle, pokemons, shareUrl]);

    const exportBlob = useCallback(
        () =>
            new Promise((resolve, reject) => {
                const canvas = canvasRef.current;
                if (!canvas) return reject(new Error('Canvas not ready'));
                canvas.toBlob(
                    (blob) => (blob ? resolve(blob) : reject(new Error('Empty blob'))),
                    'image/png'
                );
            }),
        []
    );

    const fileName = useMemo(
        () => `${(title || 'pokemon-team').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`,
        [title]
    );

    const isCoarsePointerDevice = useMemo(() => {
        if (typeof window === 'undefined') return false;
        const hasCoarsePointer =
            typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
        const hasTouchPoints = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
        return hasCoarsePointer || hasTouchPoints;
    }, []);

    const canShareFiles = useMemo(() => {
        if (
            typeof navigator === 'undefined' ||
            typeof navigator.share !== 'function' ||
            typeof navigator.canShare !== 'function' ||
            typeof File === 'undefined'
        ) {
            return false;
        }

        try {
            const probeFile = new File(['pokemon'], 'probe.png', { type: 'image/png' });
            return navigator.canShare({ files: [probeFile] });
        } catch {
            return false;
        }
    }, []);

    const shareImageFile = useCallback(
        async (sharePayload = {}) => {
            if (!canShareFiles) return false;

            const blob = await exportBlob();
            const file = new File([blob], fileName, { type: 'image/png' });

            if (!navigator.canShare({ files: [file] })) {
                return false;
            }

            await navigator.share({ ...sharePayload, files: [file] });
            return true;
        },
        [canShareFiles, exportBlob, fileName]
    );

    const prefersNativeSave = isCoarsePointerDevice && canShareFiles;

    const handleDownload = useCallback(async () => {
        try {
            if (prefersNativeSave) {
                const openedShareSheet = await shareImageFile({
                    title: title || t('modals.shareModalDefaultTitle'),
                });

                if (openedShareSheet) {
                    return;
                }
            }
            const blob = await exportBlob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            showToast?.(t('modals.shareModalDownloaded'), 'success');
        } catch (err) {
            if (err && err.name === 'AbortError') return;
            showToast?.(t('modals.shareModalErrGenerate'), 'error');
        }
    }, [prefersNativeSave, shareImageFile, title, exportBlob, fileName, showToast, t]);

    const handleCopyLink = useCallback(async () => {
        if (!shareUrl) return;
        try {
            await navigator.clipboard.writeText(shareUrl);
            showToast?.(t('modals.shareModalSuccess'), 'success');
        } catch {
            // Last-resort fallback for browsers without async clipboard
            try {
                const ta = document.createElement('textarea');
                ta.value = shareUrl;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                ta.remove();
                showToast?.(t('modals.shareModalSuccess'), 'success');
            } catch {
                showToast?.(t('modals.shareModalErrCopy'), 'error');
            }
        }
    }, [shareUrl, showToast, t]);

    const handleNativeShare = useCallback(async () => {
        try {
            const sharePayload = {
                title: title || t('modals.shareModalDefaultTitle'),
                text: shareUrl
                    ? `${title || t('modals.shareModalDefaultTitle')} — ${shareUrl}`
                    : title || t('modals.shareModalDefaultTitle'),
            };

            const didShareFile = await shareImageFile(sharePayload);
            if (didShareFile) {
                return;
            }

            if (navigator.share) {
                await navigator.share({ ...sharePayload, url: shareUrl || undefined });
                return;
            }
            // No native share — fall back to copy link
            await handleCopyLink();
        } catch (err) {
            if (err && err.name === 'AbortError') return; // user cancelled
            showToast?.(t('modals.shareModalErrShare'), 'error');
        }
    }, [shareImageFile, title, shareUrl, handleCopyLink, showToast, t]);

    const handleShareToForum = useCallback(async () => {
        const userId = useAuthStore.getState().userId;
        if (!userId) {
            showToast?.(t('modals.shareModalForumError'), 'error');
            return;
        }

        const currentTeam = useActiveTeamStore.getState().currentTeam;
        if (!currentTeam || currentTeam.length === 0) {
            showToast?.(t('modals.shareModalErrGenerate'), 'error');
            return;
        }

        setIsPosting(true);
        try {
            const serializedPokemons = currentTeam.map(serializeTeamPokemon);
            const forumTeamData = {
                name: title || t('modals.shareModalDefaultTitle'),
                pokemons: serializedPokemons
            };

            const postText = subtitle
                ? `${title || t('modals.shareModalDefaultTitle')} — ${subtitle}`
                : `${title || t('modals.shareModalDefaultTitle')}`;

            // Resolve target topic id: find exact "Teams", case-insensitive "teams", or category "teams"
            const topics = useForumStore.getState().topics;
            let targetTopic = topics.find(t => t.title === 'Teams');
            if (!targetTopic) {
                targetTopic = topics.find(t => t.title?.toLowerCase() === 'teams');
            }
            if (!targetTopic) {
                targetTopic = topics.find(t => t.category === 'teams');
            }
            const targetTopicId = targetTopic ? targetTopic.id : 'general';

            const success = await useForumStore.getState().sendMessage(targetTopicId, postText, forumTeamData);
            if (success) {
                showToast?.(t('modals.shareModalForumSuccess'), 'success');
                onClose();
            } else {
                showToast?.(t('modals.shareModalErrShare'), 'error');
            }
        } catch (err) {
            console.error("Error sharing team to forum:", err);
            showToast?.(t('modals.shareModalErrShare'), 'error');
        } finally {
            setIsPosting(false);
        }
    }, [title, subtitle, onClose, showToast, t]);

    if (!isOpen) return null;

    const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

    return (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center sm:items-center justify-center z-[60]"
            onClick={onClose}
            role="presentation"
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="share-snippet-title"
                tabIndex={-1}
                className="mx-4 w-full max-h-[92vh] overflow-y-auto rounded-2xl border border-surface-raised bg-surface p-4 shadow-2xl animate-scale-in focus:outline-none sm:max-w-lg sm:rounded-2xl sm:p-5"
                style={{
                    paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h3 id="share-snippet-title" className="text-xl font-bold text-fg">
                            {t('modals.shareModalTitle')}
                        </h3>
                        <p className="mt-0.5 text-xs text-muted">
                            {prefersNativeSave
                                ? t('modals.shareModalDescMobile')
                                : t('modals.shareModalDescDesktop')}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label={t('modals.shareModalCloseAria')}
                        className="rounded-lg bg-surface-raised p-2 text-fg transition-all duration-200 hover:scale-105 active:scale-95"
                    >
                        <CloseIcon />
                    </button>
                </div>

                {/* Preview */}
                <div className="relative mb-4 aspect-video overflow-hidden rounded-xl bg-bg">
                    {previewUrl ? (
                        <img
                            src={previewUrl}
                            alt="Team snippet preview"
                            className="w-full h-full object-cover block"
                        />
                    ) : (
                        <div
                            className="flex h-full w-full items-center justify-center text-xs text-muted"
                        >
                            {isRendering ? t('modals.shareModalRendering') : t('modals.shareModalPreviewUnavailable')}
                        </div>
                    )}
                    {/* Hidden canvas used for rendering */}
                    <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
                </div>

                {/* Title input */}
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">
                    {t('modals.shareModalTitleLabel')}
                </label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value.slice(0, 60))}
                    placeholder={t('modals.shareModalDefaultTitle')}
                    maxLength={60}
                    className="mb-3 w-full rounded-lg border-2 border-transparent bg-surface-raised p-2.5 text-sm text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />

                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">
                    {t('modals.shareModalSubtitleLabel')}
                </label>
                <input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value.slice(0, 80))}
                    placeholder={t('modals.shareModalOptional')}
                    maxLength={80}
                    className="mb-4 w-full rounded-lg border-2 border-transparent bg-surface-raised p-2.5 text-sm text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />

                {/* Background picker */}
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted">
                    {t('modals.shareModalBackgroundLabel')}
                </label>
                <div className="grid grid-cols-4 gap-2 mb-5" role="radiogroup" aria-label={t('modals.shareModalBackgroundLabel')}>
                    {SHARE_BACKGROUNDS.map((bg) => {
                        const selected = bg.id === backgroundId;
                        return (
                            <button
                                key={bg.id}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                onClick={() => setBackgroundId(bg.id)}
                                className={`relative aspect-video overflow-hidden rounded-lg transition-all duration-200 hover:scale-[1.03] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${selected ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface' : ''}`}
                                title={bg.name}
                            >
                                <img src={bg.url} alt={bg.name} className="w-full h-full object-cover" />
                                <span
                                    className="absolute inset-x-0 bottom-0 text-[10px] font-bold uppercase tracking-wider text-white text-center py-0.5"
                                    style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
                                >
                                    {bg.name}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Share URL row */}
                {shareUrl && (
                    <div
                        className="mb-4 flex items-center gap-2 rounded-lg bg-surface-raised p-2"
                    >
                        <input
                            type="text"
                            readOnly
                            value={shareUrl}
                            onFocus={(e) => e.target.select()}
                            className="min-w-0 flex-1 bg-transparent text-xs text-muted focus:outline-none"
                            aria-label="Share URL"
                        />
                        <button
                            type="button"
                            onClick={handleCopyLink}
                            className="rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-white"
                        >
                            {t('modals.shareModalCopyBtn')}
                        </button>
                    </div>
                )}

                {/* Share on Forum */}
                <button
                    type="button"
                    onClick={handleShareToForum}
                    disabled={isRendering || isPosting}
                    className="mb-4 w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-white py-2.5 text-sm font-bold transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
                >
                    {isPosting ? (
                        <span>{language === 'pt' ? 'Postando...' : 'Posting...'}</span>
                    ) : (
                        <>
                            <ShareIcon className="w-4 h-4 text-white" />
                            {t('modals.shareModalForumBtn')}
                        </>
                    )}
                </button>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={handleDownload}
                        disabled={isRendering || isPosting}
                        className="rounded-xl bg-surface-raised px-4 py-2.5 text-sm font-semibold text-fg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
                    >
                        {prefersNativeSave ? t('modals.shareModalSaveImage') : t('modals.shareModalDownloadImage')}
                    </button>
                    <button
                        type="button"
                        onClick={handleNativeShare}
                        disabled={isRendering || isPosting}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
                    >
                        <ShareIcon />
                        {canNativeShare ? t('modals.shareModalShareBtn') : t('modals.shareModalCopyLinkBtn')}
                    </button>
                </div>
                {prefersNativeSave && (
                    <p className="mt-2 text-[11px] text-muted">
                        {t('modals.shareModalIosTip')}
                    </p>
                )}
            </div>
        </div>
    );
};

export default ShareSnippetModal;
