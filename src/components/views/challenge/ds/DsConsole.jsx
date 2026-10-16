import { useTranslation } from '../../../../hooks/useTranslation';
import { useScreenScale } from '../../../../hooks/useScreenScale';

const DIRECTIONS = ['up', 'left', 'right', 'down'];

/**
 * The D-pad and A/B. Press-and-hold walks: `pointerdown` starts, release (or
 * the pointer leaving) stops — captured, so a thumb sliding off the button
 * still ends the walk. `touch-action: none` keeps the page from scrolling
 * under the thumb.
 */
function DsControls({ onAction, onRelease }) {
    const { t } = useTranslation();
    const press = (action) => (event) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture?.(event.pointerId);
        onAction(action);
    };
    const release = (action) => () => onRelease(action);

    return (
        <div className="ds-controls">
            <div className="ds-dpad" role="group" aria-label={t('challenge.console.dpad')}>
                {DIRECTIONS.map((dir) => (
                    <button
                        key={dir}
                        type="button"
                        className={`ds-dpad__btn is-${dir}`}
                        aria-label={t(`challenge.console.${dir}`)}
                        onPointerDown={press(dir)}
                        onPointerUp={release(dir)}
                        onPointerCancel={release(dir)}
                        onLostPointerCapture={release(dir)}
                    />
                ))}
            </div>
            <div className="ds-ab">
                <button type="button" className="ds-ab__btn is-b" onClick={() => onAction('b')}>B</button>
                <button type="button" className="ds-ab__btn is-a" onClick={() => onAction('a')}>A</button>
            </div>
        </div>
    );
}

/**
 * The console. `layout="dual"`: a top screen and a bottom screen, each
 * 256 × 192 DS pixels scaled to fit (`--px`), stacked like an open DS — a
 * phone. `layout="single"`: one screen holds everything (`screen`), the way a
 * Black & White battle reads on a desktop. The frame follows the app's theme;
 * the screens keep the game's palette (`--ds-*`, the design-system exception).
 *
 * `rails` (single layout only): `{ mode: 'one'|'two', start, end }` — BW menus
 * beside the screen where the column has room (`useRailMode`): the teams and
 * the ranking, one each side, or both stacked on the right.
 */
export function DsConsole({ layout = 'dual', screen, top, bottom, bar, onAction, onRelease, controls = true, label, rails = null }) {
    const { t } = useTranslation();
    const topRef = useScreenScale();
    const bottomRef = useScreenScale();
    const mainRef = useScreenScale();
    if (layout === 'single') {
        const frame = (
            <section className="ds-console is-single" aria-label={label}>
                <svg className="ds-defs" width="0" height="0" aria-hidden="true" focusable="false">
                    <filter id="ds-lcd-ink" colorInterpolationFilters="sRGB">
                        <feColorMatrix type="matrix" values="0 0 0 0 0.16  0 0 0 0 0.27  0 0 0 0 0.15  0 0 0 1 0" />
                    </filter>
                </svg>
                {bar && <div className="ds-console__bar">{bar}</div>}
                <div className="ds-console__body is-single">
                    <div className="ds-screen is-main" ref={mainRef}>{screen}</div>
                </div>
            </section>
        );
        // Always the same tree, rails or not: the screen inside never remounts
        // (the room would lose where the player stood) when the rails come and go.
        const on = Boolean(rails && rails.mode !== 'none');
        return (
            <div className={`ds-deck is-${on ? rails.mode : 'none'}`}>
                {on && <aside className="ds-rail is-start" aria-label={t('challenge.rail.teams')}>{rails.start}</aside>}
                {frame}
                {on && <aside className="ds-rail is-end" aria-label={t('challenge.ranking.title')}>{rails.end}</aside>}
            </div>
        );
    }
    return (
        <section className="ds-console" aria-label={label}>
            {/* One filter for every Pokétch silhouette: any opaque pixel → LCD ink. */}
            <svg className="ds-defs" width="0" height="0" aria-hidden="true" focusable="false">
                <filter id="ds-lcd-ink" colorInterpolationFilters="sRGB">
                    <feColorMatrix type="matrix" values="0 0 0 0 0.16  0 0 0 0 0.27  0 0 0 0 0.15  0 0 0 1 0" />
                </filter>
            </svg>
            {bar && <div className="ds-console__bar">{bar}</div>}
            <div className="ds-console__body">
                <div className="ds-screen is-top" ref={topRef}>{top}</div>
                <div className="ds-console__lower">
                    <div className="ds-screen is-bottom" ref={bottomRef}>{bottom}</div>
                    {controls && <DsControls onAction={onAction} onRelease={onRelease} />}
                </div>
            </div>
        </section>
    );
}
