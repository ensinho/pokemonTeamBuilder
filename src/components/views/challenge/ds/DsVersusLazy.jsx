import { useEffect, useState } from 'react';

import { loadedVersus, preloadVersus } from './versusChunk';

/*
 * The VS card as its own chunk: its stylesheet stays out of the route's CSS
 * budget (docs/modules/daily_challenge.md) and loads only when a battle is
 * about to start — `preloadVersus()` warms it a step earlier (the team
 * picker, the lobby).
 *
 * The card stands between the player and the battle, so it can never hold
 * the battle hostage: if its chunk fails or takes longer than `GIVE_UP_MS`,
 * the card is skipped and `onDone` runs at once.
 */

const GIVE_UP_MS = 1800;

export function DsVersusLazy(props) {
    const [Card, setCard] = useState(() => loadedVersus());
    const { onDone } = props;

    useEffect(() => {
        if (Card) return undefined;
        let settled = false;
        const giveUp = () => {
            if (settled) return;
            settled = true;
            onDone?.();
        };
        const timer = setTimeout(giveUp, GIVE_UP_MS);
        preloadVersus().then((component) => {
            if (settled) return;
            clearTimeout(timer);
            if (component) {
                settled = true;
                setCard(() => component);
            } else {
                giveUp();
            }
        });
        return () => {
            settled = true;
            clearTimeout(timer);
        };
        // Once per card.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return Card ? <Card {...props} /> : null;
}
