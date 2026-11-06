/**
 * @mentions in the composer (2026-11-06, docs/plans/social-heart.md A4).
 * The same token the server parses (api/_lib/socialNotify.js parseMentions):
 * `@` then 2–40 letters, digits, `_ . -`. A name with a space cannot be
 * mentioned — the server could not tell where it ends.
 */
export const MENTION_NAME = /^[\p{L}\p{N}_.-]{2,40}$/u;

/** The `@partial` being typed right before the caret, or null. */
export function activeMention(text, caret = text.length) {
    const before = String(text).slice(0, caret);
    const m = /(^|[^\w@])@([\p{L}\p{N}_.-]{0,40})$/u.exec(before);
    return m ? { query: m[2].toLowerCase(), start: caret - m[2].length - 1 } : null;
}

/** Up to `max` names that start with the query, mentionable, unique. */
export function mentionSuggestions(candidates, query, max = 5) {
    const seen = new Set();
    const out = [];
    for (const name of candidates) {
        const clean = String(name || '').trim();
        const key = clean.toLowerCase();
        if (!MENTION_NAME.test(clean) || seen.has(key) || !key.startsWith(query)) continue;
        seen.add(key);
        out.push(clean);
        if (out.length >= max) break;
    }
    return out;
}

/** The text with the partial replaced by `@name ` and where the caret goes. */
export function insertMention(text, mention, name) {
    const end = mention.start + 1 + mention.query.length;
    const next = `${text.slice(0, mention.start)}@${name} ${text.slice(end)}`;
    return { text: next, caret: mention.start + name.length + 2 };
}

/** Splits a message into text and `@name` parts, for highlighting. */
export function splitMentions(text) {
    const parts = [];
    const re = /(^|[^\w@])@([\p{L}\p{N}_.-]{2,40})/gu;
    let last = 0;
    let m;
    while ((m = re.exec(text))) {
        const at = m.index + m[1].length;
        if (at > last) parts.push({ text: text.slice(last, at) });
        parts.push({ mention: m[2] });
        last = at + 1 + m[2].length;
    }
    if (last < text.length) parts.push({ text: text.slice(last) });
    return parts;
}
