import { typeColors } from '../../constants/typeChart';
import { getPokemonFrontSpriteUrl } from '../../utils/pokemonSprites';
import { toOriginUrl } from '../../utils/assetHost';
import { TIER_BALLS, TIER_KEYS, tierExportLayout } from '../../utils/tierList';

/**
 * A tier list or a chart as an image (2026-11-15): the PokéPuzzle share's
 * language — the brand's violet ground with the poster rings, Unbounded for
 * the headline, Space Grotesk for the rest — with the mascot's mark and the
 * link in the corners, so the picture says where it was made. Every rank is
 * its Poké Ball, every sprite stands on a platform in its first type, an
 * empty chart cell is the silhouette's "?". Positions come from
 * `tierExportLayout` (utils/tierList.js, tested); this file only paints.
 */
const INK = '#ffffff';
const CREAM = '#ffe08a';
const MUTED = 'rgba(255,255,255,0.62)';
const LANE = 'rgba(255,255,255,0.06)';
const HEADING = "'Unbounded', 'Space Grotesk', system-ui, sans-serif";
const BODY = "'Space Grotesk', system-ui, sans-serif";

const loadImage = (src) => new Promise((resolve) => {
    if (!src) { resolve(null); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
});

/** A sprite from wherever it is served, falling back to its origin (the mirror may lack CORS). */
const loadSprite = async (id) => {
    const url = getPokemonFrontSpriteUrl(id);
    return (await loadImage(url)) || (toOriginUrl(url) !== url ? loadImage(toOriginUrl(url)) : null);
};

const round = (ctx, x, y, w, h, r) => {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
};

const withAlpha = (hex, alpha) => {
    const n = Number.parseInt(String(hex).replace('#', ''), 16);
    if (!Number.isFinite(n)) return `rgba(255,255,255,${alpha})`;
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
};

/** A Poké Ball: the top in the rank's colour, the band, the button. */
function drawBall(ctx, cx, cy, r, ball) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#f4f2fb';
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.fillStyle = ball.top;
    ctx.fillRect(cx - r, cy - r, r * 2, r);
    if (ball.ball === 'master') {
        // The two pink domes on the Master Ball.
        ctx.fillStyle = ball.band;
        ctx.beginPath();
        ctx.arc(cx - r * 0.45, cy - r * 0.5, r * 0.26, 0, Math.PI * 2);
        ctx.arc(cx + r * 0.45, cy - r * 0.5, r * 0.26, 0, Math.PI * 2);
        ctx.fill();
    } else if (ball.ball === 'ultra') {
        ctx.fillStyle = ball.band;
        ctx.fillRect(cx - r, cy - r * 0.62, r * 0.62, r * 0.36);
        ctx.fillRect(cx + r * 0.38, cy - r * 0.62, r * 0.62, r * 0.36);
    } else if (ball.ball === 'great') {
        ctx.fillStyle = ball.band;
        ctx.fillRect(cx - r, cy - r * 0.58, r * 0.6, r * 0.3);
        ctx.fillRect(cx + r * 0.4, cy - r * 0.58, r * 0.6, r * 0.3);
    }
    ctx.restore();
    // The seam and the button.
    ctx.fillStyle = ball.ball === 'premier' ? ball.band : '#1b1426';
    ctx.fillRect(cx - r, cy - r * 0.09, r * 2, r * 0.18);
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = ball.ball === 'premier' ? ball.band : '#1b1426';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.18, 0, Math.PI * 2);
    ctx.fillStyle = '#f4f2fb';
    ctx.fill();
}

/** A sprite on its platform, in its first type. */
function drawMon(ctx, img, x, y, size, type) {
    ctx.beginPath();
    ctx.ellipse(x + size / 2, y + size * 0.84, size * 0.38, size * 0.1, 0, 0, Math.PI * 2);
    ctx.fillStyle = withAlpha(typeColors[type] || '#a8a77a', 0.34);
    ctx.fill();
    if (img) {
        ctx.imageSmoothingEnabled = false;
        // A front sprite is 96 px with a wide transparent margin: draw its
        // middle 72 so the Pokémon, not the margin, fills the cell.
        const crop = img.naturalWidth * 0.125;
        ctx.drawImage(img, crop, crop, img.naturalWidth - crop * 2, img.naturalHeight - crop * 2, x, y - size * 0.06, size, size);
        ctx.imageSmoothingEnabled = true;
    }
}

/**
 * @param {{ board: object, monsById: Map<number, {name: string, types: string[]}>,
 *           cellLabels?: Record<string, string>, logoUrl: string, pageUrl: string,
 *           labels: { kicker: string, title: string, footer: string } }} opts
 * @returns {Promise<Blob|null>}
 */
export async function renderTierListBlob({ board, monsById, cellLabels = {}, logoUrl, pageUrl, labels }) {
    if (!board) return null;
    const isChart = board.kind === 'chart';
    const cellKeys = isChart ? Object.keys(board.cells) : [];
    const layout = isChart
        ? tierExportLayout({ cells: cellKeys.length })
        : tierExportLayout({ rows: TIER_KEYS.map((key) => ({ key, count: board.tiers[key].length })) });
    const { width: W, height: H, pad: P } = layout;

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    if (document.fonts?.load) {
        await Promise.allSettled(['800 56px Unbounded', '700 30px "Space Grotesk"', '500 26px "Space Grotesk"'].map((f) => document.fonts.load(f)));
    }
    const ids = isChart
        ? cellKeys.map((key) => board.cells[key]).filter(Boolean)
        : TIER_KEYS.flatMap((key) => board.tiers[key]);
    const [logo, ...sprites] = await Promise.all([loadImage(logoUrl), ...ids.map(loadSprite)]);
    const spriteOf = new Map(ids.map((id, i) => [id, sprites[i]]));

    // Ground: the brand violet, lit from the top, rings like the puzzle's card.
    const ground = ctx.createLinearGradient(0, 0, 0, H);
    ground.addColorStop(0, '#2a1458');
    ground.addColorStop(1, '#0c0816');
    ctx.fillStyle = ground;
    ctx.fillRect(0, 0, W, H);
    ctx.lineWidth = 30;
    for (let i = 0; i < 5; i += 1) {
        ctx.beginPath();
        ctx.arc(W * 0.95, 60, 160 + i * 120, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,255,255,${0.045 - i * 0.007})`;
        ctx.stroke();
    }

    // Header: the mascot's mark, what this is, the title.
    const markY = 64;
    if (logo) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(P + 48, markY + 48, 48, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.10)';
        ctx.fill();
        ctx.clip();
        ctx.drawImage(logo, P + 8, markY + 8, 80, 80);
        ctx.restore();
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = CREAM;
    ctx.font = `700 26px ${BODY}`;
    ctx.fillText(labels.kicker, P + 120, markY + 34);
    let size = 52;
    ctx.font = `800 ${size}px ${HEADING}`;
    const room = W - P * 2 - 120;
    while (size > 28 && ctx.measureText(labels.title).width > room) {
        size -= 2;
        ctx.font = `800 ${size}px ${HEADING}`;
    }
    ctx.fillStyle = INK;
    ctx.fillText(labels.title, P + 120, markY + 34 + size + 14);

    if (isChart) {
        layout.cells.forEach((cell, i) => {
            const key = cellKeys[i];
            const id = board.cells[key];
            const mon = id ? monsById.get(id) : null;
            const tone = typeColors[key] || null;
            round(ctx, cell.x, cell.y, cell.size, cell.size, 22);
            ctx.fillStyle = tone ? withAlpha(tone, 0.16) : LANE;
            ctx.fill();
            // The cell's name, in its type's colour where it has one.
            ctx.textAlign = 'center';
            ctx.font = `700 ${Math.round(cell.size * 0.11)}px ${BODY}`;
            ctx.fillStyle = tone ? withAlpha(tone, 1) : CREAM;
            ctx.fillText(cellLabels[key] || key, cell.x + cell.size / 2, cell.y + cell.size * 0.17);
            const spriteSize = cell.size * 0.66;
            if (mon) {
                drawMon(ctx, spriteOf.get(id), cell.x + (cell.size - spriteSize) / 2, cell.y + cell.size * 0.2, spriteSize, mon.types?.[0]);
                ctx.font = `600 ${Math.round(cell.size * 0.085)}px ${BODY}`;
                ctx.fillStyle = INK;
                ctx.fillText(mon.label || mon.name, cell.x + cell.size / 2, cell.y + cell.size * 0.93, cell.size - 16);
            } else {
                ctx.font = `800 ${Math.round(cell.size * 0.34)}px ${HEADING}`;
                ctx.fillStyle = 'rgba(255,255,255,0.14)';
                ctx.fillText('?', cell.x + cell.size / 2, cell.y + cell.size * 0.68);
            }
        });
    } else {
        layout.rows.forEach((row) => {
            const ball = TIER_BALLS[row.key];
            round(ctx, row.x, row.y, row.width, row.height, 24);
            ctx.fillStyle = LANE;
            ctx.fill();
            // The rank: its ball over its letter, on a tile in the ball's colour.
            round(ctx, row.label.x, row.label.y, row.label.width, row.label.height, 24);
            ctx.fillStyle = withAlpha(ball.top === '#2b2b33' ? ball.band : ball.top, 0.22);
            ctx.fill();
            const cx = row.label.x + row.label.width / 2;
            const middle = row.label.y + row.label.height / 2;
            drawBall(ctx, cx, middle - 22, 22, ball);
            ctx.textAlign = 'center';
            ctx.fillStyle = INK;
            ctx.font = `800 40px ${HEADING}`;
            ctx.fillText(row.key, cx, middle + 44);
            board.tiers[row.key].forEach((id, i) => {
                const item = row.items[i];
                drawMon(ctx, spriteOf.get(id), item.x, item.y, item.size, monsById.get(id)?.types?.[0]);
            });
        });
    }

    // Footer: where it was made.
    ctx.textAlign = 'left';
    ctx.fillStyle = CREAM;
    ctx.font = `600 26px ${BODY}`;
    ctx.fillText(pageUrl.replace(/^https?:\/\//, ''), P, layout.footerY + 30);
    ctx.textAlign = 'right';
    ctx.fillStyle = MUTED;
    ctx.font = `800 22px ${HEADING}`;
    ctx.fillText(labels.footer, W - P, layout.footerY + 30);

    return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/png'));
}
