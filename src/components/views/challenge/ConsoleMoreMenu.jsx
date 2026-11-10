import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';

import { AnchoredPopover } from '../../AnchoredPopover';

/**
 * The console bar's overflow on a phone: one "⋯" chip that holds what does not
 * need a place of its own in the row — the streak, music, sound, speed — so the
 * bar reads crown · clock · Ranking · ⋯ and every chip sits on one line.
 *
 * `items`: `{ id, icon, label, value?, onClick? }`. An item with no `onClick`
 * is a fact (the streak), not a control. A toggle keeps the menu open, so the
 * trainer sees the state change where they tapped.
 */
export function ConsoleMoreMenu({ label, items }) {
    const [open, setOpen] = useState(false);
    const buttonRef = useRef(null);
    const popoverRef = useRef(null);

    useEffect(() => {
        if (!open) return undefined;
        const onPointerDown = (event) => {
            if (buttonRef.current?.contains(event.target) || popoverRef.current?.contains(event.target)) return;
            setOpen(false);
        };
        const onKeyDown = (event) => {
            if (event.key !== 'Escape') return;
            // The console's B button is Escape too: this press is the menu's.
            event.stopPropagation();
            setOpen(false);
            buttonRef.current?.focus();
        };
        document.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('keydown', onKeyDown, true);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('keydown', onKeyDown, true);
        };
    }, [open]);

    return (
        <>
            <button
                ref={buttonRef}
                type="button"
                className="ds-chip is-button"
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={label}
                title={label}
                onClick={() => setOpen((value) => !value)}
            >
                <MoreHorizontal className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            </button>
            <AnchoredPopover isOpen={open} anchorRef={buttonRef} popoverRef={popoverRef} role="menu" ariaLabel={label} offset={6} className="menu-surface ds-more-menu">
                {items.map((item) => (item.onClick ? (
                    <button key={item.id} type="button" role="menuitem" className="menu-item" onClick={item.onClick}>
                        {item.icon}
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {item.value != null && <span className="ds-more-menu__value">{item.value}</span>}
                    </button>
                ) : (
                    <div key={item.id} className="menu-item ds-more-menu__fact">
                        {item.icon}
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    </div>
                )))}
            </AnchoredPopover>
        </>
    );
}
