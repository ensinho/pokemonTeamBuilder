import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { settleWrite } from './firestoreWrite';

const deferred = () => {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
};

describe('settleWrite', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('reports synced when the server acknowledges within the grace window', async () => {
        const write = deferred();
        const outcome = settleWrite(write.promise, { offline: false, graceMs: 1000 });
        write.resolve();
        await expect(outcome).resolves.toBe('synced');
    });

    it('reports queued once the grace window passes with no acknowledgement', async () => {
        const write = deferred();
        const outcome = settleWrite(write.promise, { offline: false, graceMs: 1000 });
        await vi.advanceTimersByTimeAsync(1000);
        await expect(outcome).resolves.toBe('queued');
    });

    it('does not wait at all when the browser is offline', async () => {
        const outcome = settleWrite(new Promise(() => {}), { offline: true, graceMs: 1000 });
        await vi.advanceTimersByTimeAsync(0);
        await expect(outcome).resolves.toBe('queued');
    });

    it('rejects when the write fails inside the window, even offline', async () => {
        const outcome = settleWrite(Promise.reject(new Error('invalid data')), { offline: true });
        await expect(outcome).rejects.toThrow('invalid data');
    });

    it('hands a rejection that arrives after "queued" to onLateError', async () => {
        const write = deferred();
        const onLateError = vi.fn();
        const outcome = settleWrite(write.promise, { offline: false, graceMs: 1000, onLateError });
        await vi.advanceTimersByTimeAsync(1000);
        await expect(outcome).resolves.toBe('queued');

        write.reject(new Error('permission-denied'));
        await vi.advanceTimersByTimeAsync(0);
        expect(onLateError).toHaveBeenCalledWith(expect.objectContaining({ message: 'permission-denied' }));
    });

    it('ignores a late acknowledgement', async () => {
        const write = deferred();
        const onLateError = vi.fn();
        const outcome = settleWrite(write.promise, { offline: false, graceMs: 1000, onLateError });
        await vi.advanceTimersByTimeAsync(1000);
        write.resolve();
        await expect(outcome).resolves.toBe('queued');
        expect(onLateError).not.toHaveBeenCalled();
    });
});
