const STAT_VAR = {
    hp:               '--stat-hp',
    attack:           '--stat-atk',
    defense:          '--stat-def',
    'special-attack': '--stat-spa',
    'special-defense':'--stat-spd',
    speed:            '--stat-spe',
};

export const StatBar = ({ stat, value }) => {
    const width = (value / 255) * 100;
    const color = `var(${STAT_VAR[stat] ?? '--stat-hp'})`;
    return (
        <div className="flex items-center gap-2">
            <p className="w-1/3 text-sm font-semibold capitalize text-right" style={{ color: 'var(--color-fg)' }}>
                {stat.replace('-', ' ')}
            </p>
            <div className="w-2/3 rounded-full h-4" style={{ backgroundColor: 'var(--color-surface-raised)' }}>
                <div
                    className="h-4 rounded-full text-xs font-mono font-bold text-white flex items-center justify-end pr-2"
                    style={{ width: `${width}%`, backgroundColor: color }}
                >
                    {value}
                </div>
            </div>
        </div>
    );
};
