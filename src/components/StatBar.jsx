// Stat bars use Pokémon-canonical stat colors, kept hardcoded.
const STAT_COLORS = {
    hp: 'bg-red-500',
    attack: 'bg-orange-500',
    defense: 'bg-yellow-500',
    'special-attack': 'bg-blue-500',
    'special-defense': 'bg-green-500',
    speed: 'bg-pink-500',
};

export const StatBar = ({ stat, value }) => {
    const width = (value / 255) * 100;
    return (
        <div className="flex items-center gap-2">
            <p className="w-1/3 text-sm font-semibold capitalize text-right text-fg">
                {stat.replace('-', ' ')}
            </p>
            <div className="w-2/3 rounded-full h-4 bg-surface-raised">
                <div
                    className={`${STAT_COLORS[stat]} h-4 rounded-full text-xs text-white flex items-center justify-end pr-2`}
                    style={{ width: `${width}%` }}
                >
                    {value}
                </div>
            </div>
        </div>
    );
};
