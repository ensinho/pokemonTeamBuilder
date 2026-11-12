/**
 * The bot (2026-11-11): the mascot with a body. Enzo, after seeing
 * open-bot-avatar: "quero ELE EXATO, só que em formato de mascote roxinho
 * animado". The outline is the rig's own (`definition.js`, generated); the
 * volume, the idle life, the moods' body language and the look come from the
 * open-bot-avatar engine (`src/vendor/open-bot-avatar`, MIT); the face, the
 * paws, the props, the hats and the effects are the rig's pieces
 * (`mascotPieces`), painted on the body's face plane — so every mood and
 * every pose of the line mascot is also a mood and a pose of the bot.
 *
 * Pure: a pose and a clock in, markup out (no DOM), like the rig. Drawn in
 * RIG space, so the stage, the zones and the views of the line mascot apply
 * unchanged; the engine's 0 0 100 100 box sits inside `BOX_TO_RIG`.
 *
 * How the body is painted: every cross-section of the volume, back to front,
 * in one of eleven shades (`.bs0`…`.bs10`, mascot.css). The back walls are a
 * deeper violet, the widest section (the silhouette) the icon's violet and
 * the sections toward the front fade into the icon's dark tile — so straight
 * on it IS the icon (a violet line around a dark face), and turned, the line
 * becomes the side of a solid.
 */
import { preparedVolume, viewBasis, activeStack, planeMatrix, sidePlaneMatrix, projectPoint } from '../../../vendor/open-bot-avatar/render.js';
import { computePose, hashString } from '../../../vendor/open-bot-avatar/motion.js';
import { HEAD_PIVOT, FOOT, mascotPieces, f, clamp } from '../rig.js';
import { BOT_DEFINITION, RIG_TO_BOX, RIG_SCALE } from './definition.js';

/** The engine's volume amount (0 flat … 14): 4 keeps the icon's line about as thick as it is drawn. */
export const BOT_DEPTH = 4;
/** Parts of the definition, in subpath order (build-mascot-bot.mjs): the head, two barbs, two sparks. */
const SPARK_PARTS = new Set([3, 4]);
/** The face plane sits this far above the front surface, like the engine's eyes. */
const FACE_LIFT = 1.5;
/** How far the eyes travel for a full look, rig units; the mouth and blush follow by PARALLAX. */
const GAZE_X = 18, GAZE_Y = 12, PARALLAX = 0.35;
/** The face is drawn while the front faces the viewer at least this much (fades over FACE_FADE). */
const FACE_MIN = 0.2, FACE_FADE = 0.2;
const SHADES = 10;
/** Eyes that are open shapes blink with the engine; arcs and lines are already lids (scaling them only fades them). */
const BLINKS = new Set(['open', 'wide', 'dot', 'moon', 'angry', 'half', 'teary', 'heart', 'star', 'starGold']);
/** The engine rolls the body for a mood on its own; the rig's mood tilt adds this share on top. */
const TILT_SHARE = 0.5;
/** The icon's line, box units (its 27.75 rig-unit stroke): the bevel stays violet this far in, then fades to the face. */
const LINE = 27.75 * RIG_SCALE * 0.75, LINE_FADE = 1.6;

const TILT = Number(/rotate\(([-\d.]+)/.exec(RIG_TO_BOX)[1]);
const BOX_TO_RIG = (() => {
    const [, tx, ty] = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(RIG_TO_BOX).map(Number);
    return `rotate(${-TILT} ${HEAD_PIVOT[0]} ${HEAD_PIVOT[1]}) scale(${1 / RIG_SCALE}) translate(${-tx} ${-ty})`;
})();
/** The rig's pieces on a box-space plane: the rig → box map; untilted pieces (paws, props) cancel the icon's tilt. */
const ON_PLANE = RIG_TO_BOX;
const ON_PLANE_FLAT = `${RIG_TO_BOX} rotate(${-TILT} ${HEAD_PIVOT[0]} ${HEAD_PIVOT[1]})`;

const r4 = (n) => Math.round(n * 10000) / 10000;
const mat = (m) => `matrix(${m.map((v, i) => (i < 4 ? r4(v) : f(v * 10) / 10)).join(' ')})`;
const mul = (m, n) => [
    m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
];

/* ---------- the volume, once ---------- */
let prepared = null;
/** The volume and a stable id per cross-section (`p{part}{axis}{index}`). ~100 ms the first time; cached. */
export function botVolume() {
    if (prepared) return prepared;
    const { def, vol } = preparedVolume(BOT_DEFINITION, BOT_DEPTH);
    const b = vol.bounds;
    const slices = [];
    vol.parts.forEach((part, i) => {
        for (const axis of ['z', 'x']) {
            (axis === 'z' ? part.zSlices : part.xSlices).forEach((s, j) => slices.push({ id: `p${i}${axis}${j}`, part: i, axis, index: j, s }));
        }
    });
    prepared = {
        def, vol, slices,
        seed: hashString(def.id),
        pivot: [(b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2],
        base: [(b.minX + b.maxX) / 2, b.maxY],
        faceZ: Math.max(...vol.eyeZ) + FACE_LIFT,
    };
    return prepared;
}

/** Every cross-section as a `<path id>`, for a `<defs>` written once per bot (ids prefixed by `uid`). */
export function botDefs(uid) {
    return botVolume().slices.map(({ id, s }) => `<path id="${uid}${id}" d="${s.d}"${s.evenOdd ? ' fill-rule="evenodd"' : ''}/>`).join('');
}

/* ---------- moods → the engine's body language ---------- */
const HAPPY = new Set(['animado', 'empolgado', 'radiante', 'rindo', 'apaixonado', 'brilhando', 'orgulhoso', 'piscadinha', 'comemorando', 'campeao', 'pulando']);
const THINKING = new Set(['pensando', 'confuso', 'concentrado', 'desconfiado', 'curioso', 'perdido', 'matutando', 'pataNoQueixo', 'lendoPokedex', 'investigando', 'analisando']);
/** The engine's motion for a mood and a pose: a hop for joy, the tilted look-up for thinking, idle otherwise. */
export function botMotion(mood, pose) {
    if (HAPPY.has(mood) || HAPPY.has(pose)) return 'happy';
    if (THINKING.has(mood) || THINKING.has(pose)) return 'thinking';
    return 'idle';
}

/* ---------- the frame ---------- */
/**
 * Which cross-sections a view draws (the engine's own culling): the stack that
 * faces the viewer, minus z-sections hidden behind the core, minus sections
 * that would sit closer than ~0.75 px apart at this size (`pxPerUnit`, CSS px
 * per box unit).
 */
function drawn(P, v, pxPerUnit) {
    const stack = activeStack(v);
    const sweep = Math.hypot(v.sY, v.cY * v.sP), inset = Math.min(Math.abs(v.cY), Math.abs(v.cP));
    const gap = pxPerUnit > 0 ? 0.75 / pxPerUnit : 0;
    const out = [];
    let last = -Infinity, part = -1, count = 0;
    const list = P.slices.filter((x) => x.axis === stack);
    list.forEach((x, k) => {
        if (x.part !== part) { part = x.part; last = -Infinity; count = list.filter((y) => y.part === part).length; }
        const core = x.s.axis === 'z' && x.s.at === 0 && x.s.inset === 0;
        const kept = core || x.index === 0 || x.index === count - 1 || x.s.at - last >= gap;
        if (kept) last = x.s.at;
        // in flat colour the engine drops every inset section that stays inside the core's outline;
        // shaded, the front ones ARE the face (the bevel and the dark plateau), so only the back ones go
        const hidden = x.s.axis === 'z' && x.s.at < 0 && x.s.inset > 0 && !(Math.abs(x.s.at) * sweep > x.s.inset * inset);
        if (kept && !hidden) out.push(x);
        void k;
    });
    return { stack, list: out };
}

/** Shade 0 (the far wall) … 10 (the front face) of a cross-section. */
function shadeOf(P, x, depthRank, lineK = 1) {
    const part = P.vol.parts[x.part];
    if (x.axis === 'z') {
        const half = SHADES / 2;
        if (x.s.at < 0 || x.part !== 0) return Math.round((1 + clamp(x.s.at / (part.depth / 2 || 1), -1, 0)) * half);
        // toward the front: the bevel's outer band is the icon's line, then the dark face
        return half + Math.round(clamp((x.s.inset - LINE * lineK) / LINE_FADE, 0, 1) * half);
    }
    // seen from the side: the far wall dark, the near one the line's violet
    return Math.round(depthRank * (SHADES / 2));
}

/**
 * One frame of the bot, as markup in rig space (no <svg> wrapper). `pose` is
 * a rig pose (merged layers: mood, pose, reactions, the stage's position);
 * `life` is the engine's input: `time` (s), `motion`, `gaze`, `motionBlend`,
 * `view`, `reducedMotion`. `uid` prefixes the ids of `botDefs(uid)`, which
 * must already be in the document (`standalone` inlines the ones it uses).
 */
export function botInner(pose, { time = 0, motion = 'idle', gaze, motionBlend, view, reducedMotion = false, uid = 'mb-', pxPerUnit = 0, standalone = false } = {}) {
    const P = botVolume();
    const pieces = mascotPieces(pose);
    const { p } = pieces;
    const e = computePose({ seed: P.seed, time, motion, gaze, reducedMotion, view, blend: motionBlend });
    const v = viewBasis(e.yaw, e.pitch);
    const { stack, list } = drawn(P, v, pxPerUnit);

    // back to front; each part's sections ranked by depth for the side shading
    const items = list.map((x) => {
        const part = P.vol.parts[x.part];
        const m = x.axis === 'z' ? planeMatrix(v, x.s.at, P.pivot) : sidePlaneMatrix(v, x.s.at, P.pivot);
        const [rx, ry] = x.part === P.vol.eyePart ? [P.def.eyes.x, P.def.eyes.y] : part.center;
        const depth = x.axis === 'z' ? projectPoint(v, [rx, ry, x.s.at], P.pivot)[2] : projectPoint(v, [x.s.at, ry, 0], P.pivot)[2];
        return { x, m, depth };
    }).sort((a, b) => a.depth - b.depth);
    const ranks = new Map();
    if (stack === 'x') {
        for (const part of new Set(items.map((it) => it.x.part))) {
            const mine = items.filter((it) => it.x.part === part);
            mine.forEach((it, i) => ranks.set(it, mine.length > 1 ? i / (mine.length - 1) : 1));
        }
    }
    const showSparks = p.sparks !== 'none' && p.sparkO > 0.05;
    let slices = '', outline = '';
    for (const it of items) {
        if (SPARK_PARTS.has(it.x.part) && !showSparks) continue;
        const use = `<use href="#${uid}${it.x.id}" transform="${mat(it.m)}"`;
        slices += `${use} class="bs${shadeOf(P, it.x, ranks.get(it) ?? 1, Math.min(p.strokeK, 2.2))}"/>`;
        // the head's silhouette on screen: the union of its sections, which the face never leaves
        if (it.x.part === 0) outline += `${use}/>`;
    }

    // the face plane, and how much the front faces the viewer
    const plane = mat(planeMatrix(v, P.faceZ, P.pivot));
    const facing = v.cY * v.cP;
    const faceO = clamp((facing - FACE_MIN) / FACE_FADE, 0, 1);
    const eyeNames = typeof p.eyes === 'string' ? [p.eyes] : [p.eyes.l, p.eyes.r];
    const open = eyeNames.some((n) => BLINKS.has(n)) ? Math.max(0.08, (1 - e.blink) * (1 - ((e.squintL + e.squintR) / 2) * 0.4)) : 1;
    const gx = e.gazeX * GAZE_X, gy = e.gazeY * GAZE_Y;
    const eyesT = `translate(${f(gx)} ${f(gy)}) translate(0 30) scale(1 ${r4(open)}) translate(0 -30)`;
    const face = faceO > 0 && stack === 'z'
        ? `<clipPath id="${uid}clip">${outline}</clipPath>`
            + `<g clip-path="url(#${uid}clip)" opacity="${r4(faceO)}" class="bot-face"><g transform="${plane}"><g transform="${ON_PLANE}">`
            + `<g transform="translate(${f(p.faceX + gx * PARALLAX)} ${f(p.faceY + gy * PARALLAX)})">${pieces.blush}${pieces.mouth}</g>`
            + `<g transform="translate(${f(p.faceX)} ${f(p.faceY)})"><g transform="${eyesT}">${pieces.eyes}</g></g>`
            + '</g></g></g>'
        : '';
    // what the mascot wears and holds rides the same plane, unclipped
    const dress = `<g transform="${plane}"><g transform="${ON_PLANE}">${pieces.hat}${pieces.fxHead}</g><g transform="${ON_PLANE_FLAT}">${pieces.paws}${pieces.prop}</g></g>`;

    // the engine's hop, roll and squash, about the base of the body
    const rr = (e.roll * Math.PI) / 180;
    const [bx, by] = P.base;
    const root = mul([1, 0, 0, 1, 0, e.lift], mul([1, 0, 0, 1, bx, by], mul(mul([Math.cos(rr), Math.sin(rr), -Math.sin(rr), Math.cos(rr), 0, 0], [e.sx, 0, 0, e.sy, 0, 0]), [1, 0, 0, 1, -bx, -by])));

    // the line mascot's own transforms, in rig space (mascotInner's, minus the icon's tilt that the body already has)
    const bodyT = `translate(0 ${FOOT}) scale(${r4(p.sx)} ${r4(p.sy)}) translate(0 ${-FOOT})`;
    const toneAttr = pieces.tone ? ` style="${pieces.tone}"` : '';
    const air = clamp(1 + (p.y + e.lift / RIG_SCALE) / 600, 0.45, 1.1);
    const defs = standalone ? `<defs>${items.map((it) => it.x.id).filter((id, i, a) => a.indexOf(id) === i).map((id) => {
        const s = P.slices.find((x) => x.id === id).s;
        return `<path id="${uid}${id}" d="${s.d}"${s.evenOdd ? ' fill-rule="evenodd"' : ''}/>`;
    }).join('')}</defs>` : '';
    return defs
        + `<ellipse class="bot-shadow" cx="${f(p.x)}" cy="${FOOT + 40}" rx="${f(220 * p.scale * air)}" ry="${f(28 * p.scale * air)}" opacity="${r4(p.opacity)}"/>`
        + `<g class="m-root bot-root" transform="translate(${f(p.x)} ${f(p.y)}) rotate(${f(p.rot)}) scale(${r4(p.scale)})" opacity="${r4(p.opacity)}"${toneAttr}>`
        + `<g transform="${bodyT}">`
        + pieces.behind
        + `<g transform="rotate(${f((p.tilt - TILT) * TILT_SHARE)} ${HEAD_PIVOT[0]} ${HEAD_PIVOT[1]})"><g transform="${BOX_TO_RIG}"><g transform="${mat(root)}">`
        + slices + face + dress
        + '</g></g></g>'
        + '</g>'
        + pieces.fx
        + '</g>';
}

/**
 * The bot at rest, one frame with its own sections — a face that only shows
 * itself (a sticker, a loader's scene, a modal's figure). `px` (CSS width) and
 * `view` drop the sections closer than a pixel apart; the line thickens at
 * small sizes like the line mascot's stroke (`sizeTraits` → strokeK).
 */
export function botStill(pose, { uid = 'mb-', px = 120, view = '-480 -520 960 960' } = {}) {
    const w = Number(String(view).split(/\s+/)[2]) || 960;
    return botInner(pose, { reducedMotion: true, standalone: true, uid, pxPerUnit: (px / w) / RIG_SCALE });
}

/** A complete standalone <svg> of the bot (tests, the export script). */
export function botSvg(pose, life = {}, { view = '-520 -560 1040 1040', width, height } = {}) {
    const size = `${width ? ` width="${width}"` : ''}${height ? ` height="${height}"` : ''}`;
    return `<svg xmlns="http://www.w3.org/2000/svg" class="mascot-svg mascot-bot__svg" viewBox="${view}"${size} aria-hidden="true">${botInner(pose, { ...life, standalone: true })}</svg>`;
}
