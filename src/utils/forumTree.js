// The comment tree of a forum post, Reddit style: a reply sits under the
// comment it answers, with a thread line back to it. Pure, so the nesting
// rules are tested rather than eyeballed.

/** Deeper than this, replies stop indenting (a phone runs out of width). */
export const MAX_COMMENT_DEPTH = 4;

export const COMMENT_SORTS = ['top', 'new', 'old'];

const timeOf = (c) => {
    const ms = c?.createdAt ? Date.parse(c.createdAt) : NaN;
    return Number.isFinite(ms) ? ms : 0;
};

const likesOf = (c) => (Array.isArray(c?.likedBy) ? c.likedBy.length : Math.max(0, Number(c?.likeCount) || 0));

const COMPARATORS = {
    old: (a, b) => timeOf(a.comment) - timeOf(b.comment),
    new: (a, b) => timeOf(b.comment) - timeOf(a.comment),
    top: (a, b) => likesOf(b.comment) - likesOf(a.comment) || timeOf(a.comment) - timeOf(b.comment),
};

/**
 * @param {Array<{id: string, createdAt?: string, replyTo?: {messageId?: string}, likedBy?: string[]}>} comments
 * @param {object} [options]
 * @param {'top'|'new'|'old'} [options.sort]  order of top-level comments; replies
 *   follow Top under Top and read oldest-first otherwise (a conversation).
 * @param {boolean} [options.nest]  false keeps one flat list (a chat room), where
 *   every reply carries its quote instead of moving away from the bottom.
 * @param {number} [options.maxDepth]
 * @returns {{ roots: Node[], parentOf: Map<string, string> }} where Node is
 *   `{ comment, depth, children: Node[], showQuote: boolean, descendants: number }`.
 *   `showQuote` is true when the comment is *not* shown directly under the one
 *   it answers (its parent is outside the loaded window, or it was flattened
 *   past the depth cap, or the list is flat) — the quote is then the context.
 *   `parentOf` maps a displayed comment to the comment it is displayed under.
 */
export function buildCommentTree(comments, { sort = 'old', nest = true, maxDepth = MAX_COMMENT_DEPTH } = {}) {
    const list = (comments || []).filter((c) => c && c.id);
    const byId = new Map(list.map((c) => [c.id, c]));
    const parentOf = new Map();
    const compare = COMPARATORS[sort] || COMPARATORS.old;
    const childCompare = sort === 'top' ? COMPARATORS.top : COMPARATORS.old;

    if (!nest) {
        const roots = list
            .map((comment) => ({ comment, depth: 0, children: [], showQuote: !!comment.replyTo?.messageId, descendants: 0 }))
            .sort(compare);
        return { roots, parentOf };
    }

    // Direct children by real parent. A reply whose parent is not loaded (or
    // that points at itself) becomes a root.
    const childrenOf = new Map();
    const roots = [];
    for (const c of list) {
        const pid = c.replyTo?.messageId;
        if (pid && pid !== c.id && byId.has(pid)) {
            if (!childrenOf.has(pid)) childrenOf.set(pid, []);
            childrenOf.get(pid).push(c);
        } else {
            roots.push(c);
        }
    }

    const seen = new Set();
    // Every descendant of `comment`, oldest first — used past the depth cap.
    const flatten = (comment, out) => {
        for (const child of childrenOf.get(comment.id) || []) {
            if (seen.has(child.id)) continue;
            seen.add(child.id);
            out.push(child);
            flatten(child, out);
        }
        return out;
    };

    const build = (comment, depth, displayParentId) => {
        seen.add(comment.id);
        const realParent = comment.replyTo?.messageId || null;
        const node = {
            comment,
            depth,
            children: [],
            showQuote: !!realParent && realParent !== displayParentId,
            descendants: 0,
        };
        if (displayParentId) parentOf.set(comment.id, displayParentId);

        if (depth >= maxDepth) {
            // At the cap: everything below reads as one flat run under this
            // comment, each reply with its quote so the conversation survives.
            node.children = flatten(comment, [])
                .sort((a, b) => timeOf(a) - timeOf(b))
                .map((c) => {
                    parentOf.set(c.id, comment.id);
                    return {
                        comment: c,
                        depth: depth + 1,
                        children: [],
                        showQuote: c.replyTo?.messageId !== comment.id,
                        descendants: 0,
                    };
                });
        } else {
            node.children = (childrenOf.get(comment.id) || [])
                .filter((c) => !seen.has(c.id))
                .map((c) => build(c, depth + 1, comment.id))
                .sort(childCompare);
        }
        node.descendants = node.children.reduce((n, ch) => n + 1 + ch.descendants, 0);
        return node;
    };

    const rootNodes = roots.map((c) => build(c, 0, null)).sort(compare);
    return { roots: rootNodes, parentOf };
}

/** Ids of every ancestor a displayed comment sits under, nearest first. */
export function displayAncestors(parentOf, id) {
    const out = [];
    let cur = parentOf.get(id);
    const guard = new Set();
    while (cur && !guard.has(cur)) {
        guard.add(cur);
        out.push(cur);
        cur = parentOf.get(cur);
    }
    return out;
}
