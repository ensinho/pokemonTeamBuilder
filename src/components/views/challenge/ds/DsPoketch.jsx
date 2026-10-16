import { useEffect, useState } from 'react';

import { useTranslation } from '../../../../hooks/useTranslation';
import { getBattleIcon } from '../../../../utils/battleSprites';
import { timeUntil } from '../../../../utils/challengeView';

const APPS = ['party', 'dossier', 'clock', 'counter'];

/**
 * The Pokétch (bottom screen whenever there is nothing to choose): a green LCD
 * with the team as silhouettes and an HP bar each, a countdown to the next
 * team, and a counter of days. The red button flips between apps.
 *
 * The dossier is Cynthia's six (`championRoster`): a dim silhouette and "???"
 * until each one is sent out, then its name — crossed out once it faints. The
 * wildcard is a "?" until it appears.
 *
 * Silhouettes are the real sprites through an SVG colour-matrix filter
 * (`#ds-lcd-ink`, defined once in the console) — `<img>` only, since the
 * sprite host sends no CORS header and a canvas could never read them.
 */
export function DsPoketch({ team = [], foe = null, championName = 'Cynthia', nextResetAt, stats, todayStatus = 'none' }) {
    const { t } = useTranslation();
    const [app, setApp] = useState('party');
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        if (app !== 'clock') return undefined;
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, [app]);

    const apps = foe?.length ? APPS : APPS.filter((name) => name !== 'dossier');
    const next = () => setApp((current) => apps[(apps.indexOf(current) + 1) % apps.length]);
    const left = timeUntil(nextResetAt, now);
    const seconds = Math.max(0, Math.floor(((nextResetAt || 0) - now) / 1000) % 60);
    const pad = (n) => String(n).padStart(2, '0');

    return (
        <div className="ds-poketch">
            <div className="ds-poketch__lcd" aria-live="polite">
                {app === 'party' && (
                    <ul className="ds-poketch__party" aria-label={t('challenge.poketch.party')}>
                        {team.slice(0, 6).map((mon, index) => {
                            const icon = getBattleIcon(mon.species);
                            return (
                                // The team's order is fixed for the battle.
                                <li key={`${mon.species}-${index}`} className={`ds-poketch__mon ${mon.fainted ? 'is-fainted' : ''}`}>
                                    {icon.url && <img src={icon.url} alt={mon.species} width={40} height={30} decoding="async" draggable="false" />}
                                    <span className="ds-poketch__hp" aria-hidden="true">
                                        <span style={{ '--hp': (mon.hpPct ?? 100) / 100 }} />
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                )}
                {app === 'dossier' && foe && (
                    <ul className="ds-poketch__party ds-poketch__dossier" aria-label={t('challenge.poketch.dossier', { name: championName })}>
                        {foe.map((mon, index) => {
                            const icon = mon.species ? getBattleIcon(mon.species) : null;
                            const name = mon.revealed ? mon.species : t('challenge.poketch.unknown');
                            return (
                                // Her sending order is fixed for the day.
                                <li key={index} className={`ds-poketch__foe ${mon.revealed ? 'is-revealed' : ''} ${mon.fainted ? 'is-fainted' : ''}`}>
                                    {icon?.url
                                        ? <img src={icon.url} alt={name} width={40} height={30} decoding="async" draggable="false" />
                                        : <span className="ds-poketch__unknown" aria-label={name}>?</span>}
                                    <span className="ds-poketch__name">{name}</span>
                                </li>
                            );
                        })}
                    </ul>
                )}
                {app === 'clock' && (
                    <div className="ds-poketch__clock">
                        <span className="ds-poketch__caption">{t('challenge.poketch.clock')}</span>
                        <span className="ds-poketch__digits">{pad(left.hours)}:{pad(left.minutes)}:{pad(seconds)}</span>
                    </div>
                )}
                {app === 'counter' && (
                    <dl className="ds-poketch__counter">
                        <div><dt>{t('challenge.poketch.today')}</dt><dd>{t(`challenge.poketch.todayStatus.${todayStatus}`)}</dd></div>
                        <div><dt>{t('challenge.poketch.streak')}</dt><dd>{stats?.streak ?? 0}</dd></div>
                        <div><dt>{t('challenge.poketch.wins')}</dt><dd>{stats?.wins ?? 0}</dd></div>
                        <div><dt>{t('challenge.poketch.played')}</dt><dd>{stats?.played ?? 0}</dd></div>
                    </dl>
                )}
            </div>
            <button type="button" className="ds-poketch__button" onClick={next} aria-label={t('challenge.poketch.switchApp')} />
        </div>
    );
}
