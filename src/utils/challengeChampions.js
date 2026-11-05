/**
 * The champions of the Champion Challenge, as the client knows them — ids and
 * names only, so any chunk may import this (the forum card, the Home). Mirrors
 * `CHAMPIONS` in `api/_lib/challenge/constants.js`; their sets stay there.
 * The art is `CHAMPION_ART` in `challengeArt.js`, inside the route's chunk.
 */
export const CHAMPION_IDS = ['cynthia', 'blue'];
export const DEFAULT_CHAMPION = 'cynthia';
export const CHAMPION_NAMES = { cynthia: 'Cynthia', blue: 'Blue' };

export const isChampion = (id) => CHAMPION_IDS.includes(id);

/**
 * The day's difficulty under a champion's own names: Cynthia's are her games
 * (`challenge.difficulty.*`), another champion's live under
 * `challenge.champions.{id}.difficulty.*`. The keys are shared (rotation.js).
 */
export const difficultyLabel = (t, championId, key) => {
    if (!key) return null;
    return !championId || championId === DEFAULT_CHAMPION
        ? t(`challenge.difficulty.${key}`)
        : t(`challenge.champions.${championId}.difficulty.${key}`);
};
