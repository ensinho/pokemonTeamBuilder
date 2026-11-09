/**
 * The PokéPuzzle result image's geometry (2026-11-09). Pure: where the grid
 * goes for any number of guesses and any name length, so 8 guesses of a
 * 12-letter name never run into the footer (the old card's bug). The canvas
 * is a 4:5 post (1080 × 1350), drawn by components/pokepuzzle/drawPuzzleShare.js.
 */
export const SHARE_SIZE = { width: 1080, height: 1350 };

const GRID_TOP = 560;
const GRID_BOTTOM = 1090;
const GRID_SIDE = 90;
const MAX_TILE = 84;

export function puzzleGridLayout(rows, cols) {
    const r = Math.max(1, rows);
    const c = Math.max(1, cols);
    const width = SHARE_SIZE.width - GRID_SIDE * 2;
    const height = GRID_BOTTOM - GRID_TOP;
    // gap is a fifth of a tile; solve tile from both limits.
    const byWidth = width / (c + (c - 1) * 0.2);
    const byHeight = height / (r + (r - 1) * 0.2);
    const tile = Math.floor(Math.min(MAX_TILE, byWidth, byHeight));
    const gap = Math.round(tile * 0.2);
    const gridW = c * tile + (c - 1) * gap;
    const gridH = r * tile + (r - 1) * gap;
    return {
        tile,
        gap,
        x: Math.round((SHARE_SIZE.width - gridW) / 2),
        y: Math.round(GRID_TOP + (height - gridH) / 2),
        width: gridW,
        height: gridH,
    };
}
