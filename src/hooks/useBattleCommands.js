import { useEffect, useState } from 'react';

import { play } from '../utils/challengeSfx';

/**
 * The battle menu's state, shared by both layouts of the Champion Challenge
 * (the BW touch screen on a phone, the HUD strip on a desktop): which view is
 * open — the menu, the moves, the party (the team sheet), her team — the move
 * the info box describes, the party member on the sheet, and the choices.
 *
 * The party is BW's Summary: every member's sheet, readable while the turn
 * plays too; on your turn the one shown can be sent in. A forced switch opens
 * it on the first who can come in, with no way back. Keys (through
 * `inputRef`, fed by the console's one keyboard): 1–4 pick a move; in the
 * moves, the arrows walk the 2 × 2 grid and A picks; in the party ← → walk
 * the six and A sends the one shown in; A opens the moves from the menu; B
 * goes back. `activeIndex` is who the party opens on otherwise.
 *
 * The gimmick switch (2026-11-09): one per Pokémon, because the sim gives a
 * Pokémon at most one — MEGA (its Mega Stone held, `request.canMega`), Z (a
 * Z-Crystal for one of its moves, `request.canZ`) or TERA (`request.canTera`,
 * the type). MEGA starts on, as it always did; Z and TERA start off — each is
 * once a battle, so spending it is the player's decision. With Z on, only the
 * moves that have a Z-Move can be chosen, and they show its name. The switch
 * resets with every new request.
 */
export function useBattleCommands({ request, enabled, onChoose, onForfeit, switchLabel, inputRef, activeIndex = 0 }) {
    const forced = request.kind === 'switch';
    const firstIn = forced && request.switches?.length ? request.switches[0].slot - 1 : 0;
    const [view, setView] = useState(forced ? 'party' : 'main');
    const [focus, setFocus] = useState(0);
    const [member, setMember] = useState(firstIn);
    const gimmick = gimmickOf(request);
    const [armed, setArmed] = useState(gimmick === 'mega');

    useEffect(() => {
        setView(forced ? 'party' : 'main');
        setFocus(0);
        setArmed(gimmick === 'mega');
        if (forced) setMember(firstIn);
    }, [forced, request, firstIn, gimmick]);

    const moves = request.moves || [];
    const size = request.teamSize || 0;
    const open = (next) => {
        // The party and her team (and the way back) open while the turn plays, too.
        if (!enabled && next !== 'dossier' && next !== 'party' && next !== 'main') return;
        play(next === 'main' ? 'cancel' : next === 'moves' ? 'confirm' : 'cursor');
        if (next === 'party' && !forced) setMember(activeIndex);
        setView(next);
    };
    // The sheet's member, if the sim would take them now.
    const switchable = enabled ? (request.switches || []).find((mon) => mon.slot === member + 1) || null : null;
    const chooseMove = (move) => {
        if (!enabled || !move || !moveChoosable(move, gimmick, armed)) return;
        play('confirm');
        const { choice, label } = moveChoice(move, gimmick, armed);
        onChoose(choice, label);
    };
    const toggleGimmick = () => {
        if (!gimmick) return;
        play('cursor');
        setArmed((on) => !on);
    };
    const chooseSwitch = (mon) => {
        if (!enabled) return;
        play('confirm');
        onChoose(`switch ${mon.slot}`, switchLabel(mon.name));
    };
    const forfeit = () => {
        if (!enabled) return;
        play('cursor');
        onForfeit();
    };

    useEffect(() => {
        if (!inputRef) return;
        inputRef.current = {
            onAction: (action) => {
                if (!enabled) return;
                if (action === 'mega') {
                    toggleGimmick();
                } else if (/^[1-4]$/.test(action) && request.kind === 'move') {
                    chooseMove(moves[Number(action) - 1]);
                } else if (view === 'party' && (action === 'left' || action === 'right') && size) {
                    play('cursor');
                    setMember((member + (action === 'left' ? size - 1 : 1)) % size);
                } else if (view === 'party' && action === 'a') {
                    if (switchable) chooseSwitch(switchable);
                } else if (view === 'moves' && ['up', 'down', 'left', 'right'].includes(action)) {
                    const step = { left: -1, right: 1, up: -2, down: 2 }[action];
                    const next = focus + step;
                    if (next >= 0 && next < moves.length) { play('cursor'); setFocus(next); }
                } else if (action === 'a') {
                    if (view === 'main' && request.kind === 'move') open('moves');
                    else if (view === 'moves') chooseMove(moves[focus]);
                } else if (action === 'b' && !forced && view !== 'main') {
                    open('main');
                }
            },
        };
    });

    return {
        view, open, forced, focus, setFocus, member, setMember, switchable, chooseMove, chooseSwitch, forfeit,
        gimmick, armed, toggleGimmick, teraType: request.canTera || null,
    };
}

/** The one gimmick the active Pokémon can use this turn, or null. */
export const gimmickOf = (request) => {
    if (request?.kind !== 'move') return null;
    if (request.canMega) return 'mega';
    if (request.canZ) return 'zmove';
    if (request.canTera) return 'terastallize';
    return null;
};

/** Whether a move can be picked now: with Z armed, only one that has a Z-Move. */
export const moveChoosable = (move, gimmick, armed) => {
    if (!move || move.disabled || move.pp === 0) return false;
    return !(armed && gimmick === 'zmove' && !move.zMove);
};

/** The choice the sim gets for a move, and how the console says it. */
export const moveChoice = (move, gimmick, armed) => {
    const base = `move ${move.slot}`;
    if (!armed || !gimmick) return { choice: base, label: move.name };
    if (gimmick === 'mega') return { choice: `${base} mega`, label: `${move.name} · Mega` };
    if (gimmick === 'terastallize') return { choice: `${base} terastallize`, label: `${move.name} · Tera` };
    if (gimmick === 'zmove' && move.zMove) return { choice: `${base} zmove`, label: move.zMove };
    return { choice: base, label: move.name };
};
