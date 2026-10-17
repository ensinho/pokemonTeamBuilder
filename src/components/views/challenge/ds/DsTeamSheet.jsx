import { typeColors } from '../../../../constants/types';
import { useTranslation } from '../../../../hooks/useTranslation';
import { getBattleIcon } from '../../../../utils/battleSprites';
import { hpTone } from '../../../../utils/battleState';
import { play } from '../../../../utils/challengeSfx';
import { STAT_KEYS } from '../../../../utils/challengeSheet';
import { itemSpriteUrl } from '../../../../utils/itemSuggestions';

const GENDER = { M: '♂', F: '♀' };

/*
 * The team sheet (Ficha) — Black & White's Summary, one Pokémon at a time:
 * the six along the top (icon and HP), then the chosen one's types, ability,
 * item, moves and stats. Members come from `utils/challengeSheet.js`; the
 * containers (the picker, the party menu) add their own buttons below it.
 */
export function DsTeamSheet({ members, index, onSelect }) {
    const { t } = useTranslation();
    const mon = members[index] || members[0];
    if (!mon) return null;
    const pick = (next) => {
        if (next === index) return;
        play('cursor');
        onSelect(next);
    };

    return (
        <div className="bw-ficha">
            <div className="bw-ficha__tabs" role="tablist" aria-label={t('challenge.sheet.title')}>
                {members.map((member, i) => {
                    const icon = getBattleIcon(member.species);
                    return (
                        <button
                            // The team's order is fixed for the battle.
                            key={`${member.species}-${i}`}
                            type="button"
                            role="tab"
                            aria-selected={i === index}
                            aria-label={member.species}
                            className={`bw-ficha__tab ${member.fainted ? 'is-fainted' : ''} ${member.active ? 'is-active' : ''}`}
                            onClick={() => pick(i)}
                        >
                            {icon.url && <img src={icon.url} alt="" width={40} height={30} decoding="async" draggable="false" />}
                            {member.hp && (
                                <span className="bw-card__hp">
                                    <span className={`ds-partymon__fill is-${hpTone(member.hp.pct)}`} style={{ '--hp': member.hp.pct / 100 }} />
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            <div className="bw-ficha__body" role="tabpanel" aria-label={mon.species}>
                <div className="bw-ficha__head">
                    <span className="bw-ficha__name">
                        {mon.species}
                        {GENDER[mon.gender] && <span className={`ds-hpbox__gender is-${mon.gender === 'F' ? 'f' : 'm'}`}>{GENDER[mon.gender]}</span>}
                    </span>
                    <span>Lv{mon.level}</span>
                    {mon.types.map((type) => (
                        <span key={type} className="bw-move__type" style={{ '--type': typeColors[type] }}>{t(`types.${type}`)}</span>
                    ))}
                    {mon.status && <span className={`ds-hpbox__status is-${mon.status}`}>{String(mon.status).toUpperCase()}</span>}
                    {mon.active && <span className="bw-ficha__field">{t('challenge.sheet.onField')}</span>}
                    {mon.hp && (
                        <span className="bw-ficha__hp">
                            <span className="bw-card__hp">
                                <span className={`ds-partymon__fill is-${hpTone(mon.hp.pct)}`} style={{ '--hp': mon.hp.pct / 100 }} />
                            </span>
                            {mon.hp.max ? `${mon.hp.current}/${mon.hp.max}` : `${mon.hp.pct}%`}
                        </span>
                    )}
                </div>

                <dl className="bw-ficha__facts">
                    <div>
                        <dt>{t('challenge.sheet.ability')}</dt>
                        <dd>{mon.ability || '—'}</dd>
                    </div>
                    <div>
                        <dt>{t('challenge.sheet.item')}</dt>
                        <dd>
                            {mon.itemSlug && <img src={itemSpriteUrl(mon.itemSlug)} alt="" width={30} height={30} loading="lazy" decoding="async" draggable="false" />}
                            {mon.item || t('challenge.sheet.noItem')}
                        </dd>
                    </div>
                    {mon.nature && (
                        <div>
                            <dt>{t('challenge.sheet.nature')}</dt>
                            <dd>{mon.nature}</dd>
                        </div>
                    )}
                </dl>

                <ul className="bw-ficha__moves">
                    {Array.from({ length: 4 }, (_, i) => mon.moves[i] || null).map((move, i) => (
                        // Four fixed slots, as in the game.
                        <li key={i} className={`bw-ficha__move ${move ? '' : 'is-empty'}`} style={move?.type ? { '--type': typeColors[move.type] } : undefined}>
                            {move && (
                                <>
                                    <span className="bw-move__name">{move.name}</span>
                                    {move.category && (
                                        <span
                                            className={`ds-move__cat is-${move.category.toLowerCase()}`}
                                            role="img"
                                            aria-label={t(`challenge.command.category.${move.category.toLowerCase()}`)}
                                        />
                                    )}
                                    <span className="bw-ficha__pp">
                                        {Number.isFinite(move.pp) ? `PP ${move.pp}/${move.maxpp}` : move.power ? t('challenge.command.power', { power: move.power }) : ''}
                                    </span>
                                </>
                            )}
                        </li>
                    ))}
                </ul>

                {mon.stats && (
                    // Before the battle the figures are the species' base stats, and say so.
                    <dl className={`bw-ficha__stats ${mon.statsKind === 'base' ? 'is-base' : ''}`} data-note={mon.statsKind === 'base' ? t('challenge.sheet.baseStats') : undefined}>
                        {STAT_KEYS.map((key) => (
                            <div key={key}>
                                <dt>{t(`challenge.sheet.stat.${key}`)}</dt>
                                <dd>{mon.stats[key] ?? '—'}</dd>
                            </div>
                        ))}
                    </dl>
                )}
            </div>
        </div>
    );
}
