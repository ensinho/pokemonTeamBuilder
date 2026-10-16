import { PRNG } from '@pkmn/sim';

import { hashSeed } from '../challenge/seed.js';

export { hashSeed };

/**
 * The AI's dice. Seeded from the battle seed plus a tag, never taken from the
 * battle's own PRNG (invariant I2): a roll here must not shift the damage rolls
 * of the real battle, or the replay — which never calls the AI (I4) — would
 * diverge from what the player saw.
 */
export const rngFor = (seed, ...tags) => new PRNG(hashSeed(seed, ...tags));
