import { Sparkles } from 'lucide-react';
import { getBattleSprite, getBattleIcon, statusLabel } from '../../../utils/battleSprites';
import { hpTone } from '../../../utils/battleState';
import { PokeballIcon } from '../../icons';
import { useTranslation } from '../../../hooks/useTranslation';
import { TooltipTrigger, MonTooltipCard } from './BattlePopover';

/**
 * The battlefield: both active Pokémon, their HP, and each side's remaining team.
 *
 * Everything here comes from `readBattleField(myLog)` — the viewer's own filtered
 * protocol stream — so it can only ever show what this player is entitled to see.
 * The opponent's bench is deliberately drawn as anonymous pokéballs: their species
 * are known at team preview but their HP and sets are not, and inventing detail
 * here would misrepresent the game state.
 */

/** HP bar. Green → amber → red, the mainline thresholds. */
function HpBar({ hp }) {
    const pct = hp?.pct ?? 100;
    const tone = `is-${hpTone(pct)}`;
    return (
        <div className="battlefield-hp">
            <div className={`battlefield-hp__track ${tone}`}>
                <div className="battlefield-hp__fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="battlefield-hp__text">
                {/* Only your own Pokémon report real HP; the opponent's is a percentage. */}
                {hp?.max ? `${hp.current}/${hp.max}` : `${Math.round(pct)}%`}
            </span>
        </div>
    );
}

function ActiveMon({ mon, isMine, animated }) {
    const { t } = useTranslation();

    if (!mon) {
        return (
            <div className={`battlefield-slot ${isMine ? 'is-mine' : 'is-theirs'} is-empty`}>
                <PokeballIcon className="w-8 h-8 text-muted opacity-20" />
                <span className="battlefield-slot__waiting">{t('battle.noActiveMon')}</span>
            </div>
        );
    }

    const sprite = getBattleSprite(mon.species, { back: isMine, shiny: mon.shiny, animated });
    const status = statusLabel(mon.status);

    return (
        <div className={`battlefield-slot ${isMine ? 'is-mine' : 'is-theirs'} ${mon.fainted ? 'is-fainted' : ''}`}>
            <div className="battlefield-slot__info">
                <span className="battlefield-slot__name">
                    {mon.nickname || mon.species}
                    <span className="battlefield-slot__level">L{mon.level}</span>
                    {mon.gender && <span className="battlefield-slot__gender">{mon.gender}</span>}
                </span>
                <HpBar hp={mon.hp} />
                {status && <span className={`battlefield-status is-${String(mon.status).toLowerCase()}`}>{status}</span>}
            </div>

            <TooltipTrigger
                placement={isMine ? 'right' : 'left'}
                tooltipContent={
                    <MonTooltipCard
                        speciesName={mon.species}
                        level={mon.level}
                        hpCondition={mon.hp}
                        status={mon.status}
                        item={mon.item}
                        ability={mon.ability}
                        stats={mon.stats}
                        isMine={isMine}
                    />
                }
            >
                <div className="battlefield-slot__sprite cursor-pointer" title={mon.species}>
                    {sprite.url ? (
                        <img
                            src={sprite.url}
                            alt={mon.species}
                            width={sprite.w}
                            height={sprite.h}
                            loading="eager"
                            onError={(event) => { event.currentTarget.style.visibility = 'hidden'; }}
                        />
                    ) : (
                        <PokeballIcon className="w-10 h-10 text-muted opacity-30" />
                    )}
                </div>
            </TooltipTrigger>
        </div>
    );
}

/**
 * Remaining team. For the viewer it's their own roster; for the opponent it's the
 * species revealed at team preview, with no HP claimed.
 */
function TeamStrip({ side, revealSpecies, faintedCount, isMine }) {
    const roster = side?.roster || [];
    if (roster.length === 0) return null;

    return (
        <div className="battlefield-strip">
            {roster.map((mon, index) => {
                const icon = revealSpecies ? getBattleIcon(mon.species, { shiny: mon.shiny }) : null;
                // Faints are only known as a count, not per slot — so the strip
                // dims from the end rather than pretending to know which fell.
                const isDown = index >= roster.length - faintedCount;
                return (
                    <TooltipTrigger
                        key={`${mon.species}-${index}`}
                        placement={isMine ? 'top' : 'bottom'}
                        tooltipContent={
                            <MonTooltipCard
                                speciesName={mon.species}
                                item={mon.item}
                                ability={mon.ability}
                                stats={mon.stats}
                                isMine={isMine}
                            />
                        }
                    >
                        <span className={`battlefield-strip__slot ${isDown ? 'is-down' : ''} cursor-pointer`}>
                            {icon?.url ? (
                                <img src={icon.url} alt={mon.species} loading="lazy" />
                            ) : (
                                <PokeballIcon className="w-4 h-4 text-muted opacity-40" />
                            )}
                        </span>
                    </TooltipTrigger>
                );
            })}
        </div>
    );
}

export function Battlefield({ field, animated = true, onToggleAnimated }) {
    const { t } = useTranslation();
    if (!field) return null;

    return (
        <div className="battlefield">
            <div className="battlefield__meta">
                <div className="battlefield__meta-info">
                    {field.turn > 0 && <span className="battlefield__turn">{t('battle.turnLabel', { turn: field.turn })}</span>}
                    {field.weather && <span className="battlefield__weather">{field.weather}</span>}
                </div>

                {onToggleAnimated && (
                    <button
                        type="button"
                        className="battle-sprite-toggle battle-sprite-toggle--compact flex items-center gap-1"
                        aria-pressed={animated}
                        onClick={onToggleAnimated}
                        title={t('battle.animatedSprites')}
                    >
                        <Sparkles className="w-3 h-3 text-amber-400 inline-block" />
                        <span>{animated ? 'GIF' : 'PNG'}</span>
                    </button>
                )}
            </div>

            <div className="battlefield__side is-theirs">
                <div className="battlefield__side-head">
                    <span className="battlefield__trainer">{field.theirs?.name || t('friends.unknownTrainer')}</span>
                    <TeamStrip side={field.theirs} revealSpecies faintedCount={field.theirs?.faintedCount || 0} isMine={false} />
                </div>
                <ActiveMon mon={field.theirs?.active} isMine={false} animated={animated} />
            </div>

            <div className="battlefield__divider" aria-hidden="true" />

            <div className="battlefield__side is-mine">
                <ActiveMon mon={field.mine?.active} isMine={true} animated={animated} />
                <div className="battlefield__side-head">
                    <span className="battlefield__trainer">{field.mine?.name || t('battle.you')}</span>
                    <TeamStrip side={field.mine} revealSpecies faintedCount={field.mine?.faintedCount || 0} isMine={true} />
                </div>
            </div>

            {field.ended && (
                <p className={`battlefield__result ${field.iWon ? 'is-win' : 'is-loss'}`}>
                    {field.winner
                        ? t(field.iWon ? 'battle.youWon' : 'battle.youLost', { name: field.winner })
                        : t('battle.itWasATie')}
                </p>
            )}
        </div>
    );
}
