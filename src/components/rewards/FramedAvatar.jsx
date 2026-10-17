import React from 'react';
import { useTrainerCosmetics } from '../../hooks/useTrainerCosmetics';
import { frameProps } from '../../utils/rewards';

/**
 * An avatar container that wears its trainer's frame (rewards, 2026-10-17).
 * Every place that draws a trainer's avatar — forum rows and comments, the
 * profile card, friends, battles, the Home's community posts — renders its own
 * circular container as this, so the frame is the one the trainer has
 * equipped *now*, not the one a post happened to be written with.
 *
 * `as` is the element the call site already used (a button, a span, a div);
 * every other prop passes through, `style` merged with the ring colours.
 */
export function FramedAvatar({ as = 'span', uid, stampedFrameId = null, style, children, ...rest }) {
    const Tag = as;
    const { frameId } = useTrainerCosmetics(uid, { frameId: stampedFrameId });
    const { style: frameStyle, ...frameAttrs } = frameProps(frameId);
    return (
        <Tag {...rest} {...frameAttrs} style={frameStyle ? { ...style, ...frameStyle } : style}>
            {children}
        </Tag>
    );
}

export default FramedAvatar;
