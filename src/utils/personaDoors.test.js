import { describe, expect, it } from 'vitest';
import { DOOR_LOOK, doorLook } from './personaDoors';
import { PICK_DESTINATIONS } from './trainerProfile';
import { typeColors } from '../constants/types';

describe('personaDoors', () => {
    it('gives every destination a look', () => {
        for (const key of Object.keys(PICK_DESTINATIONS)) expect(DOOR_LOOK[key], key).toBeTruthy();
    });

    it('uses canon types only', () => {
        for (const look of Object.values(DOOR_LOOK)) expect(typeColors[look.type], look.type).toBeTruthy();
    });

    it('lets live data replace the Pokémon and the type', () => {
        expect(doorLook('meta', { dex: 1000, type: 'steel' })).toEqual({ type: 'steel', dex: 1000 });
        expect(doorLook('meta')).toEqual(DOOR_LOOK.meta);
    });

    it('falls back for an unknown key', () => {
        expect(doorLook('nope').dex).toBeGreaterThan(0);
    });
});
