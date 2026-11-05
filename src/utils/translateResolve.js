/**
 * Resolve a dotted key against a language's table, falling back to English and
 * finally to the key itself. Pure: the caller hands it the tables, so the
 * server (every language, statically — translateCore.js) and the browser
 * (only the loaded one — translateClient.js) share one resolver.
 */
export function translateFrom(table, fallbackTable, path, params = {}) {
    const lookup = (node) => {
        for (const key of path.split('.')) {
            if (node && typeof node === 'object') node = node[key];
            else return undefined;
        }
        return node;
    };

    let value = lookup(table);
    if (value === undefined && fallbackTable && fallbackTable !== table) value = lookup(fallbackTable);
    if (typeof value !== 'string') return path;

    return Object.entries(params).reduce(
        (acc, [key, param]) => acc.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), String(param)),
        value,
    );
}
