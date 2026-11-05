import { describe, expect, it } from 'vitest';

import { JOURNEYS } from '../../utils/journeys';
import { JOURNEY_ICONS } from './journeyIcons';

describe('JOURNEY_ICONS', () => {
    // A level without a glyph rendered `undefined` and blanked /journeys (2026-11-05).
    it('has a glyph for every journey', () => {
        for (const journey of JOURNEYS) expect(JOURNEY_ICONS[journey.id], journey.id).toBeTruthy();
    });
});
