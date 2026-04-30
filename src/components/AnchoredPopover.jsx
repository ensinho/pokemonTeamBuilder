import React, { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const AnchoredPopover = ({
    isOpen,
    anchorRef,
    popoverRef,
    children,
    className = '',
    style = {},
    arrowStyle,
    viewportPadding = 16,
    offset = 10,
    zIndex = 80,
    role = 'dialog',
    ariaLabel,
}) => {
    const [position, setPosition] = useState(null);

    useLayoutEffect(() => {
        if (!isOpen) {
            setPosition(null);
            return undefined;
        }

        if (typeof window === 'undefined' || !anchorRef?.current || !popoverRef?.current) {
            return undefined;
        }

        let frame = 0;
        const updatePosition = () => {
            if (!anchorRef.current || !popoverRef.current) return;

            const anchorRect = anchorRef.current.getBoundingClientRect();
            const popoverRect = popoverRef.current.getBoundingClientRect();
            const centeredLeft = anchorRect.left + (anchorRect.width / 2) - (popoverRect.width / 2);
            const maxLeft = Math.max(viewportPadding, window.innerWidth - popoverRect.width - viewportPadding);
            const left = clamp(centeredLeft, viewportPadding, maxLeft);
            const top = anchorRect.bottom + offset;
            const maxHeight = Math.max(140, window.innerHeight - top - viewportPadding);
            const arrowLeft = clamp(
                anchorRect.left + (anchorRect.width / 2) - left,
                18,
                Math.max(18, popoverRect.width - 18)
            );

            setPosition({ top, left, maxHeight, arrowLeft });
        };

        const scheduleUpdate = () => {
            window.cancelAnimationFrame(frame);
            frame = window.requestAnimationFrame(updatePosition);
        };

        scheduleUpdate();

        const resizeObserver = typeof ResizeObserver !== 'undefined'
            ? new ResizeObserver(scheduleUpdate)
            : null;

        resizeObserver?.observe(anchorRef.current);
        resizeObserver?.observe(popoverRef.current);
        window.addEventListener('resize', scheduleUpdate);
        window.addEventListener('scroll', scheduleUpdate, true);

        return () => {
            window.cancelAnimationFrame(frame);
            resizeObserver?.disconnect();
            window.removeEventListener('resize', scheduleUpdate);
            window.removeEventListener('scroll', scheduleUpdate, true);
        };
    }, [isOpen, anchorRef, popoverRef, viewportPadding, offset]);

    if (!isOpen || typeof document === 'undefined') {
        return null;
    }

    return createPortal(
        <div
            ref={popoverRef}
            role={role}
            aria-label={ariaLabel}
            className={`animate-fade-in ${className}`.trim()}
            style={{
                position: 'fixed',
                top: position?.top ?? -9999,
                left: position?.left ?? viewportPadding,
                maxHeight: position?.maxHeight,
                overflowY: 'auto',
                visibility: position ? 'visible' : 'hidden',
                zIndex,
                ...style,
            }}
        >
            {arrowStyle && (
                <span
                    className="absolute -top-1.5 h-3 w-3 -translate-x-1/2 rotate-45"
                    style={{
                        left: position ? `${position.arrowLeft}px` : '50%',
                        ...arrowStyle,
                    }}
                    aria-hidden="true"
                />
            )}
            {children}
        </div>,
        document.body
    );
};