// Bundles the live mascot (rig + motion + catalog) into one browser script for
// a video composition, so a reel draws the same ghost the app does, frame by
// frame, instead of a screenshot of him.
//
//   node scripts/social/mascot-bundle.mjs <composition>/assets/mascot.js
//
// The script defines `window.PBMascot`:
//   svg(pose, view?)            → an <svg> string (dark-theme tokens inlined)
//   frame({ mood, pose, seq, t, extra })  → the pose for a moment: catalog
//                                 names + a motion sequence at `t` ms
//   MOODS, POSES, SEQ, VIEWS, merge, evalSeq
// Everything is pure: the same `t` always draws the same frame, which is what
// a renderer that seeks needs. See docs/modules/social_media.md.
import { build } from 'esbuild';
import path from 'node:path';

const out = process.argv[2];
if (!out) {
    console.error('usage: node scripts/social/mascot-bundle.mjs <out.js>');
    process.exit(1);
}

// The dark palette (index.css brand layer) as plain values: a video has no theme.
const TOKENS = [
    '--m-line:#B860F8', '--m-fill:#200048', '--m-bg:#200048', '--m-eye:#F8F4FF', '--m-fang:#F8F4FF',
    '--m-fang-edge:transparent', '--m-mouth:#B860F8', '--m-blush:#B860F8', '--m-glint:#FFFFFF',
    '--m-heart:#F95587', '--m-tear:#B4CBF8', '--m-anger:#DA8683', '--m-gold:#FFD23F', '--m-gold-ink:#8D6E29',
    '--m-live:#FF3D9A', '--m-shadow:rgba(0,0,0,.35)', '--m-smoke:#9C8FB8', '--m-hat:#3A1A6E',
    '--m-shade:#1B0A3D', '--m-orb:#3F1A7A', '--m-sil:#FFFFFF', '--m-cape:#3A1A6E', '--m-ledge:#2A1060',
    '--m-tongue:#FCA9C9', '--m-tone-mix:#F4F1FA', '--mascot-shiny:#5CC8FF',
].join(';');

const root = path.resolve('src/utils/mascot');
const entry = `
import { mascotInner, VIEWS } from '${root}/rig.js';
import { merge, evalSeq, SEQ } from '${root}/motion.js';
import { MOODS, POSES, resolvePose } from '${root}/catalog.js';

const TOKENS = ${JSON.stringify(TOKENS)};
function frame({ mood, pose, seq, t = 0, idle = true, extra } = {}) {
    return merge(resolvePose({ mood, pose }), idle ? evalSeq('idle', t) : null, seq ? evalSeq(seq, t) : null, extra, { t });
}
function svg(pose, view = VIEWS.wide) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + view + '" style="display:block;width:100%;height:100%;overflow:visible;' + TOKENS + '">' + mascotInner(pose) + '</svg>';
}
window.PBMascot = { svg, frame, merge, evalSeq, SEQ, MOODS, POSES, VIEWS };
`;

await build({
    stdin: { contents: entry, resolveDir: process.cwd(), loader: 'js' },
    bundle: true,
    format: 'iife',
    minify: true,
    target: 'es2020',
    outfile: out,
    logLevel: 'warning',
});
console.log('mascot bundle →', out);
