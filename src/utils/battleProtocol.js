/**
 * Minimal Showdown-protocol reading for the client.
 *
 * Only what's needed to play a turn: what the sim is asking of me, and a readable
 * transcript. The rich battlefield view (sprites, HP bars, animations) is
 * `@pkmn/client` + `@pkmn/view` territory — 82 KB gzipped, added in phase 4. This
 * keeps phase 3 playable without pulling that in yet.
 *
 * Pure and store-free so it can be tested without Firebase or a browser.
 */

/**
 * The sim's latest ask, from my own filtered log.
 *
 * @returns {{kind: 'teamPreview'|'move'|'switch'|'wait'|'none', moves: Array, switches: Array, teamSize: number}}
 */
export const readMyRequest = (myLogLines = []) => {
    const requests = myLogLines.filter((line) => line.startsWith('|request|'));
    const empty = { kind: 'none', moves: [], switches: [], teamSize: 0 };
    if (requests.length === 0) return empty;

    const raw = requests[requests.length - 1].slice('|request|'.length);
    if (!raw.trim()) return empty;

    let payload;
    try {
        payload = JSON.parse(raw);
    } catch {
        return empty;
    }

    if (payload.wait) return { ...empty, kind: 'wait' };

    const roster = payload.side?.pokemon || [];
    // A Pokémon can be switched to if it's on the bench and still standing.
    const switches = roster
        .map((mon, index) => ({
            slot: index + 1,
            name: (mon.details || '').split(',')[0] || mon.ident || `Slot ${index + 1}`,
            condition: mon.condition || '',
            active: Boolean(mon.active),
            fainted: String(mon.condition || '').endsWith(' fnt') || String(mon.condition || '') === '0 fnt',
        }))
        .filter((mon) => !mon.active && !mon.fainted);

    if (payload.teamPreview) {
        return { kind: 'teamPreview', moves: [], switches: [], teamSize: roster.length };
    }

    if (payload.forceSwitch) {
        return { kind: 'switch', moves: [], switches, teamSize: roster.length };
    }

    const active = payload.active?.[0];
    const moves = (active?.moves || []).map((move, index) => ({
        slot: index + 1,
        name: move.move || move.id || `Move ${index + 1}`,
        pp: move.pp,
        maxpp: move.maxpp,
        disabled: Boolean(move.disabled),
    }));

    return { kind: 'move', moves, switches, teamSize: roster.length };
};

/**
 * Protocol lines → readable transcript.
 *
 * Deliberately covers only the common lines and *drops* what it doesn't know
 * rather than printing raw protocol at the user. Phase 4 replaces this with
 * `@pkmn/view`'s full formatter.
 */
export const describeLogLines = (lines = []) => {
    const out = [];
    const nick = (ident) => String(ident || '').replace(/^p[12][a-c]?:\s*/, '');
    const statNames = {
        atk: 'Attack', def: 'Defense', spa: 'Sp. Atk', spd: 'Sp. Def', spe: 'Speed', accuracy: 'Accuracy', evasion: 'Evasion',
    };

    for (const line of lines) {
        const parts = line.split('|').slice(1);
        const [tag, ...rest] = parts;

        switch (tag) {
            case 'turn':
                out.push({ kind: 'turn', turn: Number(rest[0]) || 0, text: `Turn ${rest[0]}` });
                break;
            case 'move':
                out.push({
                    kind: 'move',
                    user: nick(rest[0]),
                    move: rest[1],
                    target: nick(rest[2]),
                    text: `${nick(rest[0])} used ${rest[1]}!`,
                });
                break;
            case 'switch':
            case 'drag':
                out.push({
                    kind: 'switch',
                    mon: nick(rest[0]),
                    details: rest[1] || '',
                    hp: rest[2] || '',
                    text: `${nick(rest[0])} came out!`,
                });
                break;
            case '-damage': {
                const hp = rest[1] || '';
                const fainted = hp.endsWith('fnt') || hp === '0 fnt';
                out.push({
                    kind: 'damage',
                    mon: nick(rest[0]),
                    hp,
                    fainted,
                    text: fainted ? `${nick(rest[0])} fainted!` : `${nick(rest[0])} is at ${hp}.`,
                });
                break;
            }
            case '-heal':
                out.push({
                    kind: 'heal',
                    mon: nick(rest[0]),
                    hp: rest[1] || '',
                    text: `${nick(rest[0])} recovered to ${rest[1]}.`,
                });
                break;
            case '-supereffective':
                out.push({ kind: 'effect', subkind: 'supereffective', target: nick(rest[0]), text: "It's super effective!" });
                break;
            case '-resisted':
                out.push({ kind: 'effect', subkind: 'resisted', target: nick(rest[0]), text: 'It was not very effective…' });
                break;
            case '-immune':
                out.push({ kind: 'effect', subkind: 'immune', mon: nick(rest[0]), text: `${nick(rest[0])} is immune.` });
                break;
            case '-crit':
                out.push({ kind: 'effect', subkind: 'crit', target: nick(rest[0]), text: 'A critical hit!' });
                break;
            case '-miss':
                out.push({ kind: 'effect', subkind: 'miss', mon: nick(rest[0]), text: `${nick(rest[0])} missed!` });
                break;
            case '-status':
                out.push({
                    kind: 'status',
                    subkind: 'afflict',
                    mon: nick(rest[0]),
                    status: rest[1],
                    text: `${nick(rest[0])} was afflicted (${rest[1]}).`,
                });
                break;
            case '-curestatus':
                out.push({
                    kind: 'status',
                    subkind: 'cure',
                    mon: nick(rest[0]),
                    status: rest[1],
                    text: `${nick(rest[0])} was cured of ${rest[1]}!`,
                });
                break;
            case '-boost': {
                const stat = rest[1];
                const amt = Number(rest[2]) || 1;
                const statName = statNames[stat] || stat;
                out.push({
                    kind: 'boost',
                    mon: nick(rest[0]),
                    stat,
                    statName,
                    amount: amt,
                    text: `${nick(rest[0])}'s ${statName} rose!`,
                });
                break;
            }
            case '-unboost': {
                const stat = rest[1];
                const amt = Number(rest[2]) || 1;
                const statName = statNames[stat] || stat;
                out.push({
                    kind: 'boost',
                    mon: nick(rest[0]),
                    stat,
                    statName,
                    amount: -amt,
                    text: `${nick(rest[0])}'s ${statName} fell!`,
                });
                break;
            }
            case '-weather': {
                const weather = rest[0] || '';
                if (weather === 'none' || weather === 'upkeep') break;
                out.push({
                    kind: 'weather',
                    weather,
                    text: weather ? `Weather: ${weather}` : 'Weather cleared.',
                });
                break;
            }
            case '-terastallize':
                out.push({
                    kind: 'tera',
                    mon: nick(rest[0]),
                    teraType: rest[1],
                    text: `${nick(rest[0])} Terastallized into ${rest[1]} type!`,
                });
                break;
            case '-mega':
                out.push({
                    kind: 'mega',
                    mon: nick(rest[0]),
                    text: `${nick(rest[0])} Mega Evolved!`,
                });
                break;
            case '-ability':
                out.push({
                    kind: 'ability',
                    mon: nick(rest[0]),
                    ability: rest[1],
                    text: `${nick(rest[0])}'s ${rest[1]} activated!`,
                });
                break;
            case 'cant':
                out.push({
                    kind: 'cant',
                    mon: nick(rest[0]),
                    reason: rest[1] || '',
                    text: `${nick(rest[0])} is unable to move!`,
                });
                break;
            case 'faint':
                out.push({ kind: 'faint', mon: nick(rest[0]), text: `${nick(rest[0])} fainted!` });
                break;
            case 'win':
                out.push({ kind: 'win', winner: rest[0], text: `${rest[0]} won the battle!` });
                break;
            case 'tie':
                out.push({ kind: 'win', winner: null, text: 'The battle ended in a tie.' });
                break;
            default:
                break;
        }
    }

    return out;
};
