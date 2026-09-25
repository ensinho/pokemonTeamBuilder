// How close together two posts by the same trainer have to be to read as one
// burst of conversation rather than two separate turns.
export const GROUP_WINDOW_MS = 5 * 60 * 1000;

const timeOf = (message) => {
    const ms = message?.createdAt ? Date.parse(message.createdAt) : NaN;
    return Number.isFinite(ms) ? ms : null;
};

/**
 * Pairs every message with whether it *continues* the one before it: same
 * author, within {@link GROUP_WINDOW_MS}, and not a reply to someone. A
 * continuation drops its avatar and byline, so a trainer's three quick lines
 * read as one turn — the hierarchy a chat earns by not repeating who is
 * speaking on every line.
 *
 * A reply always starts a new turn: its quote chip is a heading of its own.
 *
 * @param {Array<{id: string, createdBy?: string, createdAt?: string, replyTo?: object}>} messages
 *   oldest first, as the thread renders them
 * @returns {Array<{message: object, continues: boolean}>}
 */
export function groupThreadMessages(messages, windowMs = GROUP_WINDOW_MS) {
    const out = [];
    let previous = null;
    for (const message of messages || []) {
        let continues = false;
        if (previous && message.createdBy && message.createdBy === previous.createdBy && !message.replyTo) {
            const a = timeOf(previous);
            const b = timeOf(message);
            continues = a !== null && b !== null && b >= a && b - a <= windowMs;
        }
        out.push({ message, continues });
        previous = message;
    }
    return out;
}
