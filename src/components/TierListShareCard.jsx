import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Rows3 } from 'lucide-react';

import { useTranslation } from '../hooks/useTranslation';
import { loadPokemonIndex } from '../services/pokemonDataCache';
import { typeColors } from '../constants/typeChart';
import { getPokemonFrontSpriteUrl } from '../utils/pokemonSprites';
import { readTierListShare } from '../utils/gameShare';
import { TEMPLATES_BY_ID, TIER_BALLS, TIER_KEYS, keepFittingCells, monLabel } from '../utils/tierList';

/** A rank shows this many before "+N": the card stays a card on a phone. */
const MAX_PER_RANK = 8;

/**
 * A tier list inside a forum message (2026-11-15, Enzo: "sempre tenham a
 * opção de compartilhar no fórum, atualmente a tier list não tem"): the
 * theme, the ranks that hold someone — each on its ball's colour — and the
 * way to answer with one's own ("Fazer a minha" opens `/tier-list?r=`).
 *
 * The payload was written by whoever posted, so it is read back through
 * `readTierListShare` (the link's strict decode) and a chart's cells are
 * checked against their rules with the index, as the page does: a forged
 * post cannot put a Grass type in the Fire cell. The list's own name never
 * travels — the card says the theme's.
 *
 * Reuses the shared-team card's shell, so a thread keeps one visual language
 * for "somebody attached something". Its own chunk: only a thread that holds
 * a list loads the tier rules.
 */
export function TierListShareCard({ share }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const decoded = useMemo(() => readTierListShare(share), [share]);

    const [monsById, setMonsById] = useState(null);
    useEffect(() => {
        if (!decoded) return undefined;
        let alive = true;
        loadPokemonIndex()
            .then((list) => { if (alive) setMonsById(new Map(list.map((mon) => [mon.id, mon]))); })
            .catch(() => { if (alive) setMonsById(new Map()); });
        return () => { alive = false; };
    }, [decoded]);

    // A chart waits for the index: its cells are only trusted once checked.
    const list = useMemo(() => {
        if (!decoded) return null;
        if (decoded.kind !== 'chart') return decoded;
        return monsById ? keepFittingCells(decoded, (id) => monsById.get(id)) : null;
    }, [decoded, monsById]);

    if (!decoded) return null;
    const template = TEMPLATES_BY_ID[decoded.templateId];
    const theme = t(`tierList.templates.${decoded.templateId}.name`);
    const label = (id) => monLabel(monsById?.get(id)?.name || '') || `#${id}`;
    const sprite = (id, tone) => (
        <span key={id} className="tier-share__mon" style={{ '--mon-type': tone || typeColors[monsById?.get(id)?.types?.[0]] || 'var(--color-muted)' }} title={label(id)}>
            <img src={getPokemonFrontSpriteUrl(id)} alt={label(id)} width={48} height={48} loading="lazy" decoding="async" draggable="false" />
        </span>
    );

    const count = list?.count ?? decoded.count;
    const ranks = list?.kind === 'tier' ? TIER_KEYS.filter((key) => list.tiers[key].length > 0) : [];
    const cells = list?.kind === 'chart' ? template.cells.filter((cell) => list.cells[cell.key]) : [];

    return (
        <div className="forum-team-share-card tier-share">
            <div className="forum-team-share-header">
                <h5 className="forum-team-share-title flex items-center gap-1">
                    <Rows3 className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
                    {t('forum.tierTitle', { theme })}
                </h5>
                <span className="count-badge shrink-0">
                    {decoded.kind === 'chart'
                        ? t('tierList.chosen', { n: count, total: decoded.total })
                        : t('forum.tierCount', { n: count })}
                </span>
            </div>

            <div className="tier-share__body">
                {ranks.length > 0 && (
                    <ol className="tier-share__ranks">
                        {ranks.map((key) => {
                            const ids = list.tiers[key];
                            const more = ids.length - MAX_PER_RANK;
                            const ball = TIER_BALLS[key];
                            return (
                                <li key={key} className="tier-share__rank" style={{ '--ball-top': ball.ball === 'ultra' ? ball.band : ball.top }}>
                                    <span className="tier-share__letter" aria-label={t('forum.tierRank', { tier: key })}>{key}</span>
                                    <span className="tier-share__lane">
                                        {ids.slice(0, MAX_PER_RANK).map((id) => sprite(id))}
                                        {more > 0 && <span className="tier-share__more">+{more}</span>}
                                    </span>
                                </li>
                            );
                        })}
                    </ol>
                )}
                {cells.length > 0 && (
                    <ul className="tier-share__cells">
                        {cells.map((cell) => (
                            <li key={cell.key}>{sprite(list.cells[cell.key], typeColors[cell.key])}</li>
                        ))}
                    </ul>
                )}

                <button
                    type="button"
                    onClick={() => navigate(`/tier-list?r=${decoded.code}`)}
                    className="btn btn-ghost puzzle-share-play h-7 px-2.5 text-xs font-bold shrink-0"
                >
                    {t('forum.tierMake')}
                </button>
            </div>
        </div>
    );
}

export default TierListShareCard;
