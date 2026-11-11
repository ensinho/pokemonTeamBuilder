import { beforeEach, describe, expect, it } from 'vitest';
import { isQuickLookActive, useQuickLookStore } from './useQuickLookStore';

const reset = () => useQuickLookStore.setState({ holds: 0, stack: [] });

describe('useQuickLookStore', () => {
    beforeEach(reset);

    it('is active while any screen holds it', () => {
        const { hold, release } = useQuickLookStore.getState();
        hold();
        hold();
        release();
        expect(isQuickLookActive()).toBe(true);
        release();
        expect(isQuickLookActive()).toBe(false);
    });

    it('closes the panel when the last hold is released', () => {
        const { hold, release, open } = useQuickLookStore.getState();
        hold();
        open({ kind: 'move', key: 'earthquake' });
        release();
        expect(useQuickLookStore.getState().stack).toEqual([]);
    });

    it('moves a look opened again to the top instead of repeating it', () => {
        const { open } = useQuickLookStore.getState();
        open({ kind: 'pokemon', key: 445 });
        open({ kind: 'ability', key: 'rough-skin' });
        open({ kind: 'pokemon', key: '445' });
        expect(useQuickLookStore.getState().stack).toEqual([
            { kind: 'ability', key: 'rough-skin' },
            { kind: 'pokemon', key: '445' },
        ]);
    });

    it('goes back one look at a time and never below empty', () => {
        const { open, back } = useQuickLookStore.getState();
        open({ kind: 'item', key: 'leftovers' });
        back();
        back();
        expect(useQuickLookStore.getState().stack).toEqual([]);
    });

    it('never releases below zero', () => {
        useQuickLookStore.getState().release();
        expect(useQuickLookStore.getState().holds).toBe(0);
    });
});
