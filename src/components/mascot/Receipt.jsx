import React, { useMemo } from 'react';
import '../../styles/receipt.css';
import { Mascot } from '../Mascot';
import { receiptBars } from '../../utils/mascot/roundReceipt';

/**
 * The mascot's receipt (2026-11-17, "Fantasminha de plantão" — the dusk bot's
 * routine receipt, rebuilt in this app's material): paper, mono, dashed
 * rules, dotted leaders, a torn edge, his stamp and the trainer's code.
 * Presentational: the rows come worded from the caller.
 *
 * Only for summing up what he did (the round, the day). The stamp is Volt
 * for "done" and gold only for a day of four games — something earned.
 */

/** label · · · · · value — one line of the receipt. */
export function ReceiptRow({ label, value, bold = false }) {
    return (
        <li className={`receipt__row ${bold ? 'is-bold' : ''}`}>
            <span className="receipt__name">{label}</span>
            <span className="receipt__lead" aria-hidden="true" />
            <span className="receipt__value">{value}</span>
        </li>
    );
}

/** His face in a square and one word, pressed once (the pop spring). */
export function ReceiptStamp({ mood = 'feliz', hat, word, sub, gold = false, press = false }) {
    return (
        <div className={`receipt-stamp ${gold ? 'is-gold' : ''} ${press ? 'is-pressed' : ''}`}>
            {sub && <span className="receipt-stamp__sub">{sub}</span>}
            <Mascot size="lg" mood={mood} hat={hat} seasonal={false} className="receipt-stamp__face" />
            <span className="receipt-stamp__word">{word}</span>
        </div>
    );
}

/** The trainer's code as bars, then as digits. */
export function ReceiptCode({ code, label }) {
    const { bars, width } = useMemo(() => receiptBars(code), [code]);
    return (
        <div className="receipt__code">
            <svg className="receipt__bars" viewBox={`0 0 ${width} 40`} preserveAspectRatio="none" aria-hidden="true">
                {bars.map(([x, w]) => <rect key={x} x={x} y="0" width={w} height="40" />)}
            </svg>
            <span className="receipt__id">{label} {code}</span>
        </div>
    );
}

/**
 * @param {object} p
 * @param {string} p.kind        the eyebrow ("Recibo da ronda")
 * @param {Array<[string, string]>} p.meta   key/value lines under it
 * @param {[string, string]} p.columns       the items' heading
 * @param {Array<{ label, value, bold }>} p.rows
 * @param {Array<[string, string, boolean?]>} p.totals  the sum lines (the last is the status)
 * @param {[string, string]} p.next          when the next round is
 * @param {React.ReactNode} p.stamp
 * @param {string} p.bye                     his last line
 * @param {{ code: string, label: string }} p.code
 * @param {boolean} p.printing               the paper feeds out once (opened by the trainer)
 */
export function Receipt({ brand, kind, meta = [], columns, rows = [], totals = [], next, stamp, bye, code, printing = false, children }) {
    return (
        <div className="receipt-slot">
            <article className={`receipt ${printing ? 'is-printing' : ''}`}>
                <header className="receipt__header">
                    <p className="receipt__brand">
                        <Mascot size="xs" mood="feliz" seasonal={false} />
                        <span>{brand}</span>
                    </p>
                    <p className="receipt__kind">{kind}</p>
                    {meta.length > 0 && (
                        <dl className="receipt__meta receipt__meta--compact">
                            {meta.map(([key, value]) => (
                                <div key={key}><dt>{key}</dt><dd>{value}</dd></div>
                            ))}
                        </dl>
                    )}
                </header>
                <hr className="receipt__rule" />
                {columns && (
                    <p className="receipt__columns" aria-hidden="true"><span>{columns[0]}</span><span>{columns[1]}</span></p>
                )}
                <ul className="receipt__rows">
                    {rows.map((row, i) => <ReceiptRow key={`${row.label}-${i}`} {...row} />)}
                </ul>
                <hr className="receipt__rule" />
                <dl className="receipt__meta receipt__totals">
                    {totals.map(([key, value], i) => (
                        <div key={key} className={i === totals.length - 1 ? 'is-status' : ''}><dt>{key}</dt><dd>{value}</dd></div>
                    ))}
                </dl>
                {next && (
                    <>
                        <hr className="receipt__rule" />
                        <dl className="receipt__meta"><div><dt>{next[0]}</dt><dd>{next[1]}</dd></div></dl>
                    </>
                )}
                {stamp}
                {bye && <p className="receipt__bye">{bye}</p>}
                {code && <ReceiptCode code={code.code} label={code.label} />}
                {children && <div className="receipt__actions">{children}</div>}
            </article>
        </div>
    );
}

export default Receipt;
