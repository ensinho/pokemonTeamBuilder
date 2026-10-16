/**
 * Protocol lines → a queue of things to show, one at a time.
 *
 * The battle screen doesn't jump from one turn to the next: it plays the
 * turn — the move, the hit, "It's super effective!", the faint, the switch —
 * each with its line of text and its animation. This file turns the player's
 * log into that queue, and runs the queue as a pure reducer; the hook
 * (`useBattlePlayback`) only adds the timers.
 *
 * Each event remembers the index of the line it came from. While an event is
 * on screen the scene shows the battle as of that line
 * (`readBattleField(lines.slice(0, shown))`), so an HP bar drains exactly when
 * its "-damage" line plays — never before the move that caused it.
 *
 * Pure and DOM-free: tested without a browser.
 */

const SUBJECT = /^(p[12])[a-z]?:\s*(.*)$/;

const parseSubject = (text) => {
    const match = SUBJECT.exec(String(text || '').trim());
    return match ? { side: match[1], nickname: match[2] } : null;
};

const speciesOf = (details) => String(details || '').split(',')[0].trim();

/** `'137/186 par'` → percent; `'0 fnt'` → 0. */
const hpPctOf = (condition) => {
    const text = String(condition || '').trim();
    if (!text || /fnt$/.test(text)) return 0;
    const [current, max] = text.split(' ')[0].split('/').map(Number);
    if (!Number.isFinite(current)) return null;
    return Number.isFinite(max) && max > 0 ? Math.max(0, Math.min(100, (100 * current) / max)) : Math.max(0, Math.min(100, current));
};

const tagValue = (parts, tag) => {
    const part = parts.find((p) => p.startsWith(`[${tag}]`));
    return part ? part.slice(tag.length + 2).trim() : null;
};

/**
 * @param {string[]} lines the player's log
 * @param {{from?: number}} options emit events only for lines at or after `from`
 *   (earlier lines are still read, to know which nickname is which species)
 * @returns {Array<object>} events, each with `type` and `lineIndex`
 */
export const toTimeline = (lines = [], { from = 0 } = {}) => {
    const events = [];
    const names = { p1: new Map(), p2: new Map() };
    const actor = (subject) => (subject ? { side: subject.side, species: names[subject.side].get(subject.nickname) || subject.nickname } : null);

    lines.forEach((line, index) => {
        if (!line.startsWith('|')) return;
        const parts = line.split('|');
        const tag = parts[1];
        const emit = (event) => { if (index >= from) events.push({ ...event, lineIndex: index }); };

        switch (tag) {
            case 'switch':
            case 'drag':
            case 'replace': {
                const subject = parseSubject(parts[2]);
                if (!subject) break;
                const species = speciesOf(parts[3]);
                names[subject.side].set(subject.nickname, species);
                emit({ type: 'switch', side: subject.side, species, hpPct: hpPctOf(parts[4]), drag: tag === 'drag' });
                break;
            }
            case 'move': {
                const who = actor(parseSubject(parts[2]));
                if (!who) break;
                const target = parseSubject(parts[4]);
                emit({
                    type: 'move',
                    ...who,
                    move: parts[3],
                    targetSide: target?.side || (who.side === 'p1' ? 'p2' : 'p1'),
                    // `[still]`: the move happens without its animation (a
                    // charge turn, a called move); `[miss]`: it whiffs.
                    still: parts.includes('[still]'),
                    miss: parts.includes('[miss]'),
                });
                break;
            }
            case '-damage':
            case '-heal':
            case '-sethp': {
                const who = actor(parseSubject(parts[2]));
                if (!who) break;
                emit({ type: 'hp', ...who, hpPct: hpPctOf(parts[3]), heal: tag === '-heal', from: tagValue(parts, 'from') });
                break;
            }
            case '-supereffective':
            case '-resisted':
            case '-crit':
            case '-immune':
            case '-miss':
            case '-fail': {
                const who = actor(parseSubject(parts[2]));
                emit({ type: 'effect', kind: tag.slice(1), ...(who || { side: null, species: null }) });
                break;
            }
            case 'faint': {
                const who = actor(parseSubject(parts[2]));
                if (who) emit({ type: 'faint', ...who });
                break;
            }
            case '-status': {
                const who = actor(parseSubject(parts[2]));
                if (who) emit({ type: 'status', ...who, status: parts[3] });
                break;
            }
            case '-curestatus': {
                const who = actor(parseSubject(parts[2]));
                if (who) emit({ type: 'cure', ...who, status: parts[3] });
                break;
            }
            case '-boost':
            case '-unboost': {
                const who = actor(parseSubject(parts[2]));
                const amount = Number(parts[4]) || 0;
                if (who && amount) emit({ type: 'stat', ...who, stat: parts[3], amount: tag === '-boost' ? amount : -amount });
                break;
            }
            case '-weather': {
                const weather = parts[2];
                // `[upkeep]` repeats every turn the weather holds: shown once, at the start.
                if (weather && !parts.includes('[upkeep]')) emit({ type: 'weather', weather });
                break;
            }
            case 'cant': {
                const who = actor(parseSubject(parts[2]));
                if (who) emit({ type: 'cant', ...who, reason: parts[3] || '' });
                break;
            }
            case '-ability': {
                const who = actor(parseSubject(parts[2]));
                if (who) emit({ type: 'ability', ...who, ability: parts[3] });
                break;
            }
            case '-enditem': {
                const who = actor(parseSubject(parts[2]));
                if (who && !parts.includes('[silent]')) emit({ type: 'item', ...who, item: parts[3], consumed: parts.includes('[eat]') });
                break;
            }
            case 'turn':
                emit({ type: 'turn', turn: Number(parts[2]) || 0 });
                break;
            case 'win':
                emit({ type: 'end', winner: parts[2] });
                break;
            default:
                break;
        }
    });
    return events;
};

/**
 * Merge Cynthia's lines (the API's `events`, placed after a line index) into
 * the queue. A line spoken "after line N" plays after every event from N.
 */
export const withDialogue = (events, dialogue = []) => {
    if (!dialogue.length) return events;
    const tagged = [
        ...events.map((event, order) => ({ event, key: event.lineIndex, order })),
        ...dialogue.map((d, order) => ({ event: { type: 'dialogue', key: d.key, params: d.params || {}, lineIndex: d.lineIndex }, key: d.lineIndex + 0.5, order })),
    ];
    return tagged.sort((a, b) => a.key - b.key || a.order - b.order).map((entry) => entry.event);
};

/** How long an event holds the screen, in ms at normal speed. */
const BASE_MS = {
    intro: 1500,
    switch: 1000,
    move: 750,
    hp: 650,
    effect: 750,
    faint: 1000,
    status: 850,
    cure: 700,
    stat: 750,
    weather: 850,
    cant: 800,
    ability: 750,
    item: 700,
    dialogue: 1900,
    end: 1400,
    turn: 0,
};

/** Events that never show text and never hold the screen. */
export const isSilent = (event) => event.type === 'turn'
    || (event.type === 'hp' && !event.from)
    || (event.type === 'effect' && event.kind === 'fail');

export const durationOf = (event, { fast = false, reducedMotion = false } = {}) => {
    const base = BASE_MS[event.type] ?? 700;
    // A silent HP change still needs time for the bar to drain.
    const ms = event.type === 'hp' && !event.from ? 550 : base;
    return Math.round(ms * (fast ? 0.5 : 1) * (reducedMotion ? 0.7 : 1));
};

/* ── The playback reducer ────────────────────────────────────────────────
   state = { queue, current, shown, tail }
     queue    events not played yet
     current  the event on screen (null when idle)
     shown    how many log lines the scene shows
     tail     how many lines exist — `shown` reaches it when the queue drains */

export const initialPlayback = (lineCount, introEvents = []) => ({
    queue: introEvents,
    current: null,
    shown: introEvents.length ? 0 : lineCount,
    tail: lineCount,
});

export const playbackReducer = (state, action) => {
    switch (action.type) {
        case 'enqueue':
            return { ...state, queue: [...state.queue, ...action.events], tail: action.tail };
        case 'next': {
            if (!state.queue.length) return { ...state, current: null, shown: state.tail };
            const [current, ...queue] = state.queue;
            const shown = current.lineIndex >= 0 ? Math.max(state.shown, current.lineIndex + 1) : state.shown;
            return { ...state, current, queue, shown };
        }
        case 'reset':
            return initialPlayback(action.tail);
        default:
            return state;
    }
};

export const isPlaying = (state) => Boolean(state.current) || state.queue.length > 0;
