/**
 * The Champion's room: 16 × 12 tiles of 16 DS pixels — exactly one DS screen
 * (256 × 192). Pure data and grid maths, tested without a browser.
 *
 * The player walks from the doorway, across the Poké Ball ring, to the tile in
 * front of Cynthia; stepping onto it (or pressing A while facing her) starts
 * the encounter.
 */

export const TILE = 16;

export const CHAMPION_ROOM = {
    width: 16,
    height: 12,
    rows: [
        '################',
        '#LL...BBBB...LL#',
        '#......C.......#',
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
    legend: { '#': 'wall', L: 'lamp', B: 'banner', C: 'champion', S: 'spawn', '.': 'floor' },
};

const SOLID = new Set(['#', 'L', 'B', 'C']);

export const DIRECTIONS = {
    up: { dx: 0, dy: -1 },
    down: { dx: 0, dy: 1 },
    left: { dx: -1, dy: 0 },
    right: { dx: 1, dy: 0 },
};

const cellAt = (map, x, y) => (y >= 0 && y < map.height && x >= 0 && x < map.width ? map.rows[y][x] : '#');

export const isSolid = (map, x, y) => SOLID.has(cellAt(map, x, y));

const find = (map, char) => {
    for (let y = 0; y < map.height; y += 1) {
        const x = map.rows[y].indexOf(char);
        if (x !== -1) return { x, y };
    }
    return null;
};

export const spawnTile = (map) => find(map, 'S');
export const championTile = (map) => find(map, 'C');

/** The tile right in front of the Champion, where the encounter starts. */
export const encounterTile = (map) => {
    const champion = championTile(map);
    return { x: champion.x, y: champion.y + 1 };
};

export const isEncounter = (map, pos) => {
    const tile = encounterTile(map);
    return pos.x === tile.x && pos.y === tile.y;
};

/** One step. A blocked step turns the walker without moving them. */
export const stepTo = (map, pos, dir) => {
    const { dx, dy } = DIRECTIONS[dir];
    const next = { x: pos.x + dx, y: pos.y + dy };
    if (isSolid(map, next.x, next.y)) return { pos, facing: dir, bumped: true };
    return { pos: next, facing: dir, bumped: false };
};

/** Is the walker on the encounter tile and looking at her? */
export const facesChampion = (map, pos, facing) => isEncounter(map, pos) && facing === 'up';

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
 * tapping the Champion walks to the encounter tile. `null` if unreachable.
 */
export const findPath = (map, from, to) => {
    let goal = to;
    if (cellAt(map, to.x, to.y) === 'C') goal = encounterTile(map);
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
