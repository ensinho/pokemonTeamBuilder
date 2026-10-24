import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/most-used-build.css';

import { useTranslation } from '../hooks/useTranslation';
import { itemSpriteUrl } from '../utils/itemSuggestions';

/**
 * The default format's most used build for a Pokémon (utils/mostUsedBuild.js,
 * the hook useMostUsedBuild) — what "best X build" searches want, on the tab
 * the page opens on. api/render-meta.js writes the same facts into the HTML.
 * The host draws the frame and the title.
 */

const Pick = ({ label, value, share, icon }) => (
    <div className="mub__row">
        <dt>{label}</dt>
        <dd>
            {icon}
            <span className="mub__value">{value}</span>
            <span className="mub__share">{share}%</span>
        </dd>
    </div>
);

export function MostUsedBuild({ pokemonId, build }) {
    const { t } = useTranslation();
    const location = useLocation();
    if (!build) return null;
    const { data, format } = build;

    return (
        <div className="mub">
            <p className="mub__context">{t('pdetail.build.in', { format, usage: data.usage })}</p>
            <dl className="mub__picks">
                {data.item && (
                    <Pick
                        label={t('pdetail.build.item')}
                        value={data.item.name}
                        share={data.item.share}
                        icon={data.item.slug ? <img src={itemSpriteUrl(data.item.slug)} alt="" className="mub__icon image-pixelated" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} /> : null}
                    />
                )}
                {data.ability && <Pick label={t('pdetail.build.ability')} value={data.ability.name} share={data.ability.share} />}
                {data.spread && <Pick label={t('pdetail.build.spread')} value={[data.spread.nature, data.spread.evs].filter(Boolean).join(' · ')} share={data.spread.share} />}
                {data.tera && <Pick label={t('pdetail.build.tera')} value={data.tera.name} share={data.tera.share} />}
            </dl>
            {data.moves.length > 0 && (
                <ul className="mub__moves" aria-label={t('pdetail.build.moves')}>
                    {data.moves.map((move) => (
                        <li key={move.name}><span>{move.name}</span><span className="mub__share">{move.share}%</span></li>
                    ))}
                </ul>
            )}
            <Link to={`/meta/${pokemonId}`} state={location.state} className="btn btn-ghost btn-sm mub__more">{t('pdetail.build.more')}</Link>
        </div>
    );
}
