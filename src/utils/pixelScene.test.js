import { describe, it, expect } from 'vitest';
import { SCENES, SCENE_CELLS, groundAt, renderScene, sceneWidth } from './pixelScene';

describe('pixel scenes', () => {
    it('are sixty-four cells tall and opaque everywhere', () => {
        for (const kind of Object.keys(SCENES)) {
            const scene = renderScene(kind, 96, 7);
            expect(scene.height).toBe(SCENE_CELLS);
            expect(scene.data).toHaveLength(96 * SCENE_CELLS * 4);
            for (let i = 3; i < scene.data.length; i += 4) {
                if (scene.data[i] !== 255) throw new Error(`${kind}: a transparent cell`);
            }
        }
    });

    it('are the same for the same seed', () => {
        expect(renderScene('dusk', 64, 3).data).toEqual(renderScene('dusk', 64, 3).data);
    });

    it('report the ground figures stand on', () => {
        const scene = renderScene('dusk', 100, 1);
        expect(scene.ground).toHaveLength(100);
        const y = groundAt(scene, 0.5);
        expect(y).toBeGreaterThan(0.5);
        expect(y).toBeLessThan(1);
        expect(groundAt(null, 0.5)).toBe(0.8);
    });

    it("fit a box's aspect, within bounds", () => {
        expect(sceneWidth(320, 200)).toBe(102);
        expect(sceneWidth(10, 1000)).toBe(16);
        expect(sceneWidth(100000, 1)).toBe(512);
    });
});
