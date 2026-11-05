/**
 * The Champion's room: 16 × 12 tiles of 16 DS pixels — exactly one DS screen
 * (256 × 192). Pure data and grid maths, tested without a browser.
 *
 * The player walks from the doorway, across the Poké Ball ring, to the tile in
 * front of a Champion — Cynthia on the left, Blue on the right, either side of
 * the door; stepping onto it (or pressing A while facing them) starts the
 * encounter with that Champion. Which letter is who is `champions`.
 */

export const TILE = 16;

export const CHAMPION_ROOM = {
    width: 16,
    height: 12,
    rows: [
        '################',
        '#LLBBBBBBBBBBLL#',
        '#...C......U...#',
        '#L............L#',
        '#..............#',
        '#L............L#',
        '#..............#',
        '#L............L#',
        '#..............#',
        '#L............L#',
        '#......S.......#',
        '#######..#######',
    ],
    legend: { '#': 'wall', L: 'lamp', B: 'banner', C: 'champion', U: 'champion', S: 'spawn', '.': 'floor' },
    /** Map letter → champion id (`challengeChampions.js`). */
    champions: { C: 'cynthia', U: 'blue' },
};

const SOLID = new Set(['#', 'L', 'B']);

export const DIRECTIONS = {
    up: { dx: 0, dy: -1 },
    down: { dx: 0, dy: 1 },
    left: { dx: -1, dy: 0 },
    right: { dx: 1, dy: 0 },
};

const cellAt = (map, x, y) => (y >= 0 && y < map.height && x >= 0 && x < map.width ? map.rows[y][x] : '#');

export const isSolid = (map, x, y) => {
    const cell = cellAt(map, x, y);
    return SOLID.has(cell) || Boolean(map.champions?.[cell]);
};

const find = (map, char) => {
    for (let y = 0; y < map.height; y += 1) {
        const x = map.rows[y].indexOf(char);
        if (x !== -1) return { x, y };
    }
    return null;
};

export const spawnTile = (map) => find(map, 'S');

/** Every Champion standing in the room, left to right: `[{id, x, y}]`. */
export const championTiles = (map) => Object.entries(map.champions || {})
    .map(([letter, id]) => ({ id, ...find(map, letter) }))
    .filter((tile) => Number.isInteger(tile.x))
    .sort((a, b) => a.x - b.x);

/** Where one Champion stands (the first in the room without an id). */
export const championTile = (map, id) => championTiles(map).find((tile) => !id || tile.id === id) || championTiles(map)[0];

/** The tile right in front of a Champion, where the encounter starts. */
export const encounterTile = (map, id) => {
    const champion = championTile(map, id);
    return { x: champion.x, y: champion.y + 1 };
};

/** Whose encounter tile `pos` is, or null. */
export const encounterAt = (map, pos) => championTiles(map).find((c) => pos.x === c.x && pos.y === c.y + 1)?.id || null;

export const isEncounter = (map, pos) => Boolean(encounterAt(map, pos));

/** One step. A blocked step turns the walker without moving them. */
export const stepTo = (map, pos, dir) => {
    const { dx, dy } = DIRECTIONS[dir];
    const next = { x: pos.x + dx, y: pos.y + dy };
    if (isSolid(map, next.x, next.y)) return { pos, facing: dir, bumped: true };
    return { pos: next, facing: dir, bumped: false };
};

/** The Champion the walker stands before and looks at, or null. */
export const facesChampion = (map, pos, facing) => (facing === 'up' ? encounterAt(map, pos) : null);

/**
 * The direction someone at `from` looks to face `to`: along the longer axis,
 * vertical on a tie (so Cynthia watches the player cross the room and faces
 * down when they stand in front of her).
 */
export const faceToward = (from, to) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    if (!dx && !dy) return 'down';
    if (Math.abs(dy) >= Math.abs(dx)) return dy > 0 ? 'down' : 'up';
    return dx > 0 ? 'right' : 'left';
};

/**
 * Shortest walk (4-neighbour BFS) from `from` to `to`, as a list of
 * directions. Tapping a solid tile walks to the nearest free tile beside it;
 * tapping a Champion walks to their encounter tile. `null` if unreachable.
 */
export const findPath = (map, from, to) => {
    let goal = to;
    const tapped = map.champions?.[cellAt(map, to.x, to.y)];
    if (tapped) goal = encounterTile(map, tapped);
    else if (isSolid(map, to.x, to.y)) {
        const around = Object.values(DIRECTIONS)
            .map(({ dx, dy }) => ({ x: to.x + dx, y: to.y + dy }))
            .filter((p) => !isSolid(map, p.x, p.y));
        if (!around.length) return null;
        goal = around.sort((a, b) => (Math.abs(a.x - from.x) + Math.abs(a.y - from.y)) - (Math.abs(b.x - from.x) + Math.abs(b.y - from.y)))[0];
    }
    if (from.x === goal.x && from.y === goal.y) return [];

    const key = (p) => `${p.x},${p.y}`;
    const previous = new Map([[key(from), null]]);
    const queue = [from];
    while (queue.length) {
        const current = queue.shift();
        for (const [dir, { dx, dy }] of Object.entries(DIRECTIONS)) {
            const next = { x: current.x + dx, y: current.y + dy };
            if (isSolid(map, next.x, next.y) || previous.has(key(next))) continue;
            previous.set(key(next), { from: current, dir });
            if (next.x === goal.x && next.y === goal.y) {
                const path = [];
                for (let at = key(next); previous.get(at); at = key(previous.get(at).from)) path.unshift(previous.get(at).dir);
                return path;
            }
            queue.push(next);
        }
    }
    return null;
};

/** DS-pixel coordinates inside the screen → tile. */
export const tileFromPoint = (dsX, dsY) => ({ x: Math.floor(dsX / TILE), y: Math.floor(dsY / TILE) });
