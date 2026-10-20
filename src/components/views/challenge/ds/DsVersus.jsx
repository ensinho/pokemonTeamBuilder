import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronsUp, Crown, Flame, Star, Swords, Trophy } from 'lucide-react';

import { useTranslation } from '../../../../hooks/useTranslation';
import { play } from '../../../../utils/challengeSfx';
import '../../../../styles/battle-versus.css';

/*
 * The "VS" card before a battle: two trainers on a split band — blue for you,
 * red (a friend) or violet (the Champion) for them — the band sweeping in, the
 * portraits sliding from the edges, the VS slamming down between them, then
 * names and badges. Shared by the Champion Challenge and the friend battles.
 *
 * A tap, a key or A skips it; it is never in the way of the battle. Under
 * reduced motion it is the still card, briefly.
 */

/*
 * The VS, as pixels — two 12 × 14 letters a two-cell gap apart. Drawn as an
 * SVG path on a 1-unit grid (crisp at any size): a black outline one cell
 * wide, a drop shadow, the fill, and a lit top edge.
 */
const LETTER_V = [
    'XXX......XXX',
    'XXX......XXX',
    'XXX......XXX',
    'XXX......XXX',
    'XXX......XXX',
    'XXXX....XXXX',
    '.XXX....XXX.',
    '.XXXX..XXXX.',
    '..XXX..XXX..',
    '..XXXXXXXX..',
    '...XXXXXX...',
    '...XXXXXX...',
    '....XXXX....',
    '....XXXX....',
];
const LETTER_S = [
    '..XXXXXXXXX.',
    '.XXXXXXXXXXX',
    'XXXX.....XXX',
    'XXX.......XX',
    'XXXX........',
    '.XXXXXXXXX..',
    '..XXXXXXXXX.',
    '.......XXXXX',
    '.........XXX',
    'XX.......XXX',
    'XXX......XXX',
    'XXXX....XXXX',
    '.XXXXXXXXXX.',
    '..XXXXXXXX..',
];
const GLYPH = LETTER_V.map((row, i) => `${row}..${LETTER_S[i]}`);
const GLYPH_W = GLYPH[0].length;
const GLYPH_H = GLYPH.length;
const PAD = 2; // room for the outline and the shadow

const on = (x, y) => y >= 0 && y < GLYPH_H && x >= 0 && x < GLYPH_W && GLYPH[y][x] === 'X';

/** Cells → one path of unit squares, offset by `dx`, `dy`. */
const pathOf = (cells, dx = 0, dy = 0) => cells.map(([x, y]) => `M${x + PAD + dx} ${y + PAD + dy}h1v1h-1z`).join('');

const GLYPH_PATHS = (() => {
    const fill = [];
    const lit = [];
    const outline = new Set();
    for (let y = 0; y < GLYPH_H; y += 1) {
        for (let x = 0; x < GLYPH_W; x += 1) {
            if (!on(x, y)) continue;
            fill.push([x, y]);
            if (!on(x, y - 1)) lit.push([x, y]);
            for (let oy = -1; oy <= 1; oy += 1) {
                for (let ox = -1; ox <= 1; ox += 1) outline.add(`${x + ox},${y + oy}`);
            }
        }
    }
    const ring = [...outline].map((key) => key.split(',').map(Number));
    return {
        shadow: pathOf(ring, 1, 1),
        outline: pathOf(ring),
        fill: pathOf(fill),
        lit: pathOf(lit),
    };
})();

function VsGlyph() {
    return (
        <svg
            className="ds-vs__glyph-art"
            viewBox={`0 0 ${GLYPH_W + PAD * 2 + 1} ${GLYPH_H + PAD * 2 + 1}`}
            shapeRendering="crispEdges"
            aria-hidden="true"
            focusable="false"
        >
            <defs>
                <linearGradient id="ds-vs-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" className="ds-vs__stop-top" />
                    <stop offset="0.55" className="ds-vs__stop-mid" />
                    <stop offset="1" className="ds-vs__stop-bottom" />
                </linearGradient>
            </defs>
            <path className="ds-vs__glyph-shadow" d={GLYPH_PATHS.shadow} />
            <path className="ds-vs__glyph-outline" d={GLYPH_PATHS.outline} />
            <path d={GLYPH_PATHS.fill} fill="url(#ds-vs-fill)" />
            <path className="ds-vs__glyph-lit" d={GLYPH_PATHS.lit} />
        </svg>
    );
}

const BADGE_ICONS = { star: Star, crown: Crown, flame: Flame, chevrons: ChevronsUp, trophy: Trophy, swords: Swords };

/** A hexagon badge: an icon, or a short figure over a tiny label. */
function HexBadge({ icon, value, label }) {
    const Icon = BADGE_ICONS[icon] || null;
    return (
        <span className="ds-vs__hex" title={label} aria-label={label}>
            {value != null
                ? <span className="ds-vs__hex-value">{value}</span>
                : Icon && <Icon className="ds-vs__hex-icon" aria-hidden="true" />}
        </span>
    );
}

/**
 * One trainer's half: the portrait on the band, the name plate under it.
 * @param {{name: string, tag?: string, subtitle?: string, portrait?: {src: string, kind: 'trainer'|'pokemon'}, badges?: Array}} trainer
 */
function Portrait({ trainer, side }) {
    const [failed, setFailed] = useState(false);
    if (!trainer?.portrait?.src || failed) return null;
    return (
        <img
            className={`ds-vs__portrait is-${side} is-${trainer.portrait.kind || 'trainer'}`}
            src={trainer.portrait.src}
            alt=""
            draggable="false"
            decoding="async"
            onError={() => setFailed(true)}
        />
    );
}

function NamePlate({ trainer, side }) {
    return (
        <div className={`ds-vs__plate is-${side}`}>
            {trainer.tag && <span className="ds-vs__tag">{trainer.tag}</span>}
            <span className="ds-vs__name">{trainer.name}</span>
            {trainer.subtitle && <span className="ds-vs__subtitle">{trainer.subtitle}</span>}
            {trainer.badges?.length > 0 && (
                <span className="ds-vs__badges">
                    {trainer.badges.map((badge, index) => (
                        // A trainer's badges are a fixed short list per card.
                        <HexBadge key={index} {...badge} />
                    ))}
                </span>
            )}
        </div>
    );
}

const DURATION_MS = 2700;
const REDUCED_MS = 1400;
const LEAVE_MS = 320;
const SLAM_AT_MS = 560;

/**
 * @param {object} props
 * @param {object} props.left        you
 * @param {object} props.right       your opponent
 * @param {'champion'|'rival'} [props.variant]
 * @param {boolean} [props.reducedMotion]
 * @param {() => void} props.onDone  the card has left (played out or skipped)
 */
export function DsVersus({ left, right, variant = 'rival', reducedMotion = false, onDone }) {
    const { t } = useTranslation();
    const [leaving, setLeaving] = useState(false);
    const done = useRef(false);
    const doneRef = useRef(onDone);
    doneRef.current = onDone;

    const finish = useCallback(() => {
        if (done.current) return;
        done.current = true;
        doneRef.current?.();
    }, []);

    const leave = useCallback(() => {
        if (leaving || done.current) return;
        setLeaving(true);
        setTimeout(finish, reducedMotion ? 120 : LEAVE_MS);
    }, [leaving, finish, reducedMotion]);

    useEffect(() => {
        play('whoosh');
        const slam = setTimeout(() => play('versus'), reducedMotion ? 0 : SLAM_AT_MS);
        const out = setTimeout(leave, reducedMotion ? REDUCED_MS : DURATION_MS);
        return () => {
            clearTimeout(slam);
            clearTimeout(out);
        };
        // Once per card: `leave` changes identity when it starts leaving.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Any key skips it (A and Enter included) — capture, so the console's own
    // keyboard doesn't also act on the press.
    useEffect(() => {
        const onKey = (event) => {
            event.preventDefault();
            event.stopPropagation();
            leave();
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [leave]);

    return (
        <div
            className={`ds-vs is-${variant} ${reducedMotion ? 'is-reduced' : ''} ${leaving ? 'is-leaving' : ''}`}
            onPointerDown={leave}
            role="presentation"
        >
            <p className="sr-only" aria-live="assertive">{t('battle.stage.versusLabel', { left: left.name, right: right.name })}</p>
            <div className="ds-vs__band" aria-hidden="true">
                <div className="ds-vs__side is-left">
                    <span className="ds-vs__lines" />
                    <Portrait trainer={left} side="left" />
                </div>
                <div className="ds-vs__side is-right">
                    <span className="ds-vs__lines" />
                    <Portrait trainer={right} side="right" />
                </div>
            </div>
            <div className="ds-vs__glyph" aria-hidden="true"><VsGlyph /></div>
            <div className="ds-vs__plates" aria-hidden="true">
                <NamePlate trainer={left} side="left" />
                <NamePlate trainer={right} side="right" />
            </div>
            <span className="ds-vs__flash" aria-hidden="true" />
            <span className="ds-vs__skip" aria-hidden="true">{t('battle.stage.versusSkip')}</span>
        </div>
    );
}
