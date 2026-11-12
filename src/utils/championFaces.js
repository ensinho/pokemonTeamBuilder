import blueBattleUrl from '../assets/challenge/blue-battle.png';
import { trainerSpriteUrl } from './challengeView';

/**
 * Each champion's battle sprite as the Home draws them (2026-11-12): Cynthia's
 * is Showdown's, Blue's the HGSS pose (challengeArt.js credits both). Kept
 * apart from challengeArt.js so the Home never pulls the room's sheets.
 */
export const CHAMPION_FACES = {
    cynthia: trainerSpriteUrl('cynthia-gen4'),
    blue: blueBattleUrl,
};
