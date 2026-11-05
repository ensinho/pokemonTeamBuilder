import { useCallback, useEffect, useRef, useState } from 'react';

import {
    CHAMPION_ROOM, TILE, championTiles, encounterAt, encounterTile, faceToward, facesChampion, findPath, spawnTile, stepTo, tileFromPoint,
} from '../../../../utils/arenaMap';
import { ACTOR_CELL, PLAYER_SHEET, championArt, sheetStyle } from '../../../../utils/challengeArt';
import { CHAMPION_NAMES } from '../../../../utils/challengeChampions';
import { useTranslation } from '../../../../hooks/useTranslation';
import { play } from '../../../../utils/challengeSfx';
import { DsTextBox } from './DsTextBox';

const MAP = CHAMPION_ROOM;
const CHAMPIONS = championTiles(MAP);
const STEP_MS = 160;
const LAMPS = [];
const BANNER = [];
MAP.rows.forEach((row, y) => [...row].forEach((cell, x) => {
    if (cell === 'L') LAMPS.push({ x, y });
    if (cell === 'B') BANNER.push({ x, y });
}));

/*
 * Both characters share one 34 × 36 cell, two tiles tall like the DS overworld:
 * the body is centred on the tile (cell column 17) and the shadow drawn into the
 * frame (cell row 32) sits 3 px above the tile's bottom edge. A character on a
 * lower row is drawn in front, so the player's head covers Cynthia's feet when
 * standing before her — as in the games.
 */
const CELL_CENTRE_X = 17;
const CELL_GROUND_Y = 32;
const actorStyle = (x, y) => ({
    '--ax': x * TILE + TILE / 2 - CELL_CENTRE_X,
    '--ay': (y + 1) * TILE - 3 - CELL_GROUND_Y,
    '--aw': ACTOR_CELL.width,
    '--ah': ACTOR_CELL.height,
    zIndex: 10 + y,
});
/** The opaque part of a character standing on tile (x, y), in DS px — what a tap can hit. */
const bodyBox = (x, y) => {
    const left = x * TILE + TILE / 2 - CELL_CENTRE_X;
    const top = (y + 1) * TILE - 3 - CELL_GROUND_Y;
    return { left: left + 6, right: left + 28, top: top + 5, bottom: top + 34 };
};

/**
 * The Champions' room (top screen): Cynthia on the left, Blue on the right,
 * each under a name plate (✓ once beaten today). The player walks in a grid —
 * arrows/WASD, the D-pad, or a tap anywhere (shortest path, `findPath`) — and
 * the encounter starts on the tile in front of whichever one they reach:
 * `onArrive(championId)`. One React render per step; the glide between tiles
 * is a CSS transform transition.
 *
 * `championId` is the one the screen is about: the speaker of `dialogue`, and
 * who the player stands before with `startAtChampion`. `beaten` lists the ids
 * won today.
 *
 * `inputRef` receives this screen's handlers so the console's single keyboard
 * and D-pad can drive whatever screen is active; `skip(id)` walks straight to
 * one, `release()` lets the player walk again after an arrival that led nowhere.
 */
export function DsArena({
    mode, dialogue = [], championName, inputRef, onArrive, onDialogueDone, reducedMotion, startAtChampion = false,
    championId = CHAMPIONS[0].id, beaten = [],
}) {
    const { t } = useTranslation();
    const startPos = startAtChampion ? encounterTile(MAP, championId) : spawnTile(MAP);
    const [pos, setPos] = useState(startPos);
    const [facing, setFacing] = useState('up');
    const [frame, setFrame] = useState('stand');
    // Who the "!" is over: the Champion just reached.
    const [bang, setBang] = useState(null);
    const [line, setLine] = useState(0);

    const posRef = useRef(startPos);
    const facingRef = useRef('up');
    const heldRef = useRef(null);
    const pathRef = useRef([]);
    const walkingRef = useRef(false);
    const timerRef = useRef(null);
    const arrivedRef = useRef(startAtChampion);
    const advanceRef = useRef(null);
    const modeRef = useRef(mode);
    modeRef.current = mode;

    const stopWalking = useCallback(() => {
        walkingRef.current = false;
        pathRef.current = [];
        clearTimeout(timerRef.current);
        setFrame('stand');
    }, []);

    const arrive = useCallback((id) => {
        if (arrivedRef.current || !id) return;
        arrivedRef.current = true;
        stopWalking();
        facingRef.current = 'up';
        setFacing('up');
        setBang(id);
        play('encounter');
        setTimeout(() => {
            setBang(null);
            onArrive?.(id);
        }, reducedMotion ? 150 : 650);
    }, [onArrive, reducedMotion, stopWalking]);

    const loop = useCallback(() => {
        const dir = pathRef.current.length ? pathRef.current.shift() : heldRef.current;
        if (!dir || modeRef.current !== 'walk' || arrivedRef.current) {
            walkingRef.current = false;
            setFrame('stand');
            return;
        }
        const result = stepTo(MAP, posRef.current, dir);
        facingRef.current = dir;
        setFacing(dir);
        if (result.bumped) {
            play('bump');
            walkingRef.current = false;
            pathRef.current = [];
            setFrame('stand');
            return;
        }
        posRef.current = result.pos;
        play('step');
        setPos(result.pos);
        setFrame((f) => (f === 'stepA' ? 'stepB' : 'stepA'));
        const reached = encounterAt(MAP, result.pos);
        if (reached) {
            timerRef.current = setTimeout(() => arrive(reached), STEP_MS);
            return;
        }
        timerRef.current = setTimeout(loop, STEP_MS);
    }, [arrive]);

    const walk = useCallback(() => {
        if (walkingRef.current) return;
        walkingRef.current = true;
        loop();
    }, [loop]);

    useEffect(() => () => clearTimeout(timerRef.current), []);

    // Back to walking (VOLTAR from the picker or the gate): the player may walk off and come back.
    useEffect(() => {
        if (mode === 'walk') arrivedRef.current = false;
    }, [mode]);

    const onAction = useCallback((action) => {
        if (modeRef.current === 'dialogue') {
            // A is a tap on the text box: finish the line first, then advance.
            if (action === 'a') advanceRef.current?.();
            return;
        }
        if (modeRef.current !== 'walk') return;
        if (['up', 'down', 'left', 'right'].includes(action)) {
            heldRef.current = action;
            pathRef.current = [];
            walk();
        } else if (action === 'a') {
            arrive(facesChampion(MAP, posRef.current, facingRef.current));
        }
    }, [arrive, walk]);

    const onRelease = useCallback((action) => {
        if (heldRef.current === action) heldRef.current = null;
    }, []);

    const skip = useCallback((id = championId) => {
        stopWalking();
        posRef.current = encounterTile(MAP, id);
        setPos(posRef.current);
        arrive(id);
    }, [arrive, championId, stopWalking]);

    const release = useCallback(() => {
        arrivedRef.current = false;
    }, []);

    useEffect(() => {
        if (inputRef) inputRef.current = { onAction, onRelease, skip, release };
    }, [inputRef, onAction, onRelease, skip, release]);

    // Dialogue: one line per A/tap; after the last, hand over.
    useEffect(() => {
        if (mode === 'dialogue' && line >= dialogue.length && dialogue.length) onDialogueDone?.();
    }, [mode, line, dialogue.length, onDialogueDone]);
    // Reset on the way OUT of a dialogue: resetting on the way in races the 'done' check above,
    // which still sees the last dialogue's count and skips the next one entirely.
    useEffect(() => { if (mode !== 'dialogue') setLine(0); }, [mode]);

    const tap = (event) => {
        if (modeRef.current !== 'walk' || arrivedRef.current) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const px = rect.width / 256;
        const dsX = (event.clientX - rect.left) / px;
        const dsY = (event.clientY - rect.top) / px;
        // A Champion's sprite rises a tile above their own (over the banner): a tap anywhere on one is a tap on them.
        const onOne = CHAMPIONS.find((c) => {
            const box = bodyBox(c.x, c.y);
            return dsX >= box.left && dsX <= box.right && dsY >= box.top && dsY <= box.bottom;
        });
        walkTo(onOne || tileFromPoint(dsX, dsY));
    };

    function walkTo(target) {
        const path = findPath(MAP, posRef.current, target);
        if (!path) return;
        heldRef.current = null;
        pathRef.current = path;
        if (!path.length && encounterAt(MAP, posRef.current)) arrive(encounterAt(MAP, posRef.current));
        else walk();
    }

    // A plate is a button: the keyboard's and the screen reader's way to a Champion.
    const goTo = (event, champion) => {
        event.stopPropagation();
        if (modeRef.current !== 'walk' || arrivedRef.current) return;
        walkTo(champion);
    };

    const dialogueText = mode === 'dialogue' ? dialogue[Math.min(line, dialogue.length - 1)] : null;

    return (
        // A click, not pointerdown: a swipe to scroll the page must not start a walk.
        <div className={`ds-arena ${reducedMotion ? 'is-reduced' : ''}`} onClick={tap}>
            <div className="ds-arena__walls" aria-hidden="true" />
            <div className="ds-arena__floor" aria-hidden="true" />
            {/* On the room's axis (x 128): between the two Champions, over the door. */}
            <svg className="ds-arena__ring" viewBox="0 0 256 192" aria-hidden="true">
                <circle cx="128" cy="108" r="58" className="ds-ring__glow" />
                <circle cx="128" cy="108" r="54" className="ds-ring__disc" />
                <rect x="74" y="105" width="108" height="6" className="ds-ring__band" />
                <circle cx="128" cy="108" r="17" className="ds-ring__hub" />
                <circle cx="128" cy="108" r="11" className="ds-ring__button" />
            </svg>
            {BANNER.length > 0 && (
                <div
                    className="ds-arena__banner"
                    style={{ '--bx': BANNER[0].x * TILE, '--by': BANNER[0].y * TILE - 6, '--bw': BANNER.length * TILE }}
                    aria-hidden="true"
                />
            )}
            {LAMPS.map((lamp) => (
                <div key={`${lamp.x}-${lamp.y}`} className="ds-arena__lamp" style={{ '--lx': lamp.x * TILE, '--ly': lamp.y * TILE }} aria-hidden="true" />
            ))}
            <div className="ds-arena__door" aria-hidden="true" />

            {CHAMPIONS.map((c) => (
                <div key={c.id} className="ds-actor ds-actor--champion" style={actorStyle(c.x, c.y)}>
                    <div className="ds-sheet" style={sheetStyle(championArt(c.id).sheet, faceToward(c, pos))} />
                    {/* Who is who, before you walk: the choice is the walk. The "!" takes its place. */}
                    {bang === c.id ? <span className="ds-actor__bang" aria-hidden="true">!</span> : (
                        <button
                            type="button"
                            className={`ds-actor__plate ${beaten.includes(c.id) ? 'is-beaten' : ''}`}
                            onClick={(event) => goTo(event, c)}
                            disabled={mode !== 'walk'}
                            aria-label={t(beaten.includes(c.id) ? 'challenge.arena.goToBeaten' : 'challenge.arena.skip', { name: CHAMPION_NAMES[c.id] })}
                        >
                            {CHAMPION_NAMES[c.id]}{beaten.includes(c.id) ? ' ✓' : ''}
                        </button>
                    )}
                </div>
            ))}
            <div
                className={`ds-actor ds-actor--player ${frame !== 'stand' ? 'is-walking' : ''}`}
                style={actorStyle(pos.x, pos.y)}
            >
                <div className="ds-sheet" style={sheetStyle(PLAYER_SHEET, facing, frame)} />
            </div>

            {dialogueText && (
                <DsTextBox
                    text={dialogueText}
                    speaker={championName}
                    showArrow
                    advanceRef={advanceRef}
                    blip
                    reducedMotion={reducedMotion}
                    onAdvance={() => setLine((n) => n + 1)}
                />
            )}
        </div>
    );
}
