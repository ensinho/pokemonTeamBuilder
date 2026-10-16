/**
 * A Firestore small enough to reason about, for the endpoint tests.
 *
 * A flat `path -> data` map with just the surface the handlers in `api/`
 * touch: documents, collections, batches and transactions. Extracted from
 * `battle-turn.test.js` so the challenge endpoint can be tested against the same
 * stand-in instead of a second copy that drifts.
 *
 * Transactions here are serial, not isolated — the tests drive one request at a
 * time, and the property they check (a stale turn is refused) comes from the
 * handler re-reading inside the transaction, not from Firestore's locking.
 */

export const createFakeFirestore = () => {
    const store = new Map();
    let autoId = 0;

    const childIds = (prefix) => {
        const ids = new Set();
        for (const key of store.keys()) {
            if (!key.startsWith(`${prefix}/`)) continue;
            const rest = key.slice(prefix.length + 1);
            if (!rest.includes('/')) ids.add(rest);
        }
        return [...ids].sort();
    };

    const snapshotOf = (path) => {
        const data = store.get(path);
        return {
            exists: data !== undefined,
            id: path.split('/').pop(),
            ref: new FakeDoc(path),
            data: () => (data === undefined ? undefined : structuredClone(data)),
        };
    };

    class FakeDoc {
        constructor(path) { this.path = path; this.id = path.split('/').pop(); }

        async get() { return snapshotOf(this.path); }

        async set(data, options) {
            const prev = options?.merge ? (store.get(this.path) || {}) : {};
            store.set(this.path, structuredClone({ ...prev, ...data }));
        }

        async create(data) {
            if (store.has(this.path)) throw new Error('Document already exists');
            store.set(this.path, structuredClone(data));
        }

        async update(data) {
            if (!store.has(this.path)) throw new Error('No document to update');
            store.set(this.path, structuredClone({ ...store.get(this.path), ...data }));
        }

        async delete() { store.delete(this.path); }

        collection(name) { return new FakeCollection(`${this.path}/${name}`); }
    }

    class FakeCollection {
        constructor(path) { this.path = path; }

        doc(id) {
            autoId += 1;
            return new FakeDoc(`${this.path}/${id ?? `auto${String(autoId).padStart(6, '0')}`}`);
        }

        async get() {
            const docs = childIds(this.path).map((id) => snapshotOf(`${this.path}/${id}`));
            return { docs, size: docs.length, empty: docs.length === 0 };
        }

        /** `==` and `array-contains`, chainable — what the code under test queries with. */
        where(field, op, value) {
            const filters = [...(this.filters || []), { field, op, value }];
            const parent = this;
            const matches = (data) => filters.every((f) => (f.op === 'array-contains'
                ? Array.isArray(data?.[f.field]) && data[f.field].includes(f.value)
                : data?.[f.field] === f.value));
            const query = Object.create(FakeCollection.prototype);
            Object.assign(query, { path: parent.path, filters });
            query.get = async () => {
                const all = await FakeCollection.prototype.get.call(parent);
                const docs = all.docs.filter((d) => matches(d.data()));
                return { docs, size: docs.length, empty: docs.length === 0 };
            };
            return query;
        }
    }

    const db = {
        doc: (path) => new FakeDoc(path),
        collection: (path) => new FakeCollection(path),
        batch: () => {
            const ops = [];
            return {
                set: (ref, data, options) => ops.push(() => ref.set(data, options)),
                update: (ref, data) => ops.push(() => ref.update(data)),
                delete: (ref) => ops.push(() => ref.delete()),
                commit: async () => { for (const op of ops) await op(); },
            };
        },
        // Reads go straight through; writes are queued and applied only if the
        // callback resolves, so a thrown error leaves the store untouched —
        // the one transactional property the handlers rely on.
        runTransaction: async (fn) => {
            const ops = [];
            const tx = {
                get: (ref) => ref.get(),
                set: (ref, data, options) => { ops.push(() => ref.set(data, options)); return tx; },
                create: (ref, data) => { ops.push(() => ref.create(data)); return tx; },
                update: (ref, data) => { ops.push(() => ref.update(data)); return tx; },
                delete: (ref) => { ops.push(() => ref.delete()); return tx; },
            };
            const result = await fn(tx);
            for (const op of ops) await op();
            return result;
        },
    };

    return { store, db, childIds };
};
