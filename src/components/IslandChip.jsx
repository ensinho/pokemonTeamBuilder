import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import '../styles/live-island.css';

import { useTranslation } from '../hooks/useTranslation';
import { useGamesToday } from '../hooks/useGamesToday';
import { useRoundStore } from '../store/useRoundStore';
import { dayTally, nextGameFor } from '../utils/gamesToday';
import { GAME_DOORS, dayMood, dayTitle } from '../utils/liveIsland';
import { navHue } from '../utils/navHue';
import { track } from '../services/analytics';
import { MascotFace } from './Mascot';
import { DayPips } from './DayPips';
import { DayGames } from './LiveIsland';

/**
 * The island on the Champion's console (2026-11-17, Enzo: "aonde está a
 * ilha?" — he was in a battle). The floating island would sit on the
 * console's own controls (the move buttons, "SEND IN"), so on /challenge it
 * lives in the console's bar instead: a chip with his face and the day's
 * pips; a tap opens the same card — the four, each a tap away, the next one
 * (or the day's receipt at four of four) as the action. App UI, outside the
 * DS screen.
 */
export function IslandChip() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const done = useGamesToday();
    const tally = dayTally(done);
    const next = nextGameFor({ preferred: 'challenge', from: 'challenge', done });
    const openReceipt = useRoundStore((s) => s.openReceipt);
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    // A tap outside, or Escape, puts the card away (the console owns its keys otherwise).
    useEffect(() => {
        if (!open) return undefined;
        const onDown = (event) => { if (ref.current && !ref.current.contains(event.target)) setOpen(false); };
        const onKey = (event) => { if (event.key === 'Escape') { event.stopPropagation(); setOpen(false); } };
        document.addEventListener('pointerdown', onDown);
        document.addEventListener('keydown', onKey, true);
        return () => {
            document.removeEventListener('pointerdown', onDown);
            document.removeEventListener('keydown', onKey, true);
        };
    }, [open]);

    const go = () => {
        setOpen(false);
        track('island_go', { kind: 'day', where: 'challenge' });
        if (next?.kind === 'next') navigate(GAME_DOORS[next.game]);
        else openReceipt('day');
    };

    return (
        <span
            ref={ref}
            className="island-chip"
            style={{ '--island-tone': tally.complete ? 'var(--brand-gold)' : navHue('games') }}
        >
            <button
                type="button"
                className="ds-chip is-button island-chip__pill"
                aria-expanded={open}
                aria-label={`${t('island.day.label')}: ${t('nav.gamesDone', { n: tally.played, total: tally.total })}`}
                onClick={() => { if (!open) track('island_open', { kind: 'day', where: 'challenge' }); setOpen((v) => !v); }}
            >
                <MascotFace mood={dayMood(tally)} size="xs" className="island-chip__face" />
                <DayPips />
            </button>
            {open && (
                <div className="live-island__card island-chip__card" role="dialog" aria-label={t('island.day.label')}>
                    <p className="live-island__title">{dayTitle(t, tally)}</p>
                    <DayGames done={done} here="challenge" onGo={(to) => { setOpen(false); navigate(to); }} />
                    <div className="live-island__actions">
                        <button type="button" className="btn btn-sm live-island__go" onClick={go}>
                            {next?.kind === 'next'
                                ? t('island.day.next', { game: t(`gamesHub.short.${next.game}`) })
                                : t('island.day.receipt')}
                            <ChevronRight aria-hidden="true" />
                        </button>
                    </div>
                </div>
            )}
        </span>
    );
}

export default IslandChip;
