/*
 * The VS card's chunk, loaded once (DsVersusLazy explains why it is one).
 * Kept apart from the component so the module that renders it exports only
 * components (fast refresh).
 */

let loading = null;
let loaded = null;

/** The VS card's component once its chunk is in, else null. */
export const loadedVersus = () => loaded;

/** Start loading the VS card; resolves to its component, or null if the chunk failed. */
export const preloadVersus = () => {
    if (!loading) {
        loading = import('./DsVersus')
            .then((module) => {
                loaded = module.DsVersus;
                return loaded;
            })
            .catch(() => {
                loading = null;
                return null;
            });
    }
    return loading;
};
