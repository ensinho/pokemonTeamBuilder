import { useMemo } from 'react';

import { getPokemonFrontSpriteUrl } from '../utils/pokemonSprites';
import { trainerSpriteUrl } from '../utils/challengeView';
import { useTrainerCosmetics } from './useTrainerCosmetics';
import { useTranslation } from './useTranslation';

/**
 * The portrait a trainer's avatar gives the VS card: their trainer sprite, or
 * their partner Pokémon, or — with neither — `fallback` (a Showdown trainer id).
 */
export const versusPortrait = (avatar, fallback = 'hilbert') => {
    if (avatar?.trainerSprite) return { src: trainerSpriteUrl(avatar.trainerSprite), kind: 'trainer' };
    if (avatar?.pokemonId) return { src: getPokemonFrontSpriteUrl(avatar.pokemonId, { shiny: Boolean(avatar.isShiny) }), kind: 'pokemon' };
    return { src: trainerSpriteUrl(fallback), kind: 'trainer' };
};

const NO_BADGES = [];

/**
 * One side of the VS card (`DsVersus`) for a trainer: their avatar, the title
 * and level they wear now (`useTrainerCosmetics` — yours live, anyone else's
 * from their public profile), plus whatever `badges` the screen adds.
 *
 * @param {string|null} uid
 * @param {{name: string, tag?: string, avatar?: object, badges?: Array, fallback?: string}} input
 */
export function useVersusSide(uid, { name, tag, avatar, badges = NO_BADGES, fallback }) {
    const { t } = useTranslation();
    const { titleId, level } = useTrainerCosmetics(uid);
    return useMemo(() => ({
        name,
        tag,
        portrait: versusPortrait(avatar, fallback),
        subtitle: titleId ? t(`rewards.items.${titleId}.name`) : null,
        badges: [
            ...(level ? [{ value: level, label: t('battle.stage.level', { level }) }] : []),
            ...badges,
        ],
    }), [name, tag, avatar, fallback, titleId, level, badges, t]);
}
