import { openTrainerCard } from '../../../store/useTrainerCardStore';

/**
 * A season row (the Week board, last week's recap) has no single attempt to
 * open: it is the trainer, so it opens their card — when they have a public
 * profile (the row carries a uid only then).
 */
export const openWeekCard = (entry) => {
    if (!entry?.uid) return;
    openTrainerCard({
        userId: entry.uid,
        name: entry.name,
        avatar: entry.profile?.avatarPokemonId,
        isShiny: entry.profile?.avatarIsShiny,
        trainerSprite: entry.profile?.trainerSprite,
        frameId: entry.profile?.frameId,
        titleId: entry.profile?.titleId,
    });
};
