import { describe, it, expect } from 'vitest';

import {
    CHAMPION_ROOM, encounterTile, faceToward, facesChampion, findPath, isEncounter, isSolid, spawnTile, stepTo, tileFromPoint,
} from './arenaMap';

const map = CHAMPION_ROOM;

const walk = (from, path) => path.reduce((pos, dir) => stepTo(map, pos, dir).pos, from);

describe('the Champion room', () => {
    it('is one DS screen of 16 × 12 tiles', () => {
        expect(map.rows).toHaveLength(12);
        expect(map.rows.every((row) => row.length === 16)).toBe(true);
    });

    it('blocks walls, lamps, the banner and Cynthia herself', () => {
        expect(isSolid(map, 0, 5)).toBe(true);
        expect(isSolid(map, 1, 3)).toBe(true); // lamp
        expect(isSolid(map, 7, 1)).toBe(true); // banner
        expect(isSolid(map, 7, 2)).toBe(true); // Cynthia
        expect(isSolid(map, 7, 6)).toBe(false); // the ring is floor
        expect(isSolid(map, -1, 0)).toBe(true); // off the map
    });

    it('bumps into a wall without moving, and turns', () => {
        const start = spawnTile(map);
        const down = stepTo(map, { x: 7, y: 10 }, 'down');
        expect(down.bumped).toBe(false); // the doorway gap
        const blocked = stepTo(map, { x: 1, y: 4 }, 'left');
        expect(blocked).toEqual({ pos: { x: 1, y: 4 }, facing: 'left', bumped: true });
        expect(start).toEqual({ x: 7, y: 10 });
    });

    it('walks the shortest path to a tapped tile, around the lamps', () => {
        const from = spawnTile(map);
        const path = findPath(map, from, { x: 2, y: 3 });
        expect(path).not.toBe(null);
        expect(walk(from, path)).toEqual({ x: 2, y: 3 });
        expect(path.length).toBe(Math.abs(7 - 2) + Math.abs(10 - 3));
    });

    it('turns a tap on Cynthia into a walk to the tile in front of her', () => {
        const from = spawnTile(map);
        const path = findPath(map, from, { x: 7, y: 2 });
        const end = walk(from, path);
        expect(end).toEqual(encounterTile(map));
        expect(isEncounter(map, end)).toBe(true);
        expect(facesChampion(map, end, path[path.length - 1])).toBe(true);
    });

    it('converts DS pixels to tiles', () => {
        expect(tileFromPoint(0, 0)).toEqual({ x: 0, y: 0 });
        expect(tileFromPoint(127, 100)).toEqual({ x: 7, y: 6 });
    });

    it('turns Cynthia toward the player along the longer axis', () => {
        const her = { x: 7, y: 2 };
        expect(faceToward(her, spawnTile(map))).toBe('down');
        expect(faceToward(her, encounterTile(map))).toBe('down');
        expect(faceToward(her, { x: 2, y: 3 })).toBe('left');
        expect(faceToward(her, { x: 13, y: 2 })).toBe('right');
        expect(faceToward(her, { x: 4, y: 1 })).toBe('left');
        expect(faceToward(her, { x: 8, y: 1 })).toBe('up');
        expect(faceToward(her, { x: 9, y: 4 })).toBe('down'); // a tie looks vertically
    });
});
