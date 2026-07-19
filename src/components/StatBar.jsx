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
    'special-defense': 'SpD',
    speed: 'Spe',
};

export const StatBar = ({ stat, value }) => {
    const width = (value / 255) * 100;
    const color = `var(${STAT_VAR[stat] ?? '--stat-hp'})`;
    return (
        <div className="flex items-center gap-2.5">
            <p className="w-9 shrink-0 text-right text-xs font-bold uppercase tracking-wide text-muted whitespace-nowrap">
                {STAT_LABELS[stat] ?? stat.replace('-', ' ')}
            </p>
            <div className="flex-1 rounded-full h-4" style={{ backgroundColor: 'var(--color-surface-raised)' }}>
                <div
                    className="h-4 rounded-full text-xs font-mono font-bold text-white flex items-center justify-end pr-2"
                    style={{ width: `${Math.max(width, 7)}%`, backgroundColor: color }}
                >
                    {value}
                </div>
            </div>
        </div>
    );
};
