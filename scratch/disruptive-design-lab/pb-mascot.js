/**
 * pb-mascot.js — Live ES module bridge to PokemonBuilder's real 3D mascot engine
 * Re-exports the repo's exact `catalog.js`, `bot/frame.js`, and `rig.js`
 * cross-section volume renderer with zero duplicated geometry code.
 */
import {
    MOODS,
    POSES,
    resolvePose as repoResolvePose,
    sizeTraits,
    personaTone,
} from '../../src/utils/mascot/catalog.js';
import {
    botDefs,
    botInner,
    botMotion,
    botStill,
    botSvg,
    botVolume,
} from '../../src/utils/mascot/bot/frame.js';
import { TONES, clamp } from '../../src/utils/mascot/rig.js';

export {
    MOODS,
    POSES,
    TONES,
    clamp,
    sizeTraits,
    personaTone,
    botDefs,
    botInner,
    botMotion,
    botStill,
    botSvg,
    botVolume,
};

/**
 * Resolve a mood + pose preset plus optional contextual overrides
 * (`tone`, `hat`, `prop`, `fx`, `signText`, etc.).
 */
export function resolvePose(spec = {}) {
    if (!spec || typeof spec !== 'object') return repoResolvePose({});
    const { mood, pose, ...extra } = spec;
    return { ...repoResolvePose({ mood, pose }), ...extra };
}
