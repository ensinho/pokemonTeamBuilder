import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Copy, Download, LayoutGrid, Link2, MessageSquare, Palette, Pencil, Share2 } from 'lucide-react';
import '../../styles/share-snippet.css';
import { useModalA11y } from '../../hooks/useModalA11y';
import {
    SHARE_BACKGROUNDS,
    DEFAULT_BACKGROUND_ID,
    SNIPPET_DIMENSIONS,
    getBackgroundById,
} from '../../assets/backgrounds';
import { CloseIcon } from '../icons';
import { Loader } from '../Loader';
import { useDebounce } from '../../hooks/useDebounce';
import { useTranslation } from '../../hooks/useTranslation';
import { useForumStore } from '../../store/useForumStore';
import { useAuthStore } from '../../store/useAuthStore';
import { getPokemonArtworkSpriteUrl, getPokemonFrontSpriteUrl } from '../../utils/pokemonSprites';
import { useMegaStones, megaDisplayName } from '../../hooks/useMegaStones';
import { typeColors, typeIcons } from '../../constants/types';
import { loadStaticData } from '../../services/staticData';
import { SITE_URL } from '../../utils/seoPages';
import { POKEAPI_SPRITES_BASE, isAssetMirrorEnabled } from '../../utils/assetHost';
import { SHEET_TONES, mixHex, sheetBase, sheetMember } from '../../utils/teamSheet';
import { trainerSpriteUrl } from '../../hooks/useTrainerSprites';

// The image's footer names the site, and the team's own page once it is
// published (2026-10-24: it used to advertise the GitHub repository).
const BRAND_LABEL = SITE_URL.replace(/^https?:\/\//, '');
const BRAND_LOGO_URL = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname.includes('/pokemonTeamBuilder') ? '/pokemonTeamBuilder/' : '/'}LogoCuteGengarRounded.png`.replace(/([^:]\/)\/+/g, "$1")
    : '/LogoCuteGengarRounded.png';

const moveId = (name = '') => String(name).toLowerCase().replace(/[^a-z0-9]/g, '');

// ---------------------------------------------------------------------------
// Image & Canvas Helpers
// ---------------------------------------------------------------------------

const imageCache = new Map();

const loadImage = (src) => {
    if (!src) return Promise.reject(new Error('Missing image src'));
    if (imageCache.has(src)) return Promise.resolve(imageCache.get(src));

    return new Promise((resolve, reject) => {
        const img = new Image();
        const isExternal = src.startsWith('http') && typeof window !== 'undefined' && !src.startsWith(window.location.origin);
        if (isExternal) {
            img.crossOrigin = 'anonymous';
        }
        img.onload = () => {
            imageCache.set(src, img);
            resolve(img);
        };
        img.onerror = () => reject(new Error(`Failed to load ${src}`));
        img.src = src;
    });
};

/** Ultra-Robust Item Sprite Loader: Tries 4 CDNs for items & Mega Stones */
const loadItemImage = async (itemName) => {
    if (!itemName) return null;
    const sdSlug = String(itemName).toLowerCase().replace(/[^a-z0-9]/g, '');
    const pokeApiSlug = String(itemName).toLowerCase().replace(/[.'’:]/g, '').replace(/\s+/g, '-').trim();

    const candidates = [
        // Our own copy first when there is one (src/utils/assetHost.js).
        ...(isAssetMirrorEnabled ? [`${POKEAPI_SPRITES_BASE}/items/${pokeApiSlug}.png`] : []),
        `https://raw.githubusercontent.com/smogon/pokemon-showdown-client/master/sprites/itemicons/${sdSlug}.png`,
        `https://cdn.jsdelivr.net/gh/smogon/pokemon-showdown-client@master/sprites/itemicons/${sdSlug}.png`,
        `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/items/${pokeApiSlug}.png`,
        `https://play.pokemonshowdown.com/sprites/itemicons/${sdSlug}.png`
    ];

    for (const src of candidates) {
        try {
            const img = await loadImage(src);
            if (img && img.width > 0) return img;
        } catch {
            /* try next candidate */
        }
    }
    return null;
};

const loadTypeIconImage = async (typeName) => {
    if (!typeName) return null;
    const key = String(typeName).toLowerCase().trim();
    const iconSrc = typeIcons[key];
    if (!iconSrc) return null;
    try {
        return await loadImage(iconSrc);
    } catch {
        return null;
    }
};

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

const drawRoundedRect = (ctx, x, y, width, height, radius = 8, fillStyle = null, strokeStyle = null, lineWidth = 1) => {
    ctx.save();
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, width, height, radius);
    } else {
        const r = typeof radius === 'number' ? radius : 8;
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + width, y, x + width, y + height, r);
        ctx.arcTo(x + width, y + height, x, y + height, r);
        ctx.arcTo(x, y + height, x, y, r);
        ctx.arcTo(x, y, x + width, y, r);
        ctx.closePath();
    }
    if (fillStyle) {
        ctx.fillStyle = fillStyle;
        ctx.fill();
    }
    if (strokeStyle) {
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = strokeStyle;
        ctx.stroke();
    }
    ctx.restore();
};

/** Render a 3D Glowing Mega Evolution Orb for Mega Stones */
const drawMegaStoneOrb = (ctx, x, y, size = 22) => {
    ctx.save();
    const radius = size / 2;
    const cx = x + radius;
    const cy = y + radius;

    // Glowing outer aura
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(168, 85, 247, 0.35)';
    ctx.fill();

    // 3D Gem Sphere Radial Gradient (Violet -> Magenta -> Cyan)
    const g = ctx.createRadialGradient(cx - radius * 0.3, cy - radius * 0.3, 1, cx, cy, radius);
    g.addColorStop(0, '#FFFFFF');
    g.addColorStop(0.2, '#F472B6');
    g.addColorStop(0.65, '#9333EA');
    g.addColorStop(1, '#1E1B4B');

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();

    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.stroke();

    // Specular shine dot
    ctx.beginPath();
    ctx.arc(cx - radius * 0.35, cy - radius * 0.35, radius * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fill();

    ctx.restore();
};

const titleCase = (s = '') =>
    String(s)
        .split(/[\s-_]+/)
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

// ---------------------------------------------------------------------------
// Parallel Asset Preloader (Prevents async race conditions on first render!)
// ---------------------------------------------------------------------------

const preloadSnippetAssets = async (pokemons = [], moveTypesMap = {}, bgUrl = null, avatar = null) => {
    const assetMap = {
        sprites: new Map(),
        items: new Map(),
        typeIcons: new Map(),
        bg: null,
        logo: null,
        avatar: null,
        avatarIsPixel: false,
    };

    const tasks = [];

    // Background
    if (bgUrl) {
        tasks.push(
            loadImage(bgUrl)
                .then((img) => { assetMap.bg = img; })
                .catch(() => { })
        );
    }

    // The trainer's face for the sheet: their sprite (pixel art) or partner's artwork.
    if (avatar?.src) {
        tasks.push(
            loadImage(avatar.src)
                .then((img) => { assetMap.avatar = img; assetMap.avatarIsPixel = Boolean(avatar.pixel); })
                .catch(() => { })
        );
    }

    // The sheet's type: canvas draws with whatever is loaded *now*, so the
    // heading face is asked for before the first frame (fonts.css families).
    if (typeof document !== 'undefined' && document.fonts?.load) {
        ['800 52px Unbounded', '700 20px "Space Grotesk"', '600 14px "Space Grotesk"'].forEach((font) => {
            tasks.push(document.fonts.load(font).catch(() => { }));
        });
    }

    // Logo
    tasks.push(
        loadImage(BRAND_LOGO_URL)
            .then((img) => { assetMap.logo = img; })
            .catch(() => { })
    );

    // Pokémon Assets
    const slots = pokemons.slice(0, 6);
    slots.forEach((p, idx) => {
        if (!p) return;
        const customization = p.customization || {};
        const isShiny = Boolean(customization.isShiny || p.isShiny);
        const spriteSrc = p.artworkSprite || p.sprite || getPokemonArtworkSpriteUrl(p.id, { shiny: isShiny });

        tasks.push(
            loadImage(spriteSrc)
                .then((img) => { assetMap.sprites.set(idx, img); })
                .catch(() => { })
        );

        // Types
        (p.types || []).forEach((tName) => {
            tasks.push(
                loadTypeIconImage(tName)
                    .then((img) => { if (img) assetMap.typeIcons.set(String(tName).toLowerCase(), img); })
                    .catch(() => { })
            );
        });

        // Item
        const item = customization.item;
        if (item) {
            tasks.push(
                loadItemImage(item)
                    .then((img) => { if (img) assetMap.items.set(item, img); })
                    .catch(() => { })
            );
        }

        // Moves
        {
            const rawMoves = Array.isArray(customization.moves) ? customization.moves : [];
            rawMoves.slice(0, 4).forEach((mv) => {
                const moveName = typeof mv === 'string' ? mv : mv?.name || '';
                const explicitType = typeof mv === 'object' ? mv?.type : null;
                const mType = explicitType || (moveTypesMap && moveName ? moveTypesMap[moveId(moveName)] : null);
                if (mType) {
                    tasks.push(
                        loadTypeIconImage(mType)
                            .then((img) => { if (img) assetMap.typeIcons.set(String(mType).toLowerCase(), img); })
                            .catch(() => { })
                    );
                }
            });
        }
    });

    await Promise.allSettled(tasks);
    return assetMap;
};

// ---------------------------------------------------------------------------
// Poster Banner Canvas Renderer
// ---------------------------------------------------------------------------

const renderPosterSnippetSync = ({ canvas, title, subtitle, pokemons, shareUrl, assets }) => {
    const { width: W, height: H } = SNIPPET_DIMENSIONS;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    // Background image
    if (assets.bg) {
        drawCover(ctx, assets.bg, 0, 0, W, H);
    } else {
        const g = ctx.createLinearGradient(0, 0, W, H);
        g.addColorStop(0, '#7d65e1');
        g.addColorStop(1, '#38BDF8');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
    }

    // Top + bottom vignettes
    const topVignette = ctx.createLinearGradient(0, 0, 0, H * 0.38);
    topVignette.addColorStop(0, 'rgba(0,0,0,0.6)');
    topVignette.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = topVignette;
    ctx.fillRect(0, 0, W, H * 0.38);

    const botVignette = ctx.createLinearGradient(0, H * 0.62, 0, H);
    botVignette.addColorStop(0, 'rgba(0,0,0,0)');
    botVignette.addColorStop(1, 'rgba(0,0,0,0.65)');
    ctx.fillStyle = botVignette;
    ctx.fillRect(0, H * 0.62, W, H * 0.38);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 14;
    ctx.font = '700 62px system-ui, -apple-system, sans-serif';
    ctx.fillText(title || 'My Pokémon Team', W / 2, 44, W - 96);

    if (subtitle) {
        ctx.font = '500 24px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.88)';
        ctx.fillText(subtitle, W / 2, 118, W - 96);
    }
    ctx.shadowBlur = 0;

    // Sprite grid (3 cols x 2 rows)
    const FOOTER_H = 80;
    const slots = pokemons.slice(0, 6);
    const cols = 3;
    const rows = Math.max(1, Math.ceil(slots.length / cols));
    const gridTop = 190;
    const gridBottom = H - FOOTER_H;
    const gridHeight = gridBottom - gridTop;
    const cellW = W / cols;
    const cellH = gridHeight / rows;
    const spriteSize = Math.min(cellW, cellH) * 0.76;

    slots.forEach((p, i) => {
        const cx = (i % cols) * cellW + cellW / 2;
        const cy = gridTop + Math.floor(i / cols) * cellH + cellH / 2;

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

        const img = assets.sprites.get(i);
        if (img) {
            ctx.drawImage(img, cx - spriteSize / 2, cy - spriteSize / 2, spriteSize, spriteSize);
        }

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 8;
        ctx.font = '600 22px system-ui, -apple-system, sans-serif';
        ctx.fillText(titleCase(p.name), cx, cy + spriteSize / 2 + 6, cellW - 16);
        ctx.shadowBlur = 0;
    });

    drawFooterStripSync(ctx, W, H, FOOTER_H, shareUrl, assets.logo);
};

// ---------------------------------------------------------------------------
// The team sheet (2026-11-05) — after the regional-champion team posters Enzo
// referenced: the trainer's face and "<name>'s team" as the headline, then
// six slanted cards (art + item, name, ability, nature, four moves) on one
// colour. No stats any more: the image says what the team is. Helpers and
// the colour maths are utils/teamSheet.js.
// ---------------------------------------------------------------------------

const SHEET_INK = '#ffffff';
const SHEET_CREAM = '#ffe08a';
const HEADING_FONT = "'Unbounded', 'Space Grotesk', system-ui, sans-serif";
const BODY_FONT = "'Space Grotesk', system-ui, sans-serif";

/** Text that never overflows: shrinks to `min`, then ellipsises. */
const fitText = (ctx, text, maxWidth, { weight = 700, size = 24, min = 12, family = BODY_FONT } = {}) => {
    let s = size;
    ctx.font = `${weight} ${s}px ${family}`;
    while (s > min && ctx.measureText(text).width > maxWidth) {
        s -= 1;
        ctx.font = `${weight} ${s}px ${family}`;
    }
    if (ctx.measureText(text).width <= maxWidth) return text;
    let out = text;
    while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) out = out.slice(0, -1);
    return `${out}…`;
};

/** The card: square left side, the right edge raked like the poster's. */
const slantedPath = (ctx, x, y, w, h, rake = 26, r = 14) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w - rake, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
};

const renderTeamSheetSync = ({ canvas, pokemons, kicker, labels, tone, moveTypesMap, megaStones, shareUrl, assets }) => {
    const { width: W, height: H } = SNIPPET_DIMENSIONS; // 1200 x 675
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    // Ground: the tone, lit from the top left, deepening to the bottom right.
    const ground = ctx.createLinearGradient(0, 0, W, H);
    ground.addColorStop(0, mixHex(tone, '#ffffff', 0.08));
    ground.addColorStop(1, mixHex(tone, '#000000', 0.38));
    ctx.fillStyle = ground;
    ctx.fillRect(0, 0, W, H);

    // The poster's sweeping rings, from a centre off the right edge.
    ctx.save();
    ctx.lineWidth = 26;
    for (let i = 0; i < 7; i += 1) {
        ctx.beginPath();
        ctx.arc(W * 0.86, H * 0.38, 150 + i * 92, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,255,255,${0.045 - i * 0.004})`;
        ctx.stroke();
    }
    ctx.restore();

    // ---- Header: face, kicker, headline ----------------------------------
    const M = 48;
    const face = 86;
    const faceY = 34;
    drawRoundedRect(ctx, M, faceY, face, face, 16, 'rgba(0,0,0,0.22)', 'rgba(255,255,255,0.45)', 2);
    // No face of their own (a guest): the lead stands in.
    const faceImg = assets.avatar || assets.sprites.get(0);
    if (faceImg) {
        ctx.save();
        slantedPath(ctx, M + 2, faceY + 2, face - 4, face - 4, 0, 14);
        ctx.clip();
        const pixel = Boolean(assets.avatar) && assets.avatarIsPixel;
        ctx.imageSmoothingEnabled = !pixel;
        const pad = pixel ? 0 : 6;
        ctx.drawImage(faceImg, M + pad, faceY + pad, face - pad * 2, face - pad * 2);
        ctx.imageSmoothingEnabled = true;
        ctx.restore();
    }

    const headX = M + face + 22;
    const headW = W - headX - 150;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    if (kicker) {
        ctx.fillStyle = SHEET_CREAM;
        const k = fitText(ctx, kicker.toUpperCase(), headW, { weight: 700, size: 20, min: 14 });
        ctx.fillText(k, headX, faceY + 26);
    }
    ctx.fillStyle = SHEET_INK;
    const headline = fitText(ctx, labels.title.toUpperCase(), headW, { weight: 800, size: 52, min: 28, family: HEADING_FONT });
    ctx.fillText(headline, headX, faceY + 80);

    // The mark, top right, on a white disc so the Gengar reads on any tone.
    if (assets.logo) {
        const s = 76;
        const lx = W - M - s;
        ctx.save();
        ctx.beginPath();
        ctx.arc(lx + s / 2, faceY + s / 2 + 4, s / 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.14)';
        ctx.fill();
        ctx.clip();
        ctx.drawImage(assets.logo, lx + 4, faceY + 8, s - 8, s - 8);
        ctx.restore();
    }

    // ---- Six cards, 2 × 3 ------------------------------------------------
    const gap = 30;
    const colW = (W - M * 2 - gap) / 2;
    const rowH = 140;
    const rowGap = 14;
    const top = 146;
    const tile = rowH - 24;

    for (let i = 0; i < 6; i += 1) {
        const x = M + (i % 2) * (colW + gap);
        const y = top + Math.floor(i / 2) * (rowH + rowGap);
        const member = sheetMember(pokemons[i], moveTypesMap);

        slantedPath(ctx, x, y, colW, rowH);
        ctx.fillStyle = member ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.08)';
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = member ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.12)';
        if (!member) ctx.setLineDash([6, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
        if (!member) continue;

        // Art tile + the held item on its corner.
        const tx = x + 12;
        const ty = y + 12;
        drawRoundedRect(ctx, tx, ty, tile, tile, 12, 'rgba(255,255,255,0.10)', 'rgba(255,255,255,0.32)', 2);
        const art = assets.sprites.get(i);
        if (art) ctx.drawImage(art, tx + 6, ty + 4, tile - 12, tile - 12);
        if (member.item) {
            const b = 34;
            const bx = tx + tile - b + 8;
            const by = ty + tile - b + 8;
            drawRoundedRect(ctx, bx, by, b, b, 9, mixHex(tone, '#000000', 0.35), 'rgba(255,255,255,0.5)', 1.5);
            const itemImg = assets.items.get(member.item);
            const isMega = Boolean(megaStones && megaStones[member.item]) || /ite$/i.test(member.item);
            if (itemImg) ctx.drawImage(itemImg, bx + 3, by + 3, b - 6, b - 6);
            else if (isMega) drawMegaStoneOrb(ctx, bx + 7, by + 7, b - 14);
        }

        // Words.
        const cx = tx + tile + 20;
        const cw = x + colW - 34 - cx;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = SHEET_CREAM;
        ctx.fillText(fitText(ctx, titleCase(member.name).toUpperCase(), cw, { weight: 800, size: 26, min: 15, family: HEADING_FONT }), cx, y + 40);

        const half = cw / 2;
        [[labels.ability, member.ability], [labels.nature, member.nature]].forEach(([label, value], k) => {
            const lx = cx + k * half;
            ctx.fillStyle = 'rgba(255,255,255,0.62)';
            ctx.font = `700 11px ${BODY_FONT}`;
            ctx.fillText(`${label.toUpperCase()}:`, lx, y + 60);
            ctx.fillStyle = SHEET_INK;
            ctx.fillText(fitText(ctx, value ? titleCase(value) : '—', half - 10, { weight: 600, size: 14, min: 11 }), lx, y + 77);
        });

        // Four move pills, 2 × 2, each signed with its type's colour.
        const pillW = (cw - 10) / 2;
        const pillH = 22;
        member.moves.forEach((move, m) => {
            const px = cx + (m % 2) * (pillW + 10);
            const py = y + 88 + Math.floor(m / 2) * (pillH + 6);
            drawRoundedRect(ctx, px, py, pillW, pillH, 6, move ? 'rgba(0,0,0,0.16)' : null, move ? 'rgba(255,255,255,0.42)' : 'rgba(255,255,255,0.16)', 1.2);
            if (!move) return;
            const dot = move.type && typeColors[move.type] ? typeColors[move.type] : 'rgba(255,255,255,0.5)';
            ctx.beginPath();
            ctx.arc(px + 11, py + pillH / 2, 4, 0, Math.PI * 2);
            ctx.fillStyle = dot;
            ctx.fill();
            ctx.fillStyle = SHEET_INK;
            ctx.textBaseline = 'middle';
            ctx.fillText(fitText(ctx, titleCase(move.name), pillW - 26, { weight: 600, size: 12, min: 10 }), px + 21, py + pillH / 2 + 1);
            ctx.textBaseline = 'alphabetic';
        });
    }

    // ---- Footer: where the team lives ------------------------------------
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.font = `600 15px ${BODY_FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(shareUrl ? shareUrl.replace(/^https?:\/\//, '') : BRAND_LABEL, M, H - 22);
    ctx.textAlign = 'right';
    ctx.fillStyle = SHEET_INK;
    ctx.font = `800 15px ${HEADING_FONT}`;
    ctx.fillText('POKEMONBUILDER', W - M, H - 22);
    ctx.textAlign = 'left';
};

// ---------------------------------------------------------------------------
// Synchronous Footer Strip Drawing
// ---------------------------------------------------------------------------

const drawFooterStripSync = (ctx, W, H, FOOTER_H, shareUrl, logoImg) => {
    const footerY = H - FOOTER_H;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, footerY, W, FOOTER_H);

    const logoSize = 52;
    const logoX = 24;
    const logoY = footerY + (FOOTER_H - logoSize) / 2;

    if (logoImg) {
        try {
            ctx.save();
            ctx.beginPath();
            ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
            ctx.restore();
        } catch {
            /* ignore logo clip */
        }
    }

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 20px system-ui, -apple-system, sans-serif';
    ctx.fillText('PokemonBuilder', logoX + logoSize + 14, footerY + FOOTER_H / 2 - 10);
    ctx.fillStyle = 'rgba(255,255,255,0.78)';
    ctx.font = '500 15px system-ui, -apple-system, sans-serif';
    ctx.fillText(shareUrl ? shareUrl.replace(/^https?:\/\//, '') : BRAND_LABEL, logoX + logoSize + 14, footerY + FOOTER_H / 2 + 12);
};


// ---------------------------------------------------------------------------
// Main Modal Component
// ---------------------------------------------------------------------------

export const ShareSnippetModal = ({
    isOpen,
    onClose,
    pokemons = [],
    defaultTitle = '',
    shareUrl = '',
    showToast,
}) => {
    const { t } = useTranslation();
    const megaStones = useMegaStones();
    const dialogRef = useModalA11y(isOpen ? onClose : undefined);
    const canvasRef = useRef(null);

    const [moveTypesMap, setMoveTypesMap] = useState({});

    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;
        loadStaticData('move-types.json')
            .then((data) => {
                if (!cancelled && data?.byId) {
                    setMoveTypesMap(data.byId);
                }
            })
            .catch(() => { });
        return () => {
            cancelled = true;
        };
    }, [isOpen]);

    const [mode, setMode] = useState('cards');
    const [sheetTone, setSheetTone] = useState('auto');

    const [title, setTitle] = useState(defaultTitle || '');
    const [subtitle, setSubtitle] = useState('');
    const [backgroundId, setBackgroundId] = useState(DEFAULT_BACKGROUND_ID);

    const authDisplayName = useAuthStore((s) => s.displayName);
    const [trainerName, setTrainerName] = useState(authDisplayName || '');
    const [kicker, setKicker] = useState('');
    // The sheet's face: the trainer's sprite, or their partner's artwork.
    const avatarSource = useMemo(() => {
        if (!isOpen) return null;
        const a = useAuthStore.getState().publicAvatar();
        if (a?.trainerSprite) return { src: trainerSpriteUrl(a.trainerSprite), pixel: true };
        if (a?.pokemonId) return { src: getPokemonArtworkSpriteUrl(a.pokemonId, { shiny: Boolean(a.isShiny) }), pixel: false };
        return null;
    }, [isOpen]);

    const [isRendering, setIsRendering] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isPosting, setIsPosting] = useState(false);

    const [isEditingText, setIsEditingText] = useState(false);
    // A copy answers inside the button that was pressed ("Copiado" for a
    // moment): on a phone the toast stack sits right over this footer.
    const [copied, setCopied] = useState(null);
    const copiedTimer = useRef(null);
    const flashCopied = useCallback((what) => {
        setCopied(what);
        clearTimeout(copiedTimer.current);
        copiedTimer.current = setTimeout(() => setCopied(null), 1600);
    }, []);
    useEffect(() => () => clearTimeout(copiedTimer.current), []);

    const background = useMemo(() => getBackgroundById(backgroundId), [backgroundId]);

    // Typing stays instant: the canvas redraws from the text once it settles.
    const renderTitle = useDebounce(title, 180);
    const renderSubtitle = useDebounce(subtitle, 180);
    const renderTrainer = useDebounce(trainerName, 180);
    const renderKicker = useDebounce(kicker, 180);

    useEffect(() => {
        if (isOpen) {
            setTitle(defaultTitle || t('modals.shareModalDefaultTitle'));
            setSubtitle(t('modals.shareModalDefaultSubtitle', { count: pokemons.length }));
            setBackgroundId(DEFAULT_BACKGROUND_ID);
            setTrainerName(useAuthStore.getState().displayName || '');
            setKicker(defaultTitle || t('modals.shareModalDefaultTitle'));
            setSheetTone('auto');
            setPreviewUrl(null);
            setIsEditingText(false);
            useForumStore.getState().initTopicsListener();
        }
    }, [isOpen, defaultTitle, pokemons.length, t]);

    // Pre-load assets and render synchronously when ready
    useEffect(() => {
        if (!isOpen || !canvasRef.current) return;
        let cancelled = false;
        setIsRendering(true);

        const bgUrl = mode === 'poster' ? background.url : null;

        preloadSnippetAssets(pokemons, moveTypesMap, bgUrl, mode === 'cards' ? avatarSource : null)
            .then((assets) => {
                if (cancelled || !canvasRef.current) return;
                const canvas = canvasRef.current;

                if (mode === 'cards') {
                    renderTeamSheetSync({
                        canvas,
                        pokemons,
                        kicker: renderKicker,
                        labels: {
                            title: renderTrainer.trim() ? t('modals.shareSheetTitle', { name: renderTrainer.trim() }) : t('modals.shareSheetTitleAnon'),
                            ability: t('modals.shareSheetAbility'),
                            nature: t('modals.shareSheetNature'),
                        },
                        tone: sheetBase(sheetTone, pokemons, typeColors),
                        moveTypesMap,
                        megaStones,
                        shareUrl,
                        assets,
                    });
                } else {
                    renderPosterSnippetSync({
                        canvas,
                        background,
                        title: renderTitle,
                        subtitle: renderSubtitle,
                        pokemons,
                        shareUrl,
                        assets,
                    });
                }

                try {
                    setPreviewUrl(canvas.toDataURL('image/png'));
                } catch {
                    setPreviewUrl(null);
                }
            })
            .catch(() => { })
            .finally(() => {
                if (!cancelled) setIsRendering(false);
            });

        return () => {
            cancelled = true;
        };
    }, [isOpen, mode, sheetTone, background, renderTitle, renderSubtitle, pokemons, shareUrl, renderTrainer, renderKicker, avatarSource, moveTypesMap, megaStones, t]);

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
        () => `${(title || 'pokemon-team').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${mode}.png`,
        [title, mode]
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
            if (!navigator.canShare({ files: [file] })) return false;
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
                if (openedShareSheet) return;
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
            flashCopied('link');
        } catch {
            try {
                const ta = document.createElement('textarea');
                ta.value = shareUrl;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                ta.remove();
                flashCopied('link');
            } catch {
                showToast?.(t('modals.shareModalErrCopy'), 'error');
            }
        }
    }, [shareUrl, flashCopied, showToast, t]);

    const handleNativeShare = useCallback(async () => {
        try {
            const sharePayload = {
                title: title || t('modals.shareModalDefaultTitle'),
                text: shareUrl
                    ? `${title || t('modals.shareModalDefaultTitle')} — ${shareUrl}`
                    : title || t('modals.shareModalDefaultTitle'),
            };

            const didShareFile = await shareImageFile(sharePayload);
            if (didShareFile) return;

            if (navigator.share) {
                await navigator.share({ ...sharePayload, url: shareUrl || undefined });
                return;
            }
            await handleCopyLink();
        } catch (err) {
            if (err && err.name === 'AbortError') return;
            showToast?.(t('modals.shareModalErrShare'), 'error');
        }
    }, [shareImageFile, title, shareUrl, handleCopyLink, showToast, t]);

    // Desktop: the image goes straight to the clipboard, ready to paste into
    // Discord or a chat. The blob is handed over as a promise so Safari keeps
    // the click's permission while it encodes.
    const canCopyImage = typeof window !== 'undefined'
        && typeof window.ClipboardItem === 'function'
        && typeof navigator.clipboard?.write === 'function';

    const handleCopyImage = useCallback(async () => {
        try {
            await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': exportBlob() })]);
            flashCopied('image');
        } catch {
            showToast?.(t('modals.shareModalErrGenerate'), 'error');
        }
    }, [exportBlob, flashCopied, showToast, t]);

    // Posts the team this dialog shows — the saved-teams list opens it too, so
    // reading the builder's active team here posted the wrong one.
    const handleShareToForum = useCallback(async () => {
        const userId = useAuthStore.getState().userId;
        if (!userId) {
            showToast?.(t('modals.shareModalForumError'), 'error');
            return;
        }
        if (!pokemons.length) {
            showToast?.(t('modals.shareModalErrGenerate'), 'error');
            return;
        }

        setIsPosting(true);
        try {
            const forumTeamData = {
                name: title || t('modals.shareModalDefaultTitle'),
                pokemons: pokemons.map((p) => {
                    const item = p?.customization?.item;
                    const mega = item && megaStones ? megaStones[item] : null;
                    const isMega = mega && mega.baseId === p.id;
                    const spriteId = isMega ? mega.spriteId : p.id;
                    const name = isMega ? megaDisplayName(mega.form) : p.name;
                    return {
                        id: p.id,
                        name,
                        types: Array.isArray(p.types) ? p.types : (p.types ? [p.types] : []),
                        sprite: getPokemonArtworkSpriteUrl(spriteId),
                        shinySprite: getPokemonArtworkSpriteUrl(spriteId, { shiny: true }),
                        animatedSprite: getPokemonFrontSpriteUrl(spriteId),
                        animatedShinySprite: getPokemonFrontSpriteUrl(spriteId, { shiny: true }),
                        instanceId: p.instanceId,
                        customization: p.customization || {},
                    };
                }),
            };

            const postText = subtitle
                ? `${title || t('modals.shareModalDefaultTitle')} — ${subtitle}`
                : `${title || t('modals.shareModalDefaultTitle')}`;

            const topics = useForumStore.getState().topics;
            let targetTopic = topics.find((topic) => topic.title === 'Teams');
            if (!targetTopic) targetTopic = topics.find((topic) => topic.title?.toLowerCase() === 'teams');
            if (!targetTopic) targetTopic = topics.find((topic) => topic.category === 'teams');
            const targetTopicId = targetTopic ? targetTopic.id : 'general';

            const success = await useForumStore.getState().sendMessage(targetTopicId, postText, forumTeamData);
            if (success) {
                showToast?.(t('modals.shareModalForumSuccess'), 'success');
                onClose();
            } else {
                showToast?.(t('modals.shareModalErrShare'), 'error');
            }
        } catch (err) {
            console.error('Error sharing team to forum:', err);
            showToast?.(t('modals.shareModalErrShare'), 'error');
        } finally {
            setIsPosting(false);
        }
    }, [pokemons, title, subtitle, onClose, showToast, t, megaStones]);

    if (!isOpen) return null;

    const busy = isPosting || !previewUrl;
    const textFields = mode === 'cards'
        ? [
            { id: 'trainer', label: t('modals.shareModalTrainerLabel'), value: trainerName, max: 30, placeholder: t('modals.shareModalOptional'), onChange: setTrainerName },
            { id: 'kicker', label: t('modals.shareSheetKickerLabel'), value: kicker, max: 48, placeholder: t('modals.shareModalOptional'), onChange: setKicker },
        ]
        : [
            { id: 'title', label: t('modals.shareModalTitleLabel'), value: title, max: 60, placeholder: t('modals.shareModalDefaultTitle'), onChange: setTitle },
            { id: 'subtitle', label: t('modals.shareModalSubtitleLabel'), value: subtitle, max: 80, placeholder: t('modals.shareModalOptional'), onChange: setSubtitle },
        ];

    return (
        <div
            className="modal-scrim z-[60]"
            onClick={onClose}
            role="presentation"
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="share-snippet-title"
                tabIndex={-1}
                className="modal-panel modal-panel--lg share-snip"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="modal-header">
                    <h3 id="share-snippet-title" className="modal-title">{t('modals.shareModalTitle')}</h3>
                    <button type="button" onClick={onClose} aria-label={t('modals.shareModalCloseAria')} className="modal-close">
                        <CloseIcon />
                    </button>
                </div>

                <div className="modal-body share-snip__body custom-scrollbar">
                    {/* What will be shared comes first; everything below edits it. */}
                    <div className={`share-snip__preview${isRendering && previewUrl ? ' is-refreshing' : ''}`}>
                        {previewUrl ? (
                            <img src={previewUrl} alt={t('modals.shareModalTitle')} width={SNIPPET_DIMENSIONS.width} height={SNIPPET_DIMENSIONS.height} />
                        ) : isRendering ? (
                            <Loader size="sm" label={t('modals.shareModalRendering')} />
                        ) : (
                            <span className="share-snip__empty">{t('modals.shareModalPreviewUnavailable')}</span>
                        )}
                        <canvas ref={canvasRef} hidden aria-hidden="true" />
                    </div>

                    <div className="segmented segmented--block" role="group" aria-label={t('modals.shareModalStyleAria')}>
                        <button type="button" className="segmented__item" aria-pressed={mode === 'cards'} onClick={() => setMode('cards')}>
                            <LayoutGrid aria-hidden="true" />
                            {t('modals.shareModalModeCards')}
                        </button>
                        <button type="button" className="segmented__item" aria-pressed={mode === 'poster'} onClick={() => setMode('poster')}>
                            <Palette aria-hidden="true" />
                            {t('modals.shareModalModePoster')}
                        </button>
                    </div>

                    <div className="share-snip__options">
                        {mode === 'cards' ? (
                            <div className="share-snip__swatches share-snip__swatches--tones" role="group" aria-label={t('modals.shareSheetToneLabel')}>
                                {SHEET_TONES.map((id) => (
                                    <button
                                        key={id}
                                        type="button"
                                        className="share-snip__swatch share-snip__tone"
                                        aria-pressed={id === sheetTone}
                                        aria-label={t(`modals.shareSheetTones.${id}`)}
                                        title={t(`modals.shareSheetTones.${id}`)}
                                        style={{ '--swatch': sheetBase(id, pokemons, typeColors) }}
                                        onClick={() => setSheetTone(id)}
                                    >
                                        {id === 'auto' && <span className="share-snip__tone-auto">A</span>}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="share-snip__swatches" role="group" aria-label={t('modals.shareModalBackgroundLabel')}>
                                {SHARE_BACKGROUNDS.map((bg) => (
                                    <button
                                        key={bg.id}
                                        type="button"
                                        className="share-snip__swatch"
                                        aria-pressed={bg.id === backgroundId}
                                        aria-label={bg.name}
                                        title={bg.name}
                                        onClick={() => setBackgroundId(bg.id)}
                                    >
                                        <img src={bg.url} alt="" />
                                    </button>
                                ))}
                            </div>
                        )}
                        <button
                            type="button"
                            className="btn btn-ghost btn-sm share-snip__edit"
                            aria-expanded={isEditingText}
                            aria-controls="share-snip-fields"
                            onClick={() => setIsEditingText((open) => !open)}
                        >
                            <Pencil aria-hidden="true" />
                            <span>{t('modals.shareModalEditText')}</span>
                            <ChevronDown aria-hidden="true" className="share-snip__chevron" />
                        </button>
                    </div>

                    {isEditingText && (
                        <div id="share-snip-fields" className="share-snip__fields">
                            {textFields.map((field) => (
                                <label key={field.id} className="field">
                                    <span className="field-label">{field.label}</span>
                                    <input
                                        type="text"
                                        className={`input-clean${field.mono ? ' font-mono' : ''}`}
                                        value={field.value}
                                        maxLength={field.max}
                                        placeholder={field.placeholder}
                                        onChange={(e) => field.onChange(e.target.value.slice(0, field.max))}
                                    />
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                {/* One primary, then the builder's three (Imagem · Link · Fórum), here as copy / copy / post. */}
                <div className="modal-footer modal-footer--ruled share-snip__footer">
                    {prefersNativeSave ? (
                        <button type="button" className="btn btn-primary btn-lg btn-block" onClick={handleNativeShare} disabled={busy}>
                            <Share2 aria-hidden="true" />
                            {t('modals.shareModalShareImage')}
                        </button>
                    ) : (
                        <button type="button" className="btn btn-primary btn-lg btn-block" onClick={handleDownload} disabled={busy}>
                            <Download aria-hidden="true" />
                            {t('modals.shareModalDownloadImage')}
                        </button>
                    )}
                    <div className="share-snip__more">
                        {canCopyImage && (
                            <button type="button" className="btn btn-secondary btn-sm" onClick={handleCopyImage} disabled={busy} aria-label={t('modals.shareModalCopyImage')} title={t('modals.shareModalCopyImage')}>
                                {copied === 'image' ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                                <span>{copied === 'image' ? t('modals.shareModalCopied') : t('builder.shareImage')}</span>
                            </button>
                        )}
                        <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={handleCopyLink}
                            disabled={!shareUrl}
                            aria-label={t('modals.shareModalCopyLinkBtn')}
                            title={shareUrl ? t('modals.shareModalCopyLinkBtn') : t('modals.shareModalLinkPending')}
                        >
                            {copied === 'link' ? <Check aria-hidden="true" /> : <Link2 aria-hidden="true" />}
                            <span>{copied === 'link' ? t('modals.shareModalCopied') : t('builder.shareLink')}</span>
                        </button>
                        <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={handleShareToForum}
                            disabled={busy}
                            aria-label={t('modals.shareModalForumAria')}
                            title={t('modals.shareModalForumAria')}
                        >
                            {isPosting ? <Loader size="xs" /> : <MessageSquare aria-hidden="true" />}
                            <span>{t('builder.shareForum')}</span>
                        </button>
                    </div>
                    <span className="sr-only" role="status">
                        {copied === 'image' && t('modals.shareModalImageCopied')}
                        {copied === 'link' && t('modals.shareModalSuccess')}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default ShareSnippetModal;
