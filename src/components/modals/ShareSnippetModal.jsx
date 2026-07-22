import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Palette, Swords, BarChart3, Image as ImageIcon, User, Sparkles } from 'lucide-react';
import { useModalA11y } from '../../hooks/useModalA11y';
import {
    SHARE_BACKGROUNDS,
    DEFAULT_BACKGROUND_ID,
    SNIPPET_DIMENSIONS,
    getBackgroundById,
} from '../../assets/backgrounds';
import { CloseIcon, ShareIcon, SwordsIcon, ChartColumnIcon } from '../icons';
import { useTranslation } from '../../hooks/useTranslation';
import { useForumStore } from '../../store/useForumStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useActiveTeamStore } from '../../store/useActiveTeamStore';
import { getPokemonArtworkSpriteUrl, getPokemonFrontSpriteUrl } from '../../utils/pokemonSprites';
import { useMegaStones, megaDisplayName } from '../../hooks/useMegaStones';
import { typeColors, typeIcons } from '../../constants/types';

const BRAND_URL = 'https://github.com/ensinho/pokemonTeamBuilder';
const BRAND_LABEL = 'github.com/ensinho/pokemonTeamBuilder';
const BRAND_LOGO_URL = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname.includes('/pokemonTeamBuilder') ? '/pokemonTeamBuilder/' : '/'}LogoCuteGengarRounded.png`.replace(/([^:]\/)\/+/g, "$1")
    : '/LogoCuteGengarRounded.png';

const dayStamp = () => {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
};

const getMoveTypesUrl = () =>
    `${import.meta.env.BASE_URL || '/'}data/move-types.json`.replace(/([^:])\/{2,}/g, '$1/') + `?d=${dayStamp()}`;

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

const renderPosterSnippetSync = ({ canvas, background, title, subtitle, pokemons, shareUrl, assets }) => {
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
        const leftBoxW = 265;
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
    ctx.fillText(BRAND_LABEL, logoX + logoSize + 14, footerY + FOOTER_H / 2 + 12);
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
    const { t, language } = useTranslation();
    const megaStones = useMegaStones();
    const dialogRef = useModalA11y(isOpen ? onClose : undefined);
    const canvasRef = useRef(null);

    const [moveTypesMap, setMoveTypesMap] = useState({});

    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;
        fetch(getMoveTypesUrl())
            .then((res) => (res.ok ? res.json() : null))
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

    const background = useMemo(() => getBackgroundById(backgroundId), [backgroundId]);

    useEffect(() => {
        if (isOpen) {
            setTitle(defaultTitle || t('modals.shareModalDefaultTitle'));
            setSubtitle(t('modals.shareModalDefaultSubtitle', { count: pokemons.length }));
            setBackgroundId(DEFAULT_BACKGROUND_ID);
            setTrainerName(useAuthStore.getState().displayName || 'Trainer');
            setTeamIdCode(generateRandomTeamId());
            setPreviewUrl(null);
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
                        trainerName,
                        teamIdCode,
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
                        title,
                        subtitle,
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
    }, [isOpen, mode, cardTab, background, title, subtitle, pokemons, shareUrl, trainerName, teamIdCode, moveTypesMap, megaStones]);

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
            showToast?.(t('modals.shareModalSuccess'), 'success');
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
            const forumTeamData = {
                name: title || t('modals.shareModalDefaultTitle'),
                pokemons: currentTeam.map((p) => {
                    const item = p?.customization?.item;
                    const mega = item && megaStones ? megaStones[item] : null;
                    const isMega = mega && mega.baseId === p.id;
                    const spriteId = isMega ? mega.spriteId : p.id;
                    const name = isMega ? megaDisplayName(mega.form) : p.name;
                    return {
                        id: p.id,
                        name,
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
            let targetTopic = topics.find((t) => t.title === 'Teams');
            if (!targetTopic) targetTopic = topics.find((t) => t.title?.toLowerCase() === 'teams');
            if (!targetTopic) targetTopic = topics.find((t) => t.category === 'teams');
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
    }, [title, subtitle, onClose, showToast, t, megaStones]);

    if (!isOpen) return null;

    const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

    return (
        <div
            className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-[60] p-3 sm:p-4"
            onClick={onClose}
            role="presentation"
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="share-snippet-title"
                tabIndex={-1}
                className="w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden rounded-2xl border border-surface-raised bg-surface shadow-2xl animate-scale-in focus:outline-none"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-surface-raised bg-surface-raised/30">
                    <div>
                        <h3 id="share-snippet-title" className="text-lg font-bold text-fg">
                            {t('modals.shareModalTitle')}
                        </h3>
                        <p className="text-xs text-muted">
                            {prefersNativeSave
                                ? t('modals.shareModalDescMobile')
                                : t('modals.shareModalDescDesktop')}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label={t('modals.shareModalCloseAria')}
                        className="rounded-lg bg-surface-raised p-2 text-fg hover:bg-surface-raised/80 transition-all"
                    >
                        <CloseIcon />
                    </button>
                </div>

                {/* Scrollable Content Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                    {/* Mode Switcher Tabs (Lucide icons, NO emojis) */}
                    <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-surface-raised border border-surface-raised">
                        <button
                            type="button"
                            onClick={() => setMode('cards')}
                            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                                mode === 'cards'
                                    ? 'bg-primary text-white shadow-md'
                                    : 'text-muted hover:text-fg'
                            }`}
                        >
                            <SwordsIcon className="w-4 h-4" />
                            {t('modals.shareModalModeCards')}
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('poster')}
                            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                                mode === 'poster'
                                    ? 'bg-primary text-white shadow-md'
                                    : 'text-muted hover:text-fg'
                            }`}
                        >
                            <Palette className="w-4 h-4" />
                            {t('modals.shareModalModePoster')}
                        </button>
                    </div>

                    {/* Mode Specific Controls */}
                    {mode === 'cards' ? (
                        <div className="p-3.5 rounded-xl bg-surface-raised/40 border border-surface-raised space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted">
                                        {t('modals.shareModalTrainerLabel')}
                                    </label>
                                    <input
                                        type="text"
                                        value={trainerName}
                                        onChange={(e) => setTrainerName(e.target.value.slice(0, 30))}
                                        placeholder="Trainer"
                                        maxLength={30}
                                        className="w-full rounded-lg border border-surface-raised bg-surface p-2 text-xs font-medium text-fg focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted">
                                        {t('modals.shareModalTeamIdLabel')}
                                    </label>
                                    <input
                                        type="text"
                                        value={teamIdCode}
                                        onChange={(e) => setTeamIdCode(e.target.value.toUpperCase().slice(0, 14))}
                                        placeholder="7Q9H36N438"
                                        maxLength={14}
                                        className="w-full rounded-lg border border-surface-raised bg-surface p-2 text-xs font-mono font-bold text-fg focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                            </div>

                            {/* Card Content Sub-Tab */}
                            <div className="flex items-center justify-between pt-1">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                                    Display Content:
                                </span>
                                <div className="inline-flex rounded-lg bg-surface p-0.5 border border-surface-raised">
                                    <button
                                        type="button"
                                        onClick={() => setCardTab('moves')}
                                        className={`flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold rounded-md transition-all ${
                                            cardTab === 'moves'
                                                ? 'bg-primary text-white'
                                                : 'text-muted hover:text-fg'
                                        }`}
                                    >
                                        <SwordsIcon className="w-3.5 h-3.5" />
                                        {t('modals.shareModalTabMoves')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCardTab('stats')}
                                        className={`flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold rounded-md transition-all ${
                                            cardTab === 'stats'
                                                ? 'bg-primary text-white'
                                                : 'text-muted hover:text-fg'
                                        }`}
                                    >
                                        <ChartColumnIcon className="w-3.5 h-3.5" />
                                        {t('modals.shareModalTabStats')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-3.5 rounded-xl bg-surface-raised/40 border border-surface-raised space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted">
                                        {t('modals.shareModalTitleLabel')}
                                    </label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value.slice(0, 60))}
                                        placeholder={t('modals.shareModalDefaultTitle')}
                                        maxLength={60}
                                        className="w-full rounded-lg border border-surface-raised bg-surface p-2 text-xs font-medium text-fg focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted">
                                        {t('modals.shareModalSubtitleLabel')}
                                    </label>
                                    <input
                                        type="text"
                                        value={subtitle}
                                        onChange={(e) => setSubtitle(e.target.value.slice(0, 80))}
                                        placeholder={t('modals.shareModalOptional')}
                                        maxLength={80}
                                        className="w-full rounded-lg border border-surface-raised bg-surface p-2 text-xs font-medium text-fg focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                            </div>

                            {/* Background Selector */}
                            <div>
                                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted">
                                    {t('modals.shareModalBackgroundLabel')}
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {SHARE_BACKGROUNDS.map((bg) => {
                                        const selected = bg.id === backgroundId;
                                        return (
                                            <button
                                                key={bg.id}
                                                type="button"
                                                onClick={() => setBackgroundId(bg.id)}
                                                className={`relative aspect-video overflow-hidden rounded-lg border-2 transition-all hover:scale-105 ${
                                                    selected
                                                        ? 'border-primary ring-2 ring-primary/40'
                                                        : 'border-transparent opacity-75 hover:opacity-100'
                                                }`}
                                                title={bg.name}
                                            >
                                                <img src={bg.url} alt={bg.name} className="w-full h-full object-cover" />
                                                <span className="absolute inset-x-0 bottom-0 text-[9px] font-bold uppercase bg-black/60 text-white text-center py-0.5">
                                                    {bg.name}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Live Preview Canvas Box */}
                    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black/40 border border-surface-raised shadow-inner flex items-center justify-center">
                        {previewUrl ? (
                            <img
                                src={previewUrl}
                                alt="Team snippet preview"
                                className="w-full h-full object-contain block"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-muted">
                                {isRendering ? t('modals.shareModalRendering') : t('modals.shareModalPreviewUnavailable')}
                            </div>
                        )}
                        <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
                    </div>

                    {/* Share URL copy field */}
                    {shareUrl && (
                        <div className="flex items-center gap-2 rounded-xl bg-surface-raised p-2 border border-surface-raised">
                            <input
                                type="text"
                                readOnly
                                value={shareUrl}
                                onFocus={(e) => e.target.select()}
                                className="min-w-0 flex-1 bg-transparent px-1 text-xs text-muted focus:outline-none font-mono"
                                aria-label="Share URL"
                            />
                            <button
                                type="button"
                                onClick={handleCopyLink}
                                className="rounded-lg bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 px-3 py-1.5 text-xs font-bold transition-all"
                            >
                                {t('modals.shareModalCopyBtn')}
                            </button>
                        </div>
                    )}
                </div>

                {/* Sticky Action Footer */}
                <div className="p-4 border-t border-surface-raised bg-surface-raised/40 space-y-2">
                    {/* Share on Forum Button */}
                    <button
                        type="button"
                        onClick={handleShareToForum}
                        disabled={isRendering || isPosting}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-white py-2.5 text-xs font-bold shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
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

                    {/* Actions Grid */}
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={handleDownload}
                            disabled={isRendering || isPosting}
                            className="rounded-xl bg-surface-raised border border-surface-raised px-4 py-2.5 text-xs font-bold text-fg transition-all hover:bg-surface-raised/80 active:scale-[0.98] disabled:opacity-60"
                        >
                            {prefersNativeSave ? t('modals.shareModalSaveImage') : t('modals.shareModalDownloadImage')}
                        </button>
                        <button
                            type="button"
                            onClick={handleNativeShare}
                            disabled={isRendering || isPosting}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-surface-raised border border-primary/40 text-primary px-4 py-2.5 text-xs font-bold transition-all hover:bg-primary/10 active:scale-[0.98] disabled:opacity-60"
                        >
                            <ShareIcon className="w-3.5 h-3.5" />
                            {canNativeShare ? t('modals.shareModalShareBtn') : t('modals.shareModalCopyLinkBtn')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShareSnippetModal;
