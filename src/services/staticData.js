/**
 * The baked datasets in public/data (Smogon sets, usage, tournaments, mega
 * stones, move types…), loaded once per session and shared.
 *
 * Each data hook used to `fetch` its file in its own effect, so every mounted
 * instance downloaded and parsed the file again. The Pokémon page's
 * Competitive tab alone asked for mega-stones.json once per sprite (36 times),
 * tournaments.json three times and smogon.json (1.8 MB) twice: about 4 MB at
 * once on a phone, enough to starve Firestore's channel until it dropped
 * (2026-10-23). Now one request per file serves every caller, and the parsed
 * value stays in memory for the session.
 *
 * The daily `?d=` stamp keeps what it always did: a dataset rebuilt by the
 * cron reaches users within a day, while the same day hits the HTTP cache.
 */

const dayStamp = () => {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
};

export const staticDataUrl = (file) =>
    `${import.meta.env.BASE_URL || '/'}data/${file}`.replace(/([^:])\/{2,}/g, '$1/') + `?d=${dayStamp()}`;

const requests = new Map();
const loaded = new Map();

/**
 * The parsed file, from the one request every caller shares. Rejects on a
 * network or HTTP failure; the next call then tries again.
 */
export function loadStaticData(file) {
    if (loaded.has(file)) return Promise.resolve(loaded.get(file));
    let request = requests.get(file);
    if (!request) {
        request = fetch(staticDataUrl(file))
            .then((res) => {
                if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
                return res.json();
            })
            .then((data) => {
                loaded.set(file, data);
                return data;
            })
            .finally(() => { requests.delete(file); });
        requests.set(file, request);
    }
    return request;
}

/** The parsed file if it already arrived, else undefined — for a first render. */
export const cachedStaticData = (file) => loaded.get(file);

/** Tests only: forget everything loaded. */
export function __resetStaticData() {
    requests.clear();
    loaded.clear();
}
