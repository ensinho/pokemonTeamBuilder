/**
 * The day's receipt as a picture to post (2026-11-17, Enzo: "o recibo do dia
 * deve ter a opção de salvar/exportar imagem, e share via Instagram ou X").
 * Pure: the image's geometry, the post's words and the X link. The canvas is
 * drawn by components/mascot/drawReceiptShare.js; the dialog decides the
 * channel (RoundReceiptDialog.jsx).
 *
 * A 4:5 post (1080 × 1350) — the Instagram feed's tallest frame, which X shows
 * whole too. Never a trainer's words: the rows are the receipt's own labels.
 */
export const RECEIPT_IMAGE = { width: 1080, height: 1350 };

// The paper and its bands, top to bottom. Heights are in canvas pixels.
const PAPER_W = 760;
const PAPER_TOP = 160;
const PAD = 56;
const HEAD = 180;      // brand, kind, rule, date line, rule
const ROW = 58;
const TOTALS = 168;    // rule, three totals
const STAMP = 200;
const CODE = 116;      // bars + digits
const TEAR = 18;
export const MAX_IMAGE_ROWS = 4; // the day has four games

/**
 * Where each band of the paper goes for `rowCount` rows. The paper grows with
 * the rows and never runs into the footer (asserted by the test for up to
 * MAX_IMAGE_ROWS).
 */
export function receiptImageLayout(rowCount) {
    const rows = Math.max(1, Math.min(MAX_IMAGE_ROWS, rowCount | 0));
    const x = (RECEIPT_IMAGE.width - PAPER_W) / 2;
    const head = PAPER_TOP + PAD;
    const rowsTop = head + HEAD;
    const totalsTop = rowsTop + rows * ROW;
    const stampTop = totalsTop + TOTALS;
    const codeTop = stampTop + STAMP;
    const bottom = codeTop + CODE + PAD - 24;
    return {
        paper: { x, y: PAPER_TOP, w: PAPER_W, h: bottom - PAPER_TOP, tear: TEAR },
        inner: { left: x + PAD, right: x + PAPER_W - PAD },
        head,
        rowsTop,
        row: ROW,
        rows,
        totalsTop,
        stampTop,
        codeTop,
        footerTop: RECEIPT_IMAGE.height - 130,
    };
}

/** The post's line: what the day was, then the invitation. */
export function receiptPostText(t, { played = 0, total = 4, complete = false } = {}) {
    return complete
        ? t('receipt.image.postFull')
        : t('receipt.image.post', { n: played, total });
}

/** X's composer, filled — the text and the link (its card is the page's). */
export function xIntentUrl(text, url) {
    const params = new URLSearchParams();
    if (text) params.set('text', text);
    if (url) params.set('url', url);
    return `https://x.com/intent/post?${params.toString()}`;
}

/** `pokemonbuilder-recibo-2026-11-17.png` — the day, nothing of the trainer. */
export function receiptFileName(dayKey, language = 'pt') {
    const day = /^\d{4}-\d{2}-\d{2}$/.test(String(dayKey)) ? dayKey : 'hoje';
    return `pokemonbuilder-${language === 'pt' ? 'recibo' : 'receipt'}-${day}.png`;
}
