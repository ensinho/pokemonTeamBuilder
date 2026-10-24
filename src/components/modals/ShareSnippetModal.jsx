import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, Check, ChevronDown, Copy, Download, LayoutGrid, Link2, MessageSquare, Palette, Pencil, Share2, Swords } from 'lucide-react';
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

// The image's footer names the site, and the team's own page once it is
// published (2026-10-24: it used to advertise the GitHub repository).
const BRAND_LABEL = SITE_URL.replace(/^https?:\/\//, '');
const BRAND_LOGO_URL = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname.includes('/pokemonTeamBuilder') ? '/pokemonTeamBuilder/' : '/'}LogoCuteGengarRounded.png`.replace(/([^:]\/)\/+/g, "$1")
    : '/LogoCuteGengarRounded.png';

const moveId = (name = '') => String(name).toLowerCase().replace(/[^a-z0-9]/g, '');

const hexToRgba = (hex, alpha = 0.2) => {
    if (!hex || typeof hex !== 'string') return `rgba(99, 102, 241, ${alpha})`;
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map((x) => x + x).join('');
    const num = parseInt(c, 16);
    if (isNaN(num)) return `rgba(99, 102, 241, ${alpha})`;
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

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

const drawItemFallbackBadge = (ctx, x, y, size = 22) => {
    drawRoundedRect(ctx, x, y, size, size, 5, 'rgba(99, 102, 241, 0.3)', 'rgba(129, 140, 248, 0.6)', 1);
    ctx.fillStyle = '#E0E7FF';
    ctx.font = '700 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ITEM', x + size / 2, y + size / 2);
};

const titleCase = (s = '') =>
    String(s)
        .split(/[\s-_]+/)
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

const generateRandomTeamId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let res = '';
    for (let i = 0; i < 10; i++) {
        res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
};

// ---------------------------------------------------------------------------
// Parallel Asset Preloader (Prevents async race conditions on first render!)
// ---------------------------------------------------------------------------

const preloadSnippetAssets = async (pokemons = [], cardTab = 'moves', moveTypesMap = {}, bgUrl = null) => {
    const assetMap = {
        sprites: new Map(),
        items: new Map(),
        typeIcons: new Map(),
        bg: null,
        logo: null,
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
        if (cardTab !== 'stats') {
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
// Synchronous VGC / Competitive Cards Canvas Renderer
// ---------------------------------------------------------------------------

const renderCompetitiveCardSnippetSync = ({ canvas, pokemons, trainerName, teamIdCode, cardTab, moveTypesMap, megaStones, shareUrl, assets }) => {
    const { width: W, height: H } = SNIPPET_DIMENSIONS; // 1200 x 675
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    // Background Gradient (Deep Indigo & Slate)
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#0B0F19');
    g.addColorStop(0.4, '#111827');
    g.addColorStop(1, '#1E1B4B');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Soft glowing radial accents
    const g1 = ctx.createRadialGradient(200, 120, 10, 200, 120, 480);
    g1.addColorStop(0, 'rgba(99, 102, 241, 0.22)');
    g1.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, W, H);

    const g2 = ctx.createRadialGradient(1000, 520, 10, 1000, 520, 480);
    g2.addColorStop(0, 'rgba(168, 85, 247, 0.18)');
    g2.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, W, H);

    // ---------------------------------------------------------------------------
    // Premium Marketing Brand Header Bar (Top Y: 14 to 66)
    // ---------------------------------------------------------------------------
    const headerY = 14;
    const headerH = 52;
    drawRoundedRect(ctx, 24, headerY, W - 48, headerH, 14, 'rgba(17, 24, 39, 0.88)', 'rgba(99, 102, 241, 0.35)', 1.5);

    // Gengar Brand Logo on Left
    const logoSize = 36;
    const logoX = 36;
    const logoY = headerY + (headerH - logoSize) / 2;
    const logo = assets.logo;

    if (logo) {
        try {
            ctx.save();
            ctx.beginPath();
            ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
            ctx.restore();
        } catch {
            /* ignore clip error */
        }
    }

    // App Title & Subtitle Eyebrow
    const titleX = logo ? logoX + logoSize + 12 : 36;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 17px system-ui, -apple-system, sans-serif';
    ctx.fillText('POKÉMON TEAM BUILDER', titleX, headerY + 10);

    ctx.fillStyle = '#A5B4FC';
    ctx.font = '700 9px system-ui, sans-serif';
    ctx.fillText('COMPETITIVE ROSTER SHOWCASE', titleX, headerY + 31);

    // Center Marketing Badge: Team Code Pill
    const codeStr = teamIdCode || '7Q9H36N438';
    drawRoundedRect(ctx, W / 2 - 80, headerY + 10, 160, 32, 8, 'rgba(30, 41, 59, 0.75)', 'rgba(129, 140, 248, 0.4)', 1);
    ctx.fillStyle = '#9CA3AF';
    ctx.font = '600 11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('ID:', W / 2 - 68, headerY + 26);
    ctx.fillStyle = '#BEF264';
    ctx.font = '700 14px system-ui, sans-serif';
    ctx.fillText(codeStr, W / 2 - 44, headerY + 26);

    // Right: Trainer Card Pill
    const trainerDisplayName = trainerName || 'Trainer';
    drawRoundedRect(ctx, W - 230, headerY + 10, 194, 32, 8, 'rgba(99, 102, 241, 0.2)', 'rgba(99, 102, 241, 0.4)', 1);
    ctx.fillStyle = '#E0E7FF';
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Trainer: ${trainerDisplayName}`, W - 133, headerY + 26);

    // ---------------------------------------------------------------------------
    // Card Grid (2 Columns x 3 Rows)
    // ---------------------------------------------------------------------------
    const colW = 564;
    const rowH = 160;
    const gapX = 24;
    const gapY = 14;
    const startX = 24;
    const startY = 76;
    const FOOTER_H = 74;

    const slots = pokemons.slice(0, 6);

    for (let i = 0; i < 6; i++) {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const cardX = startX + col * (colW + gapX);
        const cardY = startY + row * (rowH + gapY);
        const pokemon = slots[i];

        // Card Container Glass Box
        drawRoundedRect(
            ctx,
            cardX,
            cardY,
            colW,
            rowH,
            14,
            'rgba(17, 24, 39, 0.82)',
            pokemon ? 'rgba(99, 102, 241, 0.32)' : 'rgba(75, 85, 99, 0.25)',
            1.5
        );

        // Card Slot Index Watermark
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.font = '900 84px system-ui, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText(String(i + 1), cardX + colW - 14, cardY + rowH - 4);

        if (!pokemon) {
            ctx.fillStyle = 'rgba(156, 163, 175, 0.4)';
            ctx.font = '600 16px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Empty Slot', cardX + colW / 2, cardY + rowH / 2);
            continue;
        }

        const customization = pokemon.customization || {};
        const types = Array.isArray(pokemon.types) && pokemon.types.length ? pokemon.types : ['normal'];
        const ability = customization.ability || pokemon.abilities?.[0]?.name || 'Unknown';
        const item = customization.item || '';

        // --- Left Half: Artwork, Name, Types, Ability, Item ---
        const spriteSize = 92;
        const spriteX = cardX + 12;
        const spriteY = cardY + (rowH - spriteSize) / 2;

        // Aura circle behind sprite
        ctx.save();
        ctx.beginPath();
        ctx.arc(spriteX + spriteSize / 2, spriteY + spriteSize / 2, spriteSize * 0.48, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fill();
        ctx.restore();

        const pokeImg = assets.sprites.get(i);
        if (pokeImg) {
            ctx.drawImage(pokeImg, spriteX, spriteY, spriteSize, spriteSize);
        }

        // Pokémon Name (Strict bounds protection)
        const infoX = spriteX + spriteSize + 10;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '700 18px system-ui, sans-serif';
        const nameText = titleCase(pokemon.name);
        const maxNameW = cardX + 270 - infoX;
        ctx.fillText(nameText, infoX, cardY + 14, Math.max(50, maxNameW));

        // Type Badges
        let badgeX = infoX;
        const badgeY = cardY + 40;
        types.slice(0, 2).forEach((type) => {
            const tColor = typeColors[String(type).toLowerCase()] || '#6B7280';
            const tName = titleCase(type);
            const badgeW = 56;
            drawRoundedRect(ctx, badgeX, badgeY, badgeW, 18, 5, tColor, null);
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '700 10px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(tName, badgeX + badgeW / 2, badgeY + 9);
            badgeX += badgeW + 6;
        });

        // Ability
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#9CA3AF';
        ctx.font = '500 12px system-ui, sans-serif';
        ctx.fillText(titleCase(ability), infoX, cardY + 65, Math.max(40, cardX + 270 - infoX));

        // Held Item (Smart Loader + 3D Mega Stone Gem Orb Fallback)
        if (item) {
            const itemY = cardY + 86;
            const isMegaStone = item.toLowerCase().includes('ite') || Boolean(megaStones && megaStones[item]);
            const itemImg = assets.items.get(item);

            if (itemImg) {
                ctx.drawImage(itemImg, infoX, itemY, 22, 22);
            } else if (isMegaStone) {
                drawMegaStoneOrb(ctx, infoX, itemY, 22);
            } else {
                drawItemFallbackBadge(ctx, infoX, itemY, 22);
            }

            ctx.fillStyle = '#E5E7EB';
            ctx.font = '600 12px system-ui, sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            const maxItemTextW = cardX + 270 - (infoX + 28);
            ctx.fillText(titleCase(item), infoX + 28, itemY + 11, Math.max(40, maxItemTextW));
        }

        // Vertical divider
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cardX + 276, cardY + 12);
        ctx.lineTo(cardX + 276, cardY + rowH - 12);
        ctx.stroke();

        // --- Right Half: Content ---
        const rightX = cardX + 288;
        const rightW = colW - 298;

        if (cardTab === 'stats') {
            const evs = customization.evs || {};
            const nature = customization.nature || 'serious';

            ctx.fillStyle = '#A5B4FC';
            ctx.font = '700 13px system-ui, sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(`Nature: ${titleCase(nature)}`, rightX, cardY + 14);

            const statLabels = [
                { key: 'hp', label: 'HP' },
                { key: 'attack', label: 'Atk' },
                { key: 'defense', label: 'Def' },
                { key: 'special-attack', label: 'SpA' },
                { key: 'special-defense', label: 'SpD' },
                { key: 'speed', label: 'Spe' },
            ];

            let statY = cardY + 38;
            statLabels.forEach((st, idx) => {
                const val = Number(evs[st.key] || 0);
                const rx = rightX + (idx % 2) * (rightW / 2);
                const ry = statY + Math.floor(idx / 2) * 22;

                ctx.fillStyle = '#9CA3AF';
                ctx.font = '600 11px system-ui, sans-serif';
                ctx.fillText(`${st.label}:`, rx, ry);

                ctx.fillStyle = val > 0 ? '#6EE7B7' : '#D1D5DB';
                ctx.font = val > 0 ? '700 11px system-ui, sans-serif' : '500 11px system-ui, sans-serif';
                ctx.fillText(`${val} EV`, rx + 32, ry);
            });
        } else {
            // Moves View (Type Icon Badge ONLY — NO text string!)
            const rawMoves = Array.isArray(customization.moves) ? customization.moves : [];
            const moves = rawMoves.slice(0, 4);

            for (let mIdx = 0; mIdx < 4; mIdx++) {
                const rawMove = moves[mIdx];
                const moveName = typeof rawMove === 'string' ? rawMove : rawMove?.name || '';
                const moveY = cardY + 12 + mIdx * 34;

                const explicitType = typeof rawMove === 'object' ? rawMove?.type : null;
                const mType = explicitType || (moveTypesMap && moveName ? moveTypesMap[moveId(moveName)] : null);

                if (moveName) {
                    const mainColor = mType && typeColors[mType] ? typeColors[mType] : '#6366F1';
                    const softBg = hexToRgba(mainColor, 0.22);
                    const softBorder = hexToRgba(mainColor, 0.48);

                    drawRoundedRect(ctx, rightX, moveY, rightW - 12, 28, 6, softBg, softBorder, 1);

                    const badgeSize = 22;
                    const badgeX = rightX + 4;
                    const badgeY = moveY + 3;
                    drawRoundedRect(ctx, badgeX, badgeY, badgeSize, badgeSize, 5, mainColor, null);

                    const typeIconImg = mType ? assets.typeIcons.get(String(mType).toLowerCase()) : null;
                    if (typeIconImg) {
                        ctx.drawImage(typeIconImg, badgeX + 3, badgeY + 3, 16, 16);
                    } else {
                        ctx.fillStyle = '#FFFFFF';
                        ctx.beginPath();
                        ctx.arc(badgeX + badgeSize / 2, badgeY + badgeSize / 2, 4, 0, Math.PI * 2);
                        ctx.fill();
                    }

                    ctx.fillStyle = '#FFFFFF';
                    ctx.font = '600 13px system-ui, sans-serif';
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(titleCase(moveName), rightX + badgeSize + 12, moveY + 14, rightW - badgeSize - 24);
                } else {
                    drawRoundedRect(ctx, rightX, moveY, rightW - 12, 28, 6, 'rgba(30, 41, 59, 0.35)', 'rgba(75, 85, 99, 0.2)', 1);
                    ctx.fillStyle = 'rgba(156, 163, 175, 0.35)';
                    ctx.font = '500 12px system-ui, sans-serif';
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('- Empty Move -', rightX + 14, moveY + 14);
                }
            }
        }
    }

    drawFooterStripSync(ctx, W, H, FOOTER_H, shareUrl, assets.logo);
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
    ctx.fillText('Pokémon Team Builder', logoX + logoSize + 14, footerY + FOOTER_H / 2 - 10);
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
    const [cardTab, setCardTab] = useState('moves');

    const [title, setTitle] = useState(defaultTitle || '');
    const [subtitle, setSubtitle] = useState('');
    const [backgroundId, setBackgroundId] = useState(DEFAULT_BACKGROUND_ID);

    const authDisplayName = useAuthStore((s) => s.displayName);
    const [trainerName, setTrainerName] = useState(authDisplayName || 'Trainer');
    const [teamIdCode, setTeamIdCode] = useState('');

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
    const renderTeamId = useDebounce(teamIdCode, 180);

    useEffect(() => {
        if (isOpen) {
            setTitle(defaultTitle || t('modals.shareModalDefaultTitle'));
            setSubtitle(t('modals.shareModalDefaultSubtitle', { count: pokemons.length }));
            setBackgroundId(DEFAULT_BACKGROUND_ID);
            setTrainerName(useAuthStore.getState().displayName || 'Trainer');
            setTeamIdCode(generateRandomTeamId());
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

        preloadSnippetAssets(pokemons, cardTab, moveTypesMap, bgUrl)
            .then((assets) => {
                if (cancelled || !canvasRef.current) return;
                const canvas = canvasRef.current;

                if (mode === 'cards') {
                    renderCompetitiveCardSnippetSync({
                        canvas,
                        pokemons,
                        trainerName: renderTrainer,
                        teamIdCode: renderTeamId,
                        cardTab,
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
    }, [isOpen, mode, cardTab, background, renderTitle, renderSubtitle, pokemons, shareUrl, renderTrainer, renderTeamId, moveTypesMap, megaStones]);

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
            { id: 'trainer', label: t('modals.shareModalTrainerLabel'), value: trainerName, max: 30, placeholder: 'Trainer', onChange: setTrainerName },
            { id: 'code', label: t('modals.shareModalTeamIdLabel'), value: teamIdCode, max: 14, placeholder: '7Q9H36N438', onChange: (v) => setTeamIdCode(v.toUpperCase()), mono: true },
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
                            <div className="segmented segmented--sm" role="group" aria-label={t('modals.shareModalContentAria')}>
                                <button type="button" className="segmented__item" aria-pressed={cardTab === 'moves'} onClick={() => setCardTab('moves')}>
                                    <Swords aria-hidden="true" />
                                    {t('modals.shareModalTabMoves')}
                                </button>
                                <button type="button" className="segmented__item" aria-pressed={cardTab === 'stats'} onClick={() => setCardTab('stats')}>
                                    <BarChart3 aria-hidden="true" />
                                    {t('modals.shareModalTabStats')}
                                </button>
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
