import { describe, expect, it } from 'vitest';
import { MAX_IMAGE_ROWS, RECEIPT_IMAGE, receiptFileName, receiptImageLayout, receiptPostText, xIntentUrl } from './receiptShare';

describe('receiptImageLayout', () => {
    it('keeps the paper inside the frame and above the footer for every row count', () => {
        for (let n = 0; n <= MAX_IMAGE_ROWS + 2; n += 1) {
            const l = receiptImageLayout(n);
            expect(l.paper.x).toBeGreaterThan(0);
            expect(l.paper.x + l.paper.w).toBeLessThan(RECEIPT_IMAGE.width);
            expect(l.paper.y + l.paper.h + l.paper.tear).toBeLessThan(l.footerTop);
            expect(l.rowsTop).toBeLessThan(l.totalsTop);
            expect(l.totalsTop).toBeLessThan(l.stampTop);
            expect(l.stampTop).toBeLessThan(l.codeTop);
        }
    });

    it('grows with the rows, clamped to the maximum', () => {
        expect(receiptImageLayout(4).paper.h).toBeGreaterThan(receiptImageLayout(2).paper.h);
        expect(receiptImageLayout(99).rows).toBe(MAX_IMAGE_ROWS);
        expect(receiptImageLayout(-3).rows).toBe(1);
    });
});

describe('receiptPostText', () => {
    const t = (key, p = {}) => `${key}${p.n != null ? `:${p.n}/${p.total}` : ''}`;
    it('says four of four apart from a day in progress', () => {
        expect(receiptPostText(t, { played: 4, total: 4, complete: true })).toBe('receipt.image.postFull');
        expect(receiptPostText(t, { played: 2, total: 4 })).toBe('receipt.image.post:2/4');
    });
});

describe('xIntentUrl', () => {
    it('fills the composer with the text and the link, encoded', () => {
        const url = new URL(xIntentUrl('4 de 4 & feito', 'https://pokemonbuilder.app/pt/games'));
        expect(url.origin + url.pathname).toBe('https://x.com/intent/post');
        expect(url.searchParams.get('text')).toBe('4 de 4 & feito');
        expect(url.searchParams.get('url')).toBe('https://pokemonbuilder.app/pt/games');
    });
});

describe('receiptFileName', () => {
    it('names the file by the day only', () => {
        expect(receiptFileName('2026-11-17', 'pt')).toBe('pokemonbuilder-recibo-2026-11-17.png');
        expect(receiptFileName('2026-11-17', 'en')).toBe('pokemonbuilder-receipt-2026-11-17.png');
        expect(receiptFileName('../x', 'pt')).toBe('pokemonbuilder-recibo-hoje.png');
    });
});
