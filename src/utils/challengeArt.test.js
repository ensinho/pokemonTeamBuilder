import { describe, it, expect } from 'vitest';

import { ACTOR_CELL, CYNTHIA_SHEET, PLAYER_SHEET, sheetStyle } from './challengeArt';

describe('challenge overworld sheets', () => {
    it('reads both sheets as 4 × 4 cells, rows down/left/right/up', () => {
        for (const sheet of [CYNTHIA_SHEET, PLAYER_SHEET]) {
            expect(sheet.width).toBe(4 * sheet.cell.width);
            expect(sheet.height).toBe(4 * sheet.cell.height);
            expect(Object.keys(sheet.row)).toEqual(['down', 'left', 'right', 'up']);
            expect(sheet.col).toEqual({ stand: 0, stepA: 1, stepB: 3 });
            expect(typeof sheet.url).toBe('string');
        }
    });

    it('fits the protagonist inside the shared cell', () => {
        expect(PLAYER_SHEET.offset.x + PLAYER_SHEET.cell.width).toBeLessThanOrEqual(ACTOR_CELL.width);
        expect(PLAYER_SHEET.offset.y + PLAYER_SHEET.cell.height).toBeLessThanOrEqual(ACTOR_CELL.height);
        expect(CYNTHIA_SHEET.cell).toEqual(ACTOR_CELL);
    });

    it('picks a frame by facing and step, standing when it is unknown', () => {
        expect(sheetStyle(PLAYER_SHEET, 'right', 'stepB')).toMatchObject({ '--sheet-row': 2, '--sheet-col': 3, '--cell-w': 32, '--cell-y': 4 });
        expect(sheetStyle(CYNTHIA_SHEET, 'nowhere', 'dance')).toMatchObject({ '--sheet-row': 0, '--sheet-col': 0 });
    });
});
