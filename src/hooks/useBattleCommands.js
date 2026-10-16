import { useEffect, useState } from 'react';

import { play } from '../utils/challengeSfx';

/**
 * The battle menu's state, shared by both layouts of the Champion Challenge
 * (the BW touch screen on a phone, the HUD strip on a desktop): which view is
 * open — the menu, the moves, the party, her team — the move the info box
 * describes, and the choices themselves.
 *
 * A forced switch opens the party with no way back. Keys (through `inputRef`,
 * fed by the console's one keyboard): 1–4 pick a move; in the moves, the
 * arrows walk the 2 × 2 grid and A picks; A opens the moves from the menu; B
 * goes back.
 */
export function useBattleCommands({ request, enabled, onChoose, onForfeit, switchLabel, inputRef }) {
    const forced = request.kind === 'switch';
    const [view, setView] = useState(forced ? 'party' : 'main');
    const [focus, setFocus] = useState(0);

    useEffect(() => {
        setView(forced ? 'party' : 'main');
        setFocus(0);
    }, [forced, request]);

    const moves = request.moves || [];
    const open = (next) => {
        // Her team (and the way back from it) opens while the turn plays, too.
        if (!enabled && next !== 'dossier' && next !== 'main') return;
        play(next === 'main' ? 'cancel' : next === 'moves' ? 'confirm' : 'cursor');
        setView(next);
    };
    const chooseMove = (move) => {
        if (!enabled || !move || move.disabled || move.pp === 0) return;
        play('confirm');
        onChoose(`move ${move.slot}`, move.name);
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
                if (/^[1-4]$/.test(action) && request.kind === 'move') {
                    chooseMove(moves[Number(action) - 1]);
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

    return { view, open, forced, focus, setFocus, chooseMove, chooseSwitch, forfeit };
}
