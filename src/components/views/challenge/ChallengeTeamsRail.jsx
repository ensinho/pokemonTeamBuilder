import { useTranslation } from '../../../hooks/useTranslation';
import { getBattleIcon } from '../../../utils/battleSprites';
import { hpTone } from '../../../utils/battleState';

/*
 * The teams beside a desktop's one screen (DsConsole `rails`) — app UI, not
 * the game: what the phone's Pokétch shows, always in view. The ranking in
 * the other rail is ChallengeRanking.
 */

function HpBar({ pct }) {
    return (
        <span className="challenge-team__hp" aria-hidden="true">
            <span className={`is-${hpTone(pct)}`} style={{ '--hp': pct / 100 }} />
        </span>
    );
}

/**
 * Both teams: yours with its HP (`mine`: `{species, hpPct, fainted}`), hers as
 * the dossier (`championRoster` + `hpPct`) — a "?" and "???" until each one is
 * sent out. `active` marks who is on the field.
 */
export function ChallengeTeamsRail({ title, mine = [], foe = [], championName, active = {}, foeTitle = null }) {
    const { t } = useTranslation();
    return (
        <div className="challenge-teams">
            <h2 className="m-0 shrink-0 truncate text-sm">{title}</h2>
            <ul className="challenge-teams__grid m-0 list-none p-0">
                {mine.slice(0, 6).map((mon, index) => {
                    const icon = getBattleIcon(mon.species);
                    return (
                        // The team's order is fixed for the day.
                        <li
                            key={`${mon.species}-${index}`}
                            className={`challenge-team__mon rounded-lg bg-surface-raised ${mon.fainted ? 'is-fainted' : ''} ${active.mine === mon.species ? 'is-active' : ''}`}
                        >
                            {icon.url ? <img src={icon.url} alt="" width={40} height={30} loading="lazy" decoding="async" draggable="false" /> : <span />}
                            <span className="truncate text-xs font-medium">{mon.species}</span>
                            <HpBar pct={mon.fainted ? 0 : mon.hpPct ?? 100} />
                        </li>
                    );
                })}
            </ul>
            <h2 className="m-0 shrink-0 truncate text-sm">{foeTitle || t('challenge.poketch.dossier', { name: championName })}</h2>
            <ul className="challenge-teams__grid m-0 list-none p-0">
                {foe.map((mon, index) => {
                    const icon = mon.species ? getBattleIcon(mon.species) : null;
                    const name = mon.revealed ? mon.species : t('challenge.poketch.unknown');
                    return (
                        // Her sending order is fixed for the day.
                        <li
                            key={index}
                            className={`challenge-team__mon rounded-lg bg-surface-raised ${mon.revealed ? 'is-revealed' : ''} ${mon.fainted ? 'is-fainted' : ''} ${mon.revealed && active.foe === mon.species ? 'is-active' : ''}`}
                        >
                            {icon?.url
                                ? <img src={icon.url} alt={name} width={40} height={30} loading="lazy" decoding="async" draggable="false" />
                                : <span className="font-display text-sm text-muted" aria-label={name}>?</span>}
                            <span className={`truncate text-xs font-medium ${mon.revealed ? '' : 'text-muted'}`}>{name}</span>
                            {mon.revealed && <HpBar pct={mon.fainted ? 0 : mon.hpPct ?? 100} />}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
