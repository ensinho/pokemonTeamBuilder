import { describe, it, expect } from 'vitest';

import { TRANSLATIONS } from '../constants/translations';
import { translate } from './translate';
import { eventText } from './challengeText';

const ctx = (language) => ({ t: (key, params) => translate(language, key, params), mySide: 'p1', championName: 'Cynthia' });

describe('eventText', () => {
    it('names the player\'s Pokémon plainly and Cynthia\'s as the foe\'s', () => {
        const pt = ctx('pt');
        expect(eventText({ type: 'move', side: 'p1', species: 'Pelipper', move: 'Hurricane' }, pt).text).toBe('Pelipper usou Hurricane!');
        expect(eventText({ type: 'move', side: 'p2', species: 'Garchomp', move: 'Dragon Claw' }, pt).text).toBe('Garchomp inimigo usou Dragon Claw!');
        expect(eventText({ type: 'switch', side: 'p2', species: 'Spiritomb' }, pt).text).toBe('Cynthia enviou Spiritomb!');
        expect(eventText({ type: 'switch', side: 'p1', species: 'Pelipper' }, pt).text).toBe('Vai! Pelipper!');
    });

    it('covers effects, status, stats, items and the end', () => {
        const en = ctx('en');
        expect(eventText({ type: 'effect', kind: 'supereffective' }, en).text).toBe("It's super effective!");
        expect(eventText({ type: 'status', side: 'p2', species: 'Garchomp', status: 'brn' }, en).text).toBe("The foe's Garchomp was burned!");
        expect(eventText({ type: 'stat', side: 'p2', species: 'Garchomp', stat: 'atk', amount: 2 }, en).text).toBe("The foe's Garchomp's Attack rose sharply!");
        expect(eventText({ type: 'hp', side: 'p1', species: 'Pelipper', from: 'item: Leftovers', heal: true }, en).text).toBe('Pelipper restored HP with its Leftovers!');
        expect(eventText({ type: 'end', winner: 'Cynthia' }, en).text).toMatch(/Cynthia/);
        expect(eventText({ type: 'turn' }, en).text).toBe(null);
        expect(eventText({ type: 'hp', side: 'p1', species: 'Pelipper' }, en).text).toBe(null);
    });

    it('gives Cynthia\'s lines a speaker', () => {
        const said = eventText({ type: 'dialogue', key: 'challenge.cynthia.ace', params: { species: 'Garchomp' } }, ctx('pt'));
        expect(said.speaker).toBe('Cynthia');
        expect(said.text).toContain('Garchomp');
    });

    it('has every text key in both languages', () => {
        const keys = (node, prefix = '') => Object.entries(node).flatMap(([k, v]) => (typeof v === 'object' ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]));
        expect(keys(TRANSLATIONS.pt.challenge.text).sort()).toEqual(keys(TRANSLATIONS.en.challenge.text).sort());
    });
});
