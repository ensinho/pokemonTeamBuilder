import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { useModalA11y } from '../hooks/useModalA11y';
import {
    SHARE_BACKGROUNDS,
    DEFAULT_BACKGROUND_ID,
    SNIPPET_DIMENSIONS,
    getBackgroundById,
} from '../assets/backgrounds';
import { CloseIcon, ShareIcon } from './icons';

// Author/brand link baked into every shared snippet.
const BRAND_URL = 'https://github.com/ensinho';
const BRAND_LABEL = 'github.com/ensinho';
const BRAND_LOGO_URL = `${import.meta.env.BASE_URL || '/'}LogoCuteGengarRounded.png`.replace(/\/{2,}/g, '/');

// ---------------------------------------------------------------------------
// Image helpers
// ---------------------------------------------------------------------------

/** Load an image with CORS enabled so the canvas stays untainted. */
const loadImage = (src) =>
    new Promise((resolve, reject) => {
        if (!src) return reject(new Error('Missing image src'));
        const img = new Image();
        img.crossOrigin = 'anonymous';
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
    try {
        const logo = await loadImage(BRAND_LOGO_URL);
        ctx.save();
        // round-mask the logo
        ctx.beginPath();
        ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
        ctx.restore();
    } catch {
        // skip silently if logo can't load
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
    try {
        const qrDataUrl = await QRCode.toDataURL(qrTarget, {
            margin: 1,
            width: qrSize * 2,
            color: { dark: '#111111', light: '#ffffff' },
        });
        const qrImg = await loadImage(qrDataUrl);
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
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
    } catch {
        // QR is non-essential — continue without it
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
    colors,
    showToast,
}) => {
    const dialogRef = useModalA11y(isOpen ? onClose : undefined);
    const canvasRef = useRef(null);
    const [title, setTitle] = useState(defaultTitle || 'My Pokémon Team');
    const [subtitle, setSubtitle] = useState('');
    const [backgroundId, setBackgroundId] = useState(DEFAULT_BACKGROUND_ID);
    const [isRendering, setIsRendering] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);

    const background = useMemo(() => getBackgroundById(backgroundId), [backgroundId]);

    // Reset state whenever the modal opens
    useEffect(() => {
        if (isOpen) {
            setTitle(defaultTitle || 'My Pokémon Team');
            setSubtitle(`${pokemons.length} Pokémon · built with care`);
            setBackgroundId(DEFAULT_BACKGROUND_ID);
            setPreviewUrl(null);
        }
    }, [isOpen, defaultTitle, pokemons.length]);

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

    const handleDownload = useCallback(async () => {
        try {
            const blob = await exportBlob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            showToast?.('Snippet downloaded!', 'success');
        } catch {
            showToast?.('Could not generate image.', 'error');
        }
    }, [exportBlob, fileName, showToast]);

    const handleCopyLink = useCallback(async () => {
        if (!shareUrl) return;
        try {
            await navigator.clipboard.writeText(shareUrl);
            showToast?.('Share link copied!', 'success');
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
                showToast?.('Share link copied!', 'success');
            } catch {
                showToast?.('Could not copy link.', 'error');
            }
        }
    }, [shareUrl, showToast]);

    const handleNativeShare = useCallback(async () => {
        try {
            const blob = await exportBlob();
            const file = new File([blob], fileName, { type: 'image/png' });
            const sharePayload = {
                title: title || 'My Pokémon Team',
                text: shareUrl
                    ? `${title || 'My Pokémon Team'} — ${shareUrl}`
                    : title || 'My Pokémon Team',
            };
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({ ...sharePayload, files: [file] });
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
            showToast?.('Sharing failed. Try downloading instead.', 'error');
        }
    }, [exportBlob, fileName, title, shareUrl, handleCopyLink, showToast]);

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
                className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl sm:rounded-2xl mx-4 shadow-2xl p-4 sm:p-5 animate-scale-in focus:outline-none"
                style={{
                    backgroundColor: colors.card,
                    border: `1px solid ${colors.cardLight}`,
                    paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h3 id="share-snippet-title" className="text-xl font-bold" style={{ color: colors.text }}>
                            Share your team
                        </h3>
                        <p className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
                            Generate a snippet image, then share or copy the link.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close share dialog"
                        className="p-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
                        style={{ backgroundColor: colors.cardLight, color: colors.text }}
                    >
                        <CloseIcon />
                    </button>
                </div>

                {/* Preview */}
                <div
                    className="relative rounded-xl overflow-hidden mb-4"
                    style={{ backgroundColor: colors.background, aspectRatio: '16 / 9' }}
                >
                    {previewUrl ? (
                        <img
                            src={previewUrl}
                            alt="Team snippet preview"
                            className="w-full h-full object-cover block"
                        />
                    ) : (
                        <div
                            className="w-full h-full flex items-center justify-center text-xs"
                            style={{ color: colors.textMuted }}
                        >
                            {isRendering ? 'Rendering preview…' : 'Preview unavailable'}
                        </div>
                    )}
                    {/* Hidden canvas used for rendering */}
                    <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
                </div>

                {/* Title input */}
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: colors.textMuted }}>
                    Title
                </label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value.slice(0, 60))}
                    placeholder="My Pokémon Team"
                    maxLength={60}
                    className="w-full p-2.5 mb-3 rounded-lg border-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary text-sm"
                    style={{ backgroundColor: colors.cardLight, borderColor: 'transparent', color: colors.text }}
                />

                <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: colors.textMuted }}>
                    Subtitle
                </label>
                <input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value.slice(0, 80))}
                    placeholder="Optional"
                    maxLength={80}
                    className="w-full p-2.5 mb-4 rounded-lg border-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary text-sm"
                    style={{ backgroundColor: colors.cardLight, borderColor: 'transparent', color: colors.text }}
                />

                {/* Background picker */}
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: colors.textMuted }}>
                    Background
                </label>
                <div className="grid grid-cols-4 gap-2 mb-5" role="radiogroup" aria-label="Background">
                    {SHARE_BACKGROUNDS.map((bg) => {
                        const selected = bg.id === backgroundId;
                        return (
                            <button
                                key={bg.id}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                onClick={() => setBackgroundId(bg.id)}
                                className="relative aspect-video rounded-lg overflow-hidden transition-all duration-200 hover:scale-[1.03] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                style={{
                                    outline: selected ? `3px solid ${colors.primary}` : 'none',
                                    outlineOffset: selected ? 2 : 0,
                                }}
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
                        className="flex items-center gap-2 p-2 rounded-lg mb-4"
                        style={{ backgroundColor: colors.cardLight }}
                    >
                        <input
                            type="text"
                            readOnly
                            value={shareUrl}
                            onFocus={(e) => e.target.select()}
                            className="flex-1 min-w-0 bg-transparent text-xs focus:outline-none"
                            style={{ color: colors.textMuted }}
                            aria-label="Share URL"
                        />
                        <button
                            type="button"
                            onClick={handleCopyLink}
                            className="text-xs font-bold px-3 py-1.5 rounded-md text-white"
                            style={{ backgroundColor: colors.primary }}
                        >
                            Copy
                        </button>
                    </div>
                )}

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={handleDownload}
                        disabled={isRendering}
                        className="py-2.5 px-4 rounded-xl font-semibold text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
                        style={{ backgroundColor: colors.cardLight, color: colors.text }}
                    >
                        Download image
                    </button>
                    <button
                        type="button"
                        onClick={handleNativeShare}
                        disabled={isRendering}
                        className="py-2.5 px-4 rounded-xl font-bold text-sm text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 inline-flex items-center justify-center gap-2"
                        style={{ backgroundColor: colors.primary }}
                    >
                        <ShareIcon />
                        {canNativeShare ? 'Share…' : 'Copy link'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ShareSnippetModal;
