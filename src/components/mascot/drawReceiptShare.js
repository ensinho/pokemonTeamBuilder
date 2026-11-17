import QRCode from 'qrcode';
import { RECEIPT_IMAGE, receiptImageLayout } from '../../utils/receiptShare';
import { receiptBars } from '../../utils/mascot/roundReceipt';
import { drawBrandMark } from '../../utils/brandMarkCanvas';
import { ICON_INNER, ICON_VIEW } from '../../utils/mascot/icon';

/**
 * The day's receipt as an image (2026-11-17): the same paper the dialog
 * prints — JetBrains Mono, dashed rules, dotted leaders, the torn edge, his
 * stamp (Volt, gold only at four of four) and the trainer's code — standing
 * on the brand violet with a QR to today's games. 4:5, for the Instagram
 * feed and X. Geometry from utils/receiptShare.js; every word comes worded
 * from the dialog.
 *
 * Prepared when the dialog opens, so the tap that shares it calls
 * `navigator.share` at once (a phone refuses a share after awaited work —
 * drawPuzzleShare.js).
 */
const PAPER = '#F6F3FC';
const INK = '#1B0A3D';
const MUTED = '#6E6487';
const RULE = 'rgba(27,10,61,0.3)';
const VOLT = '#6A2BF0';
const GOLD_INK = '#7E6420';
const GOLD_WASH = 'rgba(255,210,63,0.3)';
const CREAM = '#ffe08a';
const MONO = "'JetBrains Mono', ui-monospace, Menlo, Consolas, monospace";
const BODY = "'Space Grotesk', system-ui, sans-serif";
const HEADING = "'Unbounded', 'Space Grotesk', system-ui, sans-serif";

const loadImage = (src) => new Promise((resolve) => {
    if (!src) { resolve(null); return; }
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
});

/** The mascot's still face in one ink — the stamp's, like a rubber stamp. */
const mascotStampUrl = (ink) => {
    const paint = {
        line: ink, fill: 'transparent', eye: ink, fang: PAPER, 'fang-edge': 'transparent', mouth: ink, blush: 'transparent',
    };
    const inner = ICON_INNER.replace(/var\(--m-([a-z-]+)\)/g, (_, name) => paint[name] || ink);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${ICON_VIEW}" width="240" height="240">${inner}</svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const spaced = (ctx, px) => {
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${px}px`;
};

/** Fits `text` to `max` px by trimming it with an ellipsis. */
const fit = (ctx, text, max) => {
    if (ctx.measureText(text).width <= max) return text;
    let s = text;
    while (s.length > 1 && ctx.measureText(`${s}…`).width > max) s = s.slice(0, -1);
    return `${s}…`;
};

const dashed = (ctx, x1, x2, y, dash = [10, 8]) => {
    ctx.save();
    ctx.strokeStyle = RULE;
    ctx.lineWidth = 3;
    ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.stroke();
    ctx.restore();
};

const pair = (ctx, left, right, y, l, r, { bold = false, size = 26, keyColor = MUTED } = {}) => {
    ctx.font = `${bold ? 700 : 400} ${bold ? size - 4 : size - 4}px ${MONO}`;
    spaced(ctx, bold ? 2 : 3);
    ctx.fillStyle = bold ? INK : keyColor;
    ctx.textAlign = 'left';
    ctx.fillText(left.toUpperCase(), l, y);
    spaced(ctx, 0);
    ctx.font = `${bold ? 700 : 400} ${bold ? size + 4 : size}px ${MONO}`;
    ctx.fillStyle = INK;
    ctx.textAlign = 'right';
    ctx.fillText(right, r, y);
};

/**
 * @param {object} o
 * @param {Array<{ label: string, value: string, bold?: boolean }>} o.rows
 * @param {Array<[string, string]>} o.totals
 * @param {[string, string]} o.date          the meta line (key, value)
 * @param {{ word: string, sub: string, gold: boolean }} o.stamp
 * @param {{ code: string, label: string }} o.code
 * @param {{ brand: string, kind: string, kicker: string, score: string, play: string, site: string }} o.labels
 * @param {string} o.logoUrl
 * @param {string} o.playUrl
 * @returns {Promise<Blob|null>}
 */
export async function renderReceiptShareBlob({ rows, totals, date, stamp, code, labels, logoUrl, playUrl }) {
    if (!rows?.length) return null;
    const { width: W, height: H } = RECEIPT_IMAGE;
    const L = receiptImageLayout(rows.length);
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    if (document.fonts?.load) {
        await Promise.allSettled([
            `400 26px ${MONO}`, `700 30px ${MONO}`, `600 34px ${BODY}`, `700 30px ${BODY}`, `800 44px ${HEADING}`,
        ].map((f) => document.fonts.load(f)));
    }
    const inkOfStamp = stamp.gold ? GOLD_INK : VOLT;
    const [logo, face, qr] = await Promise.all([
        loadImage(logoUrl),
        loadImage(mascotStampUrl(inkOfStamp)),
        QRCode.toCanvas(playUrl, { margin: 1, width: 132, color: { dark: '#1b0f33', light: '#ffffff' } }).catch(() => null),
    ]);

    // ── Ground: the brand violet, lit from the top, the poster rings ─────────
    const ground = ctx.createLinearGradient(0, 0, 0, H);
    ground.addColorStop(0, '#2a1458');
    ground.addColorStop(1, '#0c0816');
    ctx.fillStyle = ground;
    ctx.fillRect(0, 0, W, H);
    ctx.lineWidth = 34;
    for (let i = 0; i < 6; i += 1) {
        ctx.beginPath();
        ctx.arc(W * 0.08, H * 0.86, 180 + i * 130, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,255,255,${0.05 - i * 0.006})`;
        ctx.stroke();
    }

    // ── Header: the mark, the kicker, the score ─────────────────────────────
    drawBrandMark(ctx, logo, 90, 52, 72);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.fillStyle = CREAM;
    ctx.font = `700 28px ${BODY}`;
    spaced(ctx, 4);
    ctx.fillText(labels.kicker.toUpperCase(), 186, 84);
    spaced(ctx, 0);
    ctx.fillStyle = '#ffffff';
    ctx.font = `600 30px ${BODY}`;
    ctx.fillText(date[1], 186, 120);
    ctx.font = `800 40px ${HEADING}`;
    const sw = ctx.measureText(labels.score).width + 52;
    ctx.fillStyle = stamp.gold ? '#FFD23F' : 'rgba(255,255,255,0.14)';
    ctx.beginPath();
    ctx.roundRect(W - 90 - sw, 58, sw, 68, 34);
    ctx.fill();
    ctx.fillStyle = stamp.gold ? INK : '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(labels.score, W - 90 - sw / 2, 107);

    // ── The paper, torn at the bottom, with a soft drop ─────────────────────
    const { x, y, w, h, tear } = L.paper;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 48;
    ctx.shadowOffsetY = 22;
    ctx.fillStyle = PAPER;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + h);
    const teeth = Math.round(w / (tear * 2));
    const step = w / teeth;
    for (let i = teeth; i > 0; i -= 1) {
        ctx.lineTo(x + (i - 0.5) * step, y + h + tear);
        ctx.lineTo(x + (i - 1) * step, y + h);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    const { left, right } = L.inner;
    const cx = x + w / 2;

    // Head: his brand, the kind, the date.
    ctx.font = `600 34px ${BODY}`;
    const brandW = ctx.measureText(labels.brand).width;
    const headY = L.head + 22;
    drawBrandMark(ctx, logo, cx - (brandW + 50) / 2, headY - 30, 38);
    ctx.fillStyle = INK;
    ctx.textAlign = 'left';
    ctx.fillText(labels.brand, cx - (brandW + 50) / 2 + 50, headY);
    ctx.font = `400 22px ${MONO}`;
    spaced(ctx, 7);
    ctx.fillStyle = MUTED;
    ctx.textAlign = 'center';
    ctx.fillText(labels.kind.toUpperCase(), cx + 3, L.head + 72);
    spaced(ctx, 0);
    dashed(ctx, left, right, L.head + 100);
    pair(ctx, date[0], date[1], L.head + 142, left, right);
    dashed(ctx, left, right, L.head + 168);

    // Rows: label · · · · value; a full row (bold) gets the Volt pixel.
    rows.forEach((row, i) => {
        const base = L.rowsTop + i * L.row + 40;
        ctx.font = `${row.bold ? 700 : 400} 28px ${MONO}`;
        const value = row.value;
        const vw = ctx.measureText(value).width + (row.bold ? 24 : 0);
        ctx.fillStyle = INK;
        ctx.textAlign = 'left';
        const label = fit(ctx, row.label, right - left - vw - 60);
        ctx.fillText(label, left, base);
        const lw = ctx.measureText(label).width;
        ctx.textAlign = 'right';
        ctx.fillText(value, right, base);
        if (row.bold) {
            ctx.fillStyle = VOLT;
            ctx.fillRect(right - vw, base - 18, 14, 14);
        }
        ctx.save();
        ctx.strokeStyle = RULE;
        ctx.lineWidth = 3;
        ctx.setLineDash([2, 8]);
        ctx.beginPath();
        ctx.moveTo(left + lw + 14, base - 6);
        ctx.lineTo(right - vw - 14, base - 6);
        ctx.stroke();
        ctx.restore();
    });

    // Totals: the last one is the status, heavier.
    dashed(ctx, left, right, L.totalsTop + 10);
    totals.forEach(([k, v], i) => {
        const last = i === totals.length - 1;
        pair(ctx, k, v, L.totalsTop + 58 + i * 46, left, right, { bold: last });
    });

    // The stamp: his face and one word in a tilted square.
    ctx.save();
    ctx.translate(cx, L.stampTop + 96);
    ctx.rotate((-4 * Math.PI) / 180);
    const bw = 340;
    const bh = 168;
    if (stamp.gold) {
        ctx.fillStyle = GOLD_WASH;
        ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
    }
    ctx.strokeStyle = inkOfStamp;
    ctx.lineWidth = 7;
    ctx.strokeRect(-bw / 2, -bh / 2, bw, bh);
    ctx.fillStyle = inkOfStamp;
    ctx.textAlign = 'center';
    ctx.font = `700 20px ${MONO}`;
    spaced(ctx, 5);
    ctx.fillText(stamp.sub.toUpperCase(), 3, -bh / 2 + 34);
    if (face) ctx.drawImage(face, -36, -bh / 2 + 42, 72, 72);
    ctx.font = `700 34px ${MONO}`;
    spaced(ctx, 9);
    ctx.fillText(stamp.word.toUpperCase(), 5, bh / 2 - 18);
    spaced(ctx, 0);
    ctx.restore();

    // The trainer's code: bars, then digits.
    const { bars, width: unit } = receiptBars(code.code);
    const barsW = (right - left) * 0.78;
    const scale = barsW / unit;
    const bx = cx - barsW / 2;
    ctx.fillStyle = INK;
    bars.forEach(([bxu, bwu]) => ctx.fillRect(bx + bxu * scale, L.codeTop + 4, bwu * scale, 60));
    ctx.font = `400 20px ${MONO}`;
    spaced(ctx, 6);
    ctx.fillStyle = MUTED;
    ctx.textAlign = 'center';
    ctx.fillText(`${code.label} ${code.code}`.toUpperCase(), cx + 3, L.codeTop + 100);
    spaced(ctx, 0);

    // ── Footer: the invitation and the QR to today's games ──────────────────
    const fy = L.footerTop;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 34px ${BODY}`;
    ctx.fillText(labels.play, 90, fy + 52);
    ctx.fillStyle = 'rgba(255,255,255,0.68)';
    ctx.font = `500 26px ${BODY}`;
    ctx.fillText(labels.site, 90, fy + 90);
    if (qr) {
        const q = 104;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(W - 90 - q - 12, fy + 4, q + 12, q + 12, 14);
        ctx.fill();
        ctx.drawImage(qr, W - 90 - q - 6, fy + 10, q, q);
    }

    return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob || null), 'image/png'));
}
