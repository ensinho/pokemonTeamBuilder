const STAT_VAR = {
    hp:               '--stat-hp',
    attack:           '--stat-atk',
    defense:          '--stat-def',
    'special-attack': '--stat-spa',
    'special-defense':'--stat-spd',
    speed:            '--stat-spe',
};

// Short, single-line stat labels keep every bar aligned to the same start
// column — the full names ("Special Attack") wrapped to two lines on mobile.
const STAT_LABELS = {
    hp: 'HP',
    attack: 'Atk',
    defense: 'Def',
    'special-attack': 'SpA',
    'special-defense':'SpD',
    speed: 'Spe',
};

/**
 * One base stat: label, figure, bar (design system v3). The figure sits beside
 * the bar in the readout voice instead of inside it — white digits inside a
 * pale canon colour (Def's yellow, SpD's green) were the least legible numbers
 * in the app, and a 16px bar was the loudest thing on the Pokédex entry. The
 * bar keeps the canonical stat colour; it is information, not decoration.
 */
export const StatBar = ({ stat, value, max = 255 }) => {
    const pct = Math.max(2, Math.min(100, (value / max) * 100));
    return (
        <div className="stat-bar" style={{ '--stat-color': `var(${STAT_VAR[stat] ?? '--stat-hp'})` }}>
            <span className="stat-bar__label">{STAT_LABELS[stat] ?? stat.replace('-', ' ')}</span>
            <span className="stat-bar__value">{value}</span>
            <span className="stat-bar__track" aria-hidden="true">
                <span className="stat-bar__fill" style={{ width: `${pct}%` }} />
            </span>
        </div>
    );
};
