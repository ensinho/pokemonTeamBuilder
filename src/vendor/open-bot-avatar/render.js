/**
 * Renderers for a validated silhouette + eye placement with implied volume
 * (see volume.ts). One flat body color, two plain dark eyes; no gradients,
 * gloss, rim light or shadows. Output is built only from numbers and the
 * renderer's own markup.
 *
 * - avatarFrame: one frame flattened to plain data (paths, matrices, eyes),
 *   for any vector renderer.
 * - renderAvatarSvg: a standalone still, serialized from avatarFrame. Cross-sections of the stack that
 *   faces the viewer are projected orthographically and painted back to front.
 * - renderAvatarScene + sceneFrame: a CSS 3D scene. Every cross-section is its
 *   own small SVG placed once with a 3D transform; animating, turning and
 *   recoloring only change a few CSS transforms, and the browser's compositor
 *   does projection and occlusion. Each visible slice costs a compositor layer,
 *   so mountAvatar paints live avatars to one canvas by default and only uses
 *   the scene with `renderer: 'scene'`.
 */
import { parseHex, toHex } from './color.js';
import { computePose, hashString } from './motion.js';
import { EYE_H, EYE_W, GAZE_X, GAZE_Y, HAPPY_ARC, analyzeBody, eyeCenters, gazeRange, validateAvatar } from './validate.js';
import { buildVolume } from './volume.js';
export const DEFAULT_COLOR = '#ff6a1a';
export const DEFAULT_EYE_COLOR = '#151515';
/** `depth` option value that maps to the natural inferred volume. */
export const DEFAULT_DEPTH = 6;
const MAX_DEPTH = 14;
/**
 * Eyes sit this far above the surface so they never touch the body planes. iOS WebKit treats planes
 * closer than about a pixel as one and may draw the body over an eye (0.3 did: a band of the
 * barbell's bar through one eye), so the gap is a few pixels at the stage's size. Turned, an eye
 * drifts lift × sin(angle) from its spot: under half a unit at rest, about one at 45°.
 */
const EYE_LIFT = 1.5;
const cache = new Map();
const f = (n) => {
    const r = Math.round(n * 100) / 100;
    return (Object.is(r, -0) ? 0 : r).toString();
};
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
function depthOption(options) {
    const d = clamp(Number.isFinite(options.depth) ? options.depth : DEFAULT_DEPTH, 0, MAX_DEPTH);
    return Math.round(d * 2) / 2;
}
function prepare(definition, depth) {
    const key = JSON.stringify([definition?.id, definition?.name, definition?.body?.path, definition?.eyes, depth]);
    const hit = cache.get(key);
    if (hit)
        return hit;
    const res = validateAvatar(definition);
    if (!res.ok)
        throw new Error(`Invalid avatar definition: ${res.errors.join('; ')}`);
    const def = res.value;
    const body = analyzeBody(def.body.path);
    const vol = buildVolume(def, depth / DEFAULT_DEPTH, body);
    const id = `oba-${hashString(`${def.id}|${def.body.path}|${depth}`).toString(36)}`;
    const ids = new Map();
    for (const part of vol.parts)
        for (const s of [...part.zSlices, ...part.xSlices])
            if (!ids.has(s.d))
                ids.set(s.d, `${id}-${ids.size}`);
    const prepared = {
        def,
        vol,
        range: gazeRange(body.polys, { ...def.eyes, scale: vol.eyeScale }),
        seed: hashString(def.id),
        id,
        ids,
        detail: new Map(),
    };
    if (cache.size >= 64)
        cache.delete(cache.keys().next().value);
    cache.set(key, prepared);
    return prepared;
}
/** The validated definition and its cached volume, exactly as the renderers use them. Throws if invalid. */
export function preparedVolume(definition, depth) {
    const p = prepare(definition, depthOption({ depth }));
    return { def: p.def, vol: p.vol };
}
function poseOf(p, options) {
    const motion = options.motion === 'thinking' || options.motion === 'happy' ? options.motion : 'idle';
    return computePose({
        seed: p.seed,
        time: Number.isFinite(options.time) ? options.time : 0,
        motion,
        gaze: options.gaze,
        reducedMotion: options.reducedMotion === true,
        view: options.view,
        blend: options.motionBlend,
    });
}
function esc(s) {
    return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
const mul = (m, n) => [
    m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
];
const translate = (x, y) => [1, 0, 0, 1, x, y];
const about = (x, y, m) => mul(translate(x, y), mul(m, translate(-x, -y)));
const mat = (m) => `matrix(${m.map((v, i) => (i < 4 ? (Math.round(v * 10000) / 10000).toString() : f(v))).join(' ')})`;
export function viewBasis(yaw, pitch) {
    const cY = Math.cos(yaw), cP = Math.cos(pitch);
    return { cY, sY: Math.sin(yaw), cP, sP: Math.sin(pitch), facing: cY * cP };
}
/** Minimum facing (toward-viewer component of the surface normal) for an eye to be drawn. */
const EYE_FACING = 0.22;
/** Toward-viewer component of a model-space direction under this view (1 = straight at the viewer). */
export function facingOf(v, [x, y, z]) {
    return v.sP * y + v.cP * (-v.sY * x + v.cY * z);
}
/** Whether eye `i` is drawn: every surface normal under it must face the viewer. */
function eyeVisible(vol, v, i) {
    return vol.eyeNormals[i].every((n) => facingOf(v, n) > EYE_FACING);
}
/** Which slice stack faces the viewer more: front-facing z-planes or side-facing x-planes. */
export function activeStack(v) {
    return Math.abs(v.cY) >= Math.abs(v.sY) ? 'z' : 'x';
}
/**
 * Orthographic projection of the plane at depth z, pivoting on `pivot` at z = 0.
 * Yaw turns about the vertical axis, then pitch tips about the horizontal axis.
 */
export function planeMatrix(v, z, pivot) {
    const [cx, cy] = pivot;
    return [
        v.cY, v.sY * v.sP, 0, v.cP,
        cx - v.cY * cx + v.sY * z,
        cy - v.cP * cy - v.sY * v.sP * cx - v.cY * v.sP * z,
    ];
}
/** Projection of the side plane x = x0, whose local coordinates are (u = -z, y). */
export function sidePlaneMatrix(v, x0, pivot) {
    const [cx, cy] = pivot;
    return [-v.sY, v.cY * v.sP, 0, v.cP, cx + v.cY * (x0 - cx), cy - v.cP * cy + v.sY * v.sP * (x0 - cx)];
}
/** Project a 3D point: screen x, screen y and depth toward the viewer. */
export function projectPoint(v, [x, y, z], pivot) {
    const m = planeMatrix(v, z, pivot);
    const X = x - pivot[0], Y = y - pivot[1];
    return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5], v.sP * Y + v.cP * (-v.sY * X + v.cY * z)];
}
function rootMatrix(pose, b) {
    const bx = (b.minX + b.maxX) / 2, by = b.maxY;
    const r = (pose.roll * Math.PI) / 180;
    const rot = [Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0];
    return mul(translate(0, pose.lift), about(bx, by, mul(rot, [pose.sx, 0, 0, pose.sy, 0, 0])));
}
const pivotOf = (b) => [(b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2];
/** The hop and the share of a point's distance from the base that roll and squash can move it. */
const POSE_LIFT = 4;
const POSE_SWAY = 0.2;
/**
 * A square of viewBox units that holds the avatar at every view and pose. Throws if invalid. The
 * canvas renderer uses it only as an upper bound: it sizes each bitmap to what is actually painted.
 */
export function avatarExtent(definition, depth) {
    const { vol } = prepare(definition, depthOption({ depth }));
    const b = vol.bounds;
    const [cx, cy] = pivotOf(b);
    const radius = Math.hypot(b.maxX - b.minX, b.maxY - b.minY, Math.max(...vol.parts.map((part) => part.depth)) + 2 * EYE_LIFT) / 2;
    const half = radius + POSE_LIFT + POSE_SWAY * (radius + b.maxY - cy);
    return { x: cx - half, y: cy - half, size: 2 * half };
}
/**
 * Every cross-section a view draws, with its projection: the stack facing the
 * viewer, minus z-slices hidden behind the core (they add nothing to the
 * silhouette or the paint). Their union is the silhouette on screen.
 */
function drawnSlices(p, v, size, visit) {
    const { vol } = p;
    const stack = activeStack(v);
    const pivot = pivotOf(vol.bounds);
    const drawn = sliceCull(v);
    const kept = sliceDetail(p, stack, size);
    let k = 0;
    vol.parts.forEach((part, i) => {
        (stack === 'z' ? part.zSlices : part.xSlices).forEach((s, j) => {
            if (!kept[k++] || !drawn(s))
                return;
            visit(s, stack === 'z' ? planeMatrix(v, s.at, pivot) : sidePlaneMatrix(v, s.at, pivot), i, j);
        });
    });
}
/** Whether a slice of the active stack shows: z-slices hidden behind the core are skipped. */
function sliceCull(v) {
    // Screen shift per unit of depth, and the smallest on-screen size of an in-plane inset.
    const sweep = Math.hypot(v.sY, v.cY * v.sP);
    const inset = Math.min(Math.abs(v.cY), Math.abs(v.cP));
    return (s) => s.axis !== 'z' || s.inset <= 0 || Math.abs(s.at) * sweep > s.inset * inset;
}
function eyeStates(p, pose) {
    const s = p.vol.eyeScale;
    const w = EYE_W * s, h = EYE_H * s;
    const r = p.range;
    const dx = pose.gazeX * (pose.gazeX >= 0 ? r.right : r.left) * GAZE_X * s;
    const dy = pose.gazeY * (pose.gazeY >= 0 ? r.down : r.up) * GAZE_Y * s;
    const centers = eyeCenters(p.def.eyes);
    return [0, 1].map((i) => {
        const squint = i === 0 ? pose.squintL : pose.squintR;
        const open = Math.max(h * Math.max(0.09, (1 - pose.blink) * (1 - squint * 0.4)), w * 0.55);
        return { x: centers[i][0], y: centers[i][1], w, h, dx, dy, open, shift: (h - open) * 0.18, happy: pose.eyeShape === 'happy' };
    });
}
function happyArc(e) {
    const ex = e.x + e.dx, ey = e.y + e.dy;
    const hw = e.w * HAPPY_ARC.halfWidth, base = ey + e.h * HAPPY_ARC.base;
    return `M${f(ex - hw)} ${f(base)}Q${f(ex)} ${f(ey - e.h * HAPPY_ARC.peak)} ${f(ex + hw)} ${f(base)}`;
}
function eyeMark(e) {
    if (e.happy)
        return { shape: 'arc', d: happyArc(e), strokeWidth: e.w * HAPPY_ARC.stroke };
    const cx = e.x + e.dx, cy = e.y + e.dy + e.shift;
    return { shape: 'pill', x: cx - e.w / 2, y: cy - e.open / 2, width: e.w, height: e.open, radius: Math.min(e.w, e.open) / 2 };
}
function colors(options) {
    return {
        color: toHex(parseHex(options.color) ?? parseHex(DEFAULT_COLOR)),
        ink: toHex(parseHex(options.eyeColor) ?? parseHex(DEFAULT_EYE_COLOR)),
    };
}
/** Compute one flat frame of a definition. Throws if the definition is invalid. */
export function avatarFrame(definition, options = {}) {
    return flatFrame(definition, options, undefined);
}
/**
 * avatarFrame for a live avatar drawn `options.size` CSS pixels wide: like the scene, it skips
 * cross-sections that would sit less than a pixel apart. Internal to the live renderers, so
 * `size` never changes what avatarFrame returns to custom renderers.
 */
export function liveFrame(definition, options = {}) {
    return flatFrame(definition, options, options.size);
}
function flatFrame(definition, options, size) {
    const p = prepare(definition, depthOption(options));
    const { vol } = p;
    const b = vol.bounds;
    const { color, ink } = colors(options);
    const pose = poseOf(p, options);
    const pivot = pivotOf(b);
    const v = viewBasis(pose.yaw, pose.pitch);
    const stack = activeStack(v);
    const eyesMid = [p.def.eyes.x, p.def.eyes.y];
    // Only the cross-sections this view draws are listed; ids are stable across frames.
    const paths = new Map();
    const items = [];
    drawnSlices(p, v, size, (s, m, i, j) => {
        let path = paths.get(s.d);
        if (!path) {
            path = { id: p.ids.get(s.d), d: s.d, evenOdd: s.evenOdd, box: { ...s.box } };
            paths.set(s.d, path);
        }
        // Depth keys are taken under the eyes for the eye part, so only depth decides eye-vs-body order there.
        const [rx, ry] = i === vol.eyePart ? eyesMid : vol.parts[i].center;
        const depth = stack === 'z' ? projectPoint(v, [rx, ry, s.at], pivot)[2] : projectPoint(v, [s.at, ry, 0], pivot)[2];
        items.push({ depth, shape: { kind: 'slice', key: `${i}${stack}${j}`, path: path.id, matrix: m } });
    });
    // Painted on the surface; each eye goes once the surface under it turns away.
    eyeStates(p, pose).forEach((e, idx) => {
        if (eyeVisible(vol, v, idx)) {
            const z = vol.eyeZ[idx] + EYE_LIFT;
            items.push({
                depth: projectPoint(v, [eyesMid[0], eyesMid[1], z], pivot)[2] + 1e-6,
                shape: { kind: 'eye', key: idx === 0 ? 'eye-0' : 'eye-1', matrix: planeMatrix(v, z, pivot), mark: eyeMark(e) },
            });
        }
    });
    items.sort((a, c) => a.depth - c.depth);
    return { name: p.def.name, color, ink, paths: [...paths.values()], root: rootMatrix(pose, b), shapes: items.map((it) => it.shape) };
}
// ---------------------------------------------------------------------------
// Standalone SVG still
function eyeSvg(mark, ink) {
    if (mark.shape === 'arc') {
        return `<path d="${mark.d}" fill="none" stroke="${ink}" stroke-width="${f(mark.strokeWidth)}" stroke-linecap="round"/>`;
    }
    return `<rect x="${f(mark.x)}" y="${f(mark.y)}" width="${f(mark.width)}" height="${f(mark.height)}" rx="${f(mark.radius)}" fill="${ink}"/>`;
}
/** Render a definition to a standalone SVG string. Throws if the definition is invalid. */
export function renderAvatarSvg(definition, options = {}) {
    const frame = avatarFrame(definition, options);
    const defsMarkup = frame.paths.map((d) => `<path id="${d.id}" d="${d.d}"${d.evenOdd ? ' fill-rule="evenodd"' : ''}/>`).join('');
    const body = frame.shapes
        .map((s) => (s.kind === 'slice' ? `<use href="#${s.path}" transform="${mat(s.matrix)}"/>` : `<g transform="${mat(s.matrix)}">${eyeSvg(s.mark, frame.ink)}</g>`))
        .join('');
    const size = Number.isFinite(options.size) && options.size > 0 ? f(clamp(options.size, 8, 4096)) : null;
    const dims = size ? ` width="${size}" height="${size}"` : '';
    const label = esc(frame.name);
    return (`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"${dims} role="img" aria-label="${label}" overflow="visible">` +
        `<title>${label}</title>` +
        `<defs>${defsMarkup}</defs>` +
        `<g transform="${mat(frame.root)}" fill="${frame.color}">` +
        body +
        `</g></svg>`);
}
// ---------------------------------------------------------------------------
// Live CSS 3D scene
/** 1 viewBox unit = 1% of the scene's (square) container width. */
const u = (n) => `${f(n)}cqw`;
const FILL = 'position:absolute;left:0;top:0;width:100%;height:100%;';
function sliceMarkup(s) {
    const pad = 0.3;
    const x = s.box.x - pad, y = s.box.y - pad, w = s.box.w + 2 * pad, h = s.box.h + 2 * pad;
    const rule = s.evenOdd ? ' fill-rule="evenodd"' : '';
    const place = s.axis === 'z'
        ? `left:${u(x)};top:${u(y)};transform:translateZ(${u(s.at)})`
        : // The side plane's u = 0 line sits at x = s.at; turning it 90° about that line maps u to -z.
            `left:${u(s.at + x)};top:${u(y)};transform-origin:${u(-x)} 50%;transform:rotateY(90deg)`;
    return (`<svg viewBox="${f(x)} ${f(y)} ${f(w)} ${f(h)}" style="position:absolute;width:${u(w)};height:${u(h)};overflow:visible;${place}" aria-hidden="true">` +
        `<path d="${s.d}"${rule} fill="currentColor"/></svg>`);
}
/**
 * Static markup of the live scene for a definition and depth. Mount it once,
 * then apply `sceneFrame` every frame. Body color comes from CSS `color` on
 * an ancestor, eye ink from `--avatar-ink`.
 */
export function renderAvatarScene(definition, options = {}) {
    const p = prepare(definition, depthOption(options));
    const { vol } = p;
    const b = vol.bounds;
    const [cx, cy] = pivotOf(b);
    const ink = `var(--avatar-ink,${DEFAULT_EYE_COLOR})`;
    const stack = (axis) => `<div data-stack="${axis}" style="${FILL}transform-style:preserve-3d">` +
        vol.parts.map((part) => (axis === 'z' ? part.zSlices : part.xSlices).map(sliceMarkup).join('')).join('') +
        `</div>`;
    const eyes = eyeStates(p, poseOf(p, { reducedMotion: true })).map((e, i) => {
        const box = `left:${u(e.x - e.w / 2)};top:${u(e.y - e.h / 2)};width:${u(e.w)};height:${u(e.h)}`;
        return (`<div data-eye="${i}" style="position:absolute;${box};backface-visibility:hidden;transform:translateZ(${u(vol.eyeZ[i] + EYE_LIFT)})">` +
            `<i style="position:absolute;inset:0;border-radius:999px;background:${ink}"></i>` +
            `<svg viewBox="${f(e.x - e.w / 2)} ${f(e.y - e.h / 2)} ${f(e.w)} ${f(e.h)}" style="${FILL}overflow:visible;display:none" aria-hidden="true">` +
            `<path d="${happyArc(e)}" fill="none" stroke="${ink}" stroke-width="${f(e.w * HAPPY_ARC.stroke)}" stroke-linecap="round"/></svg>` +
            `</div>`);
    });
    return (`<div data-avatar-scene="${p.id}" style="position:relative;width:100%;height:100%;container-type:size">` +
        // will-change pins the slices' raster scale: without it every hop and squash re-rasterizes each slice.
        `<div data-motion style="${FILL}will-change:transform;transform-origin:${u((b.minX + b.maxX) / 2)} ${u(b.maxY)}">` +
        `<div data-view style="${FILL}transform-style:preserve-3d;transform-origin:${u(cx)} ${u(cy)}">` +
        stack('z') + stack('x') + eyes.join('') +
        `</div></div></div>`);
}
const r4 = (n) => Math.round(n * 10000) / 10000;
/** Closest on-screen spacing, CSS px, between cross-sections a small live avatar keeps. */
const SLICE_GAP_PX = 0.75;
/**
 * Per slice of a stack, in markup order: whether it is kept at this rendered size. Within each part,
 * slices closer than SLICE_GAP_PX to the last kept one are dropped; the outermost always stay, and
 * so does the core, which sliceCull relies on to cover the inset slices it hides.
 */
function sliceDetail(p, stack, size) {
    const px = Number.isFinite(size) && size > 0 ? Math.round(size) : 0;
    const key = `${stack}${px}`;
    let keep = p.detail.get(key);
    if (keep)
        return keep;
    const gap = px ? (SLICE_GAP_PX * 100) / px : 0;
    keep = p.vol.parts.flatMap((part) => {
        const slices = stack === 'z' ? part.zSlices : part.xSlices;
        let last = -Infinity;
        return slices.map((s, j) => {
            const core = s.axis === 'z' && s.at === 0 && s.inset === 0;
            const kept = core || j === 0 || j === slices.length - 1 || s.at - last >= gap;
            if (kept)
                last = s.at;
            return kept;
        });
    });
    if (p.detail.size >= 32)
        p.detail.clear();
    p.detail.set(key, keep);
    return keep;
}
/** Per-frame CSS for a mounted scene. Pure and cheap: no geometry is rebuilt. */
export function sceneFrame(definition, options = {}) {
    const p = prepare(definition, depthOption(options));
    const pose = poseOf(p, options);
    const v = viewBasis(pose.yaw, pose.pitch);
    const states = eyeStates(p, pose);
    const stack = activeStack(v);
    const drawn = sliceCull(v);
    const kept = sliceDetail(p, stack, options.size);
    let k = 0;
    return {
        scene: p.id,
        motion: `translate(0,${u(pose.lift)}) rotate(${f(pose.roll)}deg) scale(${r4(pose.sx)},${r4(pose.sy)})`,
        view: `rotateX(${r4(pose.pitch)}rad) rotateY(${r4(pose.yaw)}rad)`,
        stack,
        slices: p.vol.parts.flatMap((part) => (stack === 'z' ? part.zSlices : part.xSlices).map((s) => kept[k++] && drawn(s))),
        eyes: states.map((e, i) => ({
            visible: eyeVisible(p.vol, v, i),
            happy: e.happy,
            transform: `translateZ(${u(p.vol.eyeZ[i] + EYE_LIFT)}) translate(${u(e.dx)},${u(e.dy)})`,
            pill: `translateY(${u(e.shift)}) scaleY(${r4(e.open / e.h)})`,
        })),
    };
}
