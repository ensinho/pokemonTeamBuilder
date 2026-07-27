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

    for (const line of lines) {
        const parts = line.split('|').slice(1);
        const [tag, ...rest] = parts;

        switch (tag) {
            case 'turn':
                out.push({ kind: 'turn', text: `Turn ${rest[0]}` });
                break;
            case 'move':
                out.push({ kind: 'move', text: `${nick(rest[0])} used ${rest[1]}!` });
                break;
            case 'switch':
            case 'drag':
                out.push({ kind: 'switch', text: `${nick(rest[0])} came out!` });
                break;
            case '-damage': {
                const hp = rest[1] || '';
                out.push({
                    kind: 'damage',
                    text: hp.endsWith('fnt')
                        ? `${nick(rest[0])} fainted!`
                        : `${nick(rest[0])} is at ${hp}.`,
                });
                break;
            }
            case '-heal':
                out.push({ kind: 'heal', text: `${nick(rest[0])} recovered to ${rest[1]}.` });
                break;
            case '-supereffective':
                out.push({ kind: 'effect', text: "It's super effective!" });
                break;
            case '-resisted':
                out.push({ kind: 'effect', text: 'It was not very effective…' });
                break;
            case '-immune':
                out.push({ kind: 'effect', text: `${nick(rest[0])} is immune.` });
                break;
            case '-crit':
                out.push({ kind: 'effect', text: 'A critical hit!' });
                break;
            case '-miss':
                out.push({ kind: 'effect', text: `${nick(rest[0])} missed!` });
                break;
            case '-status':
                out.push({ kind: 'status', text: `${nick(rest[0])} was afflicted (${rest[1]}).` });
                break;
            case '-boost':
                out.push({ kind: 'status', text: `${nick(rest[0])}'s ${rest[1]} rose.` });
                break;
            case '-unboost':
                out.push({ kind: 'status', text: `${nick(rest[0])}'s ${rest[1]} fell.` });
                break;
            case 'faint':
                out.push({ kind: 'faint', text: `${nick(rest[0])} fainted!` });
                break;
            case 'win':
                out.push({ kind: 'win', text: `${rest[0]} won the battle!` });
                break;
            case 'tie':
                out.push({ kind: 'win', text: 'The battle ended in a tie.' });
                break;
            default:
                // Unknown or purely structural line — skip it rather than leak
                // protocol noise into the UI.
                break;
        }
    }

    return out;
};
