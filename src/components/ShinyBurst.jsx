import React from 'react';

// Six sparks around the control: angle (deg), how far they fly, a small stagger
// so the burst reads as a sparkle rather than a ring, and a size spread.
const SPARKS = [
    { angle: 0, reach: '1.35rem', delay: 0, size: '0.5rem' },
    { angle: 62, reach: '1.1rem', delay: 40, size: '0.375rem' },
    { angle: 118, reach: '1.3rem', delay: 20, size: '0.4375rem' },
    { angle: 180, reach: '1.05rem', delay: 60, size: '0.375rem' },
    { angle: 238, reach: '1.35rem', delay: 10, size: '0.5rem' },
    { angle: 300, reach: '1.15rem', delay: 50, size: '0.375rem' },
];

/**
 * The sparkle a shiny Pokémon makes when it appears (design system v2; styles
 * in interactions.css). Rendered by `useShinyBurst` — mount it through the
 * hook, which is what guarantees it only ever answers a click.
 */
export function ShinyBurst() {
    return (
        <span className="shiny-burst" aria-hidden="true">
            {SPARKS.map((spark) => (
                <i
                    key={spark.angle}
                    style={{
                        '--angle': `${spark.angle}deg`,
                        '--reach': spark.reach,
                        '--delay': `${spark.delay}ms`,
                        '--size': spark.size,
                    }}
                />
            ))}
        </span>
    );
}
