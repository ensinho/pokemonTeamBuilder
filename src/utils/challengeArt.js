import cynthiaSheetUrl from '../assets/challenge/cynthia-overworld.png';
import protagonistSheetUrl from '../assets/challenge/protagonist-overworld.png';

/**
 * Overworld art for the Champion Challenge's room: two 4 × 4 RPG-Maker sheets
 * (rows down/left/right/up, four walking frames each), drawn as CSS sprites at
 * half their file size — so both characters come out at Black & White's
 * overworld scale, about 22 × 30 DS px.
 *
 * - **Cynthia**: fan sprite sheet by zedubstep (DeviantArt), supplied by Enzo
 *   on 2026-10-15. Drawn 2× (every DS pixel a 2 × 2 block); one cell is
 *   34 × 36 DS px, the cell both characters share.
 * - **The protagonist**: Hilbert's BW overworld sheet, supplied by Enzo on
 *   2026-10-16 (`protagonist-overworld.png`, 64 px cells). One cell is
 *   32 × 32 DS px, set inside the shared cell by `offset` so his feet stand
 *   where Cynthia's do; the sheet has no ground shadow, so the room draws one.
 *
 * Credited in docs/modules/daily_challenge.md. The Pokémon and Cynthia's battle
 * sprite are Showdown's, as everywhere else in the app.
 */

/** One overworld cell, in DS pixels — both characters share it. */
export const ACTOR_CELL = { width: 34, height: 36 };

/** Columns 0 and 2 are both "standing"; 1 and 3 are the two steps. */
const FRAMES = { stand: 0, stepA: 1, stepB: 3 };
const ROWS = { down: 0, left: 1, right: 2, up: 3 };

export const CYNTHIA_SHEET = {
    url: cynthiaSheetUrl,
    /** The whole sheet in DS pixels (the file is twice this). */
    width: 136,
    height: 144,
    cell: ACTOR_CELL,
    offset: { x: 0, y: 0 },
    row: ROWS,
    col: FRAMES,
};

export const PLAYER_SHEET = {
    url: protagonistSheetUrl,
    /** The whole sheet in DS pixels (the file is 256 × 256). */
    width: 128,
    height: 128,
    cell: { width: 32, height: 32 },
    /** Where his cell sits in the shared one: centred, feet on Cynthia's line. */
    offset: { x: 1, y: 4 },
    row: ROWS,
    col: FRAMES,
};

/** The inline style that shows one frame of a sheet (`.ds-sheet`). */
export const sheetStyle = (sheet, facing = 'down', frame = 'stand') => ({
    backgroundImage: `url(${sheet.url})`,
    '--sheet-w': sheet.width,
    '--sheet-h': sheet.height,
    '--cell-w': sheet.cell.width,
    '--cell-h': sheet.cell.height,
    '--cell-x': sheet.offset.x,
    '--cell-y': sheet.offset.y,
    '--sheet-col': sheet.col[frame] ?? sheet.col.stand,
    '--sheet-row': sheet.row[facing] ?? sheet.row.down,
});
