import { useId, useMemo, useRef, useState } from 'react';

import { useTranslation } from '../../../../hooks/useTranslation';
import { biggestSwing, chartGeometry, nearestIndex, percent, swingCause, toPoints } from '../../../../utils/winChart';

// The chart's box, in DS pixels (the top screen is 256 × 192).
const W = 244;
const H = 104;
const FRAME = { width: W, height: H, left: 24, right: 6, top: 6, bottom: 6 };

/**
 * The win-chance line: one series (no legend — the title names it), the area
 * between it and 50% filled in a diverging pair — your blue above, her gold
 * below, a neutral midline — with each region labelled directly. The biggest
 * swing is the one highlighted step. A crosshair answers hover, a tap and
 * ←/→; the numbers are also in a table for screen readers.
 */
function DsWinChart({ points, swing, championName }) {
    const { t } = useTranslation();
    const clip = useId().replace(/:/g, '');
    const svgRef = useRef(null);
    const [active, setActive] = useState(null);
    const g = useMemo(() => chartGeometry(points, FRAME), [points]);
    const last = points[points.length - 1];

    const pointAt = (event) => {
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect?.width) return;
        setActive(nearestIndex(points, ((event.clientX - rect.left) / rect.width) * W, g));
    };
    const onKeyDown = (event) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        event.stopPropagation();
        const step = event.key === 'ArrowLeft' ? -1 : 1;
        setActive((current) => Math.max(0, Math.min(points.length - 1, (current ?? last.i) + step)));
    };

    const shown = active === null ? null : points[active];
    const label = shown && (shown.turn !== null
        ? t('challenge.result.chartPoint', { n: shown.i, turn: shown.turn, p: percent(shown.p) })
        : t('challenge.result.chartPointNoTurn', { n: shown.i, p: percent(shown.p) }));
    // The tooltip sits above the plot's top edge, clamped inside the box.
    const tipW = Math.min(W - 4, 6 + (label?.length || 0) * 4.1);
    const tipX = shown ? Math.max(2, Math.min(W - tipW - 2, g.x(shown.i) - tipW / 2)) : 0;

    return (
        <>
            <svg
                ref={svgRef}
                className="ds-chart"
                viewBox={`0 0 ${W} ${H}`}
                role="img"
                aria-label={t('challenge.result.chartSummary', { from: percent(points[0].p), to: percent(last.p), n: last.i })}
                tabIndex={0}
                onPointerMove={(event) => { if (event.pointerType === 'mouse') pointAt(event); }}
                onPointerDown={pointAt}
                onPointerLeave={(event) => { if (event.pointerType === 'mouse') setActive(null); }}
                onKeyDown={onKeyDown}
                onBlur={() => setActive(null)}
            >
                <defs>
                    <clipPath id={`${clip}-above`}><rect x="0" y="0" width={W} height={g.midY} /></clipPath>
                    <clipPath id={`${clip}-below`}><rect x="0" y={g.midY} width={W} height={H - g.midY} /></clipPath>
                </defs>

                {[1, 0.5, 0].map((p) => (
                    <g key={p}>
                        <line className={p === 0.5 ? 'ds-chart__mid' : 'ds-chart__grid'} x1={g.plotLeft} x2={g.plotRight} y1={g.y(p)} y2={g.y(p)} />
                        <text className="ds-chart__tick" x={g.plotLeft - 3} y={g.y(p)} textAnchor="end" dominantBaseline="middle">{p * 100}%</text>
                    </g>
                ))}

                <g>
                    <path className="ds-chart__area is-you" d={g.area} clipPath={`url(#${clip}-above)`} />
                    <path className="ds-chart__area is-her" d={g.area} clipPath={`url(#${clip}-below)`} />
                    {swing && (
                        <line
                            className="ds-chart__swing"
                            x1={g.x(swing.index - 1)}
                            y1={g.y(points[swing.index - 1].p)}
                            x2={g.x(swing.index)}
                            y2={g.y(points[swing.index].p)}
                        />
                    )}
                    <path className="ds-chart__line" d={g.line} />
                    {swing && <circle className="ds-chart__swing-dot" cx={g.x(swing.index)} cy={g.y(points[swing.index].p)} r="3" />}
                    <circle className="ds-chart__end" cx={g.x(last.i)} cy={g.y(last.p)} r="2.5" />
                </g>
                {/* Drawn once, left to right: a paper cover slides off the plot (transform only;
                    a transform inside a <clipPath> does not animate in Chromium). */}
                <rect
                    className="ds-chart__cover"
                    x={g.plotLeft + 1}
                    y={g.plotTop - 4}
                    width={g.plotRight - g.plotLeft + 4}
                    height={g.plotBottom - g.plotTop + 8}
                    aria-hidden="true"
                />
                <text className="ds-chart__region" x={g.plotLeft + 3} y={g.plotTop + 7}>{t('challenge.result.chartYou')}</text>
                <text className="ds-chart__region" x={g.plotLeft + 3} y={g.plotBottom - 3}>{t('challenge.result.chartHer', { name: championName })}</text>

                {shown && (
                    <g className="ds-chart__cross" aria-hidden="true">
                        <line x1={g.x(shown.i)} x2={g.x(shown.i)} y1={g.plotTop} y2={g.plotBottom} />
                        <circle cx={g.x(shown.i)} cy={g.y(shown.p)} r="2.5" />
                        <rect x={tipX} y="0" width={tipW} height="11" rx="2" />
                        <text x={tipX + tipW / 2} y="6" textAnchor="middle" dominantBaseline="middle">{label}</text>
                    </g>
                )}
            </svg>
            <table className="sr-only">
                <caption>{t('challenge.result.chartTitle')}</caption>
                <thead>
                    <tr>
                        <th scope="col">{t('challenge.result.chartMove')}</th>
                        <th scope="col">{t('challenge.result.chartTurn')}</th>
                        <th scope="col">{t('challenge.result.chartChance')}</th>
                    </tr>
                </thead>
                <tbody>
                    {points.map((pt) => (
                        <tr key={pt.i}><td>{pt.i}</td><td>{pt.turn ?? '—'}</td><td>{percent(pt.p)}%</td></tr>
                    ))}
                </tbody>
            </table>
        </>
    );
}

/** The swing in words: what happened, and what it did to your chance. */
const swingWords = (t, points, swing, lines) => {
    if (!swing) {
        const values = points.map((pt) => percent(pt.p));
        return { head: null, text: t('challenge.result.chartSteady', { low: Math.min(...values), high: Math.max(...values) }) };
    }
    const before = points[swing.index - 1];
    const after = points[swing.index];
    const cause = before.line !== null && after.line !== null ? swingCause(lines, before.line, after.line, before.turn) : null;
    let head = t('challenge.result.swingStep', { n: swing.index });
    if (cause?.kind === 'faint') {
        head = cause.by
            ? t('challenge.result.swingFaintBy', { turn: cause.turn, by: cause.by, target: cause.target })
            : t('challenge.result.swingFaint', { turn: cause.turn, target: cause.target });
    } else if (cause?.kind === 'move') {
        head = t('challenge.result.swingMove', { turn: cause.turn, by: cause.by, move: cause.move });
    }
    return { head, text: t('challenge.result.swingChance', { from: percent(before.p), to: percent(after.p) }) };
};

/**
 * Top screen after a battle: how your chance of winning moved, decision by
 * decision (the server's M1 curve, full information), and the biggest swing
 * with what caused it — the plan's "chance only at the end, in a chart".
 */
export function DsBattleReport({ run, championName }) {
    const { t } = useTranslation();
    const curve = run.winChanceCurve || run.result?.winChanceCurve;
    const marks = run.winChanceMarks || run.result?.winChanceMarks || null;
    const points = useMemo(() => toPoints(curve || [], marks), [curve, marks]);
    const swing = useMemo(() => biggestSwing(points), [points]);
    const words = swingWords(t, points, swing, run.lines || []);

    return (
        <div className="ds-report">
            <div className="ds-report__head">
                <span className="ds-report__title">{t('challenge.result.chartTitle')}</span>
                <span className="ds-report__sub">{t('challenge.result.chartSub')}</span>
            </div>
            <div className="ds-report__chart">
                <DsWinChart points={points} swing={swing} championName={championName} />
            </div>
            <div className="ds-report__swing" aria-live="polite">
                <span className="ds-report__plate">{t('challenge.result.chartSwing')}</span>
                {words.head && <span className="ds-report__line">{words.head}</span>}
                <span className="ds-report__line is-soft">{words.text}</span>
            </div>
        </div>
    );
}
