// The mascot as an open-bot-avatar v1 definition (2026-11-11), computed from
// the rig: the outline (`headPath`) turned by the icon's 8° tilt and fitted
// into the contract's 0 0 100 100 box; the cheek barbs and the two "!" sparks
// are their own closed subpaths, so the engine gives each its own volume.
// Pure: `scripts/build-mascot-bot.mjs` writes it out, `bot.test.js` checks the
// written copy has not drifted from the rig.
import { BARBS, DEFAULT_POSE, EYE_C, HEAD_PIVOT, SPARKS, headPath } from '../../src/utils/mascot/rig.js';

export function buildBotDefinition() {
    const TILT = DEFAULT_POSE.tilt;
    const r = (n) => Math.round(n * 100) / 100;

    /** Absolute M/C/L/Z path → subpaths of [cmd, ...points]. Only what the rig emits. */
    function parse(d) {
        const subs = [];
        let cur = null;
        for (const [, cmd, args] of d.matchAll(/([MCLZ])([^MCLZ]*)/g)) {
            const n = args.trim() ? args.trim().split(/[\s,]+|(?=-)/).filter(Boolean).map(Number) : [];
            const pts = [];
            for (let i = 0; i < n.length; i += 2) pts.push([n[i], n[i + 1]]);
            if (cmd === 'M') { cur = [['M', pts[0]]]; subs.push(cur); for (const p of pts.slice(1)) cur.push(['L', p]); }
            else if (cmd === 'L') for (const p of pts) cur.push(['L', p]);
            else if (cmd === 'C') for (let i = 0; i < pts.length; i += 3) cur.push(['C', pts[i], pts[i + 1], pts[i + 2]]);
        }
        return subs;
    }

    const rad = (TILT * Math.PI) / 180;
    const turn = ([x, y]) => {
        const dx = x - HEAD_PIVOT[0], dy = y - HEAD_PIVOT[1];
        return [HEAD_PIVOT[0] + dx * Math.cos(rad) - dy * Math.sin(rad), HEAD_PIVOT[1] + dx * Math.sin(rad) + dy * Math.cos(rad)];
    };

    const sparkD = [...SPARKS.default(1).matchAll(/d="([^"]+)"/g)].map((m) => m[1]).join('');
    const subpaths = [...parse(headPath()), ...parse(BARBS), ...parse(sparkD)]
        .map((sp) => sp.map(([cmd, ...pts]) => [cmd, ...pts.map(turn)]));

    // Fit: the turned drawing's bounds (control points included) into 10..90.
    const all = subpaths.flatMap((sp) => sp.flatMap(([, ...pts]) => pts));
    const minX = Math.min(...all.map((p) => p[0])), maxX = Math.max(...all.map((p) => p[0]));
    const minY = Math.min(...all.map((p) => p[1])), maxY = Math.max(...all.map((p) => p[1]));
    const K = 80 / Math.max(maxX - minX, maxY - minY);
    const TX = 50 - ((minX + maxX) / 2) * K, TY = 50 - ((minY + maxY) / 2) * K;
    const toBox = ([x, y]) => [x * K + TX, y * K + TY];

    // Signed area of a subpath's vertices: every outline must wind like the head (nonzero fill, no holes).
    const area = (pts) => pts.reduce((a, p, i) => { const q = pts[(i + 1) % pts.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;
    const vertices = (sp) => sp.map((seg) => seg[seg.length - 1]);
    const headSign = Math.sign(area(vertices(subpaths[0])));

    const d = subpaths.map((sp) => {
        let segs = sp;
        if (Math.sign(area(vertices(sp))) !== headSign) {
            // only the barbs and sparks can need it, and they are straight lines
            const v = vertices(sp).reverse();
            segs = [['M', v[0]], ...v.slice(1).map((p) => ['L', p])];
        }
        return segs.map(([cmd, ...pts]) => cmd + pts.map(toBox).map((p) => `${r(p[0])} ${r(p[1])}`).join(' ')).join('') + 'Z';
    }).join('');

    const eyeL = toBox(turn([-EYE_C[0], EYE_C[1]])), eyeR = toBox(turn([EYE_C[0], EYE_C[1]]));
    const definition = {
        version: 1,
        id: 'pokemonbuilder-ghost',
        name: 'PokemonBuilder',
        body: { path: d },
        eyes: { x: r((eyeL[0] + eyeR[0]) / 2), y: r((eyeL[1] + eyeR[1]) / 2), spacing: r(Math.hypot(eyeR[0] - eyeL[0], eyeR[1] - eyeL[1])), scale: 1.5 },
    };

    // Rig space → the definition's box: the face is painted on the engine's face plane with this.
    const RIG_TO_BOX = `translate(${r(TX)} ${r(TY)}) scale(${Math.round(K * 100000) / 100000}) rotate(${TILT} ${HEAD_PIVOT[0]} ${HEAD_PIVOT[1]})`;
    return { definition, RIG_TO_BOX, RIG_SCALE: Math.round(K * 100000) / 100000, K, subpaths: subpaths.length };
}
