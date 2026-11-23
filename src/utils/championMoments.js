/**
 * The Champion Challenge's way in and way out (2026-11-22, the "momentos
 * vivos" pass — Enzo: Hall da Fama em toda vitória do dia).
 *
 * - **Power on:** the screen lights like a CRT (a white line that opens) and
 *   the room appears through an iris centred on the trainer's spawn, as the
 *   games open a scene.
 * - **Hall of Fame:** an official win played on this screen enters the team
 *   into the Hall, one Pokémon at a time, before the result.
 * - **Blackout:** an official loss played here closes to black around the
 *   trainer, one line, then the result.
 * - **Power off:** leaving the result for the room switches the screen off
 *   like a CRT before the room powers on again.
 *
 * Pure: which finale a run gets, where the iris opens, the team and the date
 * the Hall shows, and the timings the CSS animations are written against
 * (styles/champion-moments.css — keep the two equal).
 */
import { spawnTile } from './arenaMap.js';
import { myRoster } from './challengeView.js';

export const CHAMPION_MOMENTS = Object.freeze({
    powerOn: 1250,     // the CRT line (0–320 ms), then the iris (380–1180 ms)
    powerOff: 420,     // the picture folds to a line, the line to a dot
    hallFirst: 450,    // the first Pokémon walks in
    hallEach: 380,     // and each next one
    hallTitle: 2850,   // the plaque drops
    hall: 3900,        // the Hall hands over to the result
    blackout: 2300,    // closing to black, the line, the hand-over
});

/**
 * Which finale a run gets: the Hall of Fame for an official win and the
 * blackout for an official loss — only when the battle was played on this
 * screen (a result opened later, or a practice run, goes straight to the
 * figures).
 * @returns {'hall'|'blackout'|null}
 */
export function finaleFor(run, startedRunId) {
    if (!run || !startedRunId || run.runId !== startedRunId || run.practice) return null;
    if (run.status === 'won') return 'hall';
    if (run.status === 'lost' || run.status === 'forfeit') return 'blackout';
    return null;
}

/** Where the power-on iris opens: the spawn tile's centre, in % of the screen. */
export function irisOrigin(map) {
    const spawn = spawnTile(map) || { x: map.width / 2, y: map.height - 1 };
    const pct = (n) => `${Math.round(n * 1000) / 10}%`;
    return { x: pct((spawn.x + 0.5) / map.width), y: pct((spawn.y + 0.5) / map.height) };
}

/** The team the Hall shows: the trainer's own six, in order, from the battle's last request. */
export function hallTeam(lines = []) {
    return myRoster(lines).map((mon) => mon.species).filter(Boolean).slice(0, 6);
}

/** The Hall's plaque date: the challenge day ('YYYY-MM-DD') as dd/mm/yyyy. */
export function hallDate(dayKey) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dayKey || ''));
    return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

/** When the n-th Pokémon of the Hall walks in (ms from the Hall's start). */
export const hallEntryAt = (index) => CHAMPION_MOMENTS.hallFirst + index * CHAMPION_MOMENTS.hallEach;
