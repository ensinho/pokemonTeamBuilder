import { useTranslation } from '../../../../hooks/useTranslation';
import { getBattleIcon } from '../../../../utils/battleSprites';
import { hpTone } from '../../../../utils/battleState';

/*
 * The desktop's side rails (DsConsole `rails`): Black & White menus beside the
 * one screen, in the room a wide monitor leaves around it — what the phone's
 * Pokétch and menus show, always in view. Teams here; the ranking is DsRanking
 * without its VOLTAR.
 */

function HpBar({ pct }) {
    return (
        <span className="bw-card__hp" aria-hidden="true">
            <span className={`ds-partymon__fill is-${hpTone(pct)}`} style={{ '--hp': pct / 100 }} />
        </span>
    );
}

/**
 * Both teams, BW party cards: yours with its HP (`mine`: `{species, hpPct,
 * fainted}`), hers as the dossier (`championRoster` + `hpPct`) — a silhouette
 * and "???" until each one is sent out. `active` marks who is on the field.
 */
export function DsTeamsRail({ title, mine = [], foe = [], championName, active = {}, foeTitle = null }) {
    const { t } = useTranslation();
    return (
        <div className="ds-panel ds-teams">
            <p className="ds-panel__title ds-teams__title">{title}</p>
            <ul className="ds-teams__grid">
                {mine.slice(0, 6).map((mon, index) => {
                    const icon = getBattleIcon(mon.species);
                    return (
                        // The team's order is fixed for the day.
                        <li
                            key={`${mon.species}-${index}`}
                            className={`bw-card ${mon.fainted ? 'is-fainted' : ''} ${active.mine === mon.species ? 'is-active' : ''}`}
                        >
                            {icon.url && <img src={icon.url} alt="" width={40} height={30} loading="lazy" decoding="async" draggable="false" />}
                            <span className="bw-card__name">{mon.species}</span>
                            <HpBar pct={mon.fainted ? 0 : mon.hpPct ?? 100} />
                        </li>
                    );
                })}
            </ul>
            <p className="ds-panel__title ds-teams__title">{foeTitle || t('challenge.poketch.dossier', { name: championName })}</p>
            <ul className="ds-teams__grid">
                {foe.map((mon, index) => {
                    const icon = mon.species ? getBattleIcon(mon.species) : null;
                    const name = mon.revealed ? mon.species : t('challenge.poketch.unknown');
                    return (
                        // Her sending order is fixed for the day.
                        <li
                            key={index}
                            className={`bw-card is-foe ${mon.revealed ? 'is-revealed' : ''} ${mon.fainted ? 'is-fainted' : ''} ${mon.revealed && active.foe === mon.species ? 'is-active' : ''}`}
                        >
                            {icon?.url
                                ? <img src={icon.url} alt={name} width={40} height={30} loading="lazy" decoding="async" draggable="false" />
                                : <span className="bw-card__unknown" aria-label={name}>?</span>}
                            <span className="bw-card__name">{name}</span>
                            {mon.revealed && <HpBar pct={mon.fainted ? 0 : mon.hpPct ?? 100} />}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
