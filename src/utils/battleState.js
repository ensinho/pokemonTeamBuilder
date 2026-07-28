/**
 * Protocol log → battlefield state.
 *
 * A deliberate alternative to `@pkmn/client`. That library is the "correct" way to
 * maintain battle state, but making it *work* means shipping `@pkmn/dex` for the
 * data too: measured at **805 KB gzipped**, seven times the app's Firebase chunk
 * and by far the largest thing it would load. (An earlier note in the plan claimed
 * 82 KB — that was importing the modules without a usable dex, so it was wrong.)
 *
 * A battlefield needs to know: who is out on each side, at what HP, with what
 * status, and who has fainted. Every one of those facts is stated outright in the
 * protocol — `|switch|p1a: Charizard|Charizard, L50, M|153/153` carries the
 * species, level, gender and HP in one line. So this reads the subset that matters
 * instead, in pure and tested code.
 *
 * What it deliberately does NOT model: stat boosts, weather/terrain beyond a
 * label, hazards, screens, volatiles. Those are cosmetic overlays; if they're
 * wanted later, the honest options are to add them here or to accept the 805 KB.
 */

const SIDES = ['p1', 'p2'];

/** `p1a: Charizard` → `{ side: 'p1', nickname: 'Charizard' }` */
const parseIdent = (raw) => {
    const match = /^(p[12])[a-z]?:\s*(.*)$/i.exec(String(raw || '').trim());
    if (!match) return null;
    return { side: match[1].toLowerCase(), nickname: match[2] };
};

/** `Charizard, L50, M` → `{ species, level, gender, shiny }` */
const parseDetails = (raw) => {
    const parts = String(raw || '').split(',').map((part) => part.trim()).filter(Boolean);
    const out = { species: parts[0] || '', level: 50, gender: null, shiny: false };
    for (const part of parts.slice(1)) {
        if (/^L\d+$/i.test(part)) out.level = Number.parseInt(part.slice(1), 10);
        else if (part === 'M' || part === 'F') out.gender = part;
        else if (part.toLowerCase() === 'shiny') out.shiny = true;
    }
    return out;
};

/**
 * `137/186 par` → `{ current: 137, max: 186, pct: 73.7, status: 'par', fainted: false }`
 *
 * A player's own Pokémon report real HP; the opponent's arrive as a percentage out
 * of 100 — so `pct` is the only figure safe to compare across sides, and `max` is
 * only meaningful for your own.
 */
export const parseCondition = (raw) => {
    const text = String(raw || '').trim();
    if (!text) return null;
    if (/(^0 fnt$)|(\bfnt$)/.test(text)) {
        return { current: 0, max: null, pct: 0, status: null, fainted: true };
    }

    const [hpPart, ...rest] = text.split(' ');
    const [currentRaw, maxRaw] = hpPart.split('/');
    const current = Number.parseFloat(currentRaw);
    const max = maxRaw === undefined ? null : Number.parseFloat(maxRaw);
    if (!Number.isFinite(current)) return null;

    const pct = Number.isFinite(max) && max > 0
        ? Math.max(0, Math.min(100, (current / max) * 100))
        : Math.max(0, Math.min(100, current));

    return {
        current,
        max: Number.isFinite(max) ? max : null,
        pct: Math.round(pct * 10) / 10,
        status: rest[0] || null,
        fainted: false,
    };
};

/** Green → amber → red, the mainline HP thresholds. Shared so the battlefield's
 *  active-mon bar and the switch-chooser's mini bar never drift apart. */
export const hpTone = (pct) => (pct > 50 ? 'high' : pct > 20 ? 'mid' : 'low');

const blankSide = () => ({
    name: null,
    active: null,
    /** Species seen at team preview, in order — enough for a team bar. */
    roster: [],
    faintedCount: 0,
});

/**
 * Fold a player's own protocol lines into a battlefield snapshot.
 *
 * `mySide` is taken from the `|request|` payload's `side.id` rather than guessed
 * from display names, which can collide.
 */
export const readBattleField = (lines = []) => {
    const state = {
        mySide: null,
        turn: 0,
        weather: null,
        ended: false,
        winner: null,
        myDetailsMap: new Map(),
        sides: { p1: blankSide(), p2: blankSide() },
    };

    const applyCondition = (side, condition) => {
        const active = state.sides[side]?.active;
        if (!active || !condition) return;
        const parsed = parseCondition(condition);
        if (!parsed) return;
        active.hp = parsed;
        if (parsed.fainted) active.fainted = true;
        if (parsed.status) active.status = parsed.status;
    };

    for (const line of lines) {
        if (!line.startsWith('|')) continue;
        const [, tag, ...rest] = line.split('|');

        switch (tag) {
            case 'player': {
                const [side, name] = rest;
                if (SIDES.includes(side) && name) state.sides[side].name = name;
                break;
            }
            case 'poke': {
                const [side, details] = rest;
                if (SIDES.includes(side)) {
                    state.sides[side].roster.push(parseDetails(details));
                }
                break;
            }
            case 'request': {
                try {
                    const payload = JSON.parse(rest.join('|'));
                    const id = payload?.side?.id;
                    if (SIDES.includes(id)) state.mySide = id;

                    // Extract detailed set data for my own team (ability, item, stats)
                    const roster = payload?.side?.pokemon || [];
                    for (const mon of roster) {
                        const name = (mon.details || '').split(',')[0] || mon.ident;
                        if (name) {
                            state.myDetailsMap.set(name, {
                                ability: mon.baseAbility || mon.ability || null,
                                item: mon.item || null,
                                stats: mon.stats || null,
                                moves: mon.moves || [],
                            });
                        }
                    }
                } catch { /* malformed request */ }
                break;
            }
            case 'switch':
            case 'drag':
            case 'replace': {
                const ident = parseIdent(rest[0]);
                if (!ident) break;
                const details = parseDetails(rest[1]);

                state.sides[ident.side].active = {
                    nickname: ident.nickname,
                    ...details,
                    hp: parseCondition(rest[2]) || { current: 100, max: null, pct: 100, status: null, fainted: false },
                    status: null,
                    fainted: false,
                    item: null,
                    ability: null,
                };
                applyCondition(ident.side, rest[2]);
                break;
            }
            case '-item':
            case '-enditem': {
                const ident = parseIdent(rest[0]);
                if (ident && state.sides[ident.side].active) {
                    state.sides[ident.side].active.item = rest[1] || null;
                }
                break;
            }
            case '-ability': {
                const ident = parseIdent(rest[0]);
                if (ident && state.sides[ident.side].active) {
                    state.sides[ident.side].active.ability = rest[1] || null;
                }
                break;
            }
            case '-damage':
            case '-heal':
            case '-sethp': {
                const ident = parseIdent(rest[0]);
                if (ident) applyCondition(ident.side, rest[1]);
                break;
            }
            case '-status': {
                const ident = parseIdent(rest[0]);
                if (ident && state.sides[ident.side].active) {
                    state.sides[ident.side].active.status = rest[1] || null;
                }
                break;
            }
            case '-curestatus': {
                const ident = parseIdent(rest[0]);
                if (ident && state.sides[ident.side].active) {
                    state.sides[ident.side].active.status = null;
                }
                break;
            }
            case 'faint': {
                const ident = parseIdent(rest[0]);
                if (!ident) break;
                const side = state.sides[ident.side];
                side.faintedCount += 1;
                if (side.active) {
                    side.active.fainted = true;
                    side.active.hp = { current: 0, max: side.active.hp?.max ?? null, pct: 0, status: null, fainted: true };
                }
                break;
            }
            case '-weather':
                state.weather = rest[0] && rest[0] !== 'none' ? rest[0] : null;
                break;
            case 'turn': {
                const parsed = Number.parseInt(rest[0], 10);
                if (Number.isInteger(parsed)) state.turn = parsed;
                break;
            }
            case 'win':
                state.ended = true;
                state.winner = rest[0] || null;
                break;
            case 'tie':
                state.ended = true;
                break;
            default:
                break;
        }
    }

    // Resolve viewer's perspective and attach myDetailsMap info to my side's active/roster
    const mine = state.mySide || 'p1';
    const theirs = mine === 'p1' ? 'p2' : 'p1';

    // Enrich my active Pokémon
    if (state.sides[mine].active) {
        const specName = state.sides[mine].active.species;
        const myDet = state.myDetailsMap.get(specName) || state.myDetailsMap.get(state.sides[mine].active.nickname);
        if (myDet) {
            state.sides[mine].active.ability = myDet.ability || state.sides[mine].active.ability;
            state.sides[mine].active.item = myDet.item || state.sides[mine].active.item;
            state.sides[mine].active.stats = myDet.stats || null;
        }
    }

    // Enrich my roster Pokémon
    state.sides[mine].roster = state.sides[mine].roster.map((mon) => {
        const myDet = state.myDetailsMap.get(mon.species);
        return {
            ...mon,
            isMine: true,
            ability: myDet?.ability || null,
            item: myDet?.item || null,
            stats: myDet?.stats || null,
        };
    });

    return {
        ...state,
        mine: state.sides[mine],
        theirs: state.sides[theirs],
        iWon: state.ended && state.winner != null && state.winner === state.sides[mine].name,
    };
};
