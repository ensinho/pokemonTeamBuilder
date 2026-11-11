import React from 'react';
import { useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import '../../styles/entity-detail-view.css';
import '../../styles/reference-views.css';

import { getItemPageData } from '../../services/pokemonDataCache';
import { useEntityPageData } from '../../hooks/useEntityPageData';
import { useTranslation } from '../../hooks/useTranslation';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { useSmartBack } from '../../hooks/useEntityNavigate';
import { titleCaseSlug } from '../../utils/smogonSets';
import { EmptyState } from '../EmptyState';
import { EntityHolders } from '../entity/EntityHolders';
import { GameDescriptions } from '../entity/GameDescriptions';
import { Loader } from '../Loader';

const prettify = (name = '') => String(name).replace(/-/g, ' ');

/**
 * Bulbapedia-style reference page for a single item (/items/:name): effect,
 * category / cost / Fling power, per-game descriptions, and the wild Pokémon
 * that can hold it. Mirrors the move & ability detail pages.
 */
export function ItemDetailView() {
    const { name } = useParams();
    const { t, language } = useTranslation();

    const slug = String(name || '').toLowerCase();
    const { status, data } = useEntityPageData(slug, getItemPageData);

    const displayName = titleCaseSlug(slug);
    useDocumentMeta({
        name: displayName,
        title: `${displayName} (${t('db.itemTag')})`,
        description: data?.effect
            ? `${displayName} — ${data.effect}`
            : `${displayName} — item effect, game descriptions, and which Pokémon hold it.`,
        path: `/items/${slug}`,
    });

    // Breadcrumb-trail back: returns to wherever the item was clicked (a
    // Pokémon page, the meta view, a tournament team, …) without breaking that
    // page's own back button; falls back to the items list on a deep link.
    const { goBack: handleBack, backLabel } = useSmartBack('/items', language === 'pt', t('db.backToItems'));

    if (status === 'loading') {
        return (
            <Loader size="lg" scene="pokedex" block />
        );
    }

    if (status === 'missing') {
        return (
            <EmptyState mascot="lost"
                title={t('db.noMatchesTitle')}
                message={t('db.detailNotFoundDesc')}
                action={{ label: backLabel, onClick: handleBack }}
            />
        );
    }

    const hasHolders = data.heldBy.length > 0;
    const hasLongEffect = Boolean(data.effectLong && data.effectLong !== data.effect);
    const hasLeft = hasLongEffect || data.flavorTexts.length > 0;

    return (
        <div className="edv edv--entity">
            <button type="button" className="edv-back" onClick={handleBack}>
                <ChevronLeft className="h-4 w-4" /> {backLabel}
            </button>

            <header className="edv-header">
                <div className="edv-kicker">
                    <span>{t('db.itemTag')}</span>
                    {data.category && <span className="capitalize">· {prettify(data.category)}</span>}
                </div>
                <h1 className="edv-title flex items-center gap-2">
                    {data.sprite && <img src={data.sprite} alt="" aria-hidden="true" className="w-9 h-9 image-pixelated shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
                    {displayName}
                </h1>
                {data.effect && <p className="edv-lead">{data.effect}</p>}
                <div className="mt-2 flex flex-wrap gap-1.5 text-2xs font-semibold">
                    <span className="rounded-md bg-surface-raised px-2 py-0.5 text-fg">
                        <span className="text-muted">{t('db.colCost')}:</span> <span className="figure">{data.cost > 0 ? data.cost : '—'}</span>
                    </span>
                    {data.flingPower != null && (
                        <span className="rounded-md bg-surface-raised px-2 py-0.5 text-fg">
                            <span className="text-muted">{t('db.flingPower')}:</span> <span className="figure">{data.flingPower}</span>
                        </span>
                    )}
                </div>
            </header>

            <div className={`edv-main ${hasHolders && hasLeft ? '' : 'edv-main--single'}`}>
                {hasLeft && (
                    <div className="edv-col">
                        {hasLongEffect && (
                            <section className="edv-section">
                                <h2 className="edv-section__title">{t('db.effectHeading')}</h2>
                                <p className="edv-effect">{data.effectLong}</p>
                            </section>
                        )}
                        <GameDescriptions groups={data.flavorTexts} />
                    </div>
                )}

                {hasHolders && (
                    <section className="edv-section">
                        <h2 className="edv-section__title">
                            {t('db.heldByWild')} <span className="count-badge">{data.heldBy.length}</span>
                        </h2>
                        <EntityHolders
                            ariaLabel={t('db.heldByWild')}
                            groups={[{ id: 'all', label: t('db.heldByWild'), pokemons: data.heldBy }]}
                        />
                    </section>
                )}
            </div>
        </div>
    );
}
