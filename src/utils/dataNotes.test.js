import { describe, expect, it } from 'vitest';
import { bestTeamsNotes, dayLabel, metaNotes, monthLabel } from './dataNotes';

describe('dataNotes', () => {
    it('writes the month and the day out in the page language', () => {
        expect(monthLabel('2026-09', 'en')).toBe('September 2026');
        expect(monthLabel('2026-09', 'pt')).toBe('setembro de 2026');
        expect(dayLabel('2026-10-29T07:32:04.383Z', 'en')).toBe('Oct 29, 2026');
        expect(dayLabel('', 'en')).toBe('');
    });

    it('states the ladder sample, the tournament merge (VGC only) and the refresh', () => {
        const vgc = metaNotes({ format: 'VGC Reg M-C', battles: 1631943, month: '2026-09', kind: 'vgc' }, 'en');
        expect(vgc).toHaveLength(3);
        expect(vgc[0]).toContain('1,631,943 games of VGC Reg M-C in September 2026');
        const tier = metaNotes({ format: 'OU', battles: 10, month: '2026-09', kind: 'tier' }, 'en');
        expect(tier).toHaveLength(2);
        expect(metaNotes({}, 'en')).toHaveLength(1);
    });

    it('counts the best teams and drops the date line when there is no date', () => {
        expect(bestTeamsNotes({ total: 120, events: 12, format: 'Reg M-B' }, 'pt')[1]).toContain('120 times de Reg M-B');
        expect(bestTeamsNotes({ total: 120, events: 12, format: 'Reg M-B' }, 'pt')).toHaveLength(2);
    });
});
