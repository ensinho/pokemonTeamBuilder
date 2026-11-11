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
 * Stat stages are modelled (`active.boosts`, 2026-11-10: the HP boxes show
 * them), and so is what a player has to remember between turns: the hazards
 * and screens on each side (`side.conditions`), the lasting effects on the
 * Pokémon out (`active.volatiles`), the terrain and the rooms (`terrain`,
 * `rooms`). Only the ones in `CONDITIONS` — a whitelist, so an effect the
 * HUD has no chip for is ignored, not half-shown. Turn counters are NOT
 * modelled: an item can stretch a screen or a weather and the log never says.
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
    const out = { species: parts[0] || '', level: 50, gender: null, shiny: false, teraType: null };
    for (const part of parts.slice(1)) {
        if (/^L\d+$/i.test(part)) out.level = Number.parseInt(part.slice(1), 10);
        // A Terastallized Pokémon switching back in carries `tera:Fire`.
        else if (/^tera:/i.test(part)) out.teraType = part.slice(5) || null;
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

/** The stats a stage can move, in the order the HUD lists them. */
export const BOOST_STATS = ['atk', 'def', 'spa', 'spd', 'spe', 'accuracy', 'evasion'];

/** What a stage is worth: +2 Attack is ×2, −1 is ×0.67; accuracy/evasion run on thirds. */
export const boostMultiplier = (stat, stage) => {
    const base = stat === 'accuracy' || stat === 'evasion' ? 3 : 2;
    const n = Math.max(-6, Math.min(6, Number(stage) || 0));
    return n >= 0 ? (base + n) / base : base / (base - n);
};

/** Only the stages that are not zero, clamped to ±6. */
const cleanBoosts = (boosts) => {
    const out = {};
    for (const stat of BOOST_STATS) {
        const n = Math.max(-6, Math.min(6, Number(boosts?.[stat]) || 0));
        if (n) out[stat] = n;
    }
    return out;
};

/**
 * What the HUD keeps on screen, by the id the protocol names it with once
 * `move: ` is dropped and the rest is squeezed (`move: Stealth Rock` →
 * `stealthrock`). `short` is the chip (the abbreviations players already
 * use; move names stay English, as everywhere in the battle text); a `label`
 * is a key under `challenge.battle.cond` instead, for the few that are words.
 */
export const CONDITIONS = {
    // A side's: screens help whoever stands there, hazards hurt whoever comes in.
    reflect: { kind: 'screen', short: 'REF', name: 'Reflect' },
    lightscreen: { kind: 'screen', short: 'LS', name: 'Light Screen' },
    auroraveil: { kind: 'screen', short: 'VEIL', name: 'Aurora Veil' },
    tailwind: { kind: 'screen', short: 'TW', name: 'Tailwind' },
    safeguard: { kind: 'screen', short: 'SAFE', name: 'Safeguard' },
    mist: { kind: 'screen', short: 'MIST', name: 'Mist' },
    stealthrock: { kind: 'hazard', short: 'SR', name: 'Stealth Rock' },
    spikes: { kind: 'hazard', short: 'SPK', name: 'Spikes' },
    toxicspikes: { kind: 'hazard', short: 'TSPK', name: 'Toxic Spikes' },
    stickyweb: { kind: 'hazard', short: 'WEB', name: 'Sticky Web' },
    // The Pokémon's, until it leaves.
    substitute: { kind: 'volatile', short: 'SUB', name: 'Substitute' },
    leechseed: { kind: 'volatile', short: 'SEED', name: 'Leech Seed' },
    confusion: { kind: 'volatile', label: 'confusion' },
    taunt: { kind: 'volatile', short: 'TAUNT', name: 'Taunt' },
    encore: { kind: 'volatile', short: 'ENC', name: 'Encore' },
    yawn: { kind: 'volatile', short: 'YAWN', name: 'Yawn' },
    curse: { kind: 'volatile', short: 'CURSE', name: 'Curse' },
    perish: { kind: 'volatile', short: 'PERISH', name: 'Perish Song' },
    transform: { kind: 'volatile', label: 'transform' },
    // The whole field's.
    sun: { kind: 'field', label: 'sun' },
    rain: { kind: 'field', label: 'rain' },
    sand: { kind: 'field', label: 'sand' },
    snow: { kind: 'field', label: 'snow' },
    wind: { kind: 'field', label: 'wind' },
    electricterrain: { kind: 'field', short: 'ELEC', name: 'Electric Terrain' },
    grassyterrain: { kind: 'field', short: 'GRASSY', name: 'Grassy Terrain' },
    mistyterrain: { kind: 'field', short: 'MISTY', name: 'Misty Terrain' },
    psychicterrain: { kind: 'field', short: 'PSYCHIC', name: 'Psychic Terrain' },
    trickroom: { kind: 'field', short: 'TR', name: 'Trick Room' },
    gravity: { kind: 'field', short: 'GRAV', name: 'Gravity' },
    magicroom: { kind: 'field', short: 'M.ROOM', name: 'Magic Room' },
    wonderroom: { kind: 'field', short: 'W.ROOM', name: 'Wonder Room' },
};

const WEATHER_IDS = {
    sunnyday: 'sun', desolateland: 'sun',
    raindance: 'rain', primordialsea: 'rain',
    sandstorm: 'sand',
    hail: 'snow', snowscape: 'snow', snow: 'snow',
    deltastream: 'wind',
};

/** `move: Stealth Rock` → `stealthrock`; `perish3` → `perish` (its count is read apart). */
const conditionId = (raw) => {
    const id = String(raw || '').replace(/^(move|ability|item):\s*/i, '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return /^perish\d$/.test(id) ? 'perish' : id;
};

const isKind = (id, ...kinds) => kinds.includes(CONDITIONS[id]?.kind);

/** What Baton Pass hands over with the stages (the sim copies them without a line). */
const PASSED_VOLATILES = ['substitute', 'leechseed', 'confusion', 'curse', 'perish'];

/**
 * The whole field's chips, in the order the HUD lists them: the weather, the
 * terrain, the rooms.
 */
export const fieldConditions = (field) => [
    WEATHER_IDS[conditionId(field?.weather)],
    field?.terrain,
    ...(field?.rooms || []),
].filter((id) => isKind(id, 'field'));

/**
 * One side's chips: what is on the Pokémon out, then the side's screens, then
 * its hazards — `{ id, kind, count }`, `count` only where it says something
 * (Spikes' layers, Perish Song's turns).
 */
export const sideConditions = (side) => {
    const out = [];
    const active = side?.active && !side.active.fainted ? side.active : null;
    for (const id of Object.keys(CONDITIONS)) {
        const kind = CONDITIONS[id].kind;
        const value = kind === 'volatile' ? active?.volatiles?.[id] : side?.conditions?.[id];
        if (kind === 'field' || value == null || value === false) continue;
        const counted = id === 'perish' || ((id === 'spikes' || id === 'toxicspikes') && value > 1);
        out.push({ id, kind, count: counted ? value : null });
    }
    const order = ['volatile', 'screen', 'hazard'];
    return out.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
};

const blankSide = () => ({
    /** Hazards and screens, by id: the layers for a hazard, 1 for the rest. */
    conditions: {},
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
        terrain: null,
        rooms: [],
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

    const activeOf = (raw) => {
        const ident = parseIdent(raw);
        return (ident && state.sides[ident.side].active) || null;
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
                // Baton Pass hands the stages to whoever comes in; any other switch clears them.
                const leaving = state.sides[ident.side].active;
                const batonPass = rest.some((part) => /^\[from\].*Baton Pass/i.test(part));
                const passed = batonPass ? cleanBoosts(leaving?.boosts) : {};
                const passedVolatiles = batonPass
                    ? Object.fromEntries(PASSED_VOLATILES.filter((id) => leaving?.volatiles?.[id] != null).map((id) => [id, leaving.volatiles[id]]))
                    : {};

                state.sides[ident.side].active = {
                    nickname: ident.nickname,
                    ...details,
                    hp: parseCondition(rest[2]) || { current: 100, max: null, pct: 100, status: null, fainted: false },
                    status: null,
                    fainted: false,
                    item: null,
                    ability: null,
                    boosts: passed,
                    volatiles: passedVolatiles,
                };
                applyCondition(ident.side, rest[2]);
                break;
            }
            case 'detailschange': {
                // A Mega Evolution (or another permanent forme change): the
                // sprite follows the new species; HP and status stay.
                const ident = parseIdent(rest[0]);
                const active = ident && state.sides[ident.side].active;
                if (active) Object.assign(active, parseDetails(rest[1]));
                break;
            }
            case '-transform': {
                // `|-transform|p2a: Ditto|p1a: Iron Hands|[from] ability: Imposter`:
                // the box keeps its own name, the sprite becomes the target's
                // (as it looks now — a Ditto copying a Ditto copies its copy),
                // and the stat stages are copied with it. A switch-out ends it.
                const active = activeOf(rest[0]);
                const target = activeOf(rest[1]);
                if (!active) break;
                active.transformedInto = target ? (target.transformedInto || target.species) : null;
                if (target) active.boosts = cleanBoosts(target.boosts);
                active.volatiles = { ...active.volatiles, transform: true };
                break;
            }
            case '-terastallize': {
                // `|-terastallize|p1a: Garchomp|Fire` — the box wears the type from here on.
                const ident = parseIdent(rest[0]);
                const active = ident && state.sides[ident.side].active;
                if (active && rest[1]) active.teraType = rest[1];
                break;
            }
            case '-formechange': {
                // A forme for the rest of the switch-in (Mimikyu-Busted, Aegislash-Blade).
                const ident = parseIdent(rest[0]);
                const active = ident && state.sides[ident.side].active;
                if (active && rest[1]) active.species = rest[1];
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
            case '-boost':
            case '-unboost':
            case '-setboost': {
                // `|-boost|p1a: Scizor|atk|2`, `|-setboost|p1a: Mew|atk|6|[from] move: Belly Drum`
                const active = activeOf(rest[0]);
                const amount = Number(rest[2]) || 0;
                if (!active || !BOOST_STATS.includes(rest[1])) break;
                const now = active.boosts[rest[1]] || 0;
                const next = tag === '-setboost' ? amount : now + (tag === '-boost' ? amount : -amount);
                active.boosts = cleanBoosts({ ...active.boosts, [rest[1]]: next });
                break;
            }
            case '-clearboost': {
                const active = activeOf(rest[0]);
                if (active) active.boosts = {};
                break;
            }
            case '-clearallboost':
                // Haze: both sides.
                for (const side of SIDES) if (state.sides[side].active) state.sides[side].active.boosts = {};
                break;
            case '-clearpositiveboost':
            case '-clearnegativeboost': {
                const active = activeOf(rest[0]);
                if (!active) break;
                const keep = tag === '-clearpositiveboost' ? (n) => n < 0 : (n) => n > 0;
                active.boosts = Object.fromEntries(Object.entries(active.boosts).filter(([, n]) => keep(n)));
                break;
            }
            case '-invertboost': {
                const active = activeOf(rest[0]);
                if (active) active.boosts = Object.fromEntries(Object.entries(active.boosts).map(([stat, n]) => [stat, -n]));
                break;
            }
            case '-swapboost':
            case '-copyboost': {
                // `|-swapboost|A|B|atk, spa` trades the listed stats (all of them
                // when none is listed); `|-copyboost|A|B` gives A what B has.
                const a = activeOf(rest[0]);
                const b = activeOf(rest[1]);
                if (!a || !b) break;
                const listed = rest[2] && !rest[2].startsWith('[') ? rest[2].split(',').map((stat) => stat.trim()) : BOOST_STATS;
                const mine = { ...a.boosts };
                const theirs = { ...b.boosts };
                for (const stat of listed) {
                    mine[stat] = b.boosts[stat] || 0;
                    if (tag === '-swapboost') theirs[stat] = a.boosts[stat] || 0;
                }
                a.boosts = cleanBoosts(mine);
                b.boosts = cleanBoosts(theirs);
                break;
            }
            case '-start':
            case '-end': {
                // `|-start|p1a: Mew|Substitute`, `|-start|p2a: Blissey|move: Leech Seed`,
                // `|-start|p1a: Gengar|perish2`, `|-end|p2a: Blissey|move: Taunt`
                const active = activeOf(rest[0]);
                const id = conditionId(rest[1]);
                if (!active || !isKind(id, 'volatile')) break;
                const volatiles = { ...active.volatiles };
                if (tag === '-end') delete volatiles[id];
                else volatiles[id] = id === 'perish' ? Number(String(rest[1]).slice(-1)) || 0 : true;
                active.volatiles = volatiles;
                break;
            }
            case '-sidestart':
            case '-sideend': {
                // `|-sidestart|p2: B|move: Stealth Rock`, `|-sidestart|p2: B|Spikes` (once per layer),
                // `|-sideend|p2: B|Sticky Web|[from] move: Rapid Spin`
                const ident = parseIdent(rest[0]);
                const id = conditionId(rest[1]);
                if (!ident || !isKind(id, 'screen', 'hazard')) break;
                const conditions = { ...state.sides[ident.side].conditions };
                if (tag === '-sideend') delete conditions[id];
                else conditions[id] = (conditions[id] || 0) + 1;
                state.sides[ident.side].conditions = conditions;
                break;
            }
            case '-swapsideconditions': {
                // Court Change: everything on one side is now on the other.
                const mine = state.sides.p1.conditions;
                state.sides.p1.conditions = state.sides.p2.conditions;
                state.sides.p2.conditions = mine;
                break;
            }
            case '-fieldstart':
            case '-fieldend': {
                // `|-fieldstart|move: Trick Room|[of] p2a: Blissey`, `|-fieldend|move: Electric Terrain`
                const id = conditionId(rest[0]);
                if (!isKind(id, 'field')) break;
                if (id.endsWith('terrain')) state.terrain = tag === '-fieldstart' ? id : (state.terrain === id ? null : state.terrain);
                else state.rooms = [...state.rooms.filter((room) => room !== id), ...(tag === '-fieldstart' ? [id] : [])];
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
                    side.active.boosts = {};
                    side.active.volatiles = {};
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
