import { describe, it, expect } from 'vitest';
import { getDailyPokemonIndex, getDaysSinceLaunch } from './pokePuzzle';

// Mock allowed pool of 1025 items
const mockAllowedPool = Array.from({ length: 1025 }, (_, i) => ({
    id: i + 1,
    name: `pokemon-${i + 1}`
}));

// Overrides match the actual pool indices
// e.g. bisharp (id 625 -> index 624 in allowedPool)
const overridePokemonNames = {
    '2026-6-16': 'bisharp',
    '2026-6-17': 'pawniard',
    '2026-6-18': 'golurk',
    '2026-6-19': 'golett',
    '2026-6-20': 'klang',
    '2026-6-21': 'klink',
    '2026-6-22': 'ferrothorn',
    '2026-6-23': 'ferroseed',
    '2026-6-24': 'galvantula'
};

// Add actual names to mock pool for the overrides to find
mockAllowedPool[624] = { id: 625, name: 'bisharp' };
mockAllowedPool[623] = { id: 624, name: 'pawniard' };
mockAllowedPool[622] = { id: 623, name: 'golurk' };
mockAllowedPool[621] = { id: 622, name: 'golett' };
mockAllowedPool[599] = { id: 600, name: 'klang' };
mockAllowedPool[598] = { id: 599, name: 'klink' };
mockAllowedPool[597] = { id: 598, name: 'ferrothorn' };
mockAllowedPool[596] = { id: 597, name: 'ferroseed' };
mockAllowedPool[595] = { id: 596, name: 'galvantula' };

describe('pokePuzzle utility', () => {
    describe('getDaysSinceLaunch', () => {
        it('calculates 0 days for launch date', () => {
            expect(getDaysSinceLaunch('2026-6-16')).toBe(0);
            expect(getDaysSinceLaunch('2026-06-16')).toBe(0);
        });

        it('calculates correct days for later dates', () => {
            expect(getDaysSinceLaunch('2026-6-17')).toBe(1);
            expect(getDaysSinceLaunch('2026-6-24')).toBe(8);
            expect(getDaysSinceLaunch('2026-7-05')).toBe(19);
        });
    });

    describe('getDailyPokemonIndex', () => {
        it('uses overrides for dates within the streak', () => {
            Object.entries(overridePokemonNames).forEach(([date, name]) => {
                const idx = getDailyPokemonIndex(date, mockAllowedPool);
                expect(mockAllowedPool[idx].name).toBe(name);
            });
        });

        it('is completely deterministic', () => {
            const date = '2026-06-25';
            const first = getDailyPokemonIndex(date, mockAllowedPool);
            const second = getDailyPokemonIndex(date, mockAllowedPool);
            expect(first).toBe(second);
        });

        it('guarantees uniqueness over 1025 days', () => {
            const visitedIndices = new Set();
            const launchDate = new Date(2026, 5, 16);
            
            for (let day = 9; day < 1025; day++) { // Start at day index 9 (after the overrides)
                const current = new Date(launchDate);
                current.setDate(launchDate.getDate() + day);
                const dateStr = `${current.getFullYear()}-${current.getMonth() + 1}-${current.getDate()}`;
                
                const idx = getDailyPokemonIndex(dateStr, mockAllowedPool);
                expect(visitedIndices.has(idx)).toBe(false);
                visitedIndices.add(idx);
            }
            
            // Check that we've visited exactly 1016 unique indices (1025 - 9 overrides)
            expect(visitedIndices.size).toBe(1016);
        });

        it('does not have consecutive/adjacent indices in general', () => {
            // Check index difference for first 30 days after overrides
            let prevIdx = getDailyPokemonIndex('2026-06-25', mockAllowedPool); // Day 9
            const launchDate = new Date(2026, 5, 16);
            
            for (let day = 10; day < 40; day++) {
                const current = new Date(launchDate);
                current.setDate(launchDate.getDate() + day);
                const dateStr = `${current.getFullYear()}-${current.getMonth() + 1}-${current.getDate()}`;
                
                const idx = getDailyPokemonIndex(dateStr, mockAllowedPool);
                const diff = Math.abs(idx - prevIdx);
                // Adjacent index difference would be 1
                expect(diff).not.toBe(1);
                prevIdx = idx;
            }
        });
    });
});
