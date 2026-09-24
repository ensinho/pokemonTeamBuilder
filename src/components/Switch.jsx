import React, { useId } from 'react';

/**
 * The app's one on/off control (design system v2). A `role="switch"` button, so
 * it is keyboard-operable and announced as a switch; the knob physics — the
 * glide across, the stretch under the finger — live in interactions.css.
 *
 * - `label` / `description`: the words. With neither, pass an `aria-label`.
 * - `variant="row"`: a settings line — words left, switch at the far edge.
 * - `size="sm"`: dense rows (the damage calculator's move lines).
 * - `tone`: the "on" colour, any CSS colour; defaults to the theme primary.
 */
export function Switch({
    checked,
    onChange,
    label,
    description,
    variant,
    size,
    tone,
    disabled = false,
    className = '',
    style,
    ...rest
}) {
    const id = useId();
    const labelId = label ? `${id}-label` : undefined;
    const descriptionId = description ? `${id}-description` : undefined;
    const classes = [
        'switch',
        variant === 'row' && 'switch--row',
        size === 'sm' && 'switch--sm',
        className,
    ].filter(Boolean).join(' ');

    return (
        <button
            type="button"
            role="switch"
            aria-checked={Boolean(checked)}
            aria-labelledby={labelId}
            aria-describedby={descriptionId}
            disabled={disabled}
            onClick={() => onChange?.(!checked)}
            className={classes}
            style={tone ? { '--switch-on': tone, ...style } : style}
            {...rest}
        >
            <span className="switch__track" aria-hidden="true">
                <span className="switch__knob" />
            </span>
            {(label || description) && (
                <span className="switch__text">
                    {label && <span id={labelId} className="switch__label">{label}</span>}
                    {description && <span id={descriptionId} className="switch__description">{description}</span>}
                </span>
            )}
        </button>
    );
}
