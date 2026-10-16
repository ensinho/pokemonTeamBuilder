import { typeColors, typeIcons } from '../../../constants/types';
import { getBattleIcon } from '../../../utils/battleSprites';
import { hpTone, parseCondition } from '../../../utils/battleState';
import { PokeballIcon } from '../../icons';

/**
 * The two choice buttons a battle turn is made of — shared by the friend
 * battles (`BattleDetailView`) and the Champion Challenge, so a move looks and
 * reads the same against a friend and against Cynthia.
 */

/** Move button styled with type color chip accents. */
export function MoveOption({ move, disabled, onClick, typeForMove }) {
    const mType = typeForMove ? typeForMove(move.name) : null;
    const color = mType ? typeColors[mType] : null;
    const iconUrl = mType ? typeIcons[mType] : null;

    return (
        <button
            type="button"
            className="battle-move battle-move--chip"
            disabled={disabled}
            onClick={onClick}
            style={color ? {
                '--move-type-color': color,
                borderColor: `${color}99`,
                background: `linear-gradient(135deg, color-mix(in srgb, ${color} 22%, var(--color-surface)) 0%, var(--color-surface) 100%)`,
            } : {}}
        >
            <div className="battle-move__header">
                {iconUrl ? (
                    <img src={iconUrl} alt={mType || ''} className="battle-move__type-icon" />
                ) : mType ? (
                    <span className="battle-move__type-tag" style={{ backgroundColor: color }}>
                        {mType}
                    </span>
                ) : null}
                <span className="battle-move__name">{move.name}</span>
            </div>
            {Number.isFinite(move.pp) && (
                <span className="battle-move__pp">{move.pp}/{move.maxpp} PP</span>
            )}
        </button>
    );
}

/** A switch option button */
export function SwitchOption({ mon, disabled, onClick }) {
    const icon = getBattleIcon(mon.name);
    const condition = parseCondition(mon.condition);
    return (
        <button
            type="button"
            className="battle-move battle-move--switch"
            disabled={disabled}
            onClick={onClick}
        >
            <span className="battle-move__icon">
                {icon.url ? (
                    <img src={icon.url} alt={mon.name} loading="lazy" />
                ) : (
                    <PokeballIcon className="w-5 h-5 text-muted opacity-40" />
                )}
            </span>
            <span className="battle-move__body">
                <span className="battle-move__name">{mon.name}</span>
                {condition && (
                    <span className="battle-move__hp">
                        <span className={`battle-move__hp-track is-${hpTone(condition.pct)}`}>
                            <span className="battle-move__hp-fill" style={{ width: `${condition.pct}%` }} />
                        </span>
                        <span className="battle-move__hp-text">
                            {condition.max ? `${condition.current}/${condition.max}` : `${Math.round(condition.pct)}%`}
                        </span>
                    </span>
                )}
            </span>
        </button>
    );
}
