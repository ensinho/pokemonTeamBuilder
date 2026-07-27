import React from 'react';

import { getBattleSprite, getBattleIcon, statusLabel } from '../../../utils/battleSprites';
import { PokeballIcon } from '../../icons';
import { useTranslation } from '../../../hooks/useTranslation';

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
    const tone = pct > 50 ? 'is-high' : pct > 20 ? 'is-mid' : 'is-low';
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

            <div className="battlefield-slot__sprite">
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
        </div>
    );
}

/**
 * Remaining team. For the viewer it's their own roster; for the opponent it's the
 * species revealed at team preview, with no HP claimed.
 */
function TeamStrip({ side, revealSpecies, faintedCount }) {
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
                    <span key={`${mon.species}-${index}`} className={`battlefield-strip__slot ${isDown ? 'is-down' : ''}`}>
                        {icon?.url ? (
                            <img src={icon.url} alt={mon.species} loading="lazy" />
                        ) : (
                            <PokeballIcon className="w-4 h-4 text-muted opacity-40" />
                        )}
                    </span>
                );
            })}
        </div>
    );
}

export function Battlefield({ field, animated = true }) {
    const { t } = useTranslation();
    if (!field) return null;

    return (
        <div className="battlefield">
            <div className="battlefield__meta">
                {field.turn > 0 && <span className="battlefield__turn">{t('battle.turnLabel', { turn: field.turn })}</span>}
                {field.weather && <span className="battlefield__weather">{field.weather}</span>}
            </div>

            <div className="battlefield__side is-theirs">
                <div className="battlefield__side-head">
                    <span className="battlefield__trainer">{field.theirs?.name || t('friends.unknownTrainer')}</span>
                    <TeamStrip side={field.theirs} revealSpecies faintedCount={field.theirs?.faintedCount || 0} />
                </div>
                <ActiveMon mon={field.theirs?.active} isMine={false} animated={animated} />
            </div>

            <div className="battlefield__divider" aria-hidden="true" />

            <div className="battlefield__side is-mine">
                <ActiveMon mon={field.mine?.active} isMine animated={animated} />
                <div className="battlefield__side-head">
                    <span className="battlefield__trainer">{field.mine?.name || t('battle.you')}</span>
                    <TeamStrip side={field.mine} revealSpecies faintedCount={field.mine?.faintedCount || 0} />
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
