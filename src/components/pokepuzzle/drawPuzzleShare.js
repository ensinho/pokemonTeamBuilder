import QRCode from 'qrcode';
import { SHARE_SIZE, puzzleGridLayout } from '../../utils/puzzleShareLayout';

/**
 * The PokéPuzzle result as an image (2026-11-09, replacing the 400 × 640
 * card): a 4:5 post in the team sheet's language — the app's own faces
 * (Unbounded headline, Space Grotesk text), poster rings on the Neon
 * Sticker violet, the colour grid as the hero, and a QR + link to today's
 * puzzle. Never the answer: the grid is colours only.
 *
 * Prepared as soon as the game ends (PokePuzzleView), so the tap that shares
 * it calls `navigator.share` at once — a phone refuses a share that comes
 * after awaited work, which is what left "Imagem" doing nothing on phones.
 */
const INK = '#ffffff';
const CREAM = '#ffe08a';
const MUTED = 'rgba(255,255,255,0.68)';
const TILE = { c: '#2fbf71', p: '#e6b422', a: 'rgba(255,255,255,0.13)' };
const HEADING = "'Unbounded', 'Space Grotesk', system-ui, sans-serif";
const BODY = "'Space Grotesk', system-ui, sans-serif";

const loadImage = (src) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
});

const round = (ctx, x, y, w, h, r) => {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
};

/**
 * @param {{ rows: string[], won: boolean, maxAttempts: number, puzzleNumber: number|null,
 *           logoUrl: string, playUrl: string, labels: { kicker: string, title: string, result: string, play: string } }} opts
 * @returns {Promise<Blob|null>}
 */
export async function renderPuzzleShareBlob({ rows, won, maxAttempts, puzzleNumber, logoUrl, playUrl, labels }) {
    if (!rows?.length) return null;
    const { width: W, height: H } = SHARE_SIZE;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    if (document.fonts?.load) {
        await Promise.allSettled(['800 72px Unbounded', '700 36px "Space Grotesk"', '500 30px "Space Grotesk"'].map((f) => document.fonts.load(f)));
    }
    const [logo, qr] = await Promise.all([
        loadImage(logoUrl),
        QRCode.toCanvas(playUrl, { margin: 1, width: 168, color: { dark: '#1b0f33', light: '#ffffff' } }).catch(() => null),
    ]);

    // Ground: the brand violet, lit from the top, rings like the team sheet.
    const ground = ctx.createLinearGradient(0, 0, 0, H);
    ground.addColorStop(0, '#2a1458');
    ground.addColorStop(1, '#0c0816');
    ctx.fillStyle = ground;
    ctx.fillRect(0, 0, W, H);
    ctx.lineWidth = 34;
    for (let i = 0; i < 6; i += 1) {
        ctx.beginPath();
        ctx.arc(W * 0.92, H * 0.18, 180 + i * 130, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,255,255,${0.05 - i * 0.006})`;
        ctx.stroke();
    }

    // Header: the mark, the kicker, the puzzle number, the score.
    if (logo) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(90 + 56, 96 + 56, 56, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.10)';
        ctx.fill();
        ctx.clip();
        ctx.drawImage(logo, 98, 104, 96, 96);
        ctx.restore();
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = CREAM;
    ctx.font = `700 30px ${BODY}`;
    ctx.fillText(labels.kicker.toUpperCase(), 230, 140);
    const score = `${won ? rows.length : 'X'}/${maxAttempts}`;
    ctx.font = `800 44px ${HEADING}`;
    const sw = ctx.measureText(score).width + 56;

    // The headline shrinks to leave the score its own room.
    const headline = puzzleNumber ? `POKÉPUZZLE #${puzzleNumber}` : 'POKÉPUZZLE';
    const room = W - 90 - sw - 32 - 230;
    let size = 54;
    ctx.font = `800 ${size}px ${HEADING}`;
    while (size > 30 && ctx.measureText(headline).width > room) {
        size -= 2;
        ctx.font = `800 ${size}px ${HEADING}`;
    }
    ctx.fillStyle = INK;
    ctx.fillText(headline, 230, 200);

    round(ctx, W - 90 - sw, 112, sw, 84, 42);
    ctx.fillStyle = won ? CREAM : 'rgba(255,255,255,0.14)';
    ctx.fill();
    ctx.fillStyle = won ? '#1b0f33' : INK;
    ctx.textAlign = 'center';
    ctx.fillText(score, W - 90 - sw / 2, 171);

    // The question and the outcome.
    ctx.fillStyle = INK;
    ctx.font = `800 64px ${HEADING}`;
    ctx.fillText(labels.title, W / 2, 380);
    ctx.fillStyle = MUTED;
    ctx.font = `500 34px ${BODY}`;
    ctx.fillText(labels.result, W / 2, 448);

    // The grid, the hero — colours only.
    const cols = rows[0].length;
    const g = puzzleGridLayout(rows.length, cols);
    rows.forEach((row, r) => {
        row.split('').forEach((code, c) => {
            round(ctx, g.x + c * (g.tile + g.gap), g.y + r * (g.tile + g.gap), g.tile, g.tile, Math.round(g.tile * 0.18));
            ctx.fillStyle = TILE[code] || TILE.a;
            ctx.fill();
        });
    });

    // Footer: the QR on a white tile, the call and the link.
    const fy = 1150;
    if (qr) {
        round(ctx, 90, fy, 168, 168, 20);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.drawImage(qr, 90, fy, 168, 168);
    }
    ctx.textAlign = 'left';
    ctx.fillStyle = INK;
    ctx.font = `700 36px ${BODY}`;
    ctx.fillText(labels.play, 290, fy + 70);
    ctx.fillStyle = CREAM;
    ctx.font = `600 30px ${BODY}`;
    ctx.fillText(playUrl.replace(/^https?:\/\//, ''), 290, fy + 120);
    ctx.textAlign = 'right';
    ctx.fillStyle = MUTED;
    ctx.font = `800 24px ${HEADING}`;
    ctx.fillText('POKEMONBUILDER', W - 90, fy + 160);

    return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/png'));
}
