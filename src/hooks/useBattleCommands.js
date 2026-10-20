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
 * MEGA: when the active Pokémon holds its Mega Stone (`request.canMega`) the
 * switch is on, so the chosen move Mega Evolves it first — the player can turn
 * it off for this turn. It resets with every new request.
 */
export function useBattleCommands({ request, enabled, onChoose, onForfeit, switchLabel, inputRef, activeIndex = 0 }) {
    const forced = request.kind === 'switch';
    const firstIn = forced && request.switches?.length ? request.switches[0].slot - 1 : 0;
    const [view, setView] = useState(forced ? 'party' : 'main');
    const [focus, setFocus] = useState(0);
    const [member, setMember] = useState(firstIn);
    const canMega = request.kind === 'move' && Boolean(request.canMega);
    const [mega, setMega] = useState(true);

    useEffect(() => {
        setView(forced ? 'party' : 'main');
        setFocus(0);
        setMega(true);
        if (forced) setMember(firstIn);
    }, [forced, request, firstIn]);

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
        if (!enabled || !move || move.disabled || move.pp === 0) return;
        play('confirm');
        const megaNow = canMega && mega;
        onChoose(`move ${move.slot}${megaNow ? ' mega' : ''}`, megaNow ? `${move.name} · Mega` : move.name);
    };
    const toggleMega = () => {
        if (!canMega) return;
        play('cursor');
        setMega((on) => !on);
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
                    toggleMega();
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
        canMega, mega, toggleMega,
    };
}
