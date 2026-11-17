/**
 * Pixel scenes (2026-11-17, "Fantasminha de plantão"): the dusk bot's skies,
 * "sixty four cells tall, nothing smaller, nothing blurred", drawn in this
 * app's colours — the type colours for sky and grass. They are the mascot's
 * world and nothing else: the receipt's morning, the friends' meadow at dusk.
 *
 * Pure: a scene name, a size in cells and a seed in, the pixels (RGBA) and
 * the ground's height per column out. `components/mascot/PixelScene.jsx`
 * puts them on a canvas scaled with `image-rendering: pixelated`.
 *
 * Colours here are an illustration's palette, theme-independent like a
 * sprite's (design-system skill: canon colours) — a scene keeps its own sky
 * in every theme.
 */

export const SCENE_CELLS = 64;
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

export const SCENES = {
    // the round's night: the mascot's own violet, a moon, stars
    night: {
        sky: ['#06030E', '#0E0720', '#170B33', '#241248', '#35196A', '#4A2390'],
        stars: 70,
        moon: [0.86, 0.18, 4],
        hills: [
            { base: 0.83, amp: 0.035, freq: 2.3, col: '#170C30', top: '#25144A' },
            { base: 0.9, amp: 0.02, freq: 1.4, col: '#1F1040', top: '#3A1F6B' },
        ],
    },
    // the receipt's morning: Water and Flying sky, Fairy clouds, Grass hills
    morning: {
        sky: ['#4F86EE', '#6E9DF4', '#93B8F8', '#B9CBFA', '#D9C6F6', '#F6CDE6'],
        clouds: 5,
        cloud: ['#FBF8FF', '#F6C4DF'],
        hills: [
            { base: 0.8, amp: 0.035, freq: 1.7, col: '#5FA83F', top: '#8FD15F' },
            { base: 0.9, amp: 0.025, freq: 2.8, col: '#79C44A', top: '#B6E77C' },
        ],
    },
    // the meadow at dusk: Poison and Psychic into a Fire glow
    dusk: {
        sky: ['#1A0B38', '#33186A', '#6B2C93', '#A33EA1', '#E2588F', '#FF9F78'],
        clouds: 3,
        cloud: ['#F7A6C8', '#FFC9A8'],
        sun: [0.5, 0.74, 7],
        hills: [
            { base: 0.7, amp: 0.025, freq: 2.2, col: '#2C2350', top: '#3F3470' },
            { base: 0.78, amp: 0.012, freq: 3.2, col: '#2C5A39', top: '#4E8A3D' },
        ],
    },
};

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

/** mulberry32: a seeded generator, so a scene is the same every time. */
const rng = (seed) => {
    let a = (seed >>> 0) || 1;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

/** The top of one hill layer, per column. */
const hillTops = (hill, index, W, H) => Array.from({ length: W }, (_, x) => {
    const xf = x / W;
    const phase = index * 1.7;
    const y = hill.base * H - hill.amp * H * (Math.sin(xf * hill.freq * Math.PI * 2 + phase) * 0.6 + Math.sin(xf * hill.freq * 5.1 + phase * 2) * 0.4);
    return Math.max(0, Math.min(H - 1, Math.round(y)));
});

/** The columns a scene is wide for a box of this aspect (always 64 tall). */
export const sceneWidth = (width, height) => Math.max(16, Math.min(512, Math.round(SCENE_CELLS * ((width || 1) / Math.max(1, height || 1)))));

/**
 * @returns {{ width: number, height: number, data: Uint8ClampedArray, ground: number[], stars: Array<{x:number,y:number}> }}
 *   `ground[x]` is the topmost ground cell of column x (where figures stand).
 */
export function renderScene(kind, width, seed = 1) {
    const S = SCENES[kind] || SCENES.dusk;
    const W = Math.max(16, Math.round(width));
    const H = SCENE_CELLS;
    const data = new Uint8ClampedArray(W * H * 4);
    const R = rng(seed);
    const put = (x, y, c) => {
        if (x < 0 || y < 0 || x >= W || y >= H) return;
        const i = (y * W + x) * 4;
        data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2]; data[i + 3] = 255;
    };

    // the sky: flat bands, dithered only where one meets the next, ragged edges
    const sky = S.sky.map(hex);
    const n = sky.length - 1;
    const jag = Array.from({ length: W }, () => R() - 0.5);
    for (let y = 0; y < H; y += 1) {
        for (let x = 0; x < W; x += 1) {
            const pos = (y / (H - 1)) * n + jag[x] * 0.18;
            const i = Math.max(0, Math.min(n - 1, Math.floor(pos)));
            const fr = Math.max(0, Math.min(1, ((pos - i) - 0.5) / 0.38));
            put(x, y, fr * 16 > BAYER[y & 3][x & 3] ? sky[i + 1] : sky[i]);
        }
    }

    const stars = [];
    for (let k = 0; k < (S.stars || 0); k += 1) {
        const x = Math.floor(R() * W);
        const y = Math.floor(R() * H * 0.6);
        stars.push({ x, y });
        put(x, y, hex(R() < 0.25 ? '#C9A0FF' : '#F8F4FF'));
    }
    if (S.moon) {
        const [mx, my, mr] = S.moon;
        const cx = Math.round(mx * W);
        const cy = Math.round(my * H);
        for (let y = -mr; y <= mr; y += 1) for (let x = -mr; x <= mr; x += 1) {
            if (x * x + y * y <= mr * mr + 1) put(cx + x, cy + y, hex((x + 1) ** 2 + (y - 1) ** 2 <= 2 ? '#D9CFF5' : '#F8F4FF'));
        }
    }
    if (S.sun) {
        const [sx, sy, sr] = S.sun;
        const cx = Math.round(sx * W);
        const cy = Math.round(sy * H);
        for (let y = -sr; y <= sr; y += 1) for (let x = -sr; x <= sr; x += 1) {
            if (x * x + y * y <= sr * sr + 1 && !(y > 0 && y % 3 === 0)) put(cx + x, cy + y, hex(y < 0 ? '#FFE3A3' : '#FFC27A'));
        }
    }
    for (let k = 0; k < (S.clouds || 0); k += 1) {
        const cx = Math.floor(R() * W);
        const cy = Math.floor(H * (0.1 + R() * 0.3));
        const w = 6 + Math.floor(R() * 8);
        [[Math.floor(w * 0.35), 0], [Math.floor(w * 0.7), 1], [w, 2], [w, 3]].forEach(([rw, ry]) => {
            for (let x = -rw; x <= rw; x += 1) put(cx + x, cy + ry, hex(ry === 3 ? S.cloud[1] : S.cloud[0]));
        });
    }

    // the ground, back to front; figures stand on the topmost
    const ground = new Array(W).fill(H - 1);
    (S.hills || []).forEach((hill, index) => {
        const tops = hillTops(hill, index, W, H);
        const col = hex(hill.col);
        const top = hex(hill.top);
        for (let x = 0; x < W; x += 1) {
            for (let y = tops[x]; y < H; y += 1) put(x, y, y === tops[x] ? top : col);
            if (R() < 0.12) put(x, tops[x] - 1, top);
            ground[x] = Math.min(ground[x], tops[x]);
        }
    });

    return { width: W, height: H, data, ground, stars };
}

/** Where a figure at `xf` (0–1 across) stands, as a fraction of the height. */
export const groundAt = (scene, xf) => {
    if (!scene?.ground?.length) return 0.8;
    const x = Math.max(0, Math.min(scene.width - 1, Math.round(xf * (scene.width - 1))));
    return scene.ground[x] / scene.height;
};
